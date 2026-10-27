import {assertSeed} from '../../core/input.ts';
import {toHex} from '../../core/crypto.ts';
import {duelSeedBytes} from './seed.ts';

/** Captured public verifier, 2026-10-27: one HMAC per row, first uint32 modulo 2.
 * Eleven observed slots and announced multipliers match after a full pre-bet
 * hash and later disclosure. Paths are computed, not independently captured.
 * Payout tier selection, cashback and currency settlement are separate checks.
 */
export const DUEL_PLINKO_V1={id:'duel-plinko-v1',operator:'duel',game:'plinko',algorithmVersion:'v1',status:'verified'} as const;
export type DuelPlinkoStep={cursor:number;message:string;hmac:string;word:number;direction:0|1};
export async function duelPlinkoReplay(serverSeed:string,clientSeed:string,nonce:number,rows:number){
 if(!Number.isSafeInteger(nonce)||nonce<0||!Number.isInteger(rows)||rows<8||rows>16)throw new RangeError('Invalid Duel Plinko nonce or rows');
 assertSeed(clientSeed);
 const key=await crypto.subtle.importKey('raw',duelSeedBytes(serverSeed),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const encoder=new TextEncoder();
 const steps:DuelPlinkoStep[]=await Promise.all(Array.from({length:rows},async(_,cursor)=>{
  const message=`${clientSeed}:${nonce}:${cursor}`;
  const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(message)));
  const word=new DataView(bytes.buffer).getUint32(0,false);
  return {cursor,message,hmac:toHex(bytes),word,direction:(word%2) as 0|1};
 }));
 const path=steps.map(step=>step.direction);
 return {path,slot:path.reduce<number>((sum,direction)=>sum+direction,0),steps};
}
export async function duelPlinkoPath(serverSeed:string,clientSeed:string,nonce:number,rows:number):Promise<{path:(0|1)[];slot:number}>{
 const {path,slot}=await duelPlinkoReplay(serverSeed,clientSeed,nonce,rows);
 return {path,slot};
}
