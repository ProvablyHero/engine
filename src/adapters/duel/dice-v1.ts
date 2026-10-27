import {assertSeed} from '../../core/input.ts';
import {toHex} from '../../core/crypto.ts';
import {duelSeedBytes} from './seed.ts';

/** Captured Duel Dice code and thirteen disclosed outcomes, 2026-10-27.
 * Result replay only. Payout tiers, cashback and settlement are separate.
 */
export const DUEL_DICE_V1={id:'duel-dice-v1',operator:'duel',game:'dice',algorithmVersion:'v1',status:'verified'} as const;
export const DUEL_DICE_MAX_FAIR=0xffffffff-(0xffffffff%10001);
export function duelDiceFromHash(hash:string){
 if(typeof hash!=='string'||!/^[a-f0-9]{64}$/i.test(hash))throw new RangeError('Expected a SHA-256 hex digest');
 const words=[];
 for(let wordIndex=0;wordIndex<8;wordIndex++){
  const word=Number.parseInt(hash.slice(wordIndex*8,wordIndex*8+8),16);
  const accepted=word<DUEL_DICE_MAX_FAIR;
  words.push({wordIndex,word,accepted});
  if(accepted){const ticks=word%10001;return {ticks,value:ticks/100,wordIndex,words};}
 }
 throw new RangeError('No unbiased Dice value in this digest');
}
export async function duelDiceRoll(serverSeed:string,clientSeed:string,nonce:number){
 if(!Number.isSafeInteger(nonce)||nonce<0)throw new RangeError('Invalid Duel Dice nonce');
 assertSeed(clientSeed);
 const key=await crypto.subtle.importKey('raw',duelSeedBytes(serverSeed),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const message=`${clientSeed}:${nonce}`;
 const hash=toHex(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(message))));
 return {...duelDiceFromHash(hash),hash,message};
}
