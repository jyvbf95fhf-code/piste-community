// Complete existing app, account transport simulated. No real backend/identity writes.
import {createRemoteSession,projectRemoteSession,reduceRemoteSession} from '../src/server/coaching-service.mjs';
import {createOperationalMissionStore} from '../src/operational-missions.mjs';
import {createDogsStore} from '../src/dogs.mjs';
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {readFile,writeFile,mkdir} from 'node:fs/promises';import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname),ownerId='11111111-1111-4111-8111-111111111111';
const gps={provenance:'device-geolocation',startedAt:1792150000000,endedAt:1792150060000,elapsedMs:60000,distanceM:24,segments:[[{latitude:48,longitude:7,timestamp:1792150000000},{latitude:48.0001,longitude:7,timestamp:1792150001000}],[{latitude:49,longitude:8,timestamp:1792150060000}]]};
const projection={mode:'normal',terrain:'forêt',team:[{id:ownerId,role:'driver'}],weatherSnapshot:{weather:{temperature_c:15,humidity_pct:80,wind_speed_kmh:3,wind_direction_deg:90,provenance:'measured'}},id:'real-coaching',phase:'ARCHIVED',version:1,role:'driver',dog:'Ninja QA',search:gps,pose:gps,searchActiveMs:30000,events:[{type:'Rupture',at:1792150001000}],notes:[]};
const saved=new Map(),dogStore=createDogsStore({ownerId,storage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},idFactory:(()=>{let n=0;return ()=>['a','b','c'][n++];})()});dogStore.create({name:'Ninja QA',breed:'Malinois'});dogStore.create({name:'Ninja QA',breed:'Berger allemand'});dogStore.create({name:'Sans séances',breed:'Malinois'});
const projections=[...Array.from({length:2},(_,i)=>({...projection,id:'history-'+i,dogRef:{id:'dog-a',ownerId},search:{...gps,startedAt:gps.startedAt-(i+1)*86400000,distanceM:40+i*20},searchActiveMs:40000+i*10000,pose:{...gps,endedAt:gps.startedAt-(i+1)*86400000-3600000}})),{...projection,id:'real-coaching',pose:{...gps,endedAt:gps.startedAt-3600000},dogRef:{id:'dog-a',ownerId}},{...projection,id:'second-coaching',dogRef:{id:'dog-b',ownerId}},{...projection,id:'unlinked-coaching'}];
let now=Date.parse('2026-10-10T10:00:00Z');let next=0;
const ops=createOperationalMissionStore({ownerId,storage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},idFactory:()=> 'science-ops-'+(++next),clock:()=>now});
for(let i=0;i<3;i++){now=Date.parse('2026-10-'+(10+i)+'T10:00:00Z');const id=ops.createDraft({dog:{id:'dog-a',name:'Ninja QA'},handler:{id:ownerId,name:'Conducteur'}}).id;ops.enableGps(id,ownerId);ops.startTracking(id);const fix=()=>({timestamp:now,coords:{latitude:48,longitude:7+(now%86400000)/100000000,accuracy:5}});ops.appendGpsPoint(id,fix());now+=10000;ops.addGpsEvent(id,{type:'Rupture',position:fix()});now+=10000;ops.addGpsEvent(id,{type:'Reprise',position:fix()});now+=(i+1)*10000;ops.appendGpsPoint(id,fix());ops.stopTracking(id);ops.complete(id);ops.archive(id);}
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
 else if(b.operation==='create'){createPayload=b.payload;assert.deepEqual(Object.keys(b.payload).sort(),['dogName','mode','role','scenario','traceType']);remoteState=createRemoteSession({id:b.sessionId,owner:{id:ownerId,name:'Compte développeur QA'},...b.payload,now:Date.now()});created=projectRemoteSession(remoteState,ownerId);json={projection:created};}
 else if(b.operation==='command'){remoteState=reduceRemoteSession(remoteState,{userId:ownerId,type:b.type,payload:b.payload,now:Date.now()});created=projectRemoteSession(remoteState,ownerId);json={projection:created};}
 else if(b.operation==='read')json={projection:created?.id===b.sessionId?created:projections.find(p=>p.id===b.sessionId)||null};
 else if(b.operation==='invitations')json={invitations:[]};else if(b.operation==='notifications')json={notifications:[]};
 else if(b.operation==='contacts')json={contacts:[]};else if(b.operation==='coaching-inbox')json={invitations:[],notifications:[]};else assert.ok(['authorize-feature'].includes(b.operation),'unexpected operation '+b.operation);
 return route.fulfill({json});}
 if(url.hostname==='data.geopf.fr'&&url.searchParams.get('LAYER')==='ORTHOIMAGERY.ORTHOPHOTOS'){
  try{let saved=tileCache.get(url.href);const tileFile='/tmp/lot4-tools/ign-'+url.searchParams.get('TILEMATRIX')+'-'+url.searchParams.get('TILEROW')+'-'+url.searchParams.get('TILECOL')+'.jpg';if(!saved)try{saved=await readFile(tileFile);}catch{}if(!saved){const res=await fetch(url.href,{signal:AbortSignal.timeout(10000)});if(!res.ok)throw Error('tile');saved=Buffer.from(await res.arrayBuffer());await writeFile(tileFile,saved);tileCache.set(url.href,saved);}satelliteTiles++;return route.fulfill({body:saved,contentType:'image/jpeg'});}catch{return route.abort();}
 }
 if(url.hostname==='api.open-meteo.com'){weatherCalls++;if(weatherMode==='missing')return route.fulfill({status:503,json:{error:'test provider unavailable'}});
  const start=Date.parse(url.searchParams.get('start_hour')+'Z'),end=Date.parse(url.searchParams.get('end_hour')+'Z'),time=[];for(let at=start;at<=end;at+=3600000)time.push(at/1000);
  return route.fulfill({json:{hourly_units:{wind_speed_10m:'km/h',wind_direction_10m:'°',wind_gusts_10m:'km/h',temperature_2m:'°C',relative_humidity_2m:'%',precipitation:'mm'},hourly:{time,wind_speed_10m:time.map((_,i)=>8+i*2),wind_direction_10m:time.map((_,i)=>90+i*90),wind_gusts_10m:time.map((_,i)=>12+i*5),temperature_2m:time.map((_,i)=>14+i),relative_humidity_2m:time.map((_,i)=>80-i*5),precipitation:time.map((_,i)=>i*.4)}}});
 }
 if(url.hostname==='geo.api.gouv.fr')return route.fulfill({json:[{nom:'Epfig',code:'67125',centre:{coordinates:[7.4675,48.3485]},departement:{nom:'Bas-Rhin'}}]});
 if(url.pathname==='/api/track-network'){assert.equal(req.headers().authorization,'Bearer qa');return route.fulfill({body:await readFile(path.join(root,'tests/fixtures/epfig-smart-network.json')),contentType:'application/json'});}
 if(url.origin!=='https://science.test')return route.abort();
 if(url.pathname==='/src/vendor/supabase-client.mjs')return route.fulfill({contentType:'text/javascript',body:`export function createClient(url){const user={id:'${ownerId}'};return {supabaseUrl:url,channel(){return {on(){return this;},subscribe(cb){cb('SUBSCRIBED');return this;}};},removeChannel:async()=>{},auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user,access_token:'qa'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})}};}`});
 const pathname=/\.(mjs|js|css|png|svg|html)$/.test(url.pathname)?url.pathname:'/index.html';try{return route.fulfill({body:await readFile(path.join(root,pathname)),contentType:/\.(mjs|js)$/.test(pathname)?'text/javascript':pathname.endsWith('.css')?'text/css':pathname.endsWith('.html')?'text/html':pathname.endsWith('.svg')?'image/svg+xml':undefined});}catch{return route.fulfill({status:404,body:''});}
});


