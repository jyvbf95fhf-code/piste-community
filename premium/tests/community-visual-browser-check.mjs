import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const output=path.join(root,'screenshots','community-visual-pass');
const chromePath=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const wait=async(fn,label,timeout=16000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const value=await fn();if(value)return value;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}throw Error(`Timeout: ${label}`);};
const reservePort=()=>new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const value=server.address().port;server.close(()=>resolve(value));});});
await mkdir(output,{recursive:true});
const serverPort=await reservePort(),profile=await mkdtemp(path.join(os.tmpdir(),'piste-community-visual-')),base=`http://localhost:${serverPort}`;
const server=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(serverPort)},stdio:'ignore'});
const chrome=spawn(chromePath,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-crash-reporter','--disable-breakpad','--no-first-run','--no-default-browser-check','--remote-debugging-pipe',`--user-data-dir=${profile}`,'--window-size=390,844','about:blank'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let nextId=1,first=true,sessionId=null,buffer='';const pending=new Map(),errors=[],external=[],apiRequests=[],checks=[],captures=[];
const cdp=(method,params={},withSession=true)=>new Promise((resolve,reject)=>{const id=nextId++,message={id,method,params};if(withSession&&sessionId)message.sessionId=sessionId;pending.set(id,{resolve,reject});chrome.stdio[3].write(`${JSON.stringify(message)}\0`);const timer=setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(Error(`CDP timeout: ${method}`));}},16000);timer.unref?.();});
chrome.stdio[4].on('data',chunk=>{buffer+=chunk.toString();let boundary;while((boundary=buffer.indexOf('\0'))>=0){const raw=buffer.slice(0,boundary);buffer=buffer.slice(boundary+1);if(!raw)continue;const message=JSON.parse(raw);if(message.id&&pending.has(message.id)){const item=pending.get(message.id);pending.delete(message.id);message.error?item.reject(Error(JSON.stringify(message.error))):item.resolve(message);continue;}if(message.method==='Runtime.exceptionThrown')errors.push(JSON.stringify(message.params.exceptionDetails));if(message.method==='Log.entryAdded'&&message.params.entry.level==='error')errors.push(message.params.entry.text);if(message.method==='Network.requestWillBeSent'){const {url}=message.params.request;if(!url.startsWith(`${base}/`)&&!url.startsWith('data:'))external.push(url);if(['Fetch','XHR','WebSocket','EventSource'].includes(message.params.type))apiRequests.push(url);}}});
const evaluate=async expression=>{const response=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.result?.exceptionDetails)throw Error(JSON.stringify(response.result.exceptionDetails));return response.result?.result?.value;};
const pause=()=>new Promise(resolve=>setTimeout(resolve,160));
async function setViewport(width,height=1000){await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:width<700?2:1,mobile:width<700,screenWidth:width,screenHeight:height});await pause();}
async function navigate(route){if(first){first=false;await cdp('Page.navigate',{url:`${base}/auth`});await wait(()=>evaluate(`document.readyState==='complete'`),'initial page');await evaluate(`localStorage.setItem('piste.v2.mock-session',JSON.stringify({version:1,authenticated:true,profile:'expert'}));history.replaceState({},'',${JSON.stringify(route)})`);await cdp('Page.reload');}else await evaluate(`(()=>{history.pushState({},'',${JSON.stringify(route)});dispatchEvent(new PopStateEvent('popstate'))})()`);try{await wait(()=>evaluate(`document.readyState==='complete'&&Boolean(document.querySelector('.community-page'))`),route);}catch(error){throw Error(`${error.message}; page=${JSON.stringify(await evaluate(`({url:location.href,body:document.body.innerText.slice(0,500),classes:document.querySelector('.app-shell')?.className})`))}; console=${errors.join(' | ')}`);}await pause();}
async function capture(name){await evaluate(`(()=>{const nav=document.querySelector('.bottom-nav');if(nav){nav.style.position='static';nav.style.transform='none';nav.style.margin='14px auto 12px';}window.scrollTo(0,0)})()`);const image=await cdp('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:true});const file=path.join(output,`${name}.png`);await writeFile(file,Buffer.from(image.result.data,'base64'));captures.push(path.relative(root,file));await evaluate(`document.querySelector('.bottom-nav')?.removeAttribute('style')`);}
try{
 await wait(async()=>{const response=await fetch(base);return response.ok;},'local server');
 const target=await wait(async()=>{const targets=await cdp('Target.getTargets',{},false);return targets.result.targetInfos.find(item=>item.type==='page');},'Chrome page');
 sessionId=(await cdp('Target.attachToTarget',{targetId:target.targetId,flatten:true},false)).result.sessionId;
 await Promise.all(['Page.enable','Runtime.enable','Log.enable','Network.enable'].map(method=>cdp(method)));
 await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`if(!window.structuredClone)window.structuredClone=value=>JSON.parse(JSON.stringify(value));`});
 await setViewport(390,844);
 const routes=[['/community','feed'],['/community/profile/camille','profile'],['/community/contacts','contacts'],['/community/post/post-lea-track','post'],['/community/search?q=trace','search'],['/community/new','composer']];
 for(const width of [320,375,390,430,1024,1280,1440]){
  await setViewport(width,width<700?844:1000);
  for(const [route,name] of routes){
   await navigate(route);
   const size=await evaluate(`({document:document.documentElement.scrollWidth,body:document.body.scrollWidth,main:document.querySelector('main').scrollWidth,viewport:document.documentElement.clientWidth,app:document.querySelector('.app-shell').getBoundingClientRect().width,nav:!!document.querySelector('.bottom-nav')})`);
   assert.ok(size.document<=width&&size.body<=width,`horizontal overflow ${route} at ${width}: ${JSON.stringify(size)}`);
   checks.push({route,width,...size});
   if(width===390&&['feed','profile','contacts','post'].includes(name))await capture(`${name}-390`);
   if(width===1440&&['feed','profile'].includes(name))await capture(`${name}-1440`);
  }
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(apiRequests,[]);
 const report={passed:true,viewports:[320,375,390,430,1024,1280,1440],routes:routes.map(([route])=>route),checks,captures,consoleErrors:errors,externalRequests:external,apiRequests};
 await writeFile(path.join(output,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,checks:checks.length,captures,consoleErrors:errors,externalRequests:external,apiRequests},null,2));
}finally{server.kill('SIGTERM');chrome.kill('SIGTERM');await Promise.all([server,chrome].map(child=>child.exitCode!==null?Promise.resolve():new Promise(resolve=>{child.once('exit',resolve);setTimeout(resolve,3000).unref?.();})));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
