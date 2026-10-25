import{floats}from'../../core/floats.ts';
/** Stake's documented first HMAC fraction, with the captured fairness client's
 * floor(float * 10001) / 100 conversion. Reference only: no disclosed Dice round.
 * Payout display arithmetic and server settlement are separate from this replay.
 */
export const STAKE_DICE_V1={id:'stake-dice-v1',operator:'stake',game:'dice',algorithmVersion:'v1',status:'reference'}as const;
export function stakeDiceFromWord(word:number):{ticks:number;value:number}{
 if(!Number.isInteger(word)||word<0||word>0xffffffff)throw new RangeError('Invalid uint32');
 const ticks=Math.floor(word/2**32*10001);return{ticks,value:ticks/100};
}
export async function stakeDiceRoll(serverSeed:string,clientSeed:string,nonce:number):Promise<{ticks:number;value:number}>{
 const[float]=await floats(serverSeed,clientSeed,nonce,1);const ticks=Math.floor(float*10001);return{ticks,value:ticks/100};
}
