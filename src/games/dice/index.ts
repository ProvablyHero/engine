import {xoshiro128ss} from '../../core/prng.ts';
import {bchGamesDiceStats,bchGamesDiceFromWord} from '../../adapters/bch-games/dice-v1.ts';

/** An illustrative discrete game, NOT an operator's provably-fair algorithm. */
export const DICE_MODEL_VERSION='dice-illustrative-v1';
export const DICE_OUTCOMES=10_000;
export type DiceMode='under'|'over'|'inside'|'outside'|'pairs';
export type DiceProfile='illustrative'|'bch-games-v1'|'bc-game-v1'|'bc-game-classic-v1'|'stake-v1'|'duel-v1'|'duelbits-v1';
export type DiceRules={chanceBps:number;houseEdge:number;mode:DiceMode;profile?:DiceProfile; /** Inclusive start of an interval in hundredths. */ start?:number};
export type DiceSimulationConfig=DiceRules&{bet:number;bankroll:number;bets:number;sessions:number;seed:string};
export const DICE_LIMITS={maxBets:100_000,maxSessions:10_000,maxTotal:10_000_000} as const;
const finite=(v:number,min:number,max:number)=>Number.isFinite(v)&&v>=min&&v<=max;
export const DICE_PROFILES={
 'illustrative':{name:'Custom model',maxChance:9999,edge:null,maxRoll:9999,modes:['under','over'],scope:'Illustrative probability model.'},
 'bch-games-v1':{name:'BCH.games',maxChance:9799,edge:.02,maxRoll:9999,modes:['under','over'],scope:'Checked payout rules. Currency settlement excluded.'},
 'bc-game-v1':{name:'BC.Game · Dice98',maxChance:9799,edge:.02,maxRoll:9999,modes:['under','over','inside','outside'],scope:'Reference estimate: 98% nominal return with four-decimal downward payout rounding, consistent with captured payouts. Full payout rules are not confirmed.'},
 'bc-game-classic-v1':{name:'BC.Game · Classic',maxChance:9799,edge:.02,maxRoll:10000,modes:['under','over'],scope:'Reference estimate: 98% nominal return on the Classic grid. Full payout rules are not confirmed.'},
 'stake-v1':{name:'Stake',maxChance:9800,edge:.01,maxRoll:10000,modes:['under','over'],scope:'Reference: public client payout formula and display rounding. Server settlement is not confirmed.'},
 'duel-v1':{name:'Duel.com · base tier',maxChance:9990,edge:.001,maxRoll:10000,modes:['under','over'],scope:'Reference estimate: 0.1% base-tier edge and four-decimal payout, matching captured Over 50.05. Other targets are model estimates. Higher stake tiers and cashback excluded.'},
 'duelbits-v1':{name:'Duelbits',maxChance:9800,edge:1-1/1.01,maxRoll:9999,modes:['under','over','inside','outside','pairs'],scope:'Reference: announced multiplier formula. Interval boundaries use half-open ranges; boundary settlement and currency settlement are not confirmed.'},
} as const;
export function diceProfile(rules:Pick<DiceRules,'profile'>){return DICE_PROFILES[rules.profile??'illustrative'];}
export function validateDiceRules(rules:DiceRules):void{
 const p=diceProfile(rules);
 if(!p||!Number.isInteger(rules.chanceBps)||!finite(rules.chanceBps,1,p.maxChance)||!finite(rules.houseEdge,0,.99)||!(p.modes as readonly string[]).includes(rules.mode))throw new RangeError('Invalid Dice rules');
 if(p.edge!==null&&Math.abs(rules.houseEdge-p.edge)>1e-12)throw new RangeError('Unsupported operator edge');
 if(rules.start!==undefined&&(!Number.isInteger(rules.start)||!finite(rules.start,0,p.maxRoll)))throw new RangeError('Invalid interval start');
 if(['inside','outside','pairs'].includes(rules.mode))diceIntervals(rules);
}
/** Half-open integer intervals [start,end); generated interval widths equal chanceBps. */
export function diceIntervals(rules:DiceRules):[number,number][]{
 const size=diceProfile(rules).maxRoll+1,n=rules.chanceBps;
 if(rules.mode==='under')return [[0,n]];
 if(rules.mode==='over')return [[size-n,size]];
 if(rules.mode==='outside'){
  const gap=size-n,start=rules.start??Math.floor(n/2);
  if(start+gap>size)throw new RangeError('Interval exceeds the roll grid');
  return [[0,start],[start+gap,size]];
 }
 if(rules.mode==='pairs'){
  const first=Math.floor(n/2),second=n-first,gap=Math.floor((size-n)/3),start=rules.start??gap;
  if(start+first+gap+second>size)throw new RangeError('Intervals exceed the roll grid');
  return [[start,start+first],[start+first+gap,start+first+gap+second]];
 }
 const start=rules.start??Math.floor((size-n)/2);
 if(start+n>size)throw new RangeError('Interval exceeds the roll grid');
 return [[start,start+n]];
}
export function diceThreshold(chanceBps:number,mode:DiceMode):number{
 validateDiceRules({chanceBps,mode,houseEdge:0});
 return mode==='under'?chanceBps:DICE_OUTCOMES-1-chanceBps;
}
export function diceWinsForRules(roll:number,rules:DiceRules):boolean{
 validateDiceRules(rules);
 if(!Number.isInteger(roll)||!finite(roll,0,diceProfile(rules).maxRoll))throw new RangeError('Invalid Dice result');
 return diceIntervals(rules).some(([lo,hi])=>roll>=lo&&roll<hi);
}
export function diceWins(roll:number,chanceBps:number,mode:DiceMode):boolean{return diceWinsForRules(roll,{chanceBps,mode,houseEdge:0});}
export function diceStats(rules:DiceRules){
 validateDiceRules(rules);
 if(rules.profile==='bch-games-v1')return {...bchGamesDiceStats(diceThreshold(rules.chanceBps,rules.mode)/100,rules.mode as 'under'|'over'),maxRoll:9999,intervals:diceIntervals(rules)};
 const p=diceProfile(rules),size=p.maxRoll+1,intervals=diceIntervals(rules),words=2**32;
 const probability=intervals.reduce((sum,[lo,hi])=>{
  if(rules.profile==='stake-v1')return sum+(Math.ceil(hi*words/size)-Math.ceil(lo*words/size))/words;
  if(rules.profile==='duelbits-v1'){
   const q=Math.floor(words/size),tail=words%size;
   return sum+((hi-lo)*q+Math.max(0,Math.min(hi,tail)-lo))/words;
  }
  return sum+(hi-lo)/size;
 },0);
 const threshold=rules.mode==='under'?rules.chanceBps:size-1-rules.chanceBps;
 // Reference estimates are deliberately distinct from checked payout rules above.
 let multiplier=(1-rules.houseEdge)/(rules.chanceBps/size);
 if(rules.profile==='bc-game-classic-v1')multiplier=.98/(rules.chanceBps/10000);
 if(rules.profile==='stake-v1')multiplier=Math.round((.99/(rules.chanceBps/10000))*10000)/10000;
 if(rules.profile==='duelbits-v1')multiplier=10000/(rules.chanceBps*1.01);
 if(rules.profile==='bc-game-v1')multiplier=Math.floor(multiplier*10000)/10000;
 if(rules.profile==='duel-v1')multiplier=Math.round(multiplier*10000)/10000;
 const rtp=probability*multiplier;
 return {probability,rtp,multiplier,threshold,variance:probability*(1-probability)*multiplier**2,maxRoll:p.maxRoll,intervals};
}
export function diceAtLeastOne(probability:number,bets:number):number{
 if(!finite(probability,0,1)||!Number.isSafeInteger(bets)||bets<0||bets>1e8)throw new RangeError('Invalid probability or bet count');
 return bets===0||probability===0?0:probability===1?1:-Math.expm1(bets*Math.log1p(-probability));
}
/** Rejection sampling avoids the bias of reducing all 2^32 words modulo 10000. */
export function drawDiceRoll(next32:()=>number=()=>crypto.getRandomValues(new Uint32Array(1))[0]):number{
 const limit=Math.floor(2**32/DICE_OUTCOMES)*DICE_OUTCOMES;
 for(let i=0;i<128;i++){
  const value=next32();
  if(!Number.isInteger(value)||!finite(value,0,2**32-1))throw new RangeError('Invalid random word');
  if(value<limit)return value%DICE_OUTCOMES;
 }
 throw new Error('Random source did not yield an acceptable word');
}
/** Statistical draws for calculation profiles, not cryptographic operator replays. */
export function drawDiceForRules(rules:DiceRules,next32:()=>number=()=>crypto.getRandomValues(new Uint32Array(1))[0]):number{
 validateDiceRules(rules);
 const word=()=>{const n=next32();if(!Number.isInteger(n)||!finite(n,0,0xffffffff))throw new RangeError('Invalid random word');return n;};
 if(rules.profile==='bch-games-v1')return bchGamesDiceFromWord(word()).ticks;
 if(rules.profile==='stake-v1')return Math.floor(word()/2**32*10001);
 if(rules.profile==='duelbits-v1')return word()%10000;
 const size=diceProfile(rules).maxRoll+1,limit=Math.floor(2**32/size)*size;
 for(let i=0;i<128;i++){const n=word();if(n<limit)return n%size;}
 throw new Error('Random source did not yield an acceptable word');
}
export function validateDiceSimulation(c:DiceSimulationConfig):void{
 validateDiceRules(c);
 if(!finite(c.bet,.01,1e6)||!finite(c.bankroll,1,1e9)||c.bankroll<c.bet||!Number.isInteger(c.bets)||!finite(c.bets,1,DICE_LIMITS.maxBets)||!Number.isInteger(c.sessions)||!finite(c.sessions,1,DICE_LIMITS.maxSessions)||c.bets*c.sessions>DICE_LIMITS.maxTotal||typeof c.seed!=='string'||!/^[A-Za-z0-9._:-]{1,64}$/.test(c.seed))throw new RangeError('Invalid or excessive simulation settings');
}
export type DiceSimulationResult={mean:number;median:number;p10:number;p90:number;bustRate:number;profitRate:number;wagered:number;expectedLoss:number;observedRtp:number|null;completedBets:number;checkpoints:number[];samples:number[][];medianPath:number[]};
/** Fixed stakes only; stop a session when it cannot fund its next wager. */
export function simulateDice(c:DiceSimulationConfig,progress?:(completed:number)=>void):DiceSimulationResult{
 validateDiceSimulation(c);
 const stats=diceStats(c),rng=xoshiro128ss(c.seed);
 const intervals=diceIntervals(c),checkpoints=[...new Set(Array.from({length:51},(_,i)=>Math.floor(i*c.bets/50)))];
 const paths=checkpoints.map(()=>[] as number[]),samples:number[][]=[],endings:number[]=[];
 let stopped=0,profitable=0,completedBets=0,wagered=0,returned=0;
 for(let session=0;session<c.sessions;session++){
  let balance=c.bankroll,index=1;
  const sample:number[]=[balance];paths[0].push(balance);
  for(let n=1;n<=c.bets;n++){
   if(balance+c.bet*1e-12<c.bet)break;
   const roll=drawDiceForRules(c,rng.next32),won=intervals.some(([lo,hi])=>roll>=lo&&roll<hi);
   const payout=won?c.bet*stats.multiplier:0;
   balance=Math.max(0,balance-c.bet+payout);wagered+=c.bet;returned+=payout;completedBets++;
   if(n===checkpoints[index]){paths[index].push(balance);sample.push(balance);index++;}
  }
  while(index<checkpoints.length){paths[index].push(balance);sample.push(balance);index++;}
  if(balance+c.bet*1e-12<c.bet)stopped++;
  if(balance>c.bankroll)profitable++;
  endings.push(balance);if(session<20)samples.push(sample);
  if(session%25===0||session===c.sessions-1)progress?.(session+1);
 }
 const quantile=(values:number[],q:number)=>{const pos=(values.length-1)*q,i=Math.floor(pos);return values[i]+(values[Math.min(i+1,values.length-1)]-values[i])*(pos-i);};
 endings.sort((a,b)=>a-b);
 return {mean:endings.reduce((a,b)=>a+b,0)/c.sessions,median:quantile(endings,.5),p10:quantile(endings,.1),p90:quantile(endings,.9),bustRate:stopped/c.sessions,profitRate:profitable/c.sessions,wagered,expectedLoss:wagered*(1-stats.rtp),observedRtp:wagered?returned/wagered:null,completedBets,checkpoints,samples,medianPath:paths.map(p=>quantile(p.sort((a,b)=>a-b),.5))};
}
