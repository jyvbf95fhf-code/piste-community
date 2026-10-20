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
let authorized=true,created=null,createPayload=null,coachingAllowed=true;const calls=[];const grant={entitlement:'admin_grant',source:'admin_grant',source_id:'qa-only',granted_at:new Date(Date.now()-60000).toISOString(),expires_at:null,revoked_at:null};
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
 if(url.origin!=='https://science.test')return route.abort();
 if(url.pathname==='/src/vendor/supabase-client.mjs')return route.fulfill({contentType:'text/javascript',body:`export function createClient(url){const user={id:'${ownerId}'};return {supabaseUrl:url,channel(){return {on(){return this;},subscribe(cb){cb('SUBSCRIBED');return this;}};},removeChannel:async()=>{},auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user,access_token:'qa'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})}};}`});
 const pathname=/\.(mjs|js|css|png|svg|html)$/.test(url.pathname)?url.pathname:'/index.html';try{return route.fulfill({body:await readFile(path.join(root,pathname)),contentType:/\.(mjs|js)$/.test(pathname)?'text/javascript':pathname.endsWith('.css')?'text/css':pathname.endsWith('.html')?'text/html':pathname.endsWith('.svg')?'image/svg+xml':undefined});}catch{return route.fulfill({status:404,body:''});}
});

await page.goto('https://science.test/jumolf/activate');
for(const key of ['gps','weather','dog_history','ai_analysis','session_comparison'])await page.locator('[data-jumolf-consent="'+key+'"]').check();
await page.locator('[data-jumolf-action="activate"]').click();for(let i=0;i<3;i++)await page.locator('[data-jumolf-action="onboarding-next"]').click();await page.locator('[data-jumolf-action="complete-onboarding"]').click();
const nav=label=>page.getByRole('navigation',{name:'Navigation JUMOLF',exact:true}).getByRole('link',{name:label,exact:true});
const layout=async label=>{for(const width of [320,390,430,1280]){await page.setViewportSize({width,height:844});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' overflow '+width);assert.ok(await page.locator('.v3-nav a').evaluateAll(els=>els.every(el=>{const r=el.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.height>=44;})),label+' nav touch '+width);}await page.setViewportSize({width:390,height:844});};
await page.getByLabel('Choisir mon chien',{exact:true}).selectOption('dog-a');await nav('Apprendre').click();
await page.locator('[data-academy]').waitFor();await layout('Academy');
for(const journey of ['discovery','coaching','expert']){
 await page.locator('.academy-paths a[href*="journey='+journey+'"]').click();
 for(const href of await page.locator('[data-academy-card] a').evaluateAll(els=>els.map(a=>a.href))){
  const target=new URL(href);await page.locator('[data-academy-card] a[href="'+target.pathname+target.search+'"]').click();await page.locator('[data-academy-lesson]').waitFor();await page.getByRole('heading',{name:'Limites et niveau de preuve',exact:true}).waitFor();assert.ok(await page.locator('.academy-sources a').count());assert.equal(await page.locator('[data-academy-lesson] time').innerText(),'2026-10-20');await nav('Apprendre').click();
 }
 await nav('Apprendre').click();
}
await page.locator('[data-academy-card="protocoles"] a').click();await layout('scientific lesson');await page.screenshot({path:'/tmp/lot2-lesson.png',fullPage:true});
await page.getByRole('link',{name:'Relier à mon profil du binôme',exact:true}).click();await page.locator('[data-binome-profile="team"]').waitFor();await layout('team');
assert.ok(await page.locator('.binome-evidence a').count());assert.equal(await page.locator('[data-jumolf-form="profile-draft"]').count(),1);
await page.locator('[name="objectives"]').fill('Observer la reprise sans aide');await page.locator('[name="observations"]').fill('Chien : arrêt observé. Conducteur : pause déclarée.');
await page.getByRole('button',{name:'Appliquer pendant cette visite',exact:true}).click();await page.getByText('Rubriques appliquées pendant cette visite uniquement. Aucun enregistrement durable.',{exact:true}).waitFor();
await page.locator('.binome-tabs').getByRole('link',{name:'Mon chien',exact:true}).click();await page.getByRole('heading',{name:'Environnements rencontrés · renseignés',exact:true}).waitFor();await layout('dog');
await page.locator('[name="objectives"]').fill('Objectif du chien A');await page.getByRole('button',{name:'Appliquer pendant cette visite',exact:true}).click();
await page.getByLabel('Choisir mon chien',{exact:true}).selectOption('dog-b');assert.equal(await page.locator('[name="objectives"]').inputValue(),'');assert.equal(await page.locator('a[href*="coaching%3Areal-coaching"]').count(),0);
await page.getByLabel('Choisir mon chien',{exact:true}).selectOption('dog-a');assert.equal(await page.locator('[name="objectives"]').inputValue(),'Objectif du chien A');
await page.locator('.binome-tabs').getByRole('link',{name:'Conducteur',exact:true}).click();await page.getByText('Aucune qualification professionnelle n’est déduite de ce rôle.',{exact:false}).waitFor();await layout('handler');
await page.locator('[name="experience"]').fill('Expérience déclarée pendant la visite');await page.getByRole('button',{name:'Appliquer pendant cette visite',exact:true}).click();
await page.locator('.binome-tabs').getByRole('link',{name:'Binôme',exact:true}).click();assert.equal(await page.locator('[name="objectives"]').inputValue(),'Observer la reprise sans aide');
await page.screenshot({path:'/tmp/lot2-team.png',fullPage:true});
assert.ok(!(await page.evaluate(()=>JSON.stringify(localStorage))).includes('Observer la reprise sans aide'));
await page.reload();await page.locator('.jumolf-shell').waitFor();assert.equal(await page.locator('[name="objectives"]').count(),0,'activation and scientific drafts are visit-only');
await page.goto('https://science.test/jumolf/activate');for(const key of ['gps','weather','dog_history','ai_analysis','session_comparison'])await page.locator('[data-jumolf-consent="'+key+'"]').check();await page.locator('[data-jumolf-action="activate"]').click();
for(let i=0;i<3;i++)await page.locator('[data-jumolf-action="onboarding-next"]').click();await page.locator('[data-jumolf-action="complete-onboarding"]').click();await page.getByLabel('Choisir mon chien',{exact:true}).selectOption('dog-a');await page.getByRole('link',{name:'Profil du binôme',exact:true}).click();
await page.locator('[data-binome-profile]').waitFor();await page.locator('.v3-tools>summary').click();await page.getByRole('link',{name:'Consentements et réglages',exact:true}).click();await page.locator('[data-jumolf-consent="dog_history"]').uncheck();
await nav('Accueil').click();await page.getByRole('link',{name:'Profil du binôme',exact:true}).click();assert.equal(await page.locator('[data-jumolf-form="profile-draft"]').count(),0);assert.ok(!(await page.locator('.binome-profile').innerText()).includes('Ninja QA'));
authorized=false;await page.goto('https://science.test/jumolf/team?dog=dog-a');assert.equal(await page.locator('[data-binome-profile]').count(),0);await nav('Apprendre').click();await page.locator('[data-academy]').waitFor();
assert.deepEqual(errors,[]);assert.ok(!calls.some(x=>['create','command','export-data'].includes(x)));console.log('PASS Lot2: all 12 source-backed lessons, 3 paths, dog/handler/team profiles, visit-only scoped drafts, no storage writes, empty and revoked states, 320/390/430/1280; transports local.');
}finally{await browser.close();}

