// Full application with simulated account transport; no backend writes.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {buildLoboDemoDataset,projectLoboDemoSession,LOBO_DEMO_OWNER_ID} from '../src/lobo-demo-data.mjs';
const dataset=buildLoboDemoDataset();
import {createTrackLibrary} from '../src/track-library.mjs';
import {createOperationalMissionStore} from '../src/operational-missions.mjs';
import {createRemoteSession,projectRemoteSession,reduceRemoteSession,joinRemoteSession} from '../src/server/coaching-service.mjs';
const expectedDogId=process.env.LOBO_LOCAL_ALIAS||dataset.dog.id;
const disk=new Map(),storage={getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,v)},library=createTrackLibrary({ownerId:LOBO_DEMO_OWNER_ID,storage});
const prepared=library.createPrepared({name:'Piste préparée de contrôle iPhone avec un titre lisible',dogId:dataset.dog.id,geometry:{points:[{x:7.4,y:48.3,space:'wgs84',kind:'start'},{x:7.401,y:48.301,space:'wgs84',kind:'arrival'}]}});
let now=Date.now()-20000;const ops=createOperationalMissionStore({ownerId:LOBO_DEMO_OWNER_ID,storage,idFactory:()=> 'iphone-isolated-delete',clock:()=>now});const m=ops.createDraft({dog:dataset.dog,handler:{id:LOBO_DEMO_OWNER_ID,name:'QA'}});ops.enableGps(m.id,LOBO_DEMO_OWNER_ID);ops.startTracking(m.id);ops.appendGpsPoint(m.id,{timestamp:now,coords:{latitude:48.3,longitude:7.4,accuracy:5}});now+=10000;ops.appendGpsPoint(m.id,{timestamp:now,coords:{latitude:48.301,longitude:7.401,accuracy:5}});ops.stopTracking(m.id);ops.complete(m.id);ops.archive(m.id);
if(process.env.LOBO_LOCAL_ALIAS)disk.set('piste-v2-dogs:'+LOBO_DEMO_OWNER_ID,JSON.stringify({version:1,ownerId:LOBO_DEMO_OWNER_ID,dogs:[{...dataset.dog,id:expectedDogId,cloudId:dataset.dog.id,isDemonstration:false}]}));
let remoteState=null,commands=[],createdDog=null;

