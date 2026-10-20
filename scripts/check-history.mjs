// Read-only audit of reachable Git blobs, the index and working files.
// Never print matching secret values; historical revealed seeds are deliberate fixtures.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
const lines=execFileSync('git',['rev-list','--objects','--all'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
const paths=new Map(lines.map(line=>{const i=line.indexOf(' ');return i<0?[line,'']:[line.slice(0,i),line.slice(i+1)];}));
const staged=execFileSync('git',['ls-files','--stage','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
for(const entry of staged){const tab=entry.indexOf('\t');const id=entry.slice(0,tab).split(' ')[1];paths.set(id,entry.slice(tab+1));}
const patterns=[
 ['private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
 ['GitHub token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/],
 ['AWS access key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
 ['Supabase secret',/\bsb_secret_[A-Za-z0-9_-]{20,}/],
 ['database credentials',/postgres(?:ql)?:\/\/[^\s:/]+:[^\s@]+@/],
];
const failures=[];
function inspect(path,text){
 if(/(?:^|\/)(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?)$/.test(path)&&!/(?:example|sample|template)$/.test(path))failures.push(`${path}: environment file`);
 for(const [name,pattern] of patterns)if(pattern.test(text))failures.push(`${path}: ${name}`);
 for(const token of text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)??[]){try{if(JSON.parse(Buffer.from(token.split('.')[1],'base64url')).role==='service_role')failures.push(`${path}: service-role JWT`);}catch{}}
}
const ids=[...paths.keys()];
const output=execFileSync('git',['cat-file','--batch'],{input:ids.join('\n')+'\n',maxBuffer:64*1024*1024});
let offset=0,blobs=0;
while(offset<output.length){
 const end=output.indexOf(10,offset);const [id,type,sizeText]=output.subarray(offset,end).toString().split(' ');const size=Number(sizeText);
 offset=end+1;const bytes=output.subarray(offset,offset+size);offset+=size+1;if(type!=='blob')continue;blobs++;
 inspect(paths.get(id)||'(historical blob)',bytes.toString('utf8'));
}
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(path=>path&&existsSync(path));
for(const file of files)inspect(file,readFileSync(file,'utf8'));
if(failures.length){console.error([...new Set(failures)].join('\n'));process.exit(1);}
console.log(`Scanned ${blobs} historical/staged blobs and ${files.length} working files; no matching credential patterns. Fetch all refs before a publication audit.`);
