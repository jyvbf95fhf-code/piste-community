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
let authorized=true,created=null,createPayload=null,coachingAllowed=true;const calls=[];const grant={entitlement:'premium',source:'subscription',source_id:'qa-only',granted_at:new Date(Date.now()-60000).toISOString(),expires_at:null,revoked_at:null};
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
assert.match(await page.locator('[data-jumolf-v3-train]').innerText(),/Initiation/);
await page.getByRole('link',{name:'Ouvrir le générateur géographique'}).click();
const panel=page.locator('[data-smart-panel]');await panel.waitFor({state:'visible'});
assert.equal(await panel.locator('[data-smart-option="level"]').inputValue(),'initiation');
assert.equal(await panel.locator('[data-smart-option="dogId"]').inputValue(),'dog-a');
const layout=async label=>{await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' document overflow');assert.ok(await panel.locator('.creator-menu-sheet').evaluate(el=>el.scrollWidth<=el.clientWidth),label+' panel overflow');};
for(const width of [320,390,430,1280]){
 await page.setViewportSize({width,height:900});
 for(const level of ['initiation','consolidation','diversification','operational']){
  await panel.locator('[data-smart-option="level"]').selectOption(level);await layout(level+' '+width);
  await panel.locator('[data-smart-query]').fill('Epfig');await panel.getByRole('button',{name:'Rechercher la commune'}).click();await panel.locator('[data-smart-commune="67125"]').click();
  await panel.getByRole('button',{name:'Proposer des tracés'}).click();await panel.locator('[data-smart-proposal]').first().waitFor();
  assert.ok(await panel.locator('.smart-proposal').count()>=1);await panel.locator('[data-canine-brief] summary').first().click();
  await panel.getByRole('heading',{name:'Observations à recueillir'}).first().waitFor();assert.match(await panel.locator('[data-canine-brief]').first().innerText(),/GÉNÉRIQUE/);
  await layout('brief '+level+' '+width);
 }
}
await panel.locator('[data-smart-option="dogId"]').selectOption('dog-c');
await panel.locator('[data-smart-option="skill"]').selectOption('continuity');
await panel.getByRole('button',{name:'Proposer des tracés'}).click();await panel.locator('[data-smart-proposal]').first().waitFor();
await panel.locator('[data-canine-brief] summary').first().click();
assert.match(await panel.locator('[data-canine-brief]').first().innerText(),/GÉNÉRIQUE/);
assert.equal(await panel.locator('[data-canine-brief]').first().locator('a[href^="/jumolf/session/"]').count(),0);
await panel.locator('[data-smart-option="dogId"]').selectOption('dog-a');
// Real A/B observations justify the selected skill, not an inferred dog level.
await panel.locator('[data-smart-option="skill"]').selectOption('continuity');
await panel.getByRole('button',{name:'Proposer des tracés'}).click();await panel.locator('[data-smart-proposal]').first().waitFor();
await panel.locator('[data-canine-brief] summary').first().click();
assert.ok(await panel.locator('[data-canine-brief]').first().locator('a[href^="/jumolf/session/"]').count()>0);
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/lot3-generator-iphone.png'});
await panel.locator('[data-smart-proposal]').first().click();await panel.waitFor({state:'hidden'});
await page.locator('[data-editor-real-map]').waitFor();
await page.locator('[data-editor-real-map].leaflet-container').waitFor();
assert.ok(await page.locator('[data-editor-real-map] .leaflet-overlay-pane path').count()>0);
// Existing real map can switch layers, recenter and edit the route.
await page.getByRole('button',{name:'Recentrer',exact:true}).click();
await page.getByRole('button',{name:'Retirer le dernier segment',exact:true}).click();
await page.locator('[data-creator-panel] > summary').click();
await page.locator('.canine-editor-brief [data-canine-brief] summary').click();
assert.match(await page.locator('.canine-editor-brief').first().innerText(),/avant vos modifications|après vos ajustements/);
await page.locator('[data-track-editor-form] select[name="dogId"]').selectOption('dog-c');
assert.match(await page.locator('.canine-editor-brief').first().textContent(),/GÉNÉRIQUE/,'changing dog must refresh its evidence immediately');
assert.equal(await page.locator('.canine-editor-brief a[href^="/jumolf/session/"]').count(),0);
await page.locator('[data-track-editor-form] select[name="dogId"]').selectOption('dog-a');
await page.screenshot({path:'/tmp/lot3-editor-iphone.png'});
assert.equal(calls.filter(c=>c==='create').length,0);
await page.getByRole('button',{name:'Enregistrer et préparer dans Coaching'}).click();
await page.locator('[data-wizard-step="mode"]').waitFor();
assert.equal(calls.filter(c=>c==='create').length,0,'handoff must not create a session');
await page.locator('[data-coaching-choice="mode"][data-value="normal"]').click();
await page.locator('[data-coaching="next"]').click();
await page.locator('[data-wizard-step="prepare"]').waitFor();
assert.match(await page.locator('[data-wizard-step="prepare"]').innerText(),/Référence sélectionnée|Epfig/);
await page.screenshot({path:'/tmp/lot3-coaching-iphone.png'});
// Revocation removes personalized context; a non-Premium account cannot generate.
await page.goto('https://science.test/jumolf/settings');
await page.locator('[data-jumolf-consent="dog_history"]').uncheck();
await page.goto('https://science.test/track-builder?tool=smart&canine=1&dog=dog-a');
await panel.waitFor({state:'visible'});
assert.equal(await panel.locator('[data-smart-option="dogId"] option').count(),1);
authorized=false;
await page.goto('https://science.test/track-builder?tool=smart&canine=1');
await panel.waitFor({state:'visible'});
assert.equal(await panel.locator('[data-smart-generate-form]').count(),0);
await panel.locator('[data-smart-discover]').waitFor();
assert.deepEqual(errors,[]);
console.log(JSON.stringify({passed:true,widths:[320,390,430,1280],levels:4,actualApp:true,osmFixture:true,authorizedObservations:true,dogChangeRefresh:true,insufficientData:true,consentRevocation:true,premiumGate:true,mapAndEdit:true,explicitCoachingDraft:true,sessionWrites:0}));
await context.close();
}finally{await browser.close();}