import {projectVerifiedCapabilities} from '../src/server/account-capabilities.mjs';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const ids={owner:LOBO_DEMO_OWNER_ID,member:'22222222-2222-4222-8222-222222222222',ordinary:'33333333-3333-4333-8333-333333333333'};
let actor='owner',revoked=false,checks=0;const errors=[];
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});let page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.stack||e.message));
await context.addInitScript(entries=>{if(!localStorage.getItem('qa-seeded')){for(const [k,v] of entries)localStorage.setItem(k,v);localStorage.setItem('qa-seeded','1');}window.qaGPS={callbacks:new Map(),watches:0};Object.defineProperty(navigator,'geolocation',{value:{watchPosition(cb,error){const id=++window.qaGPS.watches;window.qaGPS.callbacks.set(id,{cb,error});return id;},clearWatch(id){window.qaGPS.callbacks.delete(id);}}});},[...disk]);
await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());
 if(url.hostname==='shnwqdkiapgcftbnhilh.supabase.co'){
  const b=req.method()==='POST'?req.postDataJSON():{};let json={records:[]};
  if(b.operation==='community-friendship-snapshot')return route.fulfill({json:{version:1,ownerId:ids[actor],contacts:[{id:ids.member,displayName:'Camille Test',quick_coaching_invite_authorized:true},{id:ids.ordinary,displayName:'Alex Test',quick_coaching_invite_authorized:false}],received:[{id:'received-qa',fromUserId:'44444444-4444-4444-8444-444444444444',toUserId:ids.owner,name:'Invitation QA',status:'pending'}],sent:[{id:'sent-qa',fromUserId:ids.owner,toUserId:'55555555-5555-4555-8555-555555555555',name:'Demande envoyée QA',status:'pending'}],relations:[]}});
  if(b.operation==='create'){createdDog=b.payload.dogName;remoteState=createRemoteSession({id:b.sessionId,owner:{id:LOBO_DEMO_OWNER_ID,name:'QA'},...b.payload,now:Date.now()});remoteState=joinRemoteSession(remoteState,{id:'22222222-2222-4222-8222-222222222222',name:'QA conducteur'},'driver');return route.fulfill({json:{projection:projectRemoteSession(remoteState,LOBO_DEMO_OWNER_ID)}});}
  if(b.operation==='read')return route.fulfill({json:{projection:remoteState?projectRemoteSession(remoteState,LOBO_DEMO_OWNER_ID):null}});
  if(b.operation==='command'){commands.push(b.type);remoteState=reduceRemoteSession(remoteState,{userId:LOBO_DEMO_OWNER_ID,type:b.type,payload:b.payload,now:Date.now()});return route.fulfill({json:{projection:projectRemoteSession(remoteState,LOBO_DEMO_OWNER_ID)}});}
  if(url.pathname.endsWith('/personal-data')){const rows=dataset.personalRecords.filter(r=>r.kind===b.kind).map(r=>({...r,schemaVersion:1,revision:1,deletedAt:null,updatedAt:'2026-10-21T12:00:00Z'}));return route.fulfill({json:{records:actor==='owner'?rows:[],cursor:null}});}
  if(b.operation==='profile'){const id=ids[actor],meta=actor==='owner'?{admin_role:'owner_admin'}:actor==='member'&&!revoked?{premium_entitlement:{entitlement:'premium',source:'admin_grant',granted_at:'2026-01-01T00:00:00Z'}}:{};json={id,name:'QA '+actor,...projectVerifiedCapabilities({id,app_metadata:meta},{id,enabled:true})};}
  else if(b.operation==='authorize-feature'){if(actor==='ordinary'||revoked)return route.fulfill({status:403,json:{error:'Accès refusé'}});json={};}
  else if(b.operation==='list')json={sessions:actor==='owner'?dataset.coachingSessions.map(projectLoboDemoSession):[]};else if(b.operation==='coaching-inbox')json={invitations:[],notifications:[]};else if(b.operation==='contacts')json={contacts:[]};
  return route.fulfill({json});
 }
 if(url.hostname==='geo.api.gouv.fr')return route.fulfill({json:[{nom:'Epfig',code:'67125',centre:{coordinates:[7.4675,48.3485]},departement:{nom:'Bas-Rhin'}}]});
 if(url.pathname==='/api/track-network')return route.fulfill({body:await readFile(path.join(root,'tests/fixtures/epfig-smart-network.json')),contentType:'application/json'});
 if(url.origin!=='https://science.test')return route.abort();
 if(url.pathname==='/src/vendor/supabase-client.mjs')return route.fulfill({contentType:'text/javascript',body:`export function createClient(url){const user=()=>{const id=localStorage.getItem('qa-user');return id?{id,email:id==='${LOBO_DEMO_OWNER_ID}'?'seb.lobstein@gmail.com':'other@example.test'}:null;};return {supabaseUrl:url,channel(){return {on(){return this;},subscribe(cb){cb('SUBSCRIBED');return this;}};},removeChannel:async()=>{},auth:{getUser:async()=>({data:{user:user()}}),getSession:async()=>({data:{session:user()?{user:user(),access_token:'qa'}:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signInWithPassword:async({email})=>{localStorage.setItem('qa-user',email.split('@')[0]);return {data:{user:user()}};},signOut:async()=>{localStorage.removeItem('qa-user');return {};}}};}`});
 const pathname=/\.(mjs|js|css|png|jpg|jpeg|svg|html|webmanifest)$/.test(url.pathname)?url.pathname:'/index.html';
 try{let body=await readFile(path.join(root,pathname));if(pathname==='/src/vendor/leaflet.js')body=Buffer.from(body.toString()+'\n;window.qaMaps=[];const qaCreateMap=L.map;L.map=(...args)=>{const m=qaCreateMap(...args);qaMaps.push(m);return m;};');return route.fulfill({body,contentType:/\.(mjs|js)$/.test(pathname)?'text/javascript':pathname.endsWith('.css')?'text/css':pathname.endsWith('.html')?'text/html':pathname.endsWith('.svg')?'image/svg+xml':pathname.endsWith('.png')?'image/png':/\.jpe?g$/.test(pathname)?'image/jpeg':undefined});}catch{return route.fulfill({status:404,body:''});}
});
const go=route=>page.goto('https://science.test'+route);
async function login(who){actor=who;await go('/auth/login');await page.locator('[name="email"]').fill(ids[who]+'@example.test');await page.locator('[name="password"]').fill('QA-password-123');await page.locator('form[data-auth="login"] button[type="submit"]').click();await page.waitForURL(u=>!u.pathname.startsWith('/auth'));}
async function activate(){await go('/jumolf/activate');await page.locator('[data-jumolf-consent="gps"]').check();await page.locator('[data-jumolf-action="activate"]').click();for(let i=0;i<3;i++)await page.locator('[data-jumolf-action="onboarding-next"]').click();await page.locator('[data-jumolf-action="complete-onboarding"]').click();await page.waitForURL(u=>u.pathname==='/jumolf');await page.getByRole('navigation',{name:'Navigation JUMOLF',exact:true}).waitFor();}
async function settings(enabled=true,gps=true){await go('/jumolf/settings');await page.getByRole('heading',{name:'Réglages JUMOLF'}).waitFor();assert.equal(await page.locator('[data-jumolf-consent="gps"]').isChecked(),gps);assert.equal(await page.locator('[data-jumolf-action="deactivate"]').count(),Number(enabled));checks++;}
async function logout(){await go('/profile/account');await page.locator('[data-action="logout"]').click();await page.waitForURL('**/auth');}
try{
 await login('owner');
 if(process.env.CHECK_ACTIVE_LIBRARY){
  await page.evaluate(async dog=>{
   const {createTrackLibrary}=await import('/src/track-library.mjs'),{coachingGeneratedTrackState}=await import('/src/coaching-shared-wizard.mjs'),{mountRemoteCoaching}=await import('/src/coaching-remote-app.mjs');
   const library=createTrackLibrary(),track=library.createPrepared({name:'Piste active sans réenregistrement',geometry:{points:[{space:'wgs84',x:7.4,y:48.3},{space:'wgs84',x:7.401,y:48.301}]}}),ownerId=localStorage.getItem('qa-user');
   const root=document.createElement('div');root.id='active-library-test';document.body.append(root);
   window.qaActiveMount=mountRemoteCoaching({root,embedded:true,resumeStoredSession:false,dogs:[dog],getTracks:id=>id===ownerId?library.list():[],initialWizardState:coachingGeneratedTrackState({ownerId,dogs:[dog],track})});await qaActiveMount.ready;
  },dataset.dog);
  await page.locator('#active-library-test [data-coaching-choice="mode"][data-value="normal"]').click();await page.locator('#active-library-test [data-coaching="next"]').click();
  await page.getByRole('button',{name:/Piste active sans réenregistrement/}).waitFor();await page.evaluate(()=>{qaActiveMount.destroy();document.querySelector('#active-library-test').remove();});console.log('active library immediately available');
 }
 const device=await context.newCDPSession(page);
 for(const width of (process.env.QUICK?[390]:[320,390,430,1280]))for(const mode of ['normal','simple_blind','full_blind']){
  console.log('tracer scenario',width,mode);commands=[];await page.setViewportSize({width,height:844});await device.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<500});await device.send('Emulation.setTouchEmulationEnabled',{enabled:width<500});await go('/tracks?category=prepared');
  await page.locator('[data-prepared-library] .track-record-card').first().click();await page.locator('[data-prepared-action="coaching"]').click();await page.waitForURL('**/new-session');
  await page.locator('[data-coaching-choice="mode"][data-value="'+mode+'"]').click();await page.locator('[data-coaching="next"]').click();await page.getByRole('heading',{name:'Choisir le tracé',exact:true}).waitFor();await page.locator('[data-coaching="next"]').click();await page.locator('.coaching-principal').waitFor();await page.locator('[data-coaching="creator"][data-role="traceur"]').click();await page.locator('[data-coaching="next"]').click();await page.locator('[data-coaching="edit"][data-step="prepare"]').click();await page.locator('[data-coaching-choice="preparation"]').first().click();await page.locator('[data-coaching="next"]').click();await page.locator('[data-coaching="create"]').click();
  const confirm=page.getByRole('button',{name:'Je suis au départ · prêt à tracer',exact:true});await confirm.waitFor();
  assert.equal(await page.evaluate(()=>qaGPS.callbacks.size),0);assert.equal(createdDog,'Lobo');
  await page.evaluate(()=>{window.qaMapNode=document.querySelector('[data-gps-map]');window.qaCurrentMap=qaMaps.find(m=>m.getContainer()===qaMapNode);qaCurrentMap.setView([48.31,7.42],15,{animate:false});});await confirm.click();const start=page.getByRole('button',{name:'Tracer la piste',exact:true});await start.waitFor();assert.equal(await page.evaluate(()=>document.querySelector('[data-gps-map]')===qaMapNode),true,'departure must retain the existing map node');
  assert.deepEqual(commands.filter(c=>['approach-start','arrive-start','ready-pose'].includes(c)),['approach-start','arrive-start','ready-pose']);assert.equal(await page.evaluate(()=>qaGPS.callbacks.size),0);
  await start.click();await page.locator('.gps-start-status').filter({hasText:'Acquisition'}).waitFor();assert.equal(commands.includes('start-pose'),false);assert.equal(await start.isDisabled(),true);
  await page.evaluate(()=>[...qaGPS.callbacks.values()].at(-1).error({code:1}));await start.waitFor();assert.equal(await start.isDisabled(),false);await page.locator('.gps-start-status').filter({hasText:'refusée'}).waitFor();
  await start.click();await page.evaluate(()=>[...qaGPS.callbacks.values()].at(-1).cb({timestamp:Date.now(),coords:{latitude:48.3,longitude:7.4,accuracy:300}}));await page.locator('.gps-start-status').filter({hasText:'précision'}).waitFor();assert.equal(commands.includes('start-pose'),false);
  await page.evaluate(()=>[...qaGPS.callbacks.values()].at(-1).error({code:3}));await start.click();await page.evaluate(()=>[...qaGPS.callbacks.values()].at(-1).cb({timestamp:Date.now(),coords:{latitude:48.3,longitude:7.4,accuracy:5}}));
  await page.locator('[data-remote-phase="LAYING"]').waitFor({state:'attached'});assert.equal(commands.filter(c=>c==='start-pose').length,1);await page.getByRole('button',{name:'Terminer la piste',exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.querySelector('[data-gps-map]')===qaMapNode),true,'GPS start must retain the map');assert.equal(await page.evaluate(()=>Math.abs(qaCurrentMap.getCenter().lat-48.3)<1e-6&&Math.abs(qaCurrentMap.getCenter().lng-7.4)<1e-6&&qaCurrentMap.getZoom()===17),true,'first recording fix must zoom to the real position');await page.evaluate(()=>qaCurrentMap.setView([48.31,7.42],15,{animate:false}));
  assert.equal(await page.locator('[data-coaching="create"]').count(),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width+' '+mode);assert.equal(new URL(page.url()).pathname,'/new-session');
  await page.evaluate(()=>[...qaGPS.callbacks.values()].at(-1).cb({timestamp:Date.now()+1,coords:{latitude:48.3001,longitude:7.4001,accuracy:5}}));
  await page.getByRole('button',{name:'Verrouiller l’écran tactile',exact:true}).click();assert.equal(await page.evaluate(()=>qaCurrentMap.getZoom()),15,'later updates preserve manual zoom');await page.getByRole('dialog',{name:'Écran tactile verrouillé',exact:true}).waitFor();await page.locator('[data-gps-touch-unlock]').hover();await page.mouse.down();await page.getByRole('dialog',{name:'Écran tactile verrouillé',exact:true}).waitFor({state:'hidden'});await page.mouse.up();
  if(mode==='normal'){await page.waitForFunction(()=>document.querySelector('[data-gps-clock]')?.textContent!=='00:00');await page.screenshot({path:'/tmp/tracer-'+width+'.png'});}
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Terminer la piste',exact:true}).click();await page.locator('[data-remote-phase="TRACK_FINISHED"]').waitFor({state:'attached'});assert.ok(remoteState.tracer.gpsPose.distanceM>0);assert.equal(await page.evaluate(()=>qaGPS.callbacks.size),0);checks++;
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,widths:process.env.QUICK?[390]:[320,390,430,1280],modes:['normal','simple_blind','full_blind'],pageErrors:errors.length,realBackendWrites:0,physicalGpsValidated:false}));
}catch(e){console.error((await page.locator('body').innerText()).slice(-4000));console.error(errors);throw e;}finally{await browser.close();}
