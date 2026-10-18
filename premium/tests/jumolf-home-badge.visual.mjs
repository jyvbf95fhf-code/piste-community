import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const suffix=process.env.CAPTURE_SUFFIX||'after';
const out=path.join(root,'screenshots','jumolf-home-badge');
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


 const checked=[];
 for(const width of [320,375,390,430,1280]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<768});await goto('/');
  const unchanged=await evaluate(`[...document.querySelectorAll('.feature-tile,.discovery-hero,.track-builder-entry,.explore-section')].map(x=>x.outerHTML)`);
  await evaluate(`(async()=>{const {SmartTrackSection}=await import('/src/track-smart-screen.mjs');const ref=document.createElement('section');ref.id='badge-reference';ref.setAttribute('data-track-cockpit','');ref.style.cssText='position:fixed;left:-1000px;top:0;width:400px';ref.innerHTML=SmartTrackSection();document.body.append(ref)})()`);
  for(const access of [{entitlement_valid:false,jumolf_enabled:false},{entitlement_valid:true,jumolf_enabled:false},{entitlement_valid:true,jumolf_enabled:true}]){
   await evaluate(`(async()=>{const {HomeScreen}=await import('/src/screens.mjs');const holder=document.createElement('div');holder.innerHTML=HomeScreen(undefined,undefined,${JSON.stringify(access)});document.querySelector('.twin-card').replaceWith(holder.querySelector('.twin-card'))})()`);
   const result=await evaluate(`(()=>{const c=document.querySelector('.twin-card'),b=c.querySelector('.jumolf-home-premium'),h=c.querySelector('h2'),p=c.querySelector('.twin-content p'),r=x=>{const v=x.getBoundingClientRect();return {x:v.x,y:v.y,width:v.width,height:v.height,right:v.right,bottom:v.bottom}},range=document.createRange();range.selectNodeContents(h.firstChild);const props=['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','color','borderTopColor','borderTopWidth','borderRadius','paddingTop','paddingRight','paddingBottom','paddingLeft','backgroundColor','boxShadow'];const style=x=>Object.fromEntries(props.map(k=>[k,getComputedStyle(x)[k]]));return {badge:r(b),title:r({getBoundingClientRect:()=>[...range.getClientRects()].at(-1)}),heading:r(h),description:r(p),card:r(c),style:style(b),reference:style(document.querySelector('#badge-reference .smart-premium-badge')),inTitle:b.parentElement===h,headerBadges:c.querySelectorAll('.twin-heading .jumolf-home-premium').length,count:c.querySelectorAll('.jumolf-home-premium').length,loaded:c.querySelector('img').complete&&c.querySelector('img').naturalWidth>0,overflow:document.documentElement.scrollWidth>innerWidth}})()`);
   assert.deepEqual(result.style,result.reference,'exact creator badge styling '+width);
   assert.equal(result.inTitle,true);assert.equal(result.headerBadges,0);assert.equal(result.count,1);assert.ok(result.loaded);assert.equal(result.overflow,false);
   const {badge:b,title:t,heading:h,description:p,card:c}=result;
   assert.ok(b.x>=c.x&&b.right<=c.right,'badge contained '+width);
   assert.ok(b.y>=h.y&&b.bottom<=p.y,'no description overlap '+width);
   assert.ok(b.x>=t.right-1||b.y>=t.bottom-1,'no title overlap '+width);
   if(t.width+b.width+6<=h.width+1)assert.ok(Math.abs((b.y+b.height/2)-(t.y+t.height/2))<6,'same line when space permits '+width+' '+JSON.stringify(result));
   if(width===390&&access.entitlement_valid&&!access.jumolf_enabled)await capture('jumolf-premium','.twin-card');
  }
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.feature-tile,.discovery-hero,.track-builder-entry,.explore-section')].map(x=>x.outerHTML)`),unchanged,'other cards unchanged');
  checked.push(width);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,widths:checked,errors}));
}finally{socket?.close();server.kill('SIGTERM');chrome.kill('SIGTERM');await new Promise(resolve=>setTimeout(resolve,250));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100}).catch(()=>{});}
