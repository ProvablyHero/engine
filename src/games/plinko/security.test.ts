import {test} from 'node:test';
import assert from 'node:assert/strict';
import {atLeastOnce, dropsFor, bankrollOutlook} from './stats.ts';
import {simulate, convergence} from '../../sim/plinko.ts';
test('probability domains and boundary cases',()=>{
 assert.throws(()=>atLeastOnce(.5,-1),RangeError);
 assert.throws(()=>atLeastOnce(NaN,1),RangeError);
 assert.equal(atLeastOnce(1,0),0);
 assert.equal(dropsFor(0,0),0);
 assert.throws(()=>dropsFor(.5,2),RangeError);
 assert.throws(()=>bankrollOutlook([1,1],1,-1,1),RangeError);
 assert.ok(atLeastOnce(1e-18,1)>0);
});
test('simulation rejects unsupported tables and invalid convergence loops',()=>{
 assert.throws(()=>simulate({multipliers:new Array(34).fill(1),bet:1,bankroll:10,sessions:1,dropsPerSession:1,seed:'x'}),RangeError);
 assert.throws(()=>convergence([1,1],'x',[10,5]),RangeError);
});

import { settleDemo, demoDrop, verifyDemoDrop } from './demo.ts';
import {sha256Hex} from '../../core/crypto.ts';
test('small demo losses reduce the balance and accounting reconciles',()=>{
 let balance=1000,returned=0;
 for(let i=0;i<100;i++){const s=settleDemo(balance,.01,.5);balance=s.balance;returned+=s.payout;}
 assert.ok(Math.abs(balance-999.5)<1e-9);
 assert.ok(Math.abs(balance-(1000-1+returned))<1e-9);
 assert.throws(()=>settleDemo(1000,.001,1),RangeError);
});
test('demo replay verifies commitment, slot, multiplier and payout',async()=>{
 const seed='server',m=new Array(9).fill(.5),drop=await demoDrop(seed,'client',0,8);
 const row={seedHash:await sha256Hex(seed),clientSeed:'client',nonce:0,rows:8,slot:drop.slot,multiplier:.5,bet:.01,payout:.005};
 assert.equal(await verifyDemoDrop(seed,row,m),true);
 assert.equal(await verifyDemoDrop(seed,{...row,multiplier:100},m),false);
 assert.equal(await verifyDemoDrop(seed,{...row,payout:1},m),false);
 assert.equal(await verifyDemoDrop('wrong',row,m),false);
});
