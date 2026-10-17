import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const suffix=process.env.CAPTURE_SUFFIX||'after';
const out=path.join(root,'screenshots','shared-brand');
const chromePath=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port=()=>new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const value=server.address().port;server.close(()=>resolve(value));});});
const wait=async(fn,label,timeout=15000)=>{const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value;}catch(error){last=error;}await new Promise(resolve=>setTimeout(resolve,100));}throw Error(`Timeout ${label}${last?`: ${last.message}`:''}`);};
await mkdir(out,{recursive:true});
const serverPort=await port(),debugPort=await port(),profile=await mkdtemp(path.join(os.tmpdir(),'piste-home-notifs-'));
const base=`http://localhost:${serverPort}`;
const server=spawn(process.execPath,['tests/shared-brand-fixture.mjs'],{cwd:root,env:{...process.env,PORT:String(serverPort)},stdio:'ignore'});
const chrome=spawn(chromePath,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-default-browser-check','--no-proxy-server',`--remote-debugging-port=${debugPort}`,`--user-data-dir=${profile}`,'--window-size=390,844','about:blank'],{stdio:'ignore'});
let socket,id=1;
const pending=new Map(),errors=[],external=[];
const cdp=(method,params={})=>new Promise((resolve,reject)=>{const requestId=id++;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));setTimeout(()=>{if(pending.has(requestId)){pending.delete(requestId);reject(Error(`CDP timeout ${method}`));}},15000).unref?.();});
const evaluate=async expression=>{const response=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.result?.exceptionDetails)throw Error(JSON.stringify(response.result.exceptionDetails));return response.result?.result?.value;};
const delay=()=>new Promise(resolve=>setTimeout(resolve,100));
async function goto(route){await cdp('Page.navigate',{url:`${base}${route}`});try{await wait(()=>evaluate(`document.readyState==='complete'&&Boolean(document.querySelector('.app-shell,.auth-shell'))`),route);}catch(error){throw Error(`${error.message}; state=${JSON.stringify(await evaluate(`({href:location.href,ready:document.readyState,body:document.body?.innerText?.slice(0,120),html:document.documentElement?.innerHTML?.slice(0,320)})`))}; errors=${JSON.stringify(errors)}`);}await delay();}
async function capture(name,selector=null,fullPage=false){if(selector)await evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'center'})`);else await evaluate('(()=>{window.scrollTo(0,0);const main=document.querySelector(".app-shell main");if(main)main.scrollTop=0})()');await delay();const result=await cdp('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:fullPage});await writeFile(path.join(out,`${name}-${suffix}-390.png`),Buffer.from(result.result.data,'base64'));}
try{
 await wait(async()=>{const r=await fetch(base);return r.ok;},'fixture server');
 const targets=await wait(async()=>{try{return (await(await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).filter(x=>x.type==='page');}catch{return null;}},'Chrome');
 socket=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){pending.get(m.id).resolve(m);pending.delete(m.id);return;}if(m.method==='Runtime.exceptionThrown')errors.push(JSON.stringify(m.params.exceptionDetails));});
 await cdp('Page.enable');await cdp('Runtime.enable');
 const measure=()=>evaluate(`(()=>{const r=x=>{const b=x.getBoundingClientRect();return [b.x,b.y,b.width,b.height]};return{header:r(document.querySelector('.screen-header')),actions:r(document.querySelector('.header-actions')),main:r(document.querySelector('#main')),html:document.querySelector('#main').innerHTML,nav:document.querySelector('.bottom-nav')?.outerHTML,scroll:document.documentElement.scrollWidth}})()`);
 const cases=[];
 for(const width of [320,390,430]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
  for(const route of ['/sessions','/operational','/live','/new-session','/dogs','/profile','/scientific','/admin','/community','/notifications','/track-builder']){
   await goto(route+'?baseline=1');const before=await measure();await goto(route);const after=await measure();assert.deepEqual(after,before,'no displaced header actions or page content: '+route+' '+width);
   assert.ok(await evaluate(`(()=>{const i=document.querySelector('.shared-official-logo'),r=i.getBoundingClientRect(),a=document.querySelector('.header-actions').getBoundingClientRect();return i.complete&&i.naturalWidth>0&&r.left>=0&&r.right<=a.left&&r.bottom<=document.querySelector('.screen-header').getBoundingClientRect().bottom})()`),'logo loaded, inside header, no overlap');
   if(width===390&&['/sessions','/community','/scientific','/admin'].includes(route))await capture(route.slice(1));cases.push({route,width});
  }
 }
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 const full=()=>evaluate(`JSON.stringify([...document.querySelectorAll('.app-shell,.app-shell *,.auth-shell,.auth-shell *')].map(x=>[x.outerHTML,[...getComputedStyle(x)].map(p=>[p,getComputedStyle(x).getPropertyValue(p)])]))`);
 for(const route of ['/','/auth/login','/auth/signup']){await goto(route+'?baseline=1');const before=await full();await goto(route);assert.equal(await full(),before,route+' exactly preserved');}
 for(const route of ['/sessions/session-id/debrief','/live/ops/id','/coaching/session','/dogs/id','/profile/access','/scientific/sessions/id','/admin/member/id']){await goto(route+'?baseline=1');const before=await measure();await goto(route);assert.deepEqual(await measure(),before,route);assert.equal(await evaluate(`document.querySelectorAll('.shared-official-logo').length`),1);}
 await goto('/operational/visual-cockpit');assert.equal(await evaluate(`getComputedStyle(document.querySelector('.screen-header')).display`),'none','terrain controls keep all available space');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,mainCases:cases.length,subscreens:7,preserved:['Home','Auth','terrain cockpit','navigation','page positions'],errors},null,2));
}finally{socket?.close();server.kill('SIGTERM');chrome.kill('SIGTERM');await new Promise(resolve=>setTimeout(resolve,250));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100}).catch(()=>{});}
