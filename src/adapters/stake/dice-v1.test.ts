import{test}from'node:test';import assert from'node:assert/strict';import{createHmac}from'node:crypto';
import{STAKE_DICE_V1,stakeDiceFromWord,stakeDiceRoll}from'./dice-v1.ts';
test('Stake Dice stays Reference: synthetic inputs do not become disclosed-round evidence',async()=>{
 assert.equal(STAKE_DICE_V1.status,'reference');const seed='stake-dice-synthetic-server-v1',client='stake-dice-synthetic-client-v1';
 const word=createHmac('sha256',seed).update(client+':0:0').digest().readUInt32BE(0);assert.deepEqual(await stakeDiceRoll(seed,client,0),stakeDiceFromWord(word));
});
test('captured fairness mapping agrees with an independent HMAC oracle over 500 synthetic rounds',async()=>{
 for(let i=0;i<500;i++){const seed='synthetic-stake-'+i,client='client-'+i,nonce=i===499?Number.MAX_SAFE_INTEGER:i;const word=createHmac('sha256',seed).update(`${client}:${nonce}:0`).digest().readUInt32BE(0);const ticks=Math.floor(word/2**32*10001);assert.deepEqual(await stakeDiceRoll(seed,client,nonce),{ticks,value:ticks/100});}
 assert.deepEqual(stakeDiceFromWord(0),{ticks:0,value:0});assert.deepEqual(stakeDiceFromWord(0xffffffff),{ticks:10000,value:100});
});
test('Stake Dice rejects invalid nonce, malformed seeds and invalid uint32 words',async()=>{
 for(const n of[-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])await assert.rejects(()=>stakeDiceRoll('server','client',n));
 for(const seed of['','bad seed','🙂','x'.repeat(257)])await assert.rejects(()=>stakeDiceRoll(seed,'client',0));await assert.rejects(()=>stakeDiceRoll('server','x'.repeat(129),0));for(const word of[-1,2**32,1.1,NaN])assert.throws(()=>stakeDiceFromWord(word));
});
