import {hmacSha256,toHex} from '../../core/crypto.ts';
import {assertSeed,INPUT} from '../../core/input.ts';

/** BC.Game Dice captures, 2026-10-25. The current classicdice_new verifier uses
 * a sliding 53-bit window, unlike legacy Classic Dice and BCH.games Dice.
 * ClassicDice98 uses floor(slideWindowNumber(hash, 10001)); Dice98 uses
 * parseInt(slideWindowNumber(hash, 10000)). Both APIs store integer cents.
 * Two disclosed rounds match. Nonce 2 has a matching pre-bet 48-hex hash
 * prefix screenshot; the complete hash was captured after the wager.
 */
export const BC_GAME_DICE_V1={id:'bc-game-dice-v1',operator:'bc-game',game:'dice',algorithmVersion:'v1',status:'verified',variant:'ClassicDice98'} as const;
export const BC_GAME_DICE_98_V1={id:'bc-game-dice98-v1',operator:'bc-game',game:'dice',algorithmVersion:'v1',status:'verified',variant:'Dice98'} as const;
export type BcDiceVariant='ClassicDice98'|'Dice98';
export function bcGameDiceFromHash(hash:string,variant:BcDiceVariant='ClassicDice98'):{ticks:number;value:number}{
 if(!['ClassicDice98','Dice98'].includes(variant))throw new RangeError('Unsupported BC.Game Dice variant');
 if(!/^[a-f0-9]{64}$/i.test(hash))throw new RangeError('Invalid HMAC hash');
 const offset=Number(BigInt('0x'+hash.slice(0,15))%47n);
 const word=BigInt('0x'+hash.slice(offset,offset+14))>>3n;
 const scaled=Number(word)*2**-53*(variant==='Dice98'?10000:10001);
 // Match dice.html's numeric parseInt, including JS scientific notation for tiny nonzero values.
 const ticks=variant==='Dice98'?Number.parseInt(String(scaled),10):Math.floor(scaled);
 return {ticks,value:ticks/100};
}
export async function bcGameDiceRoll(serverSeed:string,clientSeed:string,nonce:number,variant:BcDiceVariant='ClassicDice98'):Promise<{ticks:number;value:number}>{
 if(!['ClassicDice98','Dice98'].includes(variant))throw new RangeError('Unsupported BC.Game Dice variant');
 assertSeed(serverSeed,INPUT.serverSeed);assertSeed(clientSeed);
 if(!Number.isSafeInteger(nonce)||nonce<0)throw new RangeError('Invalid Dice nonce');
 return bcGameDiceFromHash(toHex(await hmacSha256(serverSeed,`${clientSeed}:${nonce}`)),variant);
}
