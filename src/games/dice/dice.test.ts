import{test}from'node:test';import assert from'node:assert/strict';
import{diceWins,diceStats,diceThreshold,diceAtLeastOne,drawDiceRoll,simulateDice}from'./index.ts';
test('every integer roll has exact under/over counts, including equality and extremes',()=>{
 for(const chanceBps of[1,50,4950,5000,9999])for(const mode of['under','over'] as const){let wins=0;for(let roll=0;roll<10000;roll++)wins+=Number(diceWins(roll,chanceBps,mode));assert.equal(wins,chanceBps);assert.equal(diceWins(diceThreshold(chanceBps,mode),chanceBps,mode),false);}
});
test('RTP, gross payout, variance and fixed-length hit chance agree with probability model',()=>{
 const s=diceStats({chanceBps:4950,houseEdge:.01,mode:'under'});assert.equal(s.multiplier,2);assert.equal(s.rtp,.99);assert.ok(Math.abs(s.probability*s.multiplier-.99)<1e-14);assert.ok(Math.abs(s.variance-(s.probability*s.multiplier**2-.99**2))<1e-12);assert.equal(diceAtLeastOne(.5,2),.75);assert.equal(diceAtLeastOne(1,0),0);assert.equal(diceAtLeastOne(0,100),0);assert.equal(diceAtLeastOne(1,2),1);
});
test('rejection sampling rejects the excess uint32 tail instead of assigning it to low rolls',()=>{
 const words=[4294967295,4294960000,4294959999];assert.equal(drawDiceRoll(()=>words.shift()!),9999);assert.throws(()=>drawDiceRoll(()=>-1));assert.throws(()=>drawDiceRoll(()=>4294967295));
});
test('rules reject malformed probabilities and out-of-grid results',()=>{
 for(const chanceBps of[0,10000,NaN,1.2])assert.throws(()=>diceStats({chanceBps,houseEdge:.01,mode:'under'}));assert.throws(()=>diceStats({chanceBps:5000,houseEdge:1,mode:'under'}));assert.throws(()=>diceWins(10000,5000,'under'));assert.throws(()=>diceAtLeastOne(.5,Infinity));
});
const config={chanceBps:4950,mode:'under' as const,houseEdge:.01,bet:1,bankroll:100,bets:100,sessions:100,seed:'Dice-example'};
test('simulations are deterministic and conserve bankroll against returned payouts',()=>{
 const a=simulateDice(config),b=simulateDice(config);assert.deepEqual(a,b);assert.ok(a.bustRate>=0&&a.bustRate<=1);assert.equal(a.checkpoints.length,a.medianPath.length);assert.equal(a.samples[0].length,a.checkpoints.length);assert.ok(Math.abs(a.mean*config.sessions-(config.bankroll*config.sessions+a.wagered*(a.observedRtp!-1)))<1e-8);assert.ok(Math.abs(a.expectedLoss-a.wagered*.01)<1e-8);
});
test('unfunded sessions stop, retain their last balance, and cannot exceed the work budget',()=>{
 const r=simulateDice({...config,bankroll:1,chanceBps:1,bet:1,bets:1000,sessions:2,seed:'no-hit'});assert.equal(r.bustRate,1);assert.equal(r.completedBets,2);assert.ok(r.samples.every(path=>path.slice(1).every(n=>n===0)));assert.throws(()=>simulateDice({...config,bets:100000,sessions:10000}));assert.throws(()=>simulateDice({...config,bankroll:.5}));assert.throws(()=>simulateDice({...config,seed:'bad seed'}));
});

test('BCH captured profile uses its fixed edge and rounded payout rather than the illustrative model',()=>{
 const rules={chanceBps:9630,mode:'under' as const,houseEdge:.02,profile:'bch-games-v1' as const};
 const s=diceStats(rules);assert.equal(s.multiplier,1.0177);assert.ok(Math.abs(s.rtp-.9800451)<1e-8);assert.notEqual(s.rtp,.98);
 const run=simulateDice({...config,...rules});assert.ok(Math.abs(run.expectedLoss-run.wagered*(1-s.rtp))<1e-10);
 assert.throws(()=>diceStats({...rules,houseEdge:.01}));assert.throws(()=>diceStats({...rules,chanceBps:9800}));
});
