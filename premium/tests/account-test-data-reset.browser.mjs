import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const bundle=process.env.PISTE_CHROMIUM_PATH?null:(await import('@sparticuz/chromium')).default;
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH||await bundle.executablePath(),args:bundle?.args||['--no-sandbox'],headless:true});
const page=await browser.newPage();
await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!=='https://piste.test')return route.abort();if(url.pathname==='/')return route.fulfill({body:'<!doctype html><html><body>Account reset QA</body></html>',contentType:'text/html'});try{const body=await readFile(new URL('../'+url.pathname.slice(1),import.meta.url));await route.fulfill({body,contentType:'text/javascript'});}catch{return route.fulfill({status:404,body:''});}});
await page.goto('https://piste.test/');
try{
 const result=await page.evaluate(async()=>{
  const {inventoryAccountTestData,resetAccountTestData,ACCOUNT_TEST_RESET_TARGET}=await import('/src/account-test-data-reset.mjs');
  const {createCoachingRemoteQueue}=await import('/src/coaching-remote-queue.mjs');
  const {createPersistenceJournal,indexedPersistenceStorage}=await import('/src/persistence-journal.mjs');
  const {ownerId,email}=ACCOUNT_TEST_RESET_TARGET,key=JSON.stringify(['owner',ownerId]),otherKey=JSON.stringify(['owner','other']);
  const journal=createPersistenceJournal({ownerId}),other=createPersistenceJournal({ownerId:'other'});
  await journal.stage({kind:'profile',localId:'profile',payload:{display_name:'Seb',primary_dog_id:null}});
  await journal.stage({kind:'dog',localId:'dog',payload:{name:'Lobo'}});
  await journal.stage({kind:'track',localId:'track',payload:{name:'old track'}});
  await other.stage({kind:'track',localId:'other-track',payload:{name:'KEEP'}});
  const adapter=indexedPersistenceStorage();let before,otherBefore;
  await adapter.update(key,s=>{s.records.unknown={kind:'future-kind',payload:{keep:true}};before=structuredClone(s);return s});
  await adapter.update(otherKey,s=>{otherBefore=structuredClone(s);return s});
  localStorage.setItem('sb-project-auth-token','KEEP TOKEN');localStorage.setItem('piste-v2-jumolf-preferences:'+ownerId,'KEEP CONSENT');
  await createCoachingRemoteQueue({userId:ownerId,sessionId:'session'}).enqueue({batchId:'target',kind:'pose',points:[{lat:1,lng:2}]});
  await createCoachingRemoteQueue({userId:'other',sessionId:'session'}).enqueue({batchId:'other',kind:'pose',points:[{lat:1,lng:2}]});
  const options={storage:localStorage,indexedDB,ownerId,email,ownerVerified:true};
  const inventory=await inventoryAccountTestData(options),backup=JSON.parse(inventory.backupJson),result=await resetAccountTestData({...options,inventory,discardConfirmed:true});
  let after,otherAfter;await adapter.update(key,s=>{after=structuredClone(s);return s});await adapter.update(otherKey,s=>{otherAfter=structuredClone(s);return s});adapter.close();journal.dispose();other.dispose();
  const targetQueue=await createCoachingRemoteQueue({userId:ownerId,sessionId:'session'}).listPending(),otherQueue=await createCoachingRemoteQueue({userId:'other',sessionId:'session'}).listPending();
  return {targetQueue,otherQueue,inventory:{ok:inventory.ok,journal:inventory.journal},result,before,after,otherBefore,otherAfter,backup,auth:localStorage.getItem('sb-project-auth-token'),consent:localStorage.getItem('piste-v2-jumolf-preferences:'+ownerId)};
 });
 assert.deepEqual(result.targetQueue,[]);assert.equal(result.otherQueue[0].batchId,'other');assert.equal(result.result.removedQueueEntries,1);assert.equal(result.inventory.ok,true);assert.equal(result.result.ok,true);assert.equal(result.result.removedJournalRecords,2);assert.equal(result.result.removedJournalCommands,2);
 assert.deepEqual(result.after.identities,result.before.identities);assert.deepEqual(result.after.records.unknown,result.before.records.unknown);assert.deepEqual(result.after.commands,result.before.commands.filter(c=>c.kind==='profile'));assert.deepEqual(result.after.records['["profile","profile"]'],result.before.records['["profile","profile"]']);assert.deepEqual(result.otherAfter,result.otherBefore);assert.deepEqual(result.backup.journal,result.before);assert.equal(result.auth,'KEEP TOKEN');assert.equal(result.consent,'KEEP CONSENT');
 console.log('PASS account local reset: real IndexedDB filters target dogs/tracks; preserves profile, identities, unknown records, other account, auth and consents; backup contains original journal.');
}finally{await browser.close();}
