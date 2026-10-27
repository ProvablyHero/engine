import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {duelbitsDiceRoll,duelbitsPlinkoTicket,duelbitsTicketFromHash,DUELBITS_DICE_V1,DUELBITS_PLINKO_V1} from './v1.ts';
const seed='04093dcb0d2790612ecd6d9837e2e3c6144f30f16bf560357ecc14ac0f0236e3';
test('Duelbits reference agrees with independent Node SHA-256 for published example and bounded synthetic inputs',async()=>{
 for(const client of ['my client seed','synthetic-client'])for(const nonce of [0,1,Number.MAX_SAFE_INTEGER]){
  const hash=createHash('sha256').update(`${seed}:${client}:${nonce}`).digest('hex'),word=parseInt(hash.slice(0,8),16);
  const d=await duelbitsDiceRoll(seed,client,nonce),p=await duelbitsPlinkoTicket(seed,client,nonce);
  assert.equal(d.ticket,word%10000);assert.equal(d.value,(word%10000)/100);assert.equal(p.ticket,word%65535);assert.equal(d.hash,hash);assert.equal(d.serverSeedHash,createHash('sha256').update(seed).digest('hex'));
 }
 assert.equal(DUELBITS_DICE_V1.status,'reference');assert.equal(DUELBITS_PLINKO_V1.status,'reference');
});
test('Duelbits preserves published modulo boundaries and rejects malformed inputs',async()=>{
 assert.equal(duelbitsTicketFromHash('0'.repeat(64),'dice').ticket,0);
 assert.equal(duelbitsTicketFromHash('ffffffff'+'0'.repeat(56),'dice').ticket,7295);
 assert.equal(duelbitsTicketFromHash('ffffffff'+'0'.repeat(56),'plinko').ticket,0);
 for(const n of [-1,.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])await assert.rejects(duelbitsDiceRoll(seed,'client',n),RangeError);
 for(const c of ['', 'a'.repeat(129),'\n','🙂'])await assert.rejects(duelbitsDiceRoll(seed,c,0),RangeError);
 for(const s of ['', 'g'.repeat(64), 'a'.repeat(65)])await assert.rejects(duelbitsPlinkoTicket(s,'client',0),RangeError);
 assert.throws(()=>duelbitsTicketFromHash('a'.repeat(63),'dice'),RangeError);
});
