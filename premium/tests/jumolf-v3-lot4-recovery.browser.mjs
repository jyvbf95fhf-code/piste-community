// Complete existing app, account transport simulated. No real backend/identity writes.
import {createRemoteSession,projectRemoteSession,reduceRemoteSession} from '../src/server/coaching-service.mjs';
import {createOperationalMissionStore} from '../src/operational-missions.mjs';
import {createTrackLibrary} from '../src/track-library.mjs';
import {createSharedSessionIndex} from '../src/consolidated-session-index.mjs';
import {coachingGeneratedTrackState} from '../src/coaching-shared-wizard.mjs';
import {createDogsStore} from '../src/dogs.mjs';
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname),ownerId='11111111-1111-4111-8111-111111111111';
const gps={provenance:'device-geolocation',startedAt:1792150000000,endedAt:1792150060000,elapsedMs:60000,distanceM:24,segments:[[{latitude:48,longitude:7,timestamp:1792150000000},{latitude:48.0001,longitude:7,timestamp:1792150001000}],[{latitude:49,longitude:8,timestamp:1792150060000}]]};
const projection={mode:'normal',terrain:'forêt',team:[{id:ownerId,role:'driver'}],weatherSnapshot:{weather:{temperature_c:15,humidity_pct:80,wind_speed_kmh:3,wind_direction_deg:90,provenance:'measured'}},id:'real-coaching',phase:'ARCHIVED',version:1,role:'driver',dog:'Ninja QA',search:gps,pose:gps,searchActiveMs:30000,events:[{type:'Rupture',at:1792150001000}],notes:[]};
const saved=new Map(),dogStore=createDogsStore({ownerId,storage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},idFactory:(()=>{let n=0;return ()=>['a','b','c'][n++];})()});dogStore.create({name:'Ninja QA',breed:'Malinois'});dogStore.create({name:'Ninja QA',breed:'Berger allemand'});dogStore.create({name:'Sans séances',breed:'Malinois'});
const projections=[...Array.from({length:2},(_,i)=>({...projection,id:'history-'+i,dogRef:{id:'dog-a',ownerId},search:{...gps,startedAt:gps.startedAt-(i+1)*86400000,distanceM:40+i*20},searchActiveMs:40000+i*10000,pose:{...gps,endedAt:gps.startedAt-(i+1)*86400000-3600000}})),{...projection,id:'real-coaching',pose:{...gps,endedAt:gps.startedAt-3600000},dogRef:{id:'dog-a',ownerId}},{...projection,id:'second-coaching',dogRef:{id:'dog-b',ownerId}},{...projection,id:'unlinked-coaching'}];
let now=Date.parse('2026-10-10T10:00:00Z');let next=0;
const ops=createOperationalMissionStore({ownerId,storage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},idFactory:()=> 'science-ops-'+(++next),clock:()=>now});
for(let i=0;i<3;i++){now=Date.parse('2026-10-'+(10+i)+'T10:00:00Z');const id=ops.createDraft({dog:{id:'dog-a',name:'Ninja QA'},handler:{id:ownerId,name:'Conducteur'}}).id;ops.enableGps(id,ownerId);ops.startTracking(id);const fix=()=>({timestamp:now,coords:{latitude:48,longitude:7+(now%86400000)/100000000,accuracy:5}});ops.appendGpsPoint(id,fix());now+=10000;ops.addGpsEvent(id,{type:'Rupture',position:fix()});now+=10000;ops.addGpsEvent(id,{type:'Reprise',position:fix()});now+=(i+1)*10000;ops.appendGpsPoint(id,fix());ops.stopTracking(id);ops.complete(id);ops.archive(id);}
const mode=process.env.PISTE_LOT4_FAILURE_MODE||'reconnect';let failRead=false,failReference=mode==='reference';
const storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
const plan={version:1,id:'recovery-plan',ownerId,dogId:'dog-a',createdAt:'2026-10-20T12:00:00Z',level:'initiation',skill:'motivation',objective:'Observer sans diagnostic',criteria:['Noter les aides'],instructions:['Adapter au chien'],observations:['Observer'],limits:['Préparation déclarée'],parameters:{distanceM:130,turns:0},schedule:null,weather:null};
const library=createTrackLibrary({ownerId,storage}),track=library.createPrepared({name:'Piste QA récupération',dogId:'dog-a',geometry:{points:[{space:'wgs84',x:7,y:48},{space:'wgs84',x:7.001,y:48.001}]},trainingMemory:plan});
const registry=createSharedSessionIndex({ownerId,storage});registry.saveTrainingDraft(coachingGeneratedTrackState({ownerId,dogs:dogStore.list(),dogId:'dog-a',track}));
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
let remoteState=null,authorized=true,created=null,createPayload=null,coachingAllowed=true;let weatherMode='available',weatherCalls=0,satelliteTiles=0;const tileCache=new Map(),calls=[];const grant={entitlement:'premium',source:'subscription',source_id:'qa-only',granted_at:new Date(Date.now()-60000).toISOString(),expires_at:null,revoked_at:null};
try{const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
await context.addInitScript(entries=>{for(const [k,v] of entries)localStorage.setItem(k,v);},[...saved]);
await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());
 if(url.hostname==='shnwqdkiapgcftbnhilh.supabase.co'){const b=req.method()==='POST'?req.postDataJSON():{};calls.push(b.operation);
 if(!url.pathname.endsWith('/coaching'))return route.fulfill({json:{records:[]}});
 if(b.operation==='authorize-feature'&&!authorized)return route.fulfill({status:403,json:{error:'Accès JUMOLF révoqué.'}});
 if(b.operation==='profile'&&!coachingAllowed)return route.fulfill({status:403,json:{error:'Accès Coaching non autorisé.'}});
 let json={};if(b.operation==='profile')json={id:ownerId,name:'Compte développeur QA',qa:false,permissions:{research:authorized},jumolf_entitlement:authorized?grant:{entitlement:'none'}};
 else if(b.operation==='list')json={sessions:[...projections,...(created?[created]:[])]};
 else if(b.operation==='create'){createPayload=b.payload;assert.deepEqual(Object.keys(b.payload).sort(),['dogName','mode','role','scenario','traceType']);failRead=mode==='reconnect';remoteState=createRemoteSession({id:b.sessionId,owner:{id:ownerId,name:'Compte développeur QA'},...b.payload,now:Date.now()});created=projectRemoteSession(remoteState,ownerId);json={projection:created};}
 else if(b.operation==='command'){if(failReference){failReference=false;return route.fulfill({status:503,json:{error:'QA : référence temporairement indisponible'}});}remoteState=reduceRemoteSession(remoteState,{userId:ownerId,type:b.type,payload:b.payload,now:Date.now()});created=projectRemoteSession(remoteState,ownerId);json={projection:created};}
 else if(b.operation==='read'&&failRead){failRead=false;return route.fulfill({status:503,json:{error:'QA : reconnexion temporairement indisponible'}});}
 else if(b.operation==='read')json={projection:created?.id===b.sessionId?created:projections.find(p=>p.id===b.sessionId)||null};
 else if(b.operation==='invitations')json={invitations:[]};else if(b.operation==='notifications')json={notifications:[]};
 else if(b.operation==='contacts')json={contacts:[]};else if(b.operation==='coaching-inbox')json={invitations:[],notifications:[]};else assert.ok(['authorize-feature'].includes(b.operation),'unexpected operation '+b.operation);
 return route.fulfill({json});}
 if(url.hostname==='geo.api.gouv.fr')return route.fulfill({json:[{nom:'Epfig',code:'67125',centre:{coordinates:[7.4675,48.3485]},departement:{nom:'Bas-Rhin'}}]});
 if(url.pathname==='/api/track-network'){assert.equal(req.headers().authorization,'Bearer qa');return route.fulfill({body:await readFile(path.join(root,'tests/fixtures/epfig-smart-network.json')),contentType:'application/json'});}
 if(url.origin!=='https://science.test')return route.abort();
 if(url.pathname==='/src/vendor/supabase-client.mjs')return route.fulfill({contentType:'text/javascript',body:`export function createClient(url){const user={id:'${ownerId}'};return {supabaseUrl:url,channel(){return {on(){return this;},subscribe(cb){cb('SUBSCRIBED');return this;}};},removeChannel:async()=>{},auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user,access_token:'qa'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})}};}`});
 const pathname=/\.(mjs|js|css|png|svg|html)$/.test(url.pathname)?url.pathname:'/index.html';try{return route.fulfill({body:await readFile(path.join(root,pathname)),contentType:/\.(mjs|js)$/.test(pathname)?'text/javascript':pathname.endsWith('.css')?'text/css':pathname.endsWith('.html')?'text/html':pathname.endsWith('.svg')?'image/svg+xml':undefined});}catch{return route.fulfill({status:404,body:''});}
});



