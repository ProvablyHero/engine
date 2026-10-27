import {sha256Hex} from '../../core/crypto.ts';
export const DUELBITS_DICE_V1={id:'duelbits-dice-v1',operator:'duelbits',game:'dice',algorithmVersion:'v1',status:'reference'} as const;
export const DUELBITS_PLINKO_V1={id:'duelbits-plinko-v1',operator:'duelbits',game:'plinko',algorithmVersion:'v1',status:'reference'} as const;
/** Published ticket algorithms. No disclosed operator rounds are available.
 * Plinko only reproduces the published ticket, not the current v2 path or slot.
 * Preserve the operator's modulo mapping, including its slight uint32 bias.
 */
export function duelbitsTicketFromHash(hash:string,game:'plinko'|'dice'){
 if(typeof hash!=='string'||!/^[a-f0-9]{64}$/i.test(hash)||!['plinko','dice'].includes(game))throw new RangeError('Invalid Duelbits hash or game');
 const word=Number.parseInt(hash.slice(0,8),16),ticket=word%(game==='dice'?10000:65535);
 return {word,ticket};
}
export async function duelbitsReplay(serverSeed:string,clientSeed:string,nonce:number,game:'plinko'|'dice'){
 if(typeof serverSeed!=='string'||!/^[a-f0-9]{64}$/i.test(serverSeed)||typeof clientSeed!=='string'||clientSeed.length<1||clientSeed.length>128||!/^[\x20-\x7e]+$/.test(clientSeed)||!Number.isSafeInteger(nonce)||nonce<0||!['plinko','dice'].includes(game))throw new RangeError('Invalid Duelbits replay inputs');
 const message=`${serverSeed}:${clientSeed}:${nonce}`,hash=await sha256Hex(message);
 return {...duelbitsTicketFromHash(hash,game),hash,message,serverSeedHash:await sha256Hex(serverSeed)};
}
export async function duelbitsDiceRoll(serverSeed:string,clientSeed:string,nonce:number){
 const r=await duelbitsReplay(serverSeed,clientSeed,nonce,'dice');return {...r,ticks:r.ticket,value:r.ticket/100};
}
export async function duelbitsPlinkoTicket(serverSeed:string,clientSeed:string,nonce:number){return duelbitsReplay(serverSeed,clientSeed,nonce,'plinko');}
