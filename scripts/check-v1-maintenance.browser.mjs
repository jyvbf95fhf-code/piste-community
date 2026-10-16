const {chromium}=await import(process.env.V1_PLAYWRIGHT_MODULE||'@playwright/test');
import http from 'node:http';import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const root=new URL('..',import.meta.url).pathname.replace(/\/$/,'');const config=JSON.parse(await readFile(root+'/vercel.json','utf8'));const oldSw=await readFile(root+'/sw.js');let legacy=true;
const server=http.createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;
res.setHeader('Cache-Control','no-store');if(pathname==='/sw.js'){res.setHeader('Content-Type','text/javascript');res.end(legacy?oldSw:await readFile(root+'/.v1-maintenance/sw.js'));return;}
if(legacy){res.setHeader('Content-Type',pathname.endsWith('.js')?'text/javascript':'text/html');res.end(pathname.endsWith('.js')?'':`<!doctype html><h1>V1</h1><script>navigator.serviceWorker.register('/sw.js')</script>`);return;}
for(const rule of config.headers)if(new RegExp('^'+rule.source+'$').test(pathname))for(const h of rule.headers)res.setHeader(h.key,h.value);
const dest=config.rewrites.find(r=>new RegExp('^'+r.source+'$').test(pathname)).destination;
res.setHeader('Content-Type',dest.endsWith('.svg')?'image/svg+xml':'text/html; charset=utf-8');res.end(await readFile(root+'/.v1-maintenance'+dest));}catch(e){res.writeHead(500);res.end(e.message);}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
try{const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(origin);await page.evaluate(async()=>{localStorage.setItem('qa-preserved-record','existing-local-data');await navigator.serviceWorker.ready;});await page.reload();assert.equal(await page.locator('h1').innerText(),'V1');
legacy=false;await page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration()).update();});await page.getByRole('heading',{name:'Bientôt de retour',exact:true}).waitFor({timeout:20000});
assert.equal(await page.evaluate(()=>localStorage.getItem('qa-preserved-record')),'existing-local-data');assert.deepEqual(await page.evaluate(()=>caches.keys()),['piste-community-maintenance-20261016']);
for(const url of ['/index.html#coaching','/admin','/coaching/123?invite=qa','/app.js?v=1049-1','/config.js','/live/123']){await page.goto(origin+url);await page.getByRole('heading',{name:'Bientôt de retour',exact:true}).waitFor();}
assert.equal(await page.locator('button,input,form').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await page.setViewportSize({width:1440,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await context.setOffline(true);await page.reload();await page.getByRole('heading',{name:'Bientôt de retour',exact:true}).waitFor();assert.deepEqual(errors,[]);
console.log('PASS: old V10.55 worker replaced, caches retired, local records retained, 6 direct links, mobile/desktop, offline maintenance; zero JS errors');
}finally{await browser.close();await new Promise(r=>server.close(r));}
