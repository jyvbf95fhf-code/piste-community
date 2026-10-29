// Local-only integration: bundled SDK and complete app; synthetic Auth, no live e-mails.
import {createMemoryPersistenceServer} from './helpers/persistence-memory-repository.mjs';
import {createPersonalDataHandler} from '../src/server/personal-data-http.mjs';
import {chromium} from '@playwright/test';import chromiumBundle from '@sparticuz/chromium';
import {createRemoteSession,projectRemoteSession} from '../src/server/coaching-service.mjs';
import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH||await chromiumBundle.executablePath(),args:chromiumBundle.args,headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],calls=[];
 let enabled=true,cloudOnline=true;const accountServer=createMemoryPersistenceServer(); const sessionId='33333333-3333-4333-8333-333333333333'; let projection;
 const user={id:'11111111-1111-4111-8111-111111111111',email:'qa@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{role:'admin'}};
 const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');let token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})+'.'+encode('synthetic');
 projection=projectRemoteSession(createRemoteSession({id:sessionId,owner:{id:user.id,name:'QA'},role:'driver',mode:'normal',dogName:'Nox',scenario:'external_traceur',now:Date.now()}),user.id,Date.now());
 const headers={'access-control-allow-origin':'https://piste-community-v2-premium.vercel.app','access-control-allow-headers':'*','access-control-allow-methods':'GET,PUT,POST,OPTIONS'};
 page.setDefaultTimeout(12000);page.on('pageerror',e=>{errors.push(e.message);console.error('APP ERROR:',e.message);});
 await page.route('https://piste-community-v2-premium.vercel.app/**',async route=>{const path=new URL(route.request().url()).pathname;const source=path.endsWith('.mjs')||path.endsWith('.css')||path.endsWith('.js')||path.includes('/assets/')||path.endsWith('.html')?path:'/index.html';try{const body=await readFile(new URL('..'+source,import.meta.url));await route.fulfill({body,contentType:source.endsWith('.mjs')||source.endsWith('.js')?'text/javascript':source.endsWith('.css')?'text/css':source.endsWith('.html')?'text/html':'image/png'});}catch{await route.fulfill({status:404,body:''});}});
 await page.route('https://shnwqdkiapgcftbnhilh.supabase.co/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;calls.push([req.method(),path]);
  if(req.method()==='OPTIONS')return route.fulfill({status:200,headers,body:''});
  if(path==='/functions/v1/personal-data'){if(!cloudOnline)return route.abort();const handler=createPersonalDataHandler({authenticate:async()=>({id:user.id}),enabled:async()=>enabled,repositoryFor:()=>accountServer.client(user.id)}),response=await handler(new Request(req.url(),{method:'POST',headers:{authorization:'Bearer '+token,origin:'https://piste-community-v2-premium.vercel.app','content-type':'application/json'},body:req.postData()}));return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});}
  let json=user,status=200;
  if(path==='/auth/v1/token')json={access_token:token,refresh_token:'synthetic',expires_in:3600,token_type:'bearer',user};
  if(path==='/auth/v1/signup')json={...user,id:'22222222-2222-4222-8222-222222222222',identities:[]};
  if(path==='/auth/v1/recover'){status=429;json={code:'over_email_send_rate_limit',msg:'email rate limit exceeded'};}
  if(path==='/functions/v1/coaching'){const data=req.postDataJSON();if(!enabled){status=403;json={error:'Compte non autorisé pour ce pilote.'};}else json=data.operation==='profile'?{id:user.id,name:'Compte réel',qa:false}:data.operation==='list'?{sessions:[projection]}:{projection};}
  await route.fulfill({status,headers,json});
 });

 await page.goto('https://piste-community-v2-premium.vercel.app/auth/login');
 await page.getByLabel('Email',{exact:true}).fill('qa@example.invalid');await page.getByLabel('Mot de passe',{exact:true}).fill('synthetic-existing');
 await page.getByRole('button',{name:'Se connecter',exact:true}).click();
 await page.getByText('Prêts pour le terrain ?').waitFor();

 await page.goto('https://piste-community-v2-premium.vercel.app/profile/preferences');await page.locator('[data-account-sync-status][data-sync-state=online]').waitFor();cloudOnline=false;
 await page.locator('[data-profile-preference="theme"]').selectOption('dark');
 await page.reload();assert.equal(await page.locator('[data-profile-preference="theme"]').inputValue(),'dark');
 await page.locator('[data-account-sync-status][data-sync-state=error]').waitFor();const firstOwner=user.id,firstPending=await page.evaluate(async owner=>{const {createPersistenceJournal}=await import('/src/persistence-journal.mjs');const j=createPersistenceJournal({ownerId:owner});try{return await j.pending();}finally{j.dispose();}},firstOwner);assert.ok(firstPending.length>0);
 await page.goto('https://piste-community-v2-premium.vercel.app/profile/account');await page.getByRole('button',{name:'Se déconnecter',exact:true}).click();cloudOnline=true;await page.getByRole('button',{name:'Se connecter',exact:true}).waitFor();
 user.id='44444444-4444-4444-8444-444444444444';token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})+'.'+encode('synthetic');
 await page.getByLabel('Email',{exact:true}).fill('second@example.invalid');await page.getByLabel('Mot de passe',{exact:true}).fill('synthetic-existing');await page.getByRole('button',{name:'Se connecter',exact:true}).click();await page.getByText('Prêts pour le terrain ?').waitFor();
 await page.goto('https://piste-community-v2-premium.vercel.app/profile/preferences');assert.equal(await page.locator('[data-profile-preference="theme"]').inputValue(),'system');
 const retained=await page.evaluate(async owner=>{const {createPersistenceJournal}=await import('/src/persistence-journal.mjs');const j=createPersistenceJournal({ownerId:owner});try{return await j.pending();}finally{j.dispose();}},firstOwner);assert.equal(retained[0].commandId,firstPending[0].commandId);assert.equal((await accountServer.client(firstOwner).list({kind:'profile'})).records[0].payload.preferences.theme,'system');
 await page.locator('[data-profile-preference="theme"]').selectOption('light');await page.reload();assert.equal(await page.locator('[data-profile-preference="theme"]').inputValue(),'light');
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('piste-v2-profile:'))throw Error('simulated quota');return original.call(this,key,value);};});
 await page.locator('[data-profile-preference="theme"]').selectOption('dark');await page.getByText('Profil non enregistré : stockage local indisponible.',{exact:true}).waitFor();assert.equal(await page.locator('[data-profile-preference="theme"]').inputValue(),'light');
 await page.reload();await page.goto('https://piste-community-v2-premium.vercel.app/profile/account');await page.getByRole('button',{name:'Se déconnecter',exact:true}).click();await page.getByRole('button',{name:'Se connecter',exact:true}).waitFor();user.id=firstOwner;token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})+'.'+encode('synthetic');await page.getByLabel('Email',{exact:true}).fill('qa@example.invalid');await page.getByLabel('Mot de passe',{exact:true}).fill('synthetic-existing');await page.getByRole('button',{name:'Se connecter',exact:true}).click();await page.getByText('Prêts pour le terrain ?').waitFor();await page.goto('https://piste-community-v2-premium.vercel.app/profile/preferences');await page.locator('[data-account-sync-status][data-sync-state=online]').waitFor();assert.equal(await page.locator('[data-profile-preference=theme]').inputValue(),'dark');assert.equal((await accountServer.client(firstOwner).list({kind:'profile'})).records[0].payload.preferences.theme,'dark');
 assert.deepEqual(errors,[]);console.log('PASS full app synthetic SDK/HTTP: queued offline edit survives logout, second-account isolation, original-account reconnect flush, reload and local quota rejection.');
}finally{await browser.close();}
