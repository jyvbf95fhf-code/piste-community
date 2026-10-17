import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const suffix=process.env.CAPTURE_SUFFIX||'after';
const out=path.join(root,'screenshots','official-brand');
const chromePath=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port=()=>new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const value=server.address().port;server.close(()=>resolve(value));});});
const wait=async(fn,label,timeout=15000)=>{const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value;}catch(error){last=error;}await new Promise(resolve=>setTimeout(resolve,100));}throw Error(`Timeout ${label}${last?`: ${last.message}`:''}`);};
await mkdir(out,{recursive:true});
const serverPort=await port(),debugPort=await port(),profile=await mkdtemp(path.join(os.tmpdir(),'piste-home-notifs-'));
const base=`http://localhost:${serverPort}`;
const server=spawn(process.execPath,['tests/official-brand-fixture.mjs'],{cwd:root,env:{...process.env,PORT:String(serverPort)},stdio:'ignore'});
const chrome=spawn(chromePath,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-default-browser-check','--no-proxy-server',`--remote-debugging-port=${debugPort}`,`--user-data-dir=${profile}`,'--window-size=390,844','about:blank'],{stdio:'ignore'});
let socket,id=1;
const pending=new Map(),errors=[],external=[];
const cdp=(method,params={})=>new Promise((resolve,reject)=>{const requestId=id++;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));setTimeout(()=>{if(pending.has(requestId)){pending.delete(requestId);reject(Error(`CDP timeout ${method}`));}},15000).unref?.();});
const evaluate=async expression=>{const response=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.result?.exceptionDetails)throw Error(JSON.stringify(response.result.exceptionDetails));return response.result?.result?.value;};
const delay=()=>new Promise(resolve=>setTimeout(resolve,100));
async function goto(route){await cdp('Page.navigate',{url:`${base}${route}`});try{await wait(()=>evaluate(`document.readyState==='complete'&&Boolean(document.querySelector('.app-shell,.auth-shell'))`),route);}catch(error){throw Error(`${error.message}; state=${JSON.stringify(await evaluate(`({href:location.href,ready:document.readyState,body:document.body?.innerText?.slice(0,120),html:document.documentElement?.innerHTML?.slice(0,320)})`))}; errors=${JSON.stringify(errors)}`);}await delay();}
async function capture(name,selector=null,fullPage=false){if(selector)await evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'center'})`);else await evaluate('(()=>{window.scrollTo(0,0);const main=document.querySelector(".app-shell main");if(main)main.scrollTop=0})()');await delay();const result=await cdp('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:fullPage});await writeFile(path.join(out,`${name}-${suffix}-390.png`),Buffer.from(result.result.data,'base64'));}
try{
 await wait(async()=>{const response=await fetch(base);return response.ok;},'fixture server');
 const targets=await wait(async()=>{try{return (await(await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).filter(x=>x.type==='page');}catch{return null;}},'Chrome');
 socket=new WebSocket(targets[0].webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){pending.get(message.id).resolve(message);pending.delete(message.id);return;}if(message.method==='Runtime.exceptionThrown')errors.push(JSON.stringify(message.params.exceptionDetails));});
 await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Network.enable');
 const snapshot=()=>evaluate(`(()=>({links:[...document.querySelectorAll('a')].map(x=>[x.getAttribute('href'),x.textContent]),images:[...document.images].map(x=>x.getAttribute('src')),boxes:[...document.querySelectorAll('.screen-header,.brand,.home-welcome-logo,.home-intro,.discovery-hero,.feature-grid,.feature-tile,.track-builder-entry,.active-sessions,.twin-card,.explore-section,.bottom-nav')].map(x=>{const r=x.getBoundingClientRect();return [x.className,r.x,r.y,r.width,r.height]})}))()`);
 const preserved=()=>evaluate(`JSON.stringify([...document.querySelectorAll('.twin-card,.twin-card *,.home-intro,.home-intro *,.discovery-hero,.discovery-hero *,.feature-tile,.feature-tile *,.track-builder-entry,.track-builder-entry *,.bottom-nav,.bottom-nav *')].map(x=>[x.outerHTML,...[null,'::before','::after'].map(p=>[...getComputedStyle(x,p)].map(k=>[k,getComputedStyle(x,p).getPropertyValue(k)]))]))`);
 const widths=[];
 for(const width of [320,375,390,430,1024]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await goto('/?baseline=1');const before=await snapshot(),oldStyles=await preserved();
  await goto('/');assert.deepEqual(await snapshot(),before,'Home structure, photos and destinations preserved');assert.equal(await preserved(),oldStyles,'JUMOLF and all other Home blocks preserved');
  assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`));
  assert.ok(await evaluate(`getComputedStyle(document.querySelector('.home-welcome-logo')).backgroundImage.includes('/brand/piste-community-horizontal.svg')`));
  if(width===390)await capture('home-official');widths.push(width);
 }
 for(const width of [320,390,430]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await goto('/auth/login?baseline=1');const main=await evaluate(`document.querySelector('main').outerHTML`);
  await goto('/auth/login');assert.equal(await evaluate(`document.querySelector('main').outerHTML`),main,'login fields, copy, actions and validation attributes preserved');
  assert.ok(await evaluate(`(()=>{const im=document.querySelector('.official-login-logo');const r=im.getBoundingClientRect();return im.complete&&im.naturalWidth>0&&Math.abs(r.width/r.height-421/215)<.01&&r.left>=0&&r.right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth})()`),'responsive complete SVG, no distortion/overflow');
  if(width===390)await capture('login-official');
 }
 const whole=()=>evaluate(`JSON.stringify([...document.querySelectorAll('.app-shell,.auth-shell,.brand,.bottom-nav,h1,h2,h3,form')].map(x=>[x.outerHTML,[...getComputedStyle(x)].map(p=>[p,getComputedStyle(x).getPropertyValue(p)])]))`);
 for(const route of ['/sessions','/auth/signup']){await goto(route+'?baseline=1');const prev=await whole();await goto(route);assert.equal(await whole(),prev,route+' unchanged');}
 await goto('/');
 const alpha=await evaluate(`(async()=>{const im=new Image();im.src='/src/assets/brand/piste-community-horizontal.svg';await im.decode();const c=document.createElement('canvas');c.width=421;c.height=190;const x=c.getContext('2d');x.drawImage(im,0,0,421,190);const d=x.getImageData(0,0,421,190).data;return [[0,0],[420,0],[0,189],[420,189]].map(([a,b])=>d[(b*421+a)*4+3]);})()`);assert.deepEqual(alpha,[0,0,0,0]);
 for(const url of ['/src/manifest.webmanifest','/src/assets/brand/icons/icon-32.png','/src/assets/brand/icons/icon-64.png','/src/assets/brand/icons/icon-180.png','/src/assets/brand/icons/icon-192.png','/src/assets/brand/icons/icon-512.png'])assert.equal((await fetch(base+url)).status,200,url);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,homeWidths:widths,loginWidths:[320,390,430],homeAndJumolfPreserved:true,loginMainUnchanged:true,alpha,errors},null,2));
}finally{socket?.close();server.kill('SIGTERM');chrome.kill('SIGTERM');await new Promise(resolve=>setTimeout(resolve,250));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100}).catch(()=>{});}
