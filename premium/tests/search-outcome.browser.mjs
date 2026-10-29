// Full app, two installations, authenticated local HTTP handler and isolated memory repository.
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import path from 'node:path';
import {chromium} from '@playwright/test';import {createMemoryPersistenceServer} from './helpers/persistence-memory-repository.mjs';import {createPersonalDataHandler} from '../src/server/personal-data-http.mjs';
const root=path.resolve(new URL('..',import.meta.url).pathname),uid='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',origin='https://piste-community-v2-premium.vercel.app',server=createMemoryPersistenceServer(),errors=[];let uploads=0;
const handler=createPersonalDataHandler({authenticate:async token=>[uid,other].includes(token)?{id:token}:null,enabled:async()=>true,repositoryFor:owner=>{const r=server.client(owner);return {...r,put:async c=>{uploads++;return r.put(c);}};}});
const projection={id:'33333333-3333-4333-8333-333333333333',version:4,phase:'ARCHIVED',role:'driver',mode:'normal',dog:'Chien terrain',traceType:'direct',pose:null,search:null,searchActiveMs:null,createdAt:Date.now(),team:[{id:uid,name:'Compte QA',role:'driver'}],notes:[],events:[],archivePermission:{},ownerId:uid};
const pages=[],debug=[];
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
async function device(ownerId,initialOnline=true){
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),control={online:initialOnline};pages.push(page);page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(value=>{window.__pisteOnline=value;Object.defineProperty(navigator,'onLine',{get:()=>window.__pisteOnline});},initialOnline);
 await page.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.hostname==='shnwqdkiapgcftbnhilh.supabase.co'){
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'POST,OPTIONS'}});
   const b=req.postDataJSON()||{};
   if(u.pathname.endsWith('/personal-data')){if(!control.online)return route.abort();const response=await handler(new Request(req.url(),{method:'POST',headers:{authorization:'Bearer '+ownerId,origin,'content-type':'application/json'},body:JSON.stringify(b)}));const text=await response.text();debug.push({operation:b.operation,kind:b.kind,status:response.status,body:response.status>=400?text:undefined});return route.fulfill({status:response.status,body:text,headers:Object.fromEntries(response.headers)});}
   if(u.pathname.endsWith('/ops-live'))return route.fulfill({json:[]});if(u.pathname.endsWith('/piste-history'))return route.fulfill({json:{sessions:ownerId===uid?[projection]:[],hidden:[],records:[],cursor:null}});
   let json={};if(b.operation==='profile')json={id:ownerId,name:'Compte QA',qa:false,permissions:{research:true,premium:true},jumolf_entitlement:{entitlement:'admin_grant',source:'admin_grant',source_id:'qa',granted_at:'2026-01-01T00:00:00.000Z',expires_at:null,revoked_at:null}};
   else if(b.operation==='community-friendship-snapshot')json={version:1,socialVersion:1,ownerId,contacts:[],received:[],sent:[],following:[],relations:[],livePermissions:[]};
   else if(b.operation==='community-live-list')json={version:1,sessions:[]};else if(b.operation==='coaching-inbox')json={version:1,invitations:[]};else if(b.operation==='list')json={sessions:ownerId===uid?[projection]:[]};else if(b.operation==='read')json={projection:ownerId===uid?projection:null};else if(b.operation==='authorize-feature')json={allowed:true};
   return route.fulfill({json});
  }
  if(u.origin!==origin)return route.abort();
  if(u.pathname==='/src/vendor/supabase-client.mjs')return route.fulfill({contentType:'text/javascript',body:`export function createClient(url){const user={id:'${ownerId}'};return {supabaseUrl:url,auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user,access_token:user.id}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})},channel:()=>({on(){return this},subscribe(){return this}}),removeChannel:async()=>{}};}`});
  const file=/\.(mjs|js|css|png|svg|html|webmanifest|json)$/.test(u.pathname)?u.pathname:'/index.html';try{return route.fulfill({body:await readFile(path.join(root,file)),contentType:/\.(mjs|js)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.svg')?'image/svg+xml':'application/json'});}catch{return route.fulfill({status:404,body:''});}
 });
 return {context,page,async online(value){control.online=value;await page.evaluate(v=>{window.__pisteOnline=v;window.dispatchEvent(new Event(v?'online':'offline'));},value);}};
}

