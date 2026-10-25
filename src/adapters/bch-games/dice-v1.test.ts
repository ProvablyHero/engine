import{test}from'node:test';import assert from'node:assert/strict';import{createHash,createHmac}from'node:crypto';
import{BCH_GAMES_DICE_V1,bchGamesDiceRoll,bchGamesDiceStats,bchGamesDiceWins,bchGamesDiceFromWord}from'./dice-v1.ts';
const server='d69120678a4fb7d2a2487b7772b22c17440665679c3519ab26869d315162d386',client='Lhhqh7pC1tJ7oKKP';
test('BCH.games captured round 11807862209: commitment, nonce 4, result 28.08, target 96.30 and reported multiplier',async()=>{
 assert.equal(createHash('sha256').update(server).digest('hex'),'a6a29b53e344478a32ae759f3402ca04112bb808ce5ef5c2221b1ed9d836e6a9');const result=await bchGamesDiceRoll(server,client,4);assert.deepEqual(result,{ticks:2808,value:28.08});assert.equal(bchGamesDiceWins(result.ticks,96.3,'under'),true);assert.equal(bchGamesDiceStats(96.3,'under').multiplier,1.0177);assert.equal(BCH_GAMES_DICE_V1.status,'verified');
});
test('replay follows the published first uint32 mapping across synthetic seeds and nonces',async()=>{
 for(let n=0;n<100;n++){const seed='synthetic-'+n,nonce=n*7;const word=createHmac('sha256',seed).update(`${client}:${nonce}:0`).digest().readUInt32BE(0);assert.deepEqual(await bchGamesDiceRoll(seed,client,nonce),bchGamesDiceFromWord(word));}
 assert.deepEqual(bchGamesDiceFromWord(0),{ticks:0,value:0});assert.deepEqual(bchGamesDiceFromWord(0xffffffff),{ticks:9999,value:99.99});
});
test('captured modes enforce strict comparisons, target caps and four-decimal payout rounding',()=>{
 for(const [target,mode]of[[.01,'under'],[97.99,'under'],[2,'over'],[99.98,'over']] as const){const stats=bchGamesDiceStats(target,mode);assert.equal(bchGamesDiceWins(stats.threshold,target,mode),false);assert.ok(stats.probability>0&&stats.probability<1);assert.ok(stats.multiplier>=1&&stats.multiplier<=9800);}
 assert.equal(bchGamesDiceStats(.01,'under').multiplier,9800);assert.equal(bchGamesDiceStats(99.98,'over').multiplier,9800);assert.throws(()=>bchGamesDiceStats(98,'under'));assert.throws(()=>bchGamesDiceStats(1.99,'over'));assert.throws(()=>bchGamesDiceStats(49.501,'under'));
});
test('probability counts uint32 preimages at the exact threshold instead of assuming uniform decimal bins',()=>{
 for(const [target,mode]of[[.01,'under'],[49.5,'under'],[50.49,'over'],[99.98,'over']] as const){const s=bchGamesDiceStats(target,mode);const boundary=Math.ceil((s.threshold+(mode==='over'?1:0))*2**32/10000);assert.equal(s.probability*2**32,mode==='under'?boundary:2**32-boundary);assert.equal(s.rtp,s.multiplier*s.probability);assert.ok(Math.abs(s.probability-s.winningOutcomes/10000)<1/2**32);}
});
test('invalid nonce and oversized or malformed replay inputs are rejected',async()=>{
 for(const n of[-1,NaN,1.1,Number.MAX_SAFE_INTEGER+1])await assert.rejects(()=>bchGamesDiceRoll(server,client,n));await assert.rejects(()=>bchGamesDiceRoll(server,'bad seed',4));assert.throws(()=>bchGamesDiceFromWord(2**32));
});

test('BCH.games captured Over round 11807938076: nonce 14, result 12.11 and multiplier 2.5428',async()=>{
 const server="22e8998b99381ab388b418ff1f0ddc3c275e4ccc87a0e712ea264ea657bfbe9f";
 assert.equal(createHash('sha256').update(server).digest('hex'),"80959ce2dbba08446e03b346946ffb5c5cb07db7a620c463f6d3fbfdb14a5a79");
 const result=await bchGamesDiceRoll(server,client,14);assert.deepEqual(result,{ticks:1211,value:12.11});
 assert.equal(bchGamesDiceWins(result.ticks,61.45,'over'),false);assert.equal(bchGamesDiceStats(61.45,'over').multiplier,2.5428);
});

test('precommitted BCH.games round 11807972487: nonce 3, result 77.37, Over 99.43 and 175x',async()=>{
 const server='d0c74fb24a9befc8d2d89547e9537157ee08c8e03facdd3ec7fad5140bd6821e';
 assert.equal(createHash('sha256').update(server).digest('hex'),'1025b8fd20376ffc4086efeaf49ea0793397837bea9e448cd8c7cdcac1781577');
 const result=await bchGamesDiceRoll(server,client,3);assert.deepEqual(result,{ticks:7737,value:77.37});
 assert.equal(bchGamesDiceWins(result.ticks,99.43,'over'),false);assert.equal(bchGamesDiceStats(99.43,'over').multiplier,175);
});
