import {floats} from '../../core/floats.ts';

/** Published BCH.games Dice code, captured 2026-10-25. Verified against disclosed
 * rounds including a hash recorded at zero bets before round 11807972487.
 * This scope does not certify currency settlement or other operator games.
 */
export const BCH_GAMES_DICE_V1={id:'bch-games-dice-v1',operator:'bch-games',game:'dice',algorithmVersion:'v1',status:'verified',houseEdge:.02} as const;
export type BchDiceMode='under'|'over';
export function bchGamesDiceFromWord(word:number):{ticks:number;value:number}{
 if(!Number.isInteger(word)||word<0||word>0xffffffff)throw new RangeError('Invalid uint32');
 const ticks=Math.floor(word/2**32*10000);
 return {ticks,value:ticks/100};
}
export async function bchGamesDiceRoll(serverSeed:string,clientSeed:string,nonce:number):Promise<{ticks:number;value:number}>{
 const [float]=await floats(serverSeed,clientSeed,nonce,1);
 const ticks=Math.floor(float*10000);
 return {ticks,value:ticks/100};
}
/** The client accepts targets to two decimals, with a rounded four-decimal payout. */
export function bchGamesDiceStats(target:number,mode:BchDiceMode){
 const ticks=Math.round(target*100);
 if(!Number.isFinite(target)||Math.abs(target*100-ticks)>1e-8||!['under','over'].includes(mode)||(mode==='under'?(ticks<1||ticks>9799):(ticks<200||ticks>9998)))throw new RangeError('Unsupported BCH.games target');
 const winningOutcomes=mode==='under'?ticks:9999-ticks;
 // Match the published JS operations (including its floor/round order).
 const nominalProbability=Math.floor((mode==='under'?target:99.99-target)/99.99*10000)/10000;
 const multiplier=Math.round((100/(nominalProbability*100)*(1-.02))*10000)/10000;
 // The first fraction has exactly 2^32 possible values, not an exactly uniform decimal grid.
 const words=2**32;
 const probability=mode==='under'?Math.ceil(ticks*words/10000)/words:(words-Math.ceil((ticks+1)*words/10000))/words;
 const rtp=probability*multiplier;
 return {threshold:ticks,winningOutcomes,nominalProbability,probability,multiplier,rtp,variance:probability*(1-probability)*multiplier**2};
}
export function bchGamesDiceWins(ticks:number,target:number,mode:BchDiceMode):boolean{
 if(!Number.isInteger(ticks)||ticks<0||ticks>9999)throw new RangeError('Invalid Dice result');
 const stats=bchGamesDiceStats(target,mode);
 return mode==='under'?ticks<stats.threshold:ticks>stats.threshold;
}
