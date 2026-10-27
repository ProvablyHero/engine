import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHmac} from 'node:crypto';
import {duelServerSeedHash} from './seed.ts';
import {duelDiceRoll,duelDiceFromHash,DUEL_DICE_MAX_FAIR,DUEL_DICE_V1} from './dice-v1.ts';
const f=JSON.parse(readFileSync(new URL('../../../test-vectors/duel-dice-v1.json',import.meta.url),'utf8'));
test('Duel Dice thirteen observed results follow a full pre-bet commitment and later disclosure',async()=>{
 assert.equal(DUEL_DICE_V1.status,'verified');assert.equal(await duelServerSeedHash(f.serverSeed),f.serverSeedHash);assert.equal(f.commitment.nextNonce,0);
 for(const v of f.vectors){
  assert(Date.parse(f.commitment.capturedAt)<Date.parse(v.requestedAt));assert(Date.parse(v.capturedAt)<Date.parse(f.disclosure.capturedAt));
  const r=await duelDiceRoll(f.serverSeed,f.clientSeed,v.nonce);assert.equal(r.ticks,v.ticks);assert.equal(r.value,v.value);assert.equal(r.hash,v.hmac);assert.equal(r.wordIndex,v.acceptedWordIndex);assert.equal(r.ticks>v.targetTicks,v.isWin);
  assert.equal(r.hash,createHmac('sha256',Buffer.from(f.serverSeed,'hex')).update(`${f.clientSeed}:${v.nonce}`).digest('hex'));
 }
 assert.equal((await duelDiceRoll(f.serverSeed,f.clientSeed,12)).value,65.29);
});
test('Duel Dice rejection boundary, endpoints and exhausted digest',()=>{
 const hex=(n:number)=>n.toString(16).padStart(8,'0');
 assert.equal(DUEL_DICE_MAX_FAIR%10001,0);
 assert.equal(duelDiceFromHash(hex(0)+'f'.repeat(56)).ticks,0);
 assert.equal(duelDiceFromHash(hex(10000)+'f'.repeat(56)).ticks,10000);
 assert.equal(duelDiceFromHash(hex(DUEL_DICE_MAX_FAIR-1)+'f'.repeat(56)).ticks,10000);
 const r=duelDiceFromHash(hex(DUEL_DICE_MAX_FAIR)+hex(6529)+'f'.repeat(48));assert.equal(r.wordIndex,1);assert.equal(r.value,65.29);
 assert.equal(duelDiceFromHash('f'.repeat(56)+hex(1)).wordIndex,7);
 assert.throws(()=>duelDiceFromHash('f'.repeat(64)),RangeError);
 for(const h of ['','a'.repeat(63),'g'.repeat(64)])assert.throws(()=>duelDiceFromHash(h),RangeError);
});
test('Duel Dice rejects invalid inputs and preserves safe nonce and byte encoding',async()=>{
 for(const n of [-1,.2,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])await assert.rejects(duelDiceRoll(f.serverSeed,f.clientSeed,n),RangeError);
 for(const s of ['','aa','g'.repeat(64)])await assert.rejects(duelDiceRoll(s,f.clientSeed,0),RangeError);
 for(const c of ['','a'.repeat(129),'has space','🙂'])await assert.rejects(duelDiceRoll(f.serverSeed,c,0),RangeError);
 const n=Number.MAX_SAFE_INTEGER,r=await duelDiceRoll(f.serverSeed.toUpperCase(),f.clientSeed,n);assert.equal(r.hash,createHmac('sha256',Buffer.from(f.serverSeed,'hex')).update(`${f.clientSeed}:${n}`).digest('hex'));
});
