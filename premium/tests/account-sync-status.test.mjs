import {test} from 'node:test';import assert from 'node:assert/strict';
import {AccountSyncStatus,AccountSyncPanel} from '../src/account-sync-screen.mjs';
test('healthy and transient sync states do not create a banner',()=>{
 for(const v of [null,{state:'online'},{state:'syncing'},{state:'deferred'}])assert.equal(AccountSyncStatus(v),'');
});
test('pending, offline and failed saves retain an accessible route to details',()=>{
 for(const state of ['pending','offline','conflict','error']){
  const html=AccountSyncStatus({state});assert.match(html,/href="\/profile\/sync"/);assert.match(html,/role="status"/);assert.ok(html.includes(`data-sync-state="${state}"`));
 }
 assert.match(AccountSyncPanel({state:'online'}),/Compte à jour/);
 assert.match(AccountSyncPanel({state:'error',errors:['Erreur réseau']}),/Erreur réseau/);
});

test('deferred retrieval stays available in account details without a page banner',()=>{assert.equal(AccountSyncStatus({state:'deferred'}),'');assert.match(AccountSyncPanel({state:'deferred'}),/Données en ligne à récupérer/);});
