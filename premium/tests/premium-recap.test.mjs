import test from 'node:test';
import assert from 'node:assert/strict';
import {createPremiumWelcome,PremiumRecap} from '../src/premium-recap.mjs';
const active={entitlement_valid:true,entitlement:'premium'};
test('welcome requires verified Premium access and waits for a safe screen',()=>{
 const w=createPremiumWelcome();
 assert.equal(w.visible({ownerId:'a',access:active,verified:false,route:'/'}),false);
 for(const route of ['/operational/missions/one','/coaching/session','/track-builder','/auth/login'])assert.equal(w.visible({ownerId:'a',access:active,verified:true,route}),false);
 assert.equal(w.visible({ownerId:'a',access:active,verified:true,route:'/'}),true);
 assert.equal(w.visible({ownerId:'a',access:{...active,entitlement_valid:false},verified:true,route:'/'}),false);
});
test('dismissal is persistent per account and cannot dismiss another signed-in account',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const w=createPremiumWelcome({storage});
 assert.equal(w.dismiss('a','b'),false);
 assert.equal(w.dismiss('a','a'),true);
 const next=createPremiumWelcome({storage});
 assert.equal(next.visible({ownerId:'a',access:active,verified:true,route:'/'}),false);
 assert.equal(next.visible({ownerId:'b',access:active,verified:true,route:'/'}),true);
});
test('Live is prominent and accurately distinguished from Premium tools',()=>{
 const html=PremiumRecap({welcome:true,ownerId:'<account>'});
 assert.ok(html.indexOf('Live')<html.indexOf('Tracés intelligents'));
 for(const path of ['/live','/track-builder?tool=smart','/jumolf'])assert.ok(html.includes('href="'+path+'"'));
 assert.match(html,/Premium actif requis pour diffuser et regarder/);
 assert.doesNotMatch(html,/sans Premium/);
 assert.match(html,/amis autorisés/);
 assert.match(html,/consentements/);
 assert.ok(!html.includes('data-premium-owner="<account>"'));
 assert.ok(!PremiumRecap().includes('data-premium-dismiss'));
});
