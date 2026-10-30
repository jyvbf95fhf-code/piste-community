// Complete app, local synthetic account services only. No account or mail writes.
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname),origin='https://piste-community-v2-premium.vercel.app',owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true}),context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());
 if(url.hostname==='shnwqdkiapgcftbnhilh.supabase.co'){const b=req.method()==='POST'?req.postDataJSON():{},id=req.headers().authorization?.replace('Bearer ','')||owner;
  if(url.pathname.endsWith('/ops-live'))return route.fulfill({json:{result:[]}});
  return route.fulfill({json:b.operation==='profile'?{id,name:'Audit',qa:false,permissions:{research:true,premium:false,admin:false}}:b.operation==='list'?{sessions:[]}:b.operation==='catalogue'?{sessions:[],records:[],hidden:[],cursor:null}:b.operation==='coaching-inbox'?{invitations:[],notifications:[]}:{records:[],cursor:null}});
 }
 if(url.origin!==origin)return route.abort();
 if(url.pathname==='/src/vendor/supabase-client.mjs')return route.fulfill({contentType:'text/javascript',body:`export function createClient(url){const user=()=>({id:localStorage.getItem('audit-owner')||'${owner}'});return {supabaseUrl:url,auth:{getUser:async()=>({data:{user:user()}}),getSession:async()=>({data:{session:{user:user(),access_token:user().id}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},channel(){return {on(){return this},subscribe(){return this}}},removeChannel:async()=>{}}}`});
 const file=/\.(mjs|js|css|png|jpg|svg|html|webmanifest)$/.test(url.pathname)?url.pathname:'/index.html';try{return route.fulfill({body:await readFile(path.join(root,file)),contentType:/\.(mjs|js)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':undefined});}catch{return route.fulfill({status:404,body:''});}
});
const go=p=>page.goto(origin+p),create=async name=>{const f=page.locator('[data-scientific-form=cohort]');await f.locator('[name=name]').fill(name);await f.locator('button[type=submit],button:not([type])').first().click();};
try{
 await go('/profile/preferences');for(const width of [320,390,430]){await page.setViewportSize({width,height:844});assert.ok(await page.locator('[data-profile-preference=theme]').isDisabled());await page.locator('#profile-preferences-unavailable').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await go('/scientific/corpus');assert.equal(await page.locator('[data-scientific-corpus=true]').count(),0);assert.equal(await page.locator('[data-scientific-corpus-form=cohort]').count(),0);
 await go('/scientific/cohorts');await create('Audit durable');await page.getByText('Audit durable',{exact:true}).first().waitFor();await page.reload();await page.getByText('Audit durable',{exact:true}).first().waitFor();
 await page.evaluate(id=>localStorage.setItem('audit-owner',id),other);await page.reload();assert.equal(await page.getByText('Audit durable',{exact:true}).count(),0);
 await page.evaluate(id=>localStorage.setItem('audit-owner',id),owner);await page.reload();await page.getByText('Audit durable',{exact:true}).first().waitFor();
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('piste-v2-scientific-work:'))throw Error('quota');return original.call(this,k,v);};});await create('Must not save');await page.getByText(/Enregistrement Science impossible/).first().waitFor();await page.reload();assert.equal(await page.getByText('Must not save',{exact:true}).count(),0);await page.getByText('Audit durable',{exact:true}).first().waitFor();
 assert.deepEqual(errors,[]);console.log('PASS audit corrections: unavailable preferences 320/390/430, real app Science cohort survives reload, account isolation, quota failure without false saved work. Synthetic accounts only.');
}finally{await browser.close();}
