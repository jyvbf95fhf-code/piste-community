// Browser + actual handler/reducer/Postgres locally. All external requests intercepted.
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {readFile,mkdir} from 'node:fs/promises';import path from 'node:path';
import {coachingInboxFixture,gmail,icloud} from './fixtures/coaching-inbox-db.mjs';
const root=path.resolve(new URL('..',import.meta.url).pathname),origin='https://piste-community-v2-premium.vercel.app',f=await coachingInboxFixture();
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});const errors=[];let lastPage;
async function account(uid){const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());
 if(url.hostname==='shnwqdkiapgcftbnhilh.supabase.co'){if(url.pathname.endsWith('/coaching')){const r=await f.handler(new Request(req.url(),{method:req.method(),headers:req.headers(),...(req.method()==='POST'?{body:req.postData()}:{})}));return route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:await r.text()});}if(url.pathname.endsWith('/personal-data'))return route.fulfill({json:{records:[],version:1}});return route.fulfill({json:{sessions:[],invitations:[],notifications:[],records:[]}});}
 if(url.origin!==origin)return route.abort();
 if(url.pathname==='/src/vendor/supabase-client.mjs')return route.fulfill({contentType:'text/javascript',body:`export function createClient(url){const user={id:'${uid}'};return {supabaseUrl:url,auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user,access_token:user.id}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})},channel:()=>({on(){return this},subscribe(){return this}}),removeChannel:async()=>{}};}`});
 const file=/\.(mjs|js|css|png|svg|html|webmanifest)$/.test(url.pathname)?url.pathname:'/index.html';try{return route.fulfill({body:await readFile(path.join(root,file)),contentType:/\.(mjs|js)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':undefined});}catch{return route.fulfill({status:404,body:''});}
 });const page=await context.newPage();lastPage=page;page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(30000);return {page,context};}
try{const owner=await account(gmail),guest=await account(icloud),id=await f.create();
 await guest.page.goto(origin+'/');await guest.page.getByRole('heading',{name:'Invitation Coaching',exact:true}).waitFor();assert.match(await guest.page.locator('.coaching-invitation').innerText(),/Sébastien[\s\S]*Traceur/);
 assert.match(await guest.page.locator('.header-actions a.notification').getAttribute('aria-label'),/1 non lue/);
 await guest.page.getByRole('button',{name:'Actualiser',exact:true}).click();await guest.page.getByText(/Actualisé à/).waitFor();
 await guest.page.goto(origin+'/notifications');await guest.page.locator('.coaching-invitation').waitFor();await guest.page.goto(origin+'/');await guest.page.locator('.coaching-invitation').waitFor();
 await mkdir('/tmp/coaching-invitation-qa',{recursive:true});await guest.page.screenshot({path:'/tmp/coaching-invitation-qa/home.png',fullPage:true});
 await owner.page.goto(origin+'/');await owner.page.locator(`a[href="/coaching/session?session=${id}"]`).first().waitFor();
 await guest.page.reload();await guest.page.getByRole('button',{name:'Rejoindre la session',exact:true}).waitFor();await guest.page.getByRole('button',{name:'Rejoindre la session',exact:true}).click();await guest.page.waitForURL('**/coaching/session?session='+id);await guest.page.locator(`[data-remote-session-id="${id}"]`).waitFor({state:'attached'});await guest.page.getByRole('heading',{name:'Pose GPS · Nox'}).waitFor();
 await guest.page.goto(origin+'/sessions');await guest.page.locator(`a[href="/coaching/session?session=${id}"]`).first().waitFor();assert.equal(await guest.page.locator('.coaching-invitation').count(),0);
 const inverse=await f.create(icloud,gmail,'driver');await owner.page.goto(origin+'/sessions');await owner.page.locator('.coaching-invitation').waitFor();await owner.page.getByRole('button',{name:'Rejoindre la session',exact:true}).click();await owner.page.waitForURL('**/coaching/session?session='+inverse);await owner.page.locator(`[data-remote-session-id="${inverse}"]`).waitFor({state:'attached'});await owner.page.getByRole('heading',{name:'Recherche GPS · Nox'}).waitFor();
 const refused=await f.create();await guest.page.goto(origin+'/');await guest.page.getByRole('button',{name:'Refuser',exact:true}).click();await guest.page.waitForFunction(()=>!document.querySelector('.coaching-invitation'));await guest.page.reload();await guest.page.getByRole('heading',{name:'Invitations Coaching',exact:true}).waitFor();assert.equal(await guest.page.locator('.coaching-invitation').count(),0);await f.call(icloud,{operation:'read',sessionId:refused},403);
 const foreground=await f.create();await guest.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await guest.page.locator(`[data-coaching-invitation][data-session-id="${foreground}"]`).first().waitFor();
 for(const width of [320,390,430]){await guest.page.setViewportSize({width,height:844});assert.ok(await guest.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await guest.page.goto(origin+'/dogs/new');const dogName=guest.page.locator('[name=name]');await dogName.fill('Brouillon conservé');await guest.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await guest.page.waitForTimeout(350);assert.equal(await dogName.inputValue(),'Brouillon conservé');
 // Full creation from an account with no dog, followed by pose before guest acceptance.
 await owner.page.goto(origin+'/new-session');await owner.page.locator('[data-wizard-step="mode"]').waitFor();
 await owner.page.locator('[data-coaching="creator"][data-role="traceur"]').click();
 await owner.page.locator('[data-coaching-choice="mode"][data-value="full_blind"]').click();
 await owner.page.locator('[data-coaching-choice="traceType"][data-value="direct"]').click();
 await owner.page.getByRole('button',{name:'Continuer',exact:true}).click();
 await owner.page.locator('[data-wizard-step="roles"]').waitFor();
 await owner.page.locator('[data-coaching-role="driver"]').selectOption(icloud);
 await owner.page.getByRole('button',{name:'Continuer',exact:true}).click();
 await owner.page.getByRole('button',{name:'Créer la session',exact:true}).click();
 await owner.page.locator('[data-remote-session-id]').waitFor({state:'attached'});
 const created=await owner.page.locator('[data-remote-session-id]').getAttribute('data-remote-session-id');
 let p=(await f.call(gmail,{operation:'read',sessionId:created})).projection;
 assert.equal(p.dog,'Chien non renseigné');
 const at=Date.now();await f.call(gmail,{operation:'command',sessionId:created,commandId:crypto.randomUUID(),expectedVersion:p.version,type:'start-pose',payload:{fix:{timestamp:at,coords:{latitude:48,longitude:7,accuracy:5}}}});
 await guest.page.goto(origin+'/');await guest.page.locator(`[data-coaching-invitation][data-session-id="${created}"]`).first().waitFor();
 await guest.page.locator(`[data-coaching-invitation="accept"][data-session-id="${created}"]`).click();
 await guest.page.waitForURL('**/coaching/session?session='+created);
 await guest.page.locator('[data-remote-phase="LAYING"]').waitFor({state:'attached'});
 p=(await f.call(icloud,{operation:'read',sessionId:created})).projection;assert.equal(p.pose,null);assert.equal(p.mode,'full_blind');
 assert.deepEqual(errors,[]);console.log('PASS: home, organizer shortcut, reload, accept both directions, Sessions, refuse, foreground, mobile widths, refresh feedback, bell + notifications, no-dog Traceur creation, late Double blind driver join; no live writes.');
}catch(e){if(lastPage){await lastPage.screenshot({path:'/tmp/coaching-invitation-failure.png',fullPage:true});console.log(await lastPage.locator('body').innerText());console.log(errors);}throw e;}finally{await browser.close();await f.db.close();}
