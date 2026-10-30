import test from 'node:test';import assert from 'node:assert/strict';import {readFile,mkdtemp,writeFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import os from 'node:os';import path from 'node:path';
import {createOperationalMissionStore} from '../src/operational-missions.mjs';
const uid='11111111-1111-4111-8111-111111111111',dog='22222222-2222-4222-8222-222222222222',ops='33333333-3333-4333-8333-333333333333';
export function fixture(){const retrospective={interventionDate:'2026-10-28',recordedAt:'2026-10-29T18:00:00Z',searchOutcome:{code:'positive',context:'search',updatedAt:'2026-10-29T18:00:00Z'},gpx:{name:'QA',fileName:'qa.gpx',coordinates:[[7,48,null,0],[7.001,48.001,null,0],[8,49,null,1],[8.001,49.001,null,0]]}};
 const mission=createOperationalMissionStore({ownerId:uid,idFactory:()=>ops}).createRetrospective({dog:{id:dog,name:'QA'},handler:{id:uid,name:'QA'},retrospective});
 const rows=[{id:dog,kind:'dog',payload:{name:'QA'},schema_version:1,revision:1},{id:ops,kind:'ops',payload:mission,schema_version:1,revision:1}];
 const admin={from(table){const filters={};return {select(){return this},eq(k,v){filters[k]=v;return this},contains(){return this},gt(){return this},order(){return this},async limit(){return {data:table==='v2_personal_records'?rows.filter(r=>r.kind===filters.kind):[]}}}}};return {admin,uid,rows,mission};}
test('packaged export code carries current retrospective geometry and preserves deployed entry and unrelated services',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'piste-export-package-')),input=path.join(dir,'input.json'),output=path.join(dir,'output.json');
 const entry="import webpush from 'npm:web-push@3.6.7'; // deployed push/social flags preserved";
 await writeFile(input,JSON.stringify({slug:'coaching',verify_jwt:false,files:[{name:'index.ts',content:entry},{name:'src/server/coaching-http.mjs',content:'unchanged handler'},{name:'src/server/unrelated.mjs',content:'keep'}]}));
 execFileSync(process.execPath,[new URL('../scripts/prepare-audit-exports-edge.mjs',import.meta.url).pathname,input,output]);
 const pkg=JSON.parse(await readFile(output)),files=new Map(pkg.files.map(f=>[f.name,f.content]));assert.equal(files.get('index.ts'),entry);assert.equal(files.get('src/server/coaching-http.mjs'),'unchanged handler');assert.equal(files.get('src/server/unrelated.mjs'),'keep');assert.equal(pkg.verify_jwt,false);assert.equal(pkg.project_id,'shnwqdkiapgcftbnhilh');
 assert.match(files.get('src/account-analysis-sources.mjs'),/retrospectivePoints/);assert.ok(files.has('src/operational-retrospective.mjs'));assert.ok(files.has('src/iso-timestamp.mjs'));
 for(const [name,content] of files)if(name.endsWith('.mjs')&&name!=='src/server/unrelated.mjs'&&name!=='src/server/coaching-http.mjs'){const p=path.join(dir,name);await import('node:fs/promises').then(fs=>fs.mkdir(path.dirname(p),{recursive:true}).then(()=>fs.writeFile(p,content)));}
 const {exportAccountData}=await import('file://'+path.join(dir,'src/server/data-exports-service.mjs'));
 const f=fixture(),file=await exportAccountData({...f,capabilities:{permissions:{}},body:{domain:'ops',format:'gpx'}});assert.equal((file.content.match(/<trkseg>/g)||[]).length,2);assert.equal((file.content.match(/<trkpt /g)||[]).length,4);assert.ok(!file.content.includes('<time>'));
});
import {exportAccountData} from '../src/server/data-exports-service.mjs';
import {serializeDataExport} from '../src/data-exports.mjs';
test('OPS analysis export keeps imported result then honors the personal annotation on the original mission id',async()=>{
 const f=fixture(),send=format=>exportAccountData({...f,capabilities:{permissions:{}},body:{domain:'ops',format}});
 let row=JSON.parse((await send('json')).content).sessions[0];assert.equal(row.searchOutcome?.code,'positive');assert.equal(row.provenance.trace,'gpx_import');assert.equal(row.metrics.durationSeconds,undefined);
 f.rows.push({id:'44444444-4444-4444-8444-444444444444',kind:'session-dog-link',payload:{sessionId:'ops:'+f.mission.id,searchOutcome:{code:'negative',context:'interrupted',updatedAt:'2026-10-30T08:00:00Z'}},schema_version:1,revision:1});
 row=JSON.parse((await send('json')).content).sessions[0];assert.equal(row.searchOutcome.code,'negative');assert.equal(row.searchOutcome.context,'interrupted');
 const csv=(await send('csv')).content;assert.match(csv,/search_outcome_code/);assert.match(csv,/"negative";"Négatif";"interrupted"/);
});
test('older analysis rows export explicit unreported without a fabricated result or timestamp',()=>{
 const file=serializeDataExport({domain:'coaching',format:'csv',rows:[{id:'old'}]});assert.match(file.content,/"unreported";"Non renseigné";"";""/);
});
test('JUMOLF export does not retain outcomes when dog history consent is off',async()=>{
 const f=fixture(),file=await exportAccountData({...f,capabilities:{jumolf_entitlement:{entitlement:'premium'},permissions:{}},body:{domain:'jumolf',format:'json',consents:{dog_history:false}}});assert.equal(JSON.parse(file.content).sessions[0].searchOutcome,null);
});
test('Coaching result-only annotations reach JSON and CSV even without a dog link',async()=>{
 const f=fixture(),{createRemoteSession}=await import('../src/server/coaching-service.mjs');const state=createRemoteSession({id:'shared',owner:{id:f.uid,name:'QA'},role:'traceur',mode:'full_blind',dogName:'QA',now:100000});state.search.phase='ARCHIVED';
 f.rows.push({id:'55555555-5555-4555-8555-555555555555',kind:'session-dog-link',payload:{sessionId:'shared',searchOutcome:{code:'oriented_not_found',context:'search',updatedAt:'2026-10-30T08:00:00Z'}},schema_version:1,revision:1});
 const original=f.admin.from;f.admin.from=table=>table==='coaching_remote_sessions'?{select(){return this},contains(){return this},order(){return this},limit:async()=>({data:[{id:'shared',state}]})}:original(table);
 const json=await exportAccountData({...f,capabilities:{permissions:{}},body:{domain:'coaching',format:'json'}});assert.equal(JSON.parse(json.content).sessions[0].searchOutcome.code,'oriented_not_found');
 const csv=await exportAccountData({...f,capabilities:{permissions:{}},body:{domain:'coaching',format:'csv'}});assert.match(csv.content,/Orienté sans découverte/);
});
