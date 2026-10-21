// Full application with simulated account transport; no backend writes.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {projectVerifiedCapabilities} from '../src/server/account-capabilities.mjs';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const ids={owner:'11111111-1111-4111-8111-111111111111',member:'22222222-2222-4222-8222-222222222222',ordinary:'33333333-3333-4333-8333-333333333333'};
let actor='owner',revoked=false,checks=0;const errors=[];
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});let page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());
 if(url.hostname==='shnwqdkiapgcftbnhilh.supabase.co'){
  const b=req.method()==='POST'?req.postDataJSON():{};let json={records:[]};
  if(b.operation==='profile'){const id=ids[actor],meta=actor==='owner'?{admin_role:'owner_admin'}:actor==='member'&&!revoked?{premium_entitlement:{entitlement:'premium',source:'admin_grant',granted_at:'2026-01-01T00:00:00Z'}}:{};json={id,name:'QA '+actor,...projectVerifiedCapabilities({id,app_metadata:meta},{id,enabled:true})};}
  else if(b.operation==='authorize-feature'){if(actor==='ordinary'||revoked)return route.fulfill({status:403,json:{error:'Accès refusé'}});json={};}
  else if(b.operation==='list')json={sessions:[]};else if(b.operation==='coaching-inbox')json={invitations:[],notifications:[]};else if(b.operation==='contacts')json={contacts:[]};
  return route.fulfill({json});
 }
 if(url.origin!=='https://science.test')return route.abort();
 if(url.pathname==='/src/vendor/supabase-client.mjs')return route.fulfill({contentType:'text/javascript',body:`export function createClient(url){const user=()=>{const id=localStorage.getItem('qa-user');return id?{id}:null;};return {supabaseUrl:url,channel(){return {on(){return this;},subscribe(cb){cb('SUBSCRIBED');return this;}};},removeChannel:async()=>{},auth:{getUser:async()=>({data:{user:user()}}),getSession:async()=>({data:{session:user()?{user:user(),access_token:'qa'}:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signInWithPassword:async({email})=>{localStorage.setItem('qa-user',email.split('@')[0]);return {data:{user:user()}};},signOut:async()=>{localStorage.removeItem('qa-user');return {};}}};}`});
 const pathname=/\.(mjs|js|css|png|svg|html|webmanifest)$/.test(url.pathname)?url.pathname:'/index.html';
 try{return route.fulfill({body:await readFile(path.join(root,pathname)),contentType:/\.(mjs|js)$/.test(pathname)?'text/javascript':pathname.endsWith('.css')?'text/css':pathname.endsWith('.html')?'text/html':undefined});}catch{return route.fulfill({status:404,body:''});}
});
const go=route=>page.goto('https://science.test'+route);
async function login(who){actor=who;await go('/auth/login');await page.locator('[name="email"]').fill(ids[who]+'@example.test');await page.locator('[name="password"]').fill('QA-password-123');await page.locator('form[data-auth="login"] button[type="submit"]').click();await page.waitForURL(u=>!u.pathname.startsWith('/auth'));}
async function activate(){await go('/jumolf/activate');await page.locator('[data-jumolf-consent="gps"]').check();await page.locator('[data-jumolf-action="activate"]').click();for(let i=0;i<3;i++)await page.locator('[data-jumolf-action="onboarding-next"]').click();await page.locator('[data-jumolf-action="complete-onboarding"]').click();await page.waitForURL(u=>u.pathname==='/jumolf');await page.getByRole('navigation',{name:'Navigation JUMOLF',exact:true}).waitFor();}
async function settings(enabled=true,gps=true){await go('/jumolf/settings');await page.getByRole('heading',{name:'Réglages JUMOLF'}).waitFor();assert.equal(await page.locator('[data-jumolf-consent="gps"]').isChecked(),gps);assert.equal(await page.locator('[data-jumolf-action="deactivate"]').count(),Number(enabled));checks++;}
async function logout(){await go('/profile/account');await page.locator('[data-action="logout"]').click();await page.waitForURL('**/auth');}
try{
 await login('owner');await activate();await settings();await page.reload();await page.getByRole('heading',{name:'Réglages JUMOLF'}).waitFor();assert.equal(await page.locator('[data-jumolf-consent="gps"]').isChecked(),true);checks++;
 for(const width of [320,390,430,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);checks++;}
 await logout();await login('member');await go('/jumolf');assert.equal(await page.locator('[data-jumolf-action="deactivate"]').count(),0);await activate();await settings();await page.locator('[data-jumolf-consent="gps"]').uncheck();await page.reload();await page.getByRole('heading',{name:'Réglages JUMOLF'}).waitFor();assert.equal(await page.locator('[data-jumolf-consent="gps"]').isChecked(),false);checks++;
 await logout();await login('owner');await settings(true,true);await logout();await login('member');await settings(true,false);
 // Page closure retains device choices.
 await page.close();page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await settings(true,false);
 revoked=true;await go('/jumolf');await page.waitForTimeout(200);assert.equal(await page.getByRole('heading',{name:'Réglages JUMOLF'}).count(),0);assert.equal(await page.locator('[data-jumolf-action="activate"]').count(),0);checks++;
 revoked=false;await logout();await login('ordinary');await go('/jumolf');await page.waitForTimeout(200);assert.equal(await page.locator('[data-jumolf-action="activate"]').count(),0);checks++;
 await logout();await login('member');await settings(true,false);await page.locator('[data-jumolf-action="deactivate"]').click();await logout();await login('member');await go('/jumolf');assert.equal(await page.getByRole('heading',{name:'Réglages JUMOLF'}).count(),0);checks++;
 await page.evaluate(id=>localStorage.setItem('piste-v2-jumolf-preferences:'+id,'{'),ids.member);await go('/jumolf');await page.getByRole('alert').filter({hasText:'Préférences JUMOLF indisponibles'}).waitFor();checks++;
 await activate();await settings(true,true);await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('piste-v2-jumolf-preferences:'))throw Error('quota QA');return original.call(this,key,value);};});await page.locator('[data-jumolf-action="deactivate"]').click();await page.getByRole('alert').filter({hasText:'mémorisation sur cet appareil a échoué'}).waitFor();checks++;
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,widths:[320,390,430,1280],accounts:3,pageErrors:errors.length}));
}finally{await browser.close();}
