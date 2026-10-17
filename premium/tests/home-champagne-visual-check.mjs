import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const suffix=process.env.CAPTURE_SUFFIX||'after';
const out=path.join(root,'screenshots','home-champagne');
const chromePath=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port=()=>new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const value=server.address().port;server.close(()=>resolve(value));});});
const wait=async(fn,label,timeout=15000)=>{const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value;}catch(error){last=error;}await new Promise(resolve=>setTimeout(resolve,100));}throw Error(`Timeout ${label}${last?`: ${last.message}`:''}`);};
await mkdir(out,{recursive:true});
const serverPort=await port(),debugPort=await port(),profile=await mkdtemp(path.join(os.tmpdir(),'piste-home-notifs-'));
const base=`http://localhost:${serverPort}`;
const server=spawn(process.execPath,['tests/home-champagne-fixture.mjs'],{cwd:root,env:{...process.env,PORT:String(serverPort)},stdio:'ignore'});
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
 socket=new WebSocket(targets[0].webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){pending.get(message.id).resolve(message);pending.delete(message.id);return;}if(message.method==='Runtime.exceptionThrown')errors.push(JSON.stringify(message.params.exceptionDetails));});
 await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Network.enable');
 const theme=enabled=>evaluate(`document.querySelector('link[href="/src/home-champagne.css"]').disabled=${!enabled}`);
 const snapshot=()=>evaluate(`(()=>({links:[...document.querySelectorAll('a')].map(x=>[x.getAttribute('href'),x.textContent]),images:[...document.images].map(x=>x.getAttribute('src')),boxes:[...document.querySelectorAll('.home-intro,.discovery-hero,.feature-grid,.feature-tile,.track-builder-entry,.active-sessions,.twin-card,.bottom-nav')].map(x=>{const r=x.getBoundingClientRect();return [x.className,r.x,r.y,r.width,r.height]})}))()`);
 const results=[];
 for(const width of [320,375,390,430,1024]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await goto('/');
  await theme(false);const before=await snapshot();if(width===390)await capture('before');
  await theme(true);const after=await snapshot();if(width===390){await capture('after');await capture('after-full',null,true);}
  assert.deepEqual(after.links,before.links,'same destinations and copy');assert.deepEqual(after.images,before.images,'same photos');
  assert.deepEqual(after.boxes,before.boxes,`same layout at ${width}px`);
  assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),`no overflow ${width}`);
  results.push({width,layoutUnchanged:true});
 }
 await goto('/sessions');
 const styles=()=>evaluate(`JSON.stringify([...document.querySelectorAll('.app-shell,.screen-header,.card,.bottom-nav,.bottom-nav a,h1,h2,h3')].map(x=>[...getComputedStyle(x)].map(p=>[p,getComputedStyle(x).getPropertyValue(p)])))`);
 await theme(false);const beforeStyles=await styles();await capture('sessions-before');
 await theme(true);assert.equal(await styles(),beforeStyles,'other section and navigation unchanged');await capture('sessions-after');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,results,otherSectionUnchanged:true,errors},null,2));
}finally{socket?.close();server.kill('SIGTERM');chrome.kill('SIGTERM');await new Promise(resolve=>setTimeout(resolve,250));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100}).catch(()=>{});}
