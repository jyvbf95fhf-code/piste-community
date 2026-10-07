import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const suffix=process.env.CAPTURE_SUFFIX||'after';
const out=path.join(root,'screenshots','home-notifications-visual');
const chromePath=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port=()=>new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const value=server.address().port;server.close(()=>resolve(value));});});
const wait=async(fn,label,timeout=15000)=>{const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await fn();if(value)return value;}catch(error){last=error;}await new Promise(resolve=>setTimeout(resolve,100));}throw Error(`Timeout ${label}${last?`: ${last.message}`:''}`);};
await mkdir(out,{recursive:true});
const serverPort=await port(),debugPort=await port(),profile=await mkdtemp(path.join(os.tmpdir(),'piste-home-notifs-'));
const base=`http://localhost:${serverPort}`;
const server=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(serverPort)},stdio:'ignore'});
const chrome=spawn(chromePath,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-default-browser-check','--no-proxy-server',`--remote-debugging-port=${debugPort}`,`--user-data-dir=${profile}`,'--window-size=390,844','about:blank'],{stdio:'ignore'});
let socket,id=1;
const pending=new Map(),errors=[],external=[];
const cdp=(method,params={})=>new Promise((resolve,reject)=>{const requestId=id++;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));setTimeout(()=>{if(pending.has(requestId)){pending.delete(requestId);reject(Error(`CDP timeout ${method}`));}},15000).unref?.();});
const evaluate=async expression=>{const response=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.result?.exceptionDetails)throw Error(JSON.stringify(response.result.exceptionDetails));return response.result?.result?.value;};
const delay=()=>new Promise(resolve=>setTimeout(resolve,100));
async function goto(route){await cdp('Page.navigate',{url:`${base}${route}`});try{await wait(()=>evaluate(`document.readyState==='complete'&&Boolean(document.querySelector('.app-shell,.auth-shell'))`),route);}catch(error){throw Error(`${error.message}; state=${JSON.stringify(await evaluate(`({href:location.href,ready:document.readyState,body:document.body?.innerText?.slice(0,120),html:document.documentElement?.innerHTML?.slice(0,320)})`))}; errors=${JSON.stringify(errors)}`);}await delay();}
async function capture(name,selector=null,fullPage=false){if(selector)await evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'center'})`);else await evaluate('(()=>{window.scrollTo(0,0);const main=document.querySelector(".app-shell main");if(main)main.scrollTop=0})()');await delay();const result=await cdp('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:fullPage});await writeFile(path.join(out,`${name}-${suffix}-390.png`),Buffer.from(result.result.data,'base64'));}
try{
 await wait(async()=>{const response=await fetch(base);return response.ok;},'local app server');
 const targets=await wait(async()=>{const response=await fetch(`http://127.0.0.1:${debugPort}/json/list`);return response.ok?(await response.json()).filter(item=>item.type==='page'):null;},'Chrome page target');
 if(!targets.length)await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`,{method:'PUT'});
 const pageTarget=targets[0]||await wait(async()=>{const response=await fetch(`http://127.0.0.1:${debugPort}/json/list`);return response.ok?(await response.json()).find(item=>item.type==='page'):null;},'new Chrome page');
 socket=new WebSocket(pageTarget.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){pending.get(message.id).resolve(message);pending.delete(message.id);return;}if(message.method==='Runtime.exceptionThrown')errors.push(JSON.stringify(message.params.exceptionDetails));if(message.method==='Log.entryAdded'&&message.params.entry.level==='error')errors.push(message.params.entry.text);if(message.method==='Network.requestWillBeSent'&&!message.params.request.url.startsWith(`${base}/`)&&!message.params.request.url.startsWith('data:'))external.push(message.params.request.url);});
 await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Log.enable');await cdp('Network.enable');
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`if(!window.structuredClone)window.structuredClone=value=>JSON.parse(JSON.stringify(value));try{localStorage.setItem('piste.v2.mock-session',JSON.stringify({version:1,authenticated:true,profile:'expert',name:'Sébastien'}))}catch{}`});
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:false});
 await goto('/auth');await evaluate(`localStorage.setItem('piste.v2.mock-session',JSON.stringify({version:1,authenticated:true,profile:'expert',name:'Sébastien'}))`);await goto('/');assert.match(await evaluate('location.pathname'),/^\/$/);
 await capture('01-home-full',null,true);await capture('02-home-top');
 await capture('03-home-community','.feature-tile[href="/community"]');
 await capture('04-home-twin','.twin-card');
 const widths=[];
 for(const width of [320,375,390,430]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:2,mobile:false});
  const measure=await evaluate(`(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,main:document.querySelector('main')?.scrollWidth||0,offenders:[...document.querySelectorAll('body *')].map(node=>({tag:node.tagName,cls:typeof node.className==='string'?node.className:'svg',right:Math.round(node.getBoundingClientRect().right),left:Math.round(node.getBoundingClientRect().left)})).filter(item=>item.right>${width}+1||item.left< -1).slice(-12)}))()`);
  if(!process.env.CAPTURE_ONLY)assert.ok(measure.document<=width&&measure.body<=width&&measure.main<=width,`Home overflow ${width}: ${JSON.stringify(measure)}`);widths.push({route:'/',...measure});
 }
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:false});
 await goto('/notifications');assert.ok(await evaluate(`document.querySelectorAll('.notification-card.is-unread').length>=1`));const notificationStyle=await evaluate(`(()=>{const shell=document.querySelector('.app-shell'),page=document.querySelector('.notifications-page'),card=document.querySelector('.notification-card.is-unread');return{theme:shell?.dataset.moduleTheme,scopedClass:shell?.classList.contains('notifications-shell'),has:!!page,background:getComputedStyle(shell).backgroundImage,card:getComputedStyle(card).backgroundColor,ruleCount:document.styleSheets[1]?.cssRules?.length}})()`);
 await capture('05-notifications-unread');
 await evaluate(`(()=>{const first=document.querySelector('.notification-card');const read=first.cloneNode(true);read.classList.remove('is-unread');read.classList.add('is-read');read.dataset.notificationId='visual-read-example';read.querySelector('.badge')?.remove();read.querySelector('p').textContent='Alex a accepté votre demande de contact';read.querySelector('time').textContent='28 sept. 2026, 09:30';first.after(read);const another=first.cloneNode(true);another.dataset.notificationId='visual-unread-example';another.querySelector('p').textContent='Camille a démarré une session Live';another.querySelector('time').textContent='Aujourd’hui, 08:42';read.after(another)})()`);
 await capture('06-notifications-multiple','.notification-card.is-read');
 for(const width of [320,375,390,430]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:2,mobile:false});
  const measure=await evaluate(`(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,main:document.querySelector('main')?.scrollWidth||0}))()`);
  if(!process.env.CAPTURE_ONLY)assert.ok(measure.document<=width&&measure.body<=width&&measure.main<=width,`Notifications overflow ${width}: ${JSON.stringify(measure)}`);widths.push({route:'/notifications',...measure});
 }
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:false});
 await goto('/jumolf');await capture('07-jumolf-control');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log(JSON.stringify({passed:true,suffix,widths,notificationStyle,errors,external},null,2));
}finally{socket?.close();server.kill('SIGTERM');chrome.kill('SIGTERM');await new Promise(resolve=>setTimeout(resolve,250));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100}).catch(()=>{});}
