import assert from 'node:assert/strict';import {persistenceBrowser} from './helpers/persistence-browser.mjs';
const {browser,page}=await persistenceBrowser();try{
 const first=await page.evaluate(async()=>{const {createPersistenceJournal,indexedPersistenceStorage}=await import('/src/persistence-journal.mjs');const j=createPersistenceJournal({ownerId:'a'});const c=await j.stage({kind:'track',localId:'track-local-1',payload:{name:'First'}});const storage=indexedPersistenceStorage();let aborted=false;try{await storage.update(JSON.stringify(['owner','a']),s=>{s.commands=[];throw Error('aborted');});}catch{aborted=true;}storage.close();const other=createPersistenceJournal({ownerId:'b'});return {c,aborted,remaining:(await j.pending()).length,other:(await other.pending()).length};});
 assert.equal(first.aborted,true);assert.equal(first.remaining,1);assert.equal(first.other,0);
 await page.reload();const restored=await page.evaluate(async()=>{const {createPersistenceJournal}=await import('/src/persistence-journal.mjs');return createPersistenceJournal({ownerId:'a'}).pending();});assert.equal(restored[0].commandId,first.c.commandId);assert.equal(restored[0].id,first.c.id);
 console.log('PASS IndexedDB: atomic abort, owner isolation, reload preserves pending payload/command and identity.');
}finally{await browser.close();}
