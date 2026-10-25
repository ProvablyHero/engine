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
