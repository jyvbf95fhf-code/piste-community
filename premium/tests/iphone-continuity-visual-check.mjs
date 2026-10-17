import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const suffix=process.env.CAPTURE_SUFFIX||'after';
const out=path.join(root,'screenshots','iphone-continuity');
const chromePath=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port=()=>new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const value=server.address().port;server.close(()=>resolve(value));});});
const wait=async(fn,label,timeout=15000)=>{const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value;}catch(error){last=error;}await new Promise(resolve=>setTimeout(resolve,100));}throw Error(`Timeout ${label}${last?`: ${last.message}`:''}`);};
await mkdir(out,{recursive:true});
const serverPort=await port(),debugPort=await port(),profile=await mkdtemp(path.join(os.tmpdir(),'piste-home-notifs-'));
const base=`http://localhost:${serverPort}`;
const server=spawn(process.execPath,['tests/iphone-continuity-fixture.mjs'],{cwd:root,env:{...process.env,PORT:String(serverPort)},stdio:'ignore'});
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

 const routes=['/','/community','/new-session','/sessions','/sessions/id/debrief','/operational','/live/ops/id','/dogs','/dogs/new','/profile','/profile/access','/scientific','/scientific/sessions/id','/notifications','/track-builder','/statistics','/admin','/admin/member/id','/jumolf','/jumolf/dashboard','/jumolf/settings'];
 const measure=()=>evaluate(`(()=>{const r=x=>{const b=x.getBoundingClientRect();return [b.x,b.y,b.width,b.height]};return{actions:r(document.querySelector('.header-actions')),main:r(document.querySelector('#main')),html:document.querySelector('#main').innerHTML,nav:document.querySelector('.bottom-nav')?.outerHTML,cards:[...document.querySelectorAll('main .card,.community-post-card,.dog-form,.jumolf-panel')].map(x=>{const s=getComputedStyle(x);return [s.background,s.color,s.borderColor,s.boxShadow]})}})()`);
 const results=[];
 for(const width of (process.env.VISUAL_SCOPE==='auth'?[]:[320,390,430])){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
  for(const route of routes){
   await goto(route+'?baseline=1');const before=await measure();await goto(route);const after=await measure();assert.deepEqual(after,before,'content, card surfaces and controls preserved '+route+' '+width);
   const canvas=await evaluate(`(()=>{const s=document.querySelector('.app-shell'),h=s.querySelector('.screen-header'),m=s.querySelector('main');const c=x=>getComputedStyle(x);return {shell:c(s).backgroundColor,shellImage:c(s).backgroundImage,header:c(h).backgroundColor,headerImage:c(h).backgroundImage,main:c(m).backgroundColor,mainImage:c(m).backgroundImage,scroll:document.documentElement.scrollWidth,width:innerWidth,logos:document.querySelectorAll('.shared-official-logo').length,filter:c(s.querySelector('.shared-official-logo')||h).filter}})()`);
   assert.equal(canvas.shell,'rgb(20, 34, 47)',route+' unified Community canvas');assert.equal(canvas.shellImage,'none');assert.equal(canvas.header,'rgba(0, 0, 0, 0)');assert.equal(canvas.headerImage,'none');assert.equal(canvas.main,'rgba(0, 0, 0, 0)');assert.equal(canvas.mainImage,'none');assert.ok(canvas.scroll<=width,route+' no horizontal overflow');
   assert.ok(await evaluate(`([...document.querySelectorAll('.coaching-flow,.jumolf-shell')].every(x=>getComputedStyle(x,'::before').backgroundImage==='none'))`),'no separate page halo below header');if(route!=='/')assert.equal(canvas.logos,1);if(route.startsWith('/jumolf'))assert.match(canvas.filter,/hue-rotate/);
   if(width===390&&['/community','/new-session','/dogs','/jumolf/dashboard'].includes(route))await capture(route.slice(1).replaceAll('/','-'));
   results.push({route,width});
  }
 }
 // Same artwork bytes, never cropped or backed by a second blurred copy. Short/landscape screens scroll.
 const auth=[];
 for(const [width,height,safe] of [[320,568,0],[390,664,0],[390,844,34],[430,932,34],[844,390,21]]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await goto('/auth');
  if(safe)await evaluate(`(()=>{const s=document.createElement('link');s.rel='stylesheet';s.href='/src/__safe-area.css?bottom=${safe}';document.head.append(s)})()`);
  await delay();
  const imageState=await evaluate(`(()=>{const i=document.querySelector('.auth-welcome-art img'),art=i.parentElement,main=document.querySelector('main'),actions=document.querySelector('.auth-welcome-actions'),r=x=>{const b=x.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height,b:b.bottom}};return {image:r(i),art:r(art),main:r(main),actions:r(actions),loaded:i.complete&&i.naturalWidth>0,ratio:i.naturalWidth/i.naturalHeight,objectFit:getComputedStyle(i).objectFit,duplicate:getComputedStyle(main,'::before').backgroundImage,scroll:document.documentElement.scrollWidth,links:[...actions.querySelectorAll('a')].map(a=>[a.textContent,a.getAttribute('href')]),bottomPadding:parseFloat(getComputedStyle(actions).paddingBottom)}})()`);
  assert.ok(imageState.loaded);assert.equal(imageState.image.w,width);assert.equal(imageState.image.x,0);assert.ok(Math.abs(imageState.image.w/imageState.image.h-imageState.ratio)<.001,'uncropped original proportions');assert.equal(imageState.duplicate,'none','no duplicate blurred artwork');assert.ok(imageState.actions.y>=imageState.image.b-1,'actions never cover dog or baked-in text');assert.ok(imageState.scroll<=width);assert.deepEqual(imageState.links,[['Se connecter','/auth/login'],['Créer un compte','/auth/signup']]);if(safe)assert.ok(imageState.bottomPadding>=safe);
  await evaluate(`document.querySelector('.auth-welcome-signup').scrollIntoView({block:'end'})`);await wait(()=>evaluate(`(()=>{const r=document.querySelector('.auth-welcome-signup').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1})()`),'signup reachable '+JSON.stringify({width,height,imageState}));
  if(width===390&&height===844)await capture('auth-welcome',null,true);
  auth.push({width,height,safe});
 }
 // Form DOM and all authentication handlers are untouched; routes remain reachable.
 for(const route of ['/auth/login','/auth/signup','/auth/forgot']){await goto(route+'?baseline=1');const html=await evaluate(`document.querySelector('.auth-shell').outerHTML`);await goto(route);assert.equal(await evaluate(`document.querySelector('.auth-shell').outerHTML`),html);}
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await goto('/operational/visual-cockpit');assert.equal(await evaluate(`getComputedStyle(document.querySelector('.screen-header')).display`),'none');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,sectionCases:results.length,authViewports:auth,errors},null,2));
}finally{socket?.close();server.kill('SIGTERM');chrome.kill('SIGTERM');await new Promise(resolve=>setTimeout(resolve,250));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100}).catch(()=>{});}
