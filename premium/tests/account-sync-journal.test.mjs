import test from 'node:test';import assert from 'node:assert/strict';
import {createPersistenceJournal} from '../src/persistence-journal.mjs';
const disk=()=>{let state;return {async update(k,f){state=f(structuredClone(state));return structuredClone(state);}};};
const record=(c,revision=1)=>({schemaVersion:1,kind:c.kind,id:c.id,revision,updatedAt:new Date().toISOString(),deletedAt:null,payload:c.payload});
test('automatic scans persist one command until data changes, including after reload',async()=>{
 const storage=disk(),a=createPersistenceJournal({ownerId:'a',storage}),input={kind:'track',localId:'t',payload:{name:'Piste'}};
 const first=await a.stageChanged(input);assert.ok(first.commandId);assert.equal(await a.stageChanged(input),null);
 const b=createPersistenceJournal({ownerId:'a',storage});assert.equal(await b.stageChanged(input),null);assert.equal((await b.pending())[0].commandId,first.commandId);
 await b.acknowledge({commandId:first.commandId,record:record(first)});assert.equal(await b.stageChanged(input),null);
 assert.equal((await b.stageChanged({...input,payload:{name:'Renommée'}})).expectedRevision,1);
});
test('conflict choice preserves old local commands and uses a new command with latest revision',async()=>{
 const j=createPersistenceJournal({ownerId:'a',storage:disk()}),c=await j.stage({kind:'track',localId:'t',payload:{name:'Locale'}});
 await j.markConflict(c);await j.resolveLocal({record:{...record(c,2),payload:{name:'Distante'}},kind:'track',localId:'t',payload:{name:'Dernière locale'}});
 const next=(await j.pending())[0];assert.equal(next.expectedRevision,2);assert.notEqual(next.commandId,c.commandId);assert.equal(next.payload.name,'Dernière locale');assert.equal((await j.snapshot()).recovery.length,1);
});
test('hiding a local copy survives reload without deleting anything remotely',async()=>{
 const storage=disk(),j=createPersistenceJournal({ownerId:'a',storage}),c=await j.stage({kind:'track',localId:'t',payload:{name:'Piste'}});
 await j.acknowledge({commandId:c.commandId,record:record(c)});await j.hide({kind:'track',id:c.id});
 assert.ok((await createPersistenceJournal({ownerId:'a',storage}).snapshot()).hidden.includes('track:'+c.id));assert.equal((await j.pending()).length,0);
});
