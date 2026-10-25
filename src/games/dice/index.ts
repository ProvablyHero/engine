import {xoshiro128ss} from '../../core/prng.ts';
import {bchGamesDiceStats,bchGamesDiceFromWord} from '../../adapters/bch-games/dice-v1.ts';

/** An illustrative discrete game, NOT an operator's provably-fair algorithm. */
export const DICE_MODEL_VERSION='dice-illustrative-v1';
export const DICE_OUTCOMES=10_000;
export type DiceMode='under'|'over';
export type DiceRules={chanceBps:number;houseEdge:number;mode:DiceMode;profile?:'illustrative'|'bch-games-v1'};
export type DiceSimulationConfig=DiceRules&{bet:number;bankroll:number;bets:number;sessions:number;seed:string};
export const DICE_LIMITS={maxBets:100_000,maxSessions:10_000,maxTotal:10_000_000} as const;
const finite=(v:number,min:number,max:number)=>Number.isFinite(v)&&v>=min&&v<=max;
export function validateDiceRules(rules:DiceRules):void{
 if(!Number.isInteger(rules.chanceBps)||!finite(rules.chanceBps,1,9999)||!finite(rules.houseEdge,0,.99)||!['under','over'].includes(rules.mode))throw new RangeError('Invalid Dice rules');
 if(rules.profile&&!['illustrative','bch-games-v1'].includes(rules.profile))throw new RangeError('Unknown Dice profile');
 if(rules.profile==='bch-games-v1'&&(rules.houseEdge!==.02||rules.chanceBps>9799))throw new RangeError('Unsupported BCH.games settings');
}
export function diceThreshold(chanceBps:number,mode:DiceMode):number{
 validateDiceRules({chanceBps,mode,houseEdge:0});
 return mode==='under'?chanceBps:DICE_OUTCOMES-1-chanceBps;
}
export function diceWins(roll:number,chanceBps:number,mode:DiceMode):boolean{
 if(!Number.isInteger(roll)||!finite(roll,0,DICE_OUTCOMES-1))throw new RangeError('Roll must be an integer from 0 to 9999');
 const threshold=diceThreshold(chanceBps,mode);
 return mode==='under'?roll<threshold:roll>threshold;
}
export function diceStats(rules:DiceRules){
 validateDiceRules(rules);
 if(rules.profile==='bch-games-v1')return bchGamesDiceStats(diceThreshold(rules.chanceBps,rules.mode)/100,rules.mode);
 const probability=rules.chanceBps/DICE_OUTCOMES,rtp=1-rules.houseEdge;
 return {probability,rtp,multiplier:rtp/probability,threshold:diceThreshold(rules.chanceBps,rules.mode),variance:rtp*rtp*(1-probability)/probability};
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
/** Only the illustrative grid rejects uint32 tails; BCH.games follows its published float mapping. */
export function drawDiceForRules(rules:DiceRules,next32:()=>number=()=>crypto.getRandomValues(new Uint32Array(1))[0]):number{
 validateDiceRules(rules);
 return rules.profile==='bch-games-v1'?bchGamesDiceFromWord(next32()).ticks:drawDiceRoll(next32);
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
 const threshold=stats.threshold,checkpoints=[...new Set(Array.from({length:51},(_,i)=>Math.floor(i*c.bets/50)))];
 const paths=checkpoints.map(()=>[] as number[]),samples:number[][]=[],endings:number[]=[];
 let stopped=0,profitable=0,completedBets=0,wagered=0,returned=0;
 for(let session=0;session<c.sessions;session++){
  let balance=c.bankroll,index=1;
  const sample:number[]=[balance];paths[0].push(balance);
  for(let n=1;n<=c.bets;n++){
   if(balance+c.bet*1e-12<c.bet)break;
   const roll=c.profile==='bch-games-v1'?Math.floor(rng.next32()/2**32*10000):drawDiceRoll(rng.next32),won=c.mode==='under'?roll<threshold:roll>threshold;
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
