import{test}from'node:test';import assert from'node:assert/strict';import{createHash,createHmac}from'node:crypto';
import{BC_GAME_DICE_V1,bcGameDiceFromHash,bcGameDiceRoll}from'./dice-v1.ts';
const server='2dbc38e175dcf0fed504db05da12adffc1df6684e6394b1d18070c1f25728fe8',client='8a83fd8e6b586a23e84aa99b4a88bedf';
test('ClassicDice98 round 1880047227552134678: seed hash, nonce 15 and 76.28 agree',async()=>{
 assert.equal(createHash('sha256').update(server).digest('hex'),'d566fbe201f5aac6a4d45ff9d7fa44fe5bb7108efb5d00212d7962daf012983a');
 assert.deepEqual(await bcGameDiceRoll(server,client,15),{ticks:7628,value:76.28});assert.equal(BC_GAME_DICE_V1.status,'verified');
 // Legacy first-four-byte mapping gives 42.21; this fixture must not select it.
 const bytes=createHmac('sha256',server).update(client+':15').digest();assert.equal(Math.floor(bytes.readUInt32BE(0)/2**32*10001)/100,42.21);
});
test('sliding-window replay agrees with an independent BigInt oracle across offsets and nonce bounds',async()=>{
 const offsets=new Set<number>();
 for(let n=0;n<500;n++){
  const nonce=n===499?Number.MAX_SAFE_INTEGER:n,seed='synthetic-'+n;
  const h=createHmac('sha256',seed).update(`${client}:${nonce}`).digest('hex');
  const i=Number(BigInt('0x'+h.substring(0,15))%47n);offsets.add(i);
  const fraction=Number(BigInt('0x'+h.substring(i,i+14))/8n)/2**53;
  const ticks=Math.floor(fraction*10001);assert.deepEqual(await bcGameDiceRoll(seed,client,nonce),{ticks,value:ticks/100});
 }
 assert.equal(offsets.size,47);
});
test('Classic Dice has 10001 displayed values, including 100.00; truncation is deliberate',()=>{
 assert.deepEqual(bcGameDiceFromHash('0'.repeat(64)),{ticks:0,value:0});
 assert.deepEqual(bcGameDiceFromHash('f'.repeat(64)),{ticks:10000,value:100});
 assert.deepEqual(bcGameDiceFromHash('F'.repeat(64)),{ticks:10000,value:100});
});
test('replay rejects oversized, malformed or unsafe inputs before computing',async()=>{
 for(const n of[-1,NaN,Infinity,1.5,Number.MAX_SAFE_INTEGER+1])await assert.rejects(()=>bcGameDiceRoll(server,client,n));
 for(const seed of['','x'.repeat(257),'bad seed','🙂','<script>'])await assert.rejects(()=>bcGameDiceRoll(seed,client,15));
 await assert.rejects(()=>bcGameDiceRoll(server,'x'.repeat(129),15));
 for(const h of['','f'.repeat(63),'g'.repeat(64)])assert.throws(()=>bcGameDiceFromHash(h));
});

test('pre-bet prefix round 1880048288356627997 reproduces nonce 2, 35.84 and the official HMAC',async()=>{
 const seed='5307cf62acca4cc9141c450c7ac72ecd926f5ee92301bf3033c4a45e49cb30b5',client='e18e0JxwASAwiwCdx';
 const hash=createHash('sha256').update(seed).digest('hex');assert.equal(hash,'eae602feda6085458e78baf816f9e12b0a41ae34adecebb6ae540b9f81e03cb4');assert.ok(hash.startsWith('eae602feda6085458e78baf816f9e12b0a41ae34adecebb6'));
 assert.equal(createHmac('sha256',seed).update(client+':2').digest('hex'),'4fd8674a362eb484fe975039d777f8f45b2ab4b59b08c05bc284ba7368120a18');
 assert.deepEqual(await bcGameDiceRoll(seed,client,2),{ticks:3584,value:35.84});
});

test('Dice98 captures use 10000 events: six disclosed interval rounds, including 13.49',async()=>{
 const seed='58cc768fe782afd394911862a3579dc7f2eb3a13802f16ce0f762948f0115ff7',client='e58d4457f15c1851581b349de5b60821';
 assert.equal(createHash('sha256').update(seed).digest('hex'),'66a41f40ad9463e54554a3e5588e5ae4550f1635ea3ca0fc74300748505025f8');
 for(const[nonce,ticks]of[[2,9362],[3,1197],[4,9907],[6,925],[7,3754],[9,1349]])assert.deepEqual(await bcGameDiceRoll(seed,client,nonce,'Dice98'),{ticks,value:ticks/100});
 assert.deepEqual(bcGameDiceFromHash('f'.repeat(64),'Dice98'),{ticks:9999,value:99.99});assert.deepEqual(bcGameDiceFromHash('0'.repeat(64),'Dice98'),{ticks:0,value:0});
});
test('both BC.Game variants agree with independent HMAC math and unknown variants are rejected',async()=>{
 for(let n=0;n<100;n++){const seed='dice98-'+n,h=createHmac('sha256',seed).update(client+':'+n).digest('hex'),i=Number(BigInt('0x'+h.slice(0,15))%47n),fraction=Number(BigInt('0x'+h.slice(i,i+14))/8n)/2**53;
 for(const variant of['Dice98','ClassicDice98']as const){const ticks=Math.floor(fraction*(variant==='Dice98'?10000:10001));assert.deepEqual(await bcGameDiceRoll(seed,client,n,variant),{ticks,value:ticks/100});}}
 assert.throws(()=>bcGameDiceFromHash('0'.repeat(64),'unknown' as never));await assert.rejects(()=>bcGameDiceRoll(server,client,0,'unknown' as never));
});

test('Dice98 preserves the published numeric parseInt conversion for tiny fractions',()=>{
 const hash='000000000000010'+'0'+'00000000000008'+'0'.repeat(34);
 assert.equal(hash.length,64);assert.equal(Number(BigInt('0x'+hash.slice(0,15))%47n),16);
 const scaled=Number(BigInt('0x'+hash.slice(16,30))>>3n)*2**-53*10000;
 assert.equal(Math.floor(scaled),0);assert.equal(Number.parseInt(String(scaled),10),1);
 assert.deepEqual(bcGameDiceFromHash(hash,'Dice98'),{ticks:1,value:.01});
});
