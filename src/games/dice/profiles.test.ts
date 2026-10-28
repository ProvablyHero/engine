import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DICE_PROFILES,diceStats,diceIntervals,diceWinsForRules,drawDiceForRules,simulateDice,type DiceRules,type DiceMode,type DiceProfile} from './index.ts';
const rules=(profile:DiceProfile,mode:DiceMode='under',chanceBps=5000):DiceRules=>({profile,mode,chanceBps,houseEdge:DICE_PROFILES[profile].edge??.01});
test('all supported modes partition their integer grid into the requested number of winning values',()=>{
 for(const profile of Object.keys(DICE_PROFILES) as DiceProfile[])for(const mode of DICE_PROFILES[profile].modes){
  const r=rules(profile,mode),stats=diceStats(r);let count=0;
  for(let roll=0;roll<=stats.maxRoll;roll++)count+=Number(diceWinsForRules(roll,r));
  assert.equal(count,5000,`${profile}/${mode}`);
  assert.ok(Math.abs(stats.rtp-stats.probability*stats.multiplier)<1e-12);
  assert.ok(stats.probability>0&&stats.probability<1);
  const c={...r,bet:1,bankroll:100,bets:100,sessions:3,seed:'profiles'};
  const a=simulateDice(c);assert.deepEqual(a,simulateDice(c));
  assert.ok(Math.abs(a.mean*3-(300+a.wagered*(a.observedRtp!-1)))<1e-9);
 }
});
test('captured payout examples and announced multipliers remain reproducible without promoting evidence',()=>{
 assert.equal(diceStats(rules('bc-game-v1','inside',5000)).multiplier,1.96);
 assert.equal(diceStats(rules('bc-game-classic-v1','under',5000)).multiplier,1.96);
 assert.equal(diceStats(rules('bc-game-v1','inside',6616)).multiplier,1.4812);
 assert.equal(diceStats(rules('duel-v1','over',4995)).threshold,5005);
 assert.equal(diceStats(rules('duel-v1','over',4995)).multiplier,2.0002);
 for(const chance of[2000,4000,5000,8000])assert.equal(diceStats(rules('duelbits-v1','under',chance)).multiplier,10000/(chance*1.01));
 const inside={...rules('duelbits-v1','inside',2000),start:4000};
 for(const [roll,win] of [[3537,false],[1108,false],[4000,true],[5999,true],[6000,false]] as const)assert.equal(diceWinsForRules(roll,inside),win);
 const outside={...rules('duelbits-v1','outside',8000),start:4000};
 for(const [roll,win] of [[4972,false],[7074,true],[1936,true]] as const)assert.equal(diceWinsForRules(roll,outside),win);
 const pairs={...rules('duelbits-v1','pairs',4000),start:2000};assert.deepEqual(diceIntervals(pairs),[[2000,4000],[6000,8000]]);
 for(const [roll,win] of [[8234,false],[2507,true],[8892,false]] as const)assert.equal(diceWinsForRules(roll,pairs),win);
});
test('Stake float mapping and Duelbits modulo bias agree with exact word counts',()=>{
 const words=2**32;
 for(const mode of ['under','over'] as const)for(const chance of[1,4995,5000,9800]){
  const r=rules('stake-v1',mode,chance),s=diceStats(r),[[lo,hi]]=diceIntervals(r);
  assert.equal(s.probability,(Math.ceil(hi*words/10001)-Math.ceil(lo*words/10001))/words);
  for(const n of[0,1,0xffffffff])assert.equal(drawDiceForRules(r,()=>n),Math.floor(n/words*10001));
  const db=rules('duelbits-v1',mode,chance),stats=diceStats(db),[[a,b]]=diceIntervals(db),q=Math.floor(words/10000),tail=words%10000;
  assert.equal(stats.probability,((b-a)*q+Math.max(0,Math.min(b,tail)-a))/words);
 }
 assert.equal(drawDiceForRules(rules('duelbits-v1'),()=>0xffffffff),7295);
});
test('profile limits, fixed edges and malformed intervals are enforced',()=>{
 assert.throws(()=>diceStats({...rules('stake-v1'),houseEdge:.02}));
 assert.throws(()=>diceStats(rules('stake-v1','inside')));
 assert.throws(()=>diceStats({...rules('bc-game-v1','inside'),start:9999}));
 assert.throws(()=>diceStats({...rules('duelbits-v1','pairs'),start:-1}));
 assert.throws(()=>drawDiceForRules(rules('stake-v1'),()=>NaN));
});