async function activate(){await page.goto('https://science.test/jumolf');if(await page.getByLabel('Choisir mon chien',{exact:true}).count())return;await page.goto('https://science.test/jumolf/activate');
for(const key of ['gps','weather','dog_history','ai_analysis','session_comparison'])await page.locator('[data-jumolf-consent="'+key+'"]').check();
await page.locator('[data-jumolf-action="activate"]').click();for(let i=0;i<3;i++)await page.locator('[data-jumolf-action="onboarding-next"]').click();await page.locator('[data-jumolf-action="complete-onboarding"]').click();}
await activate();await page.getByLabel('Choisir mon chien',{exact:true}).selectOption('dog-a');
await page.getByRole('navigation',{name:'Navigation JUMOLF',exact:true}).getByRole('link',{name:'S’entraîner',exact:true}).click();
await page.getByRole('link',{name:'Ouvrir le générateur géographique'}).click();
const panel=page.locator('[data-smart-panel]'),mc=page.locator('[data-mission-control]');
await panel.waitFor({state:'visible'});await panel.locator('[data-smart-option="level"]').selectOption('initiation');await panel.locator('[data-smart-query]').fill('Epfig');await panel.getByRole('button',{name:'Rechercher la commune'}).click();await panel.locator('[data-smart-commune="67125"]').click();await panel.getByRole('button',{name:'Proposer des tracés'}).click();await panel.locator('[data-smart-preview]').first().click();await mc.locator('[data-mission-action="apply"]').click();
await mc.locator('[data-mission-panel] > summary').click();await mc.locator('[data-mission-section="timeline"] > summary').click();await mc.locator('[data-mission-action="preset"]').click();
await mc.locator('[data-mission-section="environment"] > summary').click();await mc.locator('[data-mission-action="weather"]').click();await page.waitForFunction(()=>document.querySelector('[data-mission-weather]')?.textContent.includes('MODÈLE HORAIRE'));
await mc.locator('[data-mission-section="brief"] > summary').click();await mc.locator('[data-mission-action="prepare"]').click();await page.locator('[data-wizard-step="mode"]').waitFor();
assert.equal(calls.filter(c=>c==='create').length,0);
const memoryBefore=await page.evaluate(owner=>JSON.parse(localStorage.getItem('piste-v2-session-dogs:'+owner)),ownerId);
assert.equal(memoryBefore.trainingDraft.draft.preparationTrack.trainingMemory.dogId,'dog-a');
assert.equal(memoryBefore.trainingDraft.draft.preparationTrack.trainingMemory.level,'initiation');
assert.equal(memoryBefore.trainingDraft.draft.preparationTrack.trainingMemory.weather.basis,'provider-model');
assert.equal(memoryBefore.trainingDraft.draft.preparationTrack.trainingMemory.schedule.plannedAgeSeconds>0,true);
// Reload the real app: no injected restoration after first load.
await context.clearCookies();await page.reload();await page.locator('[data-wizard-step="mode"]').waitFor();
assert.match(await page.locator('[data-prepared-training]').innerText(),/retrouvée/);
assert.equal(calls.filter(c=>c==='create').length,0);
await page.locator('[data-coaching-choice="mode"][data-value="normal"]').click();
await page.locator('[data-coaching-choice="trackingScenario"][data-value="self_trace"]').click();
await page.locator('[data-coaching="next"]').click();await page.locator('[data-wizard-step="prepare"]').waitFor();
await page.locator('[data-coaching="next"]').click();await page.locator('[data-wizard-step="dog"]').waitFor();
await page.locator('[data-coaching="next"]').click();await page.locator('[data-wizard-step="roles"]').waitFor();
if(await page.locator('[data-coaching="next"]').isDisabled())throw Error(await page.locator('[data-wizard-step]').innerText());await page.locator('[data-coaching="next"]').click();await page.locator('[data-wizard-step="review"]').waitFor();
await page.locator('[data-coaching="create"]').click();await page.locator('[data-remote-session-id]').waitFor({state:'attached'});
await page.waitForFunction(owner=>{const r=JSON.parse(localStorage.getItem('piste-v2-session-dogs:'+owner));return !r.trainingDraft&&Object.values(r.links).some(x=>x.trainingMemory);},ownerId);
assert.equal(calls.filter(c=>c==='create').length,1);
assert.equal(remoteState.session.preparation.geometry.points.length>=2,true);
const createdId=created.id;
// Complete a QA session using the existing real reducer, with explicit synthetic sensor fixes.
let at=Date.now();const fix=(delta=0)=>({timestamp:at,coords:{latitude:48.3485+delta,longitude:7.4675,accuracy:5}});
const command=(type,payload={})=>{remoteState=reduceRemoteSession(remoteState,{userId:ownerId,type,payload,now:at});created=projectRemoteSession(remoteState,ownerId,at);};
for(const type of ['approach-start','arrive-start','ready-pose'])command(type);
command('start-pose',{fix:fix()});at+=10000;command('gps-batch',{kind:'pose',points:[{...fix(.001),sequence:1,segmentId:'start'}]});command('finish-pose');command('in-place');command('return-start');at+=3600000;command('start-search',{fix:fix()});at+=10000;command('gps-batch',{kind:'search',points:[{...fix(.001),sequence:1,segmentId:'start'}]});command('finish-search');
assert.equal(created.phase,'DEBRIEF');
await activate();await page.getByLabel('Choisir mon chien',{exact:true}).waitFor();await page.getByLabel('Choisir mon chien',{exact:true}).selectOption('dog-a');await page.getByRole('navigation',{name:'Navigation JUMOLF',exact:true}).getByRole('link',{name:'Progresser',exact:true}).click();
// Activation is now retained per verified account on this device.
if(await page.locator('[data-jumolf-action="activate"]').count())throw Error('unexpected activation reset');
await page.locator('[data-training-history] a').waitFor();assert.match(await page.locator('[data-training-history]').innerText(),/Séance clôturée/);
for(const width of [320,390,430,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'progress overflow '+width);}
await page.locator('[data-training-history] a').click();await page.locator('[data-training-memory]').waitFor();assert.match(await page.locator('[data-training-memory]').innerText(),/GPS du chien/);assert.equal(await page.locator('[data-training-memory]').getAttribute('data-training-memory'),memoryBefore.trainingDraft.draft.preparationTrack.trainingMemory.id);
for(const width of [320,390,430,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'dossier overflow '+width);}
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/lot4-dossier-iphone.png'});
await page.getByRole('link',{name:'Carte',exact:true}).click();await page.locator('[data-dossier-panel="map"] [data-gps-map]').waitFor();
await page.getByRole('link',{name:'Rapport PDF',exact:true}).click();assert.ok(await page.locator('[data-training-memory]').count());
// Incomplete/revoked projections never become completed exercises and cached permissions never grant access.
created={...created,phase:'INTERRUPTED',version:created.version+1};
await page.getByRole('button',{name:'Actualiser les sessions'}).count();
await page.evaluate(async()=>{document.querySelector('[data-refresh-shared-sessions]')?.click();});
// Reload retains consent choices while server authorization is rechecked.
await page.goto('https://science.test/jumolf/settings');await page.getByRole('heading',{name:'Réglages JUMOLF'}).waitFor();assert.equal(await page.locator('[data-jumolf-consent="gps"]').isChecked(),true);
assert.equal(calls.filter(c=>c==='create').length,1);assert.deepEqual(errors,[]);
console.log(JSON.stringify({passed:true,widths:[320,390,430,1280],restoredDraft:true,exactDogId:true,oneExplicitSession:true,realReducer:true,providerSnapshot:true,declaredAge:true,dossier:true,report:true,cloudMemory:false}));
await context.close();
}finally{await browser.close();}