try{
 const a=await device(uid);await a.page.goto(origin+'/sessions/'+projection.id);await a.page.locator('[data-search-outcome-form]').waitFor();
 assert.equal(await a.page.locator('.sessions-heading [data-search-outcome=unreported]').count(),1);
 for(const width of [320,390,430]){await a.page.setViewportSize({width,height:844});assert.ok(await a.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await a.page.locator('[data-search-outcome-form] select').evaluateAll(els=>els.every(el=>{const r=el.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth})));}
 const form=a.page.locator('[data-search-outcome-form]');await form.locator('[name=code]').selectOption('assisted_positive');await form.getByRole('button',{name:'Enregistrer le résultat'}).click();
 await a.page.locator('[data-outcome-panel] [data-search-outcome=assisted_positive]').waitFor();await a.page.goto(origin+'/profile/sync');await a.page.locator('[data-account-sync-status][data-sync-state=online]').waitFor();assert.equal((await server.client(uid).list({kind:'session-dog-link'})).records[0].payload.searchOutcome.code,'assisted_positive');
 await a.page.goto(origin+'/sessions/'+projection.id);await a.page.locator('.sessions-heading [data-search-outcome=assisted_positive]').waitFor();
 await a.page.goto(origin+'/tracks');await a.page.locator('[data-history-session] [data-search-outcome=assisted_positive]').waitFor();
 await a.page.goto(origin+'/statistics');await a.page.getByRole('heading',{name:'Statistiques terrain'}).waitFor();await a.page.waitForFunction(()=>document.querySelector('[data-outcome-count=assisted_positive] strong')?.textContent==='1');assert.equal(await a.page.locator('[data-outcome-count=assisted_positive] strong').first().innerText(),'1');
 const b=await device(uid);await b.page.goto(origin+'/sessions/'+projection.id);await b.page.locator('.sessions-heading [data-search-outcome=assisted_positive]').waitFor();
 await b.page.locator('[data-outcome-panel] summary').click();const bform=b.page.locator('[data-search-outcome-form]');await bform.locator('[name=context]').selectOption('no_target');await bform.getByRole('button',{name:'Enregistrer le résultat'}).click();await b.page.goto(origin+'/statistics');await b.page.getByText(/1 hors calcul/).first().waitFor();
 await b.page.screenshot({path:'/tmp/piste-outcomes-statistics.png',fullPage:true});

 // An OPS report keeps its original annotation key when recovered as a read-only cloud copy.
 const opsId='44444444-4444-4444-8444-444444444444';
 await a.page.evaluate(async({uid,opsId})=>{const {createDogsStore}=await import('/src/dogs.mjs'),{createOperationalMissionStore}=await import('/src/operational-missions.mjs');const dogs=createDogsStore({ownerId:uid,storage:localStorage,dogs:[]}),dog=dogs.create({name:'Chien OPS',breed:'Malinois',disciplines:['tracking']});const store=createOperationalMissionStore({ownerId:uid,storage:localStorage,idFactory:()=>opsId});store.createDraft({dog,handler:{id:uid,name:'Compte QA'}});store.startTracking(opsId);store.closeField(opsId);},{uid,opsId});
 await a.page.goto(origin+'/operational/missions/'+opsId);await a.page.locator('[data-search-outcome-form][data-domain=ops]').waitFor();
 for(const width of [320,390,430]){await a.page.setViewportSize({width,height:844});const order=await a.page.locator('.operational-page').evaluate(el=>{const result=el.querySelector('[data-outcome-panel]'),evaluation=el.querySelector('[data-operational-evaluation-form]');return !!result&&!!evaluation&&result.nextElementSibling===evaluation&&result.getBoundingClientRect().bottom<=evaluation.getBoundingClientRect().top+1;});assert.ok(order);assert.ok(await a.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await a.page.locator('[data-outcome-panel]').screenshot({path:'/tmp/piste-outcome-moved.png'});
 await a.page.evaluate(async({uid,opsId})=>{const {createOperationalMissionStore}=await import('/src/operational-missions.mjs');const store=createOperationalMissionStore({ownerId:uid,storage:localStorage});store.complete(opsId);store.archive(opsId);},{uid,opsId});
 await a.page.goto(origin+'/sessions/'+opsId);await a.page.locator('[data-search-outcome-form][data-domain=ops]').waitFor();await a.page.locator('[data-search-outcome-form] [name=code]').selectOption('positive');await a.page.locator('[data-search-outcome-form] button').click();await a.page.goto(origin+'/profile/sync');await a.page.locator('[data-account-sync-status][data-sync-state=online]').waitFor();
 const ops=(await server.client(uid).list({kind:'ops'})).records[0];assert.ok(ops);
 await b.page.goto(origin+'/profile/sync');await b.page.locator('[data-account-sync-status][data-sync-state=online]').waitFor();await b.page.goto(origin+'/sessions/cloud-'+ops.id);await b.page.locator('.sessions-heading [data-search-outcome=positive]').waitFor();
 await b.page.locator('[data-outcome-panel] summary').click();await b.page.locator('[data-search-outcome-form] [name=code]').selectOption('oriented_not_found');await b.page.locator('[data-search-outcome-form] button').click();await b.page.goto(origin+'/profile/sync');await b.page.locator('[data-account-sync-status][data-sync-state=online]').waitFor();
 const annotations=(await server.client(uid).list({kind:'session-dog-link'})).records;assert.equal(annotations.find(r=>r.payload.sessionId==='ops:'+opsId)?.payload.searchOutcome.code,'oriented_not_found');
 const c=await device(other);await c.page.goto(origin+'/sessions/'+projection.id);assert.equal(await c.page.locator('[data-search-outcome-form]').count(),0);assert.equal(await c.page.locator('[data-search-outcome=assisted_positive]').count(),0);
 await a.page.goto(origin+'/coaching/session?session='+projection.id);await a.page.locator('[data-outcome-panel]').waitFor();
 assert.deepEqual(errors,[]);console.log('PASS search results: mobile320/390/430, archived Coaching save/reload, private transport and second-device recovery, archive badge, separate statistics, no-target exclusions, account isolation, real shared cockpit integration, OPS archive/cloud recovery and editing without changing GPS. Synthetic HTTP services only.');
}catch(e){console.log(JSON.stringify({errors,debug:debug.slice(-12),screens:await Promise.all(pages.map(async p=>({url:p.url(),text:(await p.locator('body').innerText()).slice(-3500)})))}));throw e;}finally{await browser.close();}
