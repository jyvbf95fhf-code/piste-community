// Complete existing app, account transport simulated. No real backend/identity writes.
import {createRemoteSession,projectRemoteSession} from '../src/server/coaching-service.mjs';
import {createOperationalMissionStore} from '../src/operational-missions.mjs';
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
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
let authorized=true,created=null,createPayload=null,coachingAllowed=true;let weatherMode='available',weatherCalls=0,satelliteTiles=0;const tileCache=new Map(),calls=[];const grant={entitlement:'premium',source:'subscription',source_id:'qa-only',granted_at:new Date(Date.now()-60000).toISOString(),expires_at:null,revoked_at:null};
try{const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
await context.addInitScript(entries=>{for(const [k,v] of entries)localStorage.setItem(k,v);},[...saved]);
await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());
 if(url.hostname==='shnwqdkiapgcftbnhilh.supabase.co'){const b=req.method()==='POST'?req.postDataJSON():{};calls.push(b.operation);
 if(!url.pathname.endsWith('/coaching'))return route.fulfill({json:{records:[]}});
 if(b.operation==='authorize-feature'&&!authorized)return route.fulfill({status:403,json:{error:'Accès JUMOLF révoqué.'}});
 if(b.operation==='profile'&&!coachingAllowed)return route.fulfill({status:403,json:{error:'Accès Coaching non autorisé.'}});
 let json={};if(b.operation==='profile')json={id:ownerId,name:'Compte développeur QA',qa:false,permissions:{research:authorized},jumolf_entitlement:authorized?grant:{entitlement:'none'}};
 else if(b.operation==='list')json={sessions:[...projections,...(created?[created]:[])]};
 else if(b.operation==='create'){createPayload=b.payload;assert.deepEqual(Object.keys(b.payload).sort(),['dogName','mode','role','scenario','traceType']);created=projectRemoteSession(createRemoteSession({id:b.sessionId,owner:{id:ownerId,name:'Compte développeur QA'},...b.payload,now:Date.now()}),ownerId);json={projection:created};}
 else if(b.operation==='read')json={projection:created?.id===b.sessionId?created:projections.find(p=>p.id===b.sessionId)||null};
 else if(b.operation==='invitations')json={invitations:[]};else if(b.operation==='notifications')json={notifications:[]};
 else if(b.operation==='contacts')json={contacts:[]};else if(b.operation==='coaching-inbox')json={invitations:[],notifications:[]};else assert.ok(['authorize-feature'].includes(b.operation),'unexpected operation '+b.operation);
 return route.fulfill({json});}
 if(url.hostname==='data.geopf.fr'&&url.searchParams.get('LAYER')==='ORTHOIMAGERY.ORTHOPHOTOS'){
  try{let saved=tileCache.get(url.href);if(!saved){const res=await fetch(url.href,{signal:AbortSignal.timeout(10000)});if(!res.ok)throw Error('tile');saved=Buffer.from(await res.arrayBuffer());tileCache.set(url.href,saved);}satelliteTiles++;return route.fulfill({body:saved,contentType:'image/jpeg'});}catch{return route.abort();}
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

await page.goto('https://science.test/jumolf/activate');
for(const key of ['gps','weather','dog_history','ai_analysis','session_comparison'])await page.locator('[data-jumolf-consent="'+key+'"]').check();
await page.locator('[data-jumolf-action="activate"]').click();for(let i=0;i<3;i++)await page.locator('[data-jumolf-action="onboarding-next"]').click();await page.locator('[data-jumolf-action="complete-onboarding"]').click();
await page.getByLabel('Choisir mon chien',{exact:true}).selectOption('dog-a');
await page.getByRole('navigation',{name:'Navigation JUMOLF',exact:true}).getByRole('link',{name:'S’entraîner',exact:true}).click();
await page.getByRole('link',{name:'Ouvrir le générateur géographique'}).click();
const panel=page.locator('[data-smart-panel]'),mc=page.locator('[data-mission-control]');
await panel.waitFor({state:'visible'});await panel.locator('[data-smart-option="level"]').selectOption('diversification');await panel.locator('[data-smart-query]').fill('Epfig');await panel.getByRole('button',{name:'Rechercher la commune'}).click();await panel.locator('[data-smart-commune="67125"]').click();await panel.getByRole('button',{name:'Proposer des tracés'}).click();
await panel.locator('[data-smart-preview]').first().click();await mc.locator('[data-mission-panel] > summary').waitFor({state:'visible'});
assert.equal(await page.locator('[data-track-editor]').getAttribute('data-dirty'),'false','preview must not alter the existing draft');
const previewMap=page.locator('[data-editor-real-map]');await previewMap.click({position:{x:150,y:500}});
assert.equal(await page.locator('[data-track-editor]').getAttribute('data-dirty'),'false','map clicks must leave the original preview draft unchanged');
assert.equal(await page.locator('[data-editor-select-point]').count(),0);
assert.equal(await page.locator('.creator-dock').evaluate(el=>el.inert),true);
await page.locator('[data-creator-panel] > summary').click();assert.equal(await page.locator('[data-track-editor-form] input[name="name"]').isDisabled(),true);await page.locator('.creator-icon[data-editor-action="close-menu"]').click();
await mc.locator('[data-mission-action="next"]').click();assert.match(await mc.locator('.mission-preview').innerText(),/Proposition 2/);
await mc.locator('[data-mission-action="previous"]').click();
await mc.locator('[data-mission-action="apply"]').click();assert.equal(await page.locator('.mission-preview').count(),0);
await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-editor-real-map] .leaflet-tile')).some(t=>t.complete&&t.naturalWidth>0));
assert.ok(satelliteTiles>0,'actual existing IGN aerial tiles loaded');
await mc.locator('[data-mission-panel] > summary').click();
await mc.locator('[data-mission-action="corridor"]').click();assert.equal(await page.locator('.mission-hypothesis-ribbon').count()>0,true);
assert.equal(await page.locator('.mission-wind-arrow').count(),0,'missing weather cannot invent a wind direction');
await mc.locator('[data-mission-section="timeline"] > summary').click();
await mc.locator('[data-mission-action="preset"]').click();assert.match(await mc.locator('[data-mission-age]').textContent(),/âge calculé/);
await mc.locator('[data-mission-section="environment"] > summary').click();
weatherMode='missing';await mc.locator('[data-mission-action="weather"]').click();await page.waitForFunction(()=>document.querySelector('[data-mission-status]')?.textContent.includes('indisponible'));
assert.match(await mc.locator('[data-mission-weather]').textContent(),/INDISPONIBLES/);
weatherMode='available';await mc.locator('[data-mission-action="weather"]').click();
await page.waitForFunction(()=>document.querySelector('[data-mission-weather]')?.textContent.includes('MODÈLE HORAIRE'));
assert.ok(await page.locator('.mission-wind-arrow').count()>0);
const before=await mc.locator('[data-mission-weather]').textContent();
await mc.locator('[data-mission-position]').fill('1000');
assert.notEqual(await mc.locator('[data-mission-weather]').textContent(),before);
assert.match(await mc.locator('[data-mission-weather]').textContent(),/Changements/);
// The same map instance remains mounted during playback and weather/time interaction.
await page.evaluate(()=>{window.__missionMap=document.querySelector('[data-editor-real-map]');});
await mc.locator('[data-mission-action="play"]').click();
await page.waitForFunction(()=>parseInt(document.querySelector('[data-mission-progress]')?.value||'0')>10);
await mc.locator('[data-mission-action="pause"]').click();
assert.equal(await page.evaluate(()=>window.__missionMap===document.querySelector('[data-editor-real-map]')),true);
const paused=await mc.locator('[data-mission-progress]').inputValue();
await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
assert.equal(await mc.locator('[data-mission-progress]').inputValue(),paused);
await mc.locator('[data-mission-action="play"]').click();
await page.waitForFunction(p=>Number(document.querySelector('[data-mission-progress]')?.value)>Number(p),paused);
await mc.locator('[data-mission-action="pause"]').click();
await page.emulateMedia({reducedMotion:'reduce'});
await mc.locator('[data-mission-reduced]').waitFor({state:'visible'});
await mc.locator('[data-mission-action="play"]').click();assert.match(await mc.locator('[data-mission-play-status]').textContent(),/En pause|terminé/);
for(const width of [320,390,430,1280]){
 await page.setViewportSize({width,height:900});
 for(const key of ['timeline','environment','brief']){const section=mc.locator('[data-mission-section="'+key+'"]');if(!await section.evaluate(el=>el.open))await section.locator(':scope > summary').click();}
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'document overflow '+width);
 assert.ok(await mc.locator('.mission-panel-content').evaluate(el=>el.scrollWidth<=el.clientWidth),'mission overflow '+width);
 assert.ok(await mc.locator('.mission-button').evaluateAll(els=>els.filter(el=>el.getClientRects().length).every(el=>el.getBoundingClientRect().height>=44)),'touch targets '+width);
}
await page.setViewportSize({width:390,height:844});
await mc.locator('[data-mission-panel] > summary').click();
await page.screenshot({path:'/tmp/lot3b-mission-map-iphone.png'});
await mc.locator('[data-mission-panel] > summary').click();await mc.locator('[data-mission-section="brief"] > summary').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/lot3b-mission-brief-iphone.png'});
// Same settings/generator retained; regeneration is explicit and changes the preview.
await mc.locator('[data-mission-action="edit"]').click();await panel.waitFor({state:'visible'});
assert.equal(await panel.locator('[data-smart-option="level"]').inputValue(),'diversification');
assert.ok(await panel.locator('.smart-selected').count());
await panel.locator('[data-smart-option="distanceKm"]').fill('1.4');await panel.getByRole('button',{name:'Proposer des tracés'}).click();await panel.locator('[data-smart-preview]').first().click();await mc.locator('[data-mission-action="apply"]').click();await page.locator('[data-confirm]').click();
assert.match(await page.locator('[data-creator-distance]').textContent(),/1,40/);
await mc.locator('[data-mission-panel] > summary').click();
await mc.locator('[data-mission-section="brief"] > summary').click();
assert.equal(calls.filter(c=>c==='create').length,0);
await mc.locator('[data-mission-action="prepare"]').click();await page.locator('[data-wizard-step="mode"]').waitFor();
assert.equal(calls.filter(c=>c==='create').length,0);
assert.deepEqual(errors,[]);
console.log(JSON.stringify({passed:true,widths:[320,390,430,1280],actualIgnSatelliteTiles:satelliteTiles,weatherCalls,providerWeatherFixture:true,missingWeather:true,temporalChanges:true,previewDoesNotEdit:true,previewMapAndControlsReadOnly:true,reducedMotion:true,noMapRemountDuringPlayback:true,coachingDraftOnly:true}));
await context.close();
}finally{await browser.close();}
