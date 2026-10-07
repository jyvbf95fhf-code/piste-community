import test from 'node:test';
import assert from 'node:assert/strict';
import { createScientificConsentStore } from '../src/scientific-consent-store.mjs';

const self={userId:'user-demo',role:'contributor'},clock=()=>new Date('2026-10-07T10:00:00.000Z');

test('category choices are independent and append-only with versioned events',()=>{
 const store=createScientificConsentStore({mockUserId:self.userId,clock});
 store.setParticipation(self,true);
 store.setCategory(self,'weather',true);
 store.setOpsCategory(self,'track_age',true);
 const snapshot=store.snapshot(),history=store.history();
 assert.equal(snapshot.status,'partial');
 assert.equal(snapshot.categories.weather,true);
 assert.equal(snapshot.categories.gps_trace,false);
 assert.equal(snapshot.opsCategories.track_age,true);
 assert.equal(snapshot.opsCategories.weather,false);
 assert.equal(history.length,3);
 assert.ok(history.every(event=>event.version==='scientific-consent-v1'));
 history.pop();
 assert.equal(store.history().length,3);
});

test('withdrawal turns off all categories and retains prior events',()=>{
 const store=createScientificConsentStore({mockUserId:self.userId,clock});
 store.setParticipation(self,true);store.setCategory(self,'dog_metrics',true);store.setOpsCategory(self,'tracking_metrics',true);
 store.withdraw(self);
 const snapshot=store.snapshot();
 assert.equal(snapshot.status,'withdrawn');assert.equal(snapshot.participationEnabled,false);
 assert.equal(Object.values(snapshot.categories).some(Boolean),false);
 assert.equal(Object.values(snapshot.opsCategories).some(Boolean),false);
 assert.equal(store.history().length,4);
});

test('declining participation clears every previously selected category',()=>{
 const store=createScientificConsentStore({mockUserId:self.userId,clock});
 store.setParticipation(self,true);store.setCategory(self,'weather',true);store.setOpsCategory(self,'track_age',true);
 store.setParticipation(self,false);
 assert.equal(store.snapshot().status,'disabled');
 assert.equal(Object.values(store.snapshot().categories).some(Boolean),false);
 assert.equal(Object.values(store.snapshot().opsCategories).some(Boolean),false);
});

test('research roles cannot consent or change session inclusion; user exclusions are reversible only for eligible sessions',()=>{
 const store=createScientificConsentStore({mockUserId:self.userId,clock,initialSessionStates:{'session-sensitive':'excluded_sensitive'}});
 for(const actor of [{userId:'scientist',role:'researcher'},{userId:'owner',role:'scientific_owner'},{userId:'reader',role:'scientific_reader'},{userId:'someone-else',role:'contributor'}]){
 assert.throws(()=>store.setParticipation(actor,true),/consentement|autorisé/i);
 }
 store.setParticipation(self,true);
 store.setSessionInclusion(self,'session-1','excluded_by_user');
 assert.equal(store.isSessionEligible('session-1'),false);
 store.setSessionInclusion(self,'session-1','included');
 assert.equal(store.isSessionEligible('session-1'),true);
 assert.throws(()=>store.setSessionInclusion(self,'session-sensitive','included'),/éligible|système/i);
});
