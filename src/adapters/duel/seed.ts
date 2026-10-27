import {toHex} from '../../core/crypto.ts';

/** Duel's disclosed seed is a 32-byte hex key, not a UTF-8 HMAC password. */
export function duelSeedBytes(seed: string){
 if(typeof seed!=='string'||!/^[a-f0-9]{64}$/i.test(seed))throw new RangeError('Duel server seed must be exactly 64 hexadecimal characters');
 const bytes=new Uint8Array(32);
 for(let i=0;i<bytes.length;i++)bytes[i]=Number.parseInt(seed.slice(i*2,i*2+2),16);
 return bytes;
}
export async function duelServerSeedHash(seed:string):Promise<string>{
 return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256',duelSeedBytes(seed))));
}
