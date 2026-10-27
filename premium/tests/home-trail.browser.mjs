// Render real home components with production styles; no account/backend requests.
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {HomeScreen} from '../src/screens.mjs';
import {AppShell} from '../src/components.mjs';
import {mock} from '../src/data.mjs';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const template=await readFile(path.join(root,'index.html'),'utf8');
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){const content=HomeScreen(url.searchParams.has('ordinary')?{name:'Camille',permissions:{}}:mock.user,url.searchParams.has('long')?mock.activeSessions:[]);res.setHeader('Content-Type','text/html');res.end(template.replace(/<script[^>]*>[\s\S]*?<\/script>/g,'').replace('<div id="app"></div>',AppShell(content,'/','Sébastien','S','base',0,{realMode:true})));return;}const file=path.join(root,url.pathname);res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.png')?'image/png':'text/javascript');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH,args:['--no-sandbox']});
try{const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.log(m.text());});let checks=0;
for(const width of [320,390,430,1280])for(const state of ['', '?ordinary=1','?long=1']){
 await page.setViewportSize({width,height:844});await page.goto(`http://127.0.0.1:${server.address().port}/${state}`);await page.emulateMedia({reducedMotion:'reduce'});
 const values=await page.locator('.home-shell').evaluate(el=>({pointer:getComputedStyle(el,'::before').pointerEvents,background:getComputedStyle(el).backgroundImage,trail:getComputedStyle(el,'::before').backgroundImage,overflow:document.documentElement.scrollWidth>innerWidth}));
 assert.equal(values.pointer,'none');assert.match(values.background,/radial-gradient/);assert.match(values.trail,/home-trail.svg/);assert.equal(values.overflow,false);
 for(const href of ['/new-session','/tracks','/track-builder','/jumolf']){const link=page.locator(`main a[href="${href}"]`).first();await link.scrollIntoViewIfNeeded();assert.ok(await link.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),href);}
 if(width===390&&state===''){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'/tmp/piste-home-trail.png',fullPage:true});}
 await page.locator('.home-shell').evaluate(el=>el.classList.remove('home-shell'));assert.equal(await page.locator('.app-shell').evaluate(el=>getComputedStyle(el,'::before').content),'none');checks++;
}assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'PASS',checks,widths:[320,390,430,1280],pageErrors:errors.length}));
}finally{await browser.close();server.close();}