await page.goto('https://science.test/new-session');await page.locator('[data-wizard-step="mode"]').waitFor();
await page.locator('[data-coaching-choice="mode"][data-value="normal"]').click();await page.locator('[data-coaching-choice="trackingScenario"][data-value="self_trace"]').click();
for(const step of ['prepare','dog','roles','review']){await page.locator('[data-coaching="next"]').click();await page.locator('[data-wizard-step="'+step+'"]').waitFor();}
await page.locator('[data-coaching="create"]').click();
if(mode==='reconnect'){
 await page.locator('[data-remote-opening] [data-remote="retry-open"]').waitFor();
 assert.equal(await page.locator('[data-coaching="create"]').count(),0,'a consumed wizard must not reappear after failed reconnect');
 await page.locator('[data-remote="retry-open"]').click();
}else await page.waitForFunction(()=>document.querySelector('[data-remote-status]')?.textContent.includes('temporairement indisponible'));
await page.locator('[data-remote-session-id]').waitFor({state:'attached'});
assert.equal(calls.filter(c=>c==='create').length,1);
const persisted=await page.evaluate(owner=>JSON.parse(localStorage.getItem('piste-v2-session-dogs:'+owner)),ownerId);
assert.equal(persisted.trainingDraft,undefined);assert.equal(persisted.links[created.id].trainingMemory.id,'recovery-plan');
// Retry the reference using the existing session menu, without another creation.
await page.locator('.shared-session-menu[data-remote="open-session"]').click();
const form=page.locator('[data-remote-form="prepared"]');await form.locator('[name="trackId"]').selectOption(track.id);await form.locator('button').click();
await page.waitForFunction(()=>document.querySelector('[data-remote-session-id]')?.getAttribute('data-remote-version')==='1');
assert.ok(remoteState.session.preparation?.geometry.points.length>=2);assert.equal(calls.filter(c=>c==='create').length,1);assert.deepEqual(errors,[]);
console.log(JSON.stringify({passed:true,mode,oneSession:true,consumedWizard:true,existingReferenceRecovery:true}));await context.close();
}finally{await browser.close();}
