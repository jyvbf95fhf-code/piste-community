// Local-only integration: bundled SDK and complete app; synthetic Auth, no live e-mails.
import {createMemoryPersistenceServer} from './helpers/persistence-memory-repository.mjs';
import {createPersonalDataHandler} from '../src/server/personal-data-http.mjs';
import {preparePersistenceCandidate} from '../src/persistence-domain-adapters.mjs';
import {chromium} from '@playwright/test';import chromiumBundle from '@sparticuz/chromium';
import {createTrackLibrary} from '../src/track-library.mjs';
import {createOperationalMissionStore} from '../src/operational-missions.mjs';
import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH||await chromiumBundle.executablePath(),args:chromiumBundle.args,headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],calls=[];
 let cloudRecord=null,omitReceipt=false,hidden=[],deleted=false,enabled=true; const sessionId='33333333-3333-4333-8333-333333333333'; let projection;
 const user={id:'11111111-1111-4111-8111-111111111111',email:'qa@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{role:'admin'}};
 const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})+'.'+encode('synthetic');
 const gps={provenance:'device-geolocation',phase:'finished',startedAt:100000,endedAt:160000,elapsedMs:60000,distanceM:125,segments:[[{latitude:48.2,longitude:7.3,accuracy:5},{latitude:48.201,longitude:7.301,accuracy:5}],[{latitude:48.21,longitude:7.31,accuracy:5}]]};
 projection={id:sessionId,ownerId:user.id,version:5,phase:'ARCHIVED',role:'driver',mode:'full_blind',dog:'Nox',traceType:'direct',pose:gps,search:gps,searchActiveMs:45000,team:[{id:user.id,name:'Compte réel',role:'driver'}],notes:[{authorName:'Coach',text:'Session vérifiée'}],events:[{text:'Recherche terminée',at:160000,source:'driver'}]};
 const saved=new Map(),ops=createOperationalMissionStore({ownerId:user.id,storage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},idFactory:()=> 'ops-browser',clock:()=>Date.parse('2026-10-19T10:00:00Z')});
 ops.createDraft({dog:{id:'nox',name:'Nox'},handler:{id:'u',name:'Conducteur OPS'}});ops.enableGps('ops-browser',user.id);ops.startTracking('ops-browser');ops.appendGpsPoint('ops-browser',{timestamp:Date.parse('2026-10-19T10:00:00Z'),coords:{latitude:48.2,longitude:7.3,accuracy:5}});ops.stopTracking('ops-browser');ops.complete('ops-browser');ops.archive('ops-browser');
 const library=createTrackLibrary({ownerId:user.id,storage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)}});const track=library.createPrepared({name:'Tracé isolé',geometry:{points:[{x:7,y:48,space:'wgs84'},{x:7.001,y:48.001,space:'wgs84'}]}});
 const accountServer=createMemoryPersistenceServer(),accountRepository=accountServer.client(user.id);
 const trackPayload=preparePersistenceCandidate({kind:'track',localId:track.id,value:track},{ownerId:user.id}).payload;
 await accountRepository.put({kind:'track',id:'55555555-5555-4555-8555-555555555555',expectedRevision:0,commandId:crypto.randomUUID(),payload:trackPayload});
 const accountHandler=createPersonalDataHandler({authenticate:async()=>({id:user.id}),enabled:async()=>enabled,repositoryFor:()=>accountRepository});
 cloudRecord={id:'55555555-5555-4555-8555-555555555555',kind:'track',payload:track,revision:1,updated_at:'2026-10-25T10:00:00Z'};
 await page.addInitScript(entries=>{if(!localStorage.getItem('qa-piste-bulk-seeded')){for(const [k,v] of entries)localStorage.setItem(k,v);localStorage.setItem('qa-piste-bulk-seeded','1');}},[...saved]);
 const headers={'access-control-allow-origin':'https://piste-community-v2-premium.vercel.app','access-control-allow-headers':'*','access-control-allow-methods':'GET,PUT,POST,OPTIONS'};
 page.setDefaultTimeout(12000);page.on('pageerror',e=>{errors.push(e.message);console.error('APP ERROR:',e.stack);});
 await page.route('https://piste-community-v2-premium.vercel.app/**',async route=>{const path=new URL(route.request().url()).pathname;const source=path.endsWith('.mjs')||path.endsWith('.css')||path.endsWith('.js')||path.includes('/assets/')||path.endsWith('.html')?path:'/index.html';try{const body=await readFile(new URL('..'+source,import.meta.url));await route.fulfill({body,contentType:source.endsWith('.mjs')||source.endsWith('.js')?'text/javascript':source.endsWith('.css')?'text/css':source.endsWith('.html')?'text/html':source.endsWith('.svg')?'image/svg+xml':'image/png'});}catch{await route.fulfill({status:404,body:''});}});
 await page.route('https://shnwqdkiapgcftbnhilh.supabase.co/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;calls.push([req.method(),path]);
  if(req.method()==='OPTIONS')return route.fulfill({status:200,headers,body:''});
  if(path==='/functions/v1/personal-data'){const response=await accountHandler(new Request(req.url(),{method:'POST',headers:{authorization:'Bearer '+token,origin:'https://piste-community-v2-premium.vercel.app','content-type':'application/json'},body:req.postData()}));return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});}
  let json=user,status=200;
  if(path==='/auth/v1/token')json={access_token:token,refresh_token:'synthetic',expires_in:3600,token_type:'bearer',user};
  if(path==='/auth/v1/signup')json={...user,id:'22222222-2222-4222-8222-222222222222',identities:[]};
  if(path==='/auth/v1/recover'){status=429;json={code:'over_email_send_rate_limit',msg:'email rate limit exceeded'};}
  if(path==='/functions/v1/piste-history'){const data=req.postDataJSON();if(!enabled){status=403;json={error:'Compte non autorisé pour ce pilote.'};}else if(data.operation==='catalogue')json={sessions:data.domain==='coaching'&&!deleted?[projection]:[],hidden:data.domain==='hidden'?hidden:[],records:data.domain==='track'&&cloudRecord?[cloudRecord]:[],cursor:null};else if(data.operation==='batch'){if(omitReceipt==='network')return route.abort('failed');json={results:omitReceipt?[]:data.items.map(i=>{if(i.action==='hide')hidden.push(i.key);else if(i.key.startsWith('coaching:'))deleted=true;else if(i.key.startsWith('track:'))cloudRecord=null;return {key:i.key,status:i.action==='hide'?'hidden':'deleted'};})};}}
  if(path==='/functions/v1/coaching'){const data=req.postDataJSON();assert.ok(['profile','list','invitations','notifications','read','coaching-inbox','community-friendship-snapshot'].includes(data.operation),'unexpected operation '+data.operation);if(!enabled){status=403;json={error:'Compte non autorisé pour ce pilote.'};}else json=data.operation==='community-friendship-snapshot'?{version:1,ownerId:user.id,contacts:[],received:[],sent:[],relations:[]}:data.operation==='coaching-inbox'?{invitations:[],notifications:[]}:data.operation==='profile'?{id:user.id,name:'Compte réel',qa:false}:data.operation==='list'?{sessions:[projection]}:{projection};}
  await route.fulfill({status,headers,json});
 });

 await page.goto('https://piste-community-v2-premium.vercel.app/auth/login');
 await page.getByLabel('Email',{exact:true}).fill('qa@example.invalid');await page.getByLabel('Mot de passe',{exact:true}).fill('synthetic-existing');
 await page.evaluate(async({owner,track,record,payload})=>{const {createPersistenceJournal}=await import('/src/persistence-journal.mjs');const j=createPersistenceJournal({ownerId:owner});await j.adopt({localId:track.id,record:{schemaVersion:1,kind:'track',id:record.id,revision:1,payload:payload,updatedAt:record.updated_at,deletedAt:null}});j.dispose();},{owner:user.id,track,record:cloudRecord,payload:trackPayload});
 await page.getByRole('button',{name:'Se connecter',exact:true}).click();
 await page.getByText('Prêts pour le terrain ?').waitFor();
 await page.goto('https://piste-community-v2-premium.vercel.app/tracks');
 await page.locator('[data-history-session="'+sessionId+'"]').waitFor();
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:844});
  await page.getByRole('button',{name:'Sélectionner',exact:true}).click();
  await page.getByRole('button',{name:'Tout sélectionner',exact:true}).click();
  assert.equal(await page.locator('[data-piste-select]:checked').count(),2);if(width===390)await page.screenshot({path:'/tmp/piste-bulk-390-selected.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);
  await page.getByLabel('Type',{exact:true}).selectOption('coaching');await page.getByRole('button',{name:'Appliquer les filtres',exact:true}).click();
  assert.equal(await page.locator('[data-piste-select]:checked').count(),1);
  await page.locator('[data-piste-bulk="confirm"]').click();await page.locator('dialog').waitFor();
  assert.ok(await page.evaluate(()=>document.querySelector('dialog').getBoundingClientRect().width<=innerWidth),'dialog '+width);
  await page.getByRole('button',{name:'Annuler',exact:true}).click();
  await page.getByRole('button',{name:'Terminer la sélection',exact:true}).click();
  await page.getByRole('link',{name:'Effacer les filtres',exact:true}).click();
 }
 // A missing server receipt must never be treated as a confirmed permanent deletion.
 omitReceipt=true;await page.goto('https://piste-community-v2-premium.vercel.app/tracks');await page.getByRole('button',{name:'Sélectionner',exact:true}).click();await page.locator('[data-history-session="'+sessionId+'"]').getByRole('checkbox').check();await page.locator('[data-piste-bulk="confirm"]').click();await page.locator('dialog input[value="delete"]').check();await page.locator('dialog [data-confirm]').click();await page.getByText('0 réussi(s) · 0 refusé(s) · 1 échoué(s)',{exact:true}).waitFor();assert.equal(await page.locator('[data-history-session="'+sessionId+'"]').count(),1);assert.equal(deleted,false);omitReceipt='network';await page.locator('[data-piste-bulk="force"]').click();await page.locator('dialog [data-confirm]').click();await page.getByText('0 réussi(s) · 0 refusé(s) · 1 échoué(s)',{exact:true}).waitFor();assert.equal(await page.locator('[data-history-session="'+sessionId+'"]').count(),1);omitReceipt=false;
 // Hide shared record, refresh/reload: it remains hidden while the server data survives.
 projection={...projection,ownerId:'22222222-2222-4222-8222-222222222222'};
 await page.goto('https://piste-community-v2-premium.vercel.app/tracks');
 await page.getByRole('button',{name:'Sélectionner',exact:true}).click();
 await page.locator('[data-history-session="'+sessionId+'"]').getByRole('checkbox').check();
 await page.locator('[data-piste-bulk="confirm"]').click();await page.locator('dialog [data-confirm]').click();
 await page.getByText('1 réussi(s) · 0 refusé(s) · 0 échoué(s)',{exact:true}).waitFor();assert.equal(deleted,false);
 await page.reload();await page.getByRole('heading',{name:'Mes pistes',exact:true}).waitFor();
 await page.waitForFunction(()=>!document.querySelector('[data-history-session="33333333-3333-4333-8333-333333333333"]'));
 assert.equal(await page.locator('[data-history-session="'+sessionId+'"]').count(),0);
 // Prepared tracks use the existing owner store, and their backup precedes local deletion.
 await page.goto('https://piste-community-v2-premium.vercel.app/tracks?category=prepared');await page.getByText('Tracé isolé',{exact:true}).waitFor();await page.getByRole('button',{name:'Sélectionner',exact:true}).waitFor({state:'visible'});assert.equal(await page.locator('[data-prepared-library] [data-track-id]').count(),1,'cloud/local track must count once');
 await page.getByRole('button',{name:'Sélectionner',exact:true}).click();await page.getByRole('button',{name:'Tout sélectionner',exact:true}).click();await page.locator('[data-piste-bulk="confirm"]').click();
 await page.locator('dialog input[value="delete"]').check();await page.locator('dialog [data-confirm]').click();await page.getByText('1 réussi(s) · 0 refusé(s) · 0 échoué(s)',{exact:true}).waitFor();
 assert.equal(await page.locator('[data-track-id="prepared:track-local-1"]').count(),0);
 assert.ok(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('piste-v2-removal-backup:'))));
 await page.reload();assert.equal(await page.locator('[data-track-id="prepared:track-local-1"]').count(),0);
 await page.screenshot({path:'/tmp/piste-bulk-390.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS bulk history: 320/390/430, modal, filter selection intersection, shared hide survives reload, isolated prepared delete and safety backup. No live writes.');
}finally{await browser.close();}
