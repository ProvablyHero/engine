import {hmacSha256,toHex} from '../../core/crypto.ts';
import {assertSeed,INPUT} from '../../core/input.ts';

/** ClassicDice98 capture, 2026-10-25. The current classicdice_new verifier uses
 * a sliding 53-bit window, unlike legacy Classic Dice and BCH.games Dice.
 * The captured API stores floor(slideWindowNumber(hash, 10001)) as integer cents.
 * Two disclosed rounds match. Nonce 2 has a matching pre-bet 48-hex hash
 * prefix screenshot; the complete hash was captured after the wager.
 */
export const BC_GAME_DICE_V1={id:'bc-game-dice-v1',operator:'bc-game',game:'dice',algorithmVersion:'v1',status:'verified',variant:'ClassicDice98'} as const;
export function bcGameDiceFromHash(hash:string):{ticks:number;value:number}{
 if(!/^[a-f0-9]{64}$/i.test(hash))throw new RangeError('Invalid HMAC hash');
 const offset=Number(BigInt('0x'+hash.slice(0,15))%47n);
 const word=BigInt('0x'+hash.slice(offset,offset+14))>>3n;
 const ticks=Math.floor(Number(word)*2**-53*10001);
 return {ticks,value:ticks/100};
}
export async function bcGameDiceRoll(serverSeed:string,clientSeed:string,nonce:number):Promise<{ticks:number;value:number}>{
 assertSeed(serverSeed,INPUT.serverSeed);assertSeed(clientSeed);
 if(!Number.isSafeInteger(nonce)||nonce<0)throw new RangeError('Invalid Dice nonce');
 return bcGameDiceFromHash(toHex(await hmacSha256(serverSeed,`${clientSeed}:${nonce}`)));
}
