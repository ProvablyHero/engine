import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {duelPlinkoReplay,duelPlinkoPath,DUEL_PLINKO_V1} from './plinko-v1.ts';
import {duelServerSeedHash} from './seed.ts';
const f=JSON.parse(readFileSync(new URL('../../../test-vectors/duel-plinko-v1.json',import.meta.url),'utf8'));
test('Duel raw-byte commitment and all eleven captured slots match after a saved pre-bet hash',async()=>{
 assert.equal(DUEL_PLINKO_V1.status,'verified');
 assert.equal(await duelServerSeedHash(f.serverSeed),f.serverSeedHash);
 assert.notEqual(createHash('sha256').update(f.serverSeed).digest('hex'),f.serverSeedHash);
 for(const v of f.vectors){
  assert(Date.parse(f.commitment.capturedAt)<Date.parse(v.requestedAt));assert(Date.parse(v.betAt)<Date.parse(f.disclosure.capturedAt));
  const result=await duelPlinkoReplay(f.serverSeed,f.clientSeed,v.nonce,v.rows);
  assert.equal(result.slot,v.slot);assert.deepEqual(result.path,v.computedPath);assert.equal(result.steps[0].word,v.firstWord);
 }
 const last=await duelPlinkoPath(f.serverSeed,f.clientSeed,16,13);assert.equal(last.slot,4);
});
test('Duel parity agrees with independent Node HMAC across row counts and nonce bounds, preserving hex-key semantics',async()=>{
 for(const rows of [8,9,10,11,12,13,14,15,16])for(const nonce of [0,1,16,Number.MAX_SAFE_INTEGER]){
  const path=Array.from({length:rows},(_,i)=>createHmac('sha256',Buffer.from(f.serverSeed,'hex')).update(`${f.clientSeed}:${nonce}:${i}`).digest().readUInt32BE(0)%2);
  assert.deepEqual(await duelPlinkoPath(f.serverSeed,f.clientSeed,nonce,rows),{path,slot:path.reduce((s,d)=>s+d,0)});
 }
 assert.equal(await duelServerSeedHash(f.serverSeed.toUpperCase()),f.serverSeedHash);
 const utf8Path=Array.from({length:13},(_,i)=>createHmac('sha256',f.serverSeed).update(`${f.clientSeed}:16:${i}`).digest().readUInt32BE(0)%2);
 assert.notDeepEqual(utf8Path,(await duelPlinkoPath(f.serverSeed,f.clientSeed,16,13)).path);
});
test('Duel rejects malformed seed bytes and unbounded replay inputs',async()=>{
 for(const seed of ['', 'aa', 'g'.repeat(64), 'a'.repeat(65), 'a'.repeat(256), 'with space', '🙂'])await assert.rejects(duelPlinkoPath(seed,'client',0,13),RangeError);
 for(const nonce of [-1,.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])await assert.rejects(duelPlinkoPath(f.serverSeed,'client',nonce,13),RangeError);
 for(const rows of [7,17,8.5,NaN,Infinity])await assert.rejects(duelPlinkoPath(f.serverSeed,'client',0,rows),RangeError);
 for(const client of ['', 'with space','🙂','a'.repeat(129)])await assert.rejects(duelPlinkoPath(f.serverSeed,client,0,13),RangeError);
});
