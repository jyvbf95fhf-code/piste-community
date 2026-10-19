// Complete existing app, account transport simulated. No real backend/identity writes.
import {createDogsStore} from '../src/dogs.mjs';
import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname),ownerId='11111111-1111-4111-8111-111111111111';
const gps={provenance:'device-geolocation',startedAt:1792150000000,endedAt:1792150060000,elapsedMs:60000,distanceM:24,segments:[[{latitude:48,longitude:7,timestamp:1792150000000},{latitude:48.0001,longitude:7,timestamp:1792150001000}],[{latitude:49,longitude:8,timestamp:1792150060000}]]};
const projection={id:'real-coaching',phase:'ARCHIVED',version:1,role:'driver',dog:'Ninja QA',search:gps,pose:gps,searchActiveMs:30000,events:[{type:'Rupture',at:1792150001000}],notes:[]};
const saved=new Map(),dogStore=createDogsStore({ownerId,storage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},idFactory:(()=>{let n=0;return ()=>++n===1?'a':'b';})()});dogStore.create({name:'Ninja QA',breed:'Malinois'});dogStore.create({name:'Ninja QA',breed:'Berger allemand'});
const projections=[{...projection,id:'real-coaching',dogRef:{id:'dog-a',ownerId}},{...projection,id:'second-coaching',dogRef:{id:'dog-b',ownerId}},{...projection,id:'unlinked-coaching'}];
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
let authorized=true;const grant={entitlement:'admin_grant',source:'admin_grant',source_id:'qa-only',granted_at:new Date(Date.now()-60000).toISOString(),expires_at:null,revoked_at:null};
try{const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
await context.addInitScript(entries=>{for(const [k,v] of entries)localStorage.setItem(k,v);},[...saved]);
await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());
 if(url.hostname==='shnwqdkiapgcftbnhilh.supabase.co'){const b=req.method()==='POST'?req.postDataJSON():{};return route.fulfill({json:url.pathname.endsWith('/coaching')?(b.operation==='profile'?{id:ownerId,name:'Compte développeur QA',qa:false,permissions:{research:authorized},jumolf_entitlement:authorized?grant:{entitlement:'none'}}:b.operation==='list'?{sessions:projections}:{projection}):{records:[]}});}
 if(url.origin!=='https://science.test')return route.abort();
 if(url.pathname==='/src/vendor/supabase-client.mjs')return route.fulfill({contentType:'text/javascript',body:`export function createClient(url){const user={id:'${ownerId}'};return {supabaseUrl:url,auth:{getUser:async()=>({data:{user}}),getSession:async()=>({data:{session:{user,access_token:'qa'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})}};}`});
 const pathname=/\.(mjs|js|css|png|svg|html)$/.test(url.pathname)?url.pathname:'/index.html';try{return route.fulfill({body:await readFile(path.join(root,pathname)),contentType:/\.(mjs|js)$/.test(pathname)?'text/javascript':pathname.endsWith('.css')?'text/css':pathname.endsWith('.html')?'text/html':pathname.endsWith('.svg')?'image/svg+xml':undefined});}catch{return route.fulfill({status:404,body:''});}
});
await page.goto('https://science.test/jumolf/activate');
for(const key of ['gps','weather','dog_history','ai_analysis','session_comparison'])await page.locator('[data-jumolf-consent="'+key+'"]').check();
await page.locator('[data-jumolf-action="activate"]').click();for(let i=0;i<3;i++)await page.locator('[data-jumolf-action="onboarding-next"]').click();await page.locator('[data-jumolf-action="complete-onboarding"]').click();
await page.getByLabel('Choisir mon chien',{exact:true}).selectOption('dog-a');
await page.locator('[data-jumolf-source="coaching:real-coaching"]').waitFor();assert.equal(await page.locator('[data-jumolf-source="coaching:second-coaching"]').count(),0);assert.equal(await page.locator('[data-jumolf-source="coaching:unlinked-coaching"]').count(),0);
await page.getByRole('button',{name:'Analyser cette séance',exact:true}).click();await page.getByRole('heading',{name:'En un regard',exact:true}).waitFor();await page.getByText('24 m',{exact:true}).waitFor();assert.equal(await page.getByText('Panache principal',{exact:true}).count(),0);
await page.getByRole('link',{name:'Voir les détails scientifiques',exact:true}).click();await page.getByRole('heading',{name:'Carte scientifique multi-couches',exact:true}).waitFor();await page.getByRole('heading',{name:'Lecture synchronisée',exact:true}).waitFor();
await page.getByRole('link',{name:'Mon chien',exact:true}).click();await page.getByRole('link',{name:'Voir mon analyse',exact:true}).waitFor();
for(const width of [320,390,430]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width);}
await page.screenshot({path:'/tmp/jumolf-simple-home.png',fullPage:true});
await page.getByRole('link',{name:'Exercices et progression',exact:true}).click();await page.getByText('Les exercices ciblés et leur suivi automatique sur données réelles ne sont pas encore raccordés.',{exact:false}).waitFor();assert.equal(await page.locator('[data-jumolf-form="hypothesis-review"]').count(),0);
await page.getByRole('link',{name:'Réglages',exact:true}).click();await page.locator('[data-jumolf-consent="gps"]').uncheck();await page.getByRole('link',{name:'Mon chien',exact:true}).click();await page.getByRole('link',{name:'Voir mon analyse',exact:true}).click();assert.equal(await page.getByText('24 m',{exact:true}).count(),0);await page.getByText('indisponible · consentement GPS désactivé',{exact:true}).first().waitFor();
await page.getByRole('link',{name:'Réglages',exact:true}).click();await page.locator('[data-jumolf-consent="dog_history"]').uncheck();await page.getByRole('link',{name:'Mon chien',exact:true}).click();assert.equal(await page.locator('[data-jumolf-dog]').count(),0);
await page.getByText('Outils avancés',{exact:true}).click();await page.getByText('Démonstrations · données fictives',{exact:true}).click();await page.getByRole('link',{name:'Analyse de démonstration',exact:true}).click();await page.getByText('Toutes les valeurs et géométries de cette page sont fictives. Aucune mesure réelle n’est représentée.',{exact:true}).waitFor();
await page.goto('https://science.test/scientific/sessions');await page.locator('a[href="/scientific/session/coaching%3Areal-coaching"]').waitFor();assert.ok(!(await page.locator('body').innerText()).includes('150 sessions'));
authorized=false;await page.goto('https://science.test/scientific');await page.getByText('Accès restreint aux membres autorisés.',{exact:true}).waitFor();assert.ok(!(await page.locator('body').innerText()).includes('Ninja QA'));
await page.goto('https://science.test/jumolf/session/coaching%3Areal-coaching');assert.equal(await page.locator('[data-jumolf-action="analyze"]').count(),0);
await page.goto('https://science.test/profile/research');await page.getByText('Aucun dossier réel n’est transmis à un corpus partagé.',{exact:false}).waitFor();assert.deepEqual(errors,[]);
console.log('PASS simplified JUMOLF: two same-name personal dogs, exact association, quick analysis, advanced views, consent revocation, separate demo, real exercise blocker, mobile 320/390/430, Science authorization and revoked grant; no real network writes');
}finally{await browser.close();}
