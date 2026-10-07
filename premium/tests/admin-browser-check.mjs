import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url)),out=path.join(root,'screenshots','admin');
const chromePath=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const wait=async(fn,label,timeout=16000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const value=await fn();if(value)return value;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}throw Error(`Timeout: ${label}`);};
const port=()=>new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const value=server.address().port;server.close(()=>resolve(value));});});
await mkdir(out,{recursive:true});
const serverPort=await port(),profile=await mkdtemp(path.join(os.tmpdir(),'piste-admin-'));
const base=`http://localhost:${serverPort}`,server=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(serverPort)},stdio:'ignore'});
const chrome=spawn(chromePath,['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-crash-reporter','--disable-breakpad','--no-first-run','--no-default-browser-check','--remote-debugging-pipe',`--user-data-dir=${profile}`,'--window-size=390,844','about:blank'],{stdio:['ignore','ignore','ignore','pipe','pipe']});
let id=1,first=true,sessionId=null,pipeBuffer='';const pending=new Map(),errors=[],external=[],apiRequests=[],checks=[],captures=[];
const cdp=(method,params={},useSession=true)=>new Promise((resolve,reject)=>{const requestId=id++,message={id:requestId,method,params};if(useSession&&sessionId)message.sessionId=sessionId;pending.set(requestId,{resolve,reject});chrome.stdio[3].write(`${JSON.stringify(message)}\0`);const timer=setTimeout(()=>{if(pending.has(requestId)){pending.delete(requestId);reject(Error(`CDP timeout: ${method}`));}},16000);timer.unref?.();});
chrome.stdio[4].on('data',chunk=>{pipeBuffer+=chunk.toString();let boundary;while((boundary=pipeBuffer.indexOf('\0'))>=0){const raw=pipeBuffer.slice(0,boundary);pipeBuffer=pipeBuffer.slice(boundary+1);if(!raw)continue;const message=JSON.parse(raw);if(message.id&&pending.has(message.id)){const entry=pending.get(message.id);pending.delete(message.id);message.error?entry.reject(Error(JSON.stringify(message.error))):entry.resolve(message);continue;}if(message.method==='Runtime.exceptionThrown')errors.push(JSON.stringify(message.params.exceptionDetails));if(message.method==='Log.entryAdded'&&message.params.entry.level==='error')errors.push(message.params.entry.text);if(message.method==='Network.requestWillBeSent'){const {url}=message.params.request;if(!url.startsWith(`${base}/`)&&!url.startsWith('data:'))external.push(url);if(['Fetch','XHR','WebSocket','EventSource'].includes(message.params.type))apiRequests.push(url);}}});
const evaluate=async expression=>{const response=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.result?.exceptionDetails)throw Error(JSON.stringify(response.result.exceptionDetails));return response.result?.result?.value;};
const pause=()=>new Promise(resolve=>setTimeout(resolve,140));
async function setWidth(width,height=900){await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:width<700?2:1,mobile:width<700,screenWidth:width,screenHeight:height});await pause();}
async function goto(route){if(first){first=false;await cdp('Page.navigate',{url:`${base}/auth`});await wait(()=>evaluate(`document.readyState==='complete'`),'auth document load');await pause();if(!await evaluate(`Boolean(document.querySelector('.auth-shell'))`))throw Error(`Auth page failed: ${JSON.stringify(await evaluate(`({href:location.href,body:document.body.innerText,html:document.body.innerHTML.slice(0,400)})`))} ${errors.join(' | ')}`);await evaluate(`localStorage.setItem('piste.v2.mock-session',JSON.stringify({version:1,authenticated:true,profile:'expert'}));history.replaceState({},'',${JSON.stringify(route)})`);await cdp('Page.reload');}else await evaluate(`(()=>{history.pushState({},'',${JSON.stringify(route)});dispatchEvent(new PopStateEvent('popstate'))})()`);try{await wait(()=>evaluate(`document.readyState==='complete'&&Boolean(document.querySelector('.admin-shell,.admin-restricted'))`),route);}catch(error){throw Error(`${error.message} ${JSON.stringify(await evaluate(`({href:location.href,body:document.body.innerText.slice(0,500)})`))} ${errors.join(' | ')}`);}await pause();}
async function capture(name){await evaluate('window.scrollTo(0,0)');const image=await cdp('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:true});const file=path.join(out,`${name}.png`);await writeFile(file,Buffer.from(image.result.data,'base64'));captures.push(file);}
async function submit(formSelector,fill){const ok=await evaluate(`(()=>{const form=document.querySelector(${JSON.stringify(formSelector)});if(!form)return false;${fill}form.requestSubmit();return true})()`);assert.equal(ok,true,`Missing form ${formSelector}`);await pause();}
try{
 await wait(async()=>{const response=await fetch(base);return response.ok;},'local server');
 const page=await wait(async()=>{const targets=await cdp('Target.getTargets',{},false);return targets.result.targetInfos.find(item=>item.type==='page');},'Chrome page target');
 sessionId=(await cdp('Target.attachToTarget',{targetId:page.targetId,flatten:true},false)).result.sessionId;
 await Promise.all(['Page.enable','Runtime.enable','Log.enable','Network.enable'].map(method=>cdp(method)));
 await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`if(!window.structuredClone)window.structuredClone=value=>JSON.parse(JSON.stringify(value));`});
 await setWidth(390,844);await goto('/admin');
 assert.match(await evaluate(`document.querySelector('main').innerText`),/Vue générale/);
 assert.match(await evaluate(`document.querySelector('.admin-simulation-badge').innerText`),/Simulation Admin/);
 assert.equal(await evaluate(`document.querySelectorAll('.bottom-nav a').length`),5);
 await capture('mobile-dashboard-390');
 const routes=[['/admin/members','members'],['/admin/member/member-contributor-01','member'],['/admin/premium','premium'],['/admin/codes','codes'],['/admin/scientific','scientific'],['/admin/services','services'],['/admin/deployments','deployments'],['/admin/errors','errors'],['/admin/audit','audit']];
 for(const [route,type] of routes){await goto(route);assert.ok(await evaluate(`document.querySelector('.admin-page')!==null`),route);assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,`${route} overflow 390`);checks.push({route,width:390,overflow:false});if(route==='/admin/member/member-contributor-01')await capture('mobile-member-390');if(route==='/admin/premium')await capture('mobile-premium-jumolf-390');if(route==='/admin/codes')await capture('mobile-codes-390');if(route==='/admin/audit')await capture('mobile-audit-390');}
 await goto('/admin/codes');
 await submit('[data-admin-form="create-code"]',`form.elements.code.value='BROWSER-CODE';form.elements.max_uses.value='3';form.elements.grant_type.value='permanent';`);
 assert.match(await evaluate(`document.querySelector('.admin-page').innerText`),/BROWSER-CODE/);
 await goto('/admin/member/member-free-01');
 await submit('[data-admin-form="grant-jumolf"]',`form.elements.duration.value='30';`);
 assert.match(await evaluate(`document.querySelector('.admin-page').innerText`),/admin_grant · non activé/);
 assert.equal(await evaluate(`document.querySelector('[data-admin-form="grant-jumolf"]')!==null`),true);
 assert.equal(await evaluate(`document.querySelector('[data-admin-form="set-research-consent"]')===null`),true);
 await goto('/admin/scientific');await capture('mobile-scientific-390');
 for(const width of [320,375,390,430,1024,1280,1440]){
  await setWidth(width,900);
  for(const [route] of [['/admin'],['/admin/members'],['/admin/codes'],['/admin/scientific'],['/admin/services'],['/admin/audit']]){
   await goto(route);const size=await evaluate(`({doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,main:document.querySelector('main').scrollWidth})`);assert.ok(size.doc<=width&&size.body<=width,`Overflow ${route} ${width}: ${JSON.stringify(size)}`);assert.equal(await evaluate(`document.querySelectorAll('.bottom-nav a').length`),5);checks.push({route,width,...size});
  }
 }
 for(const [route,name] of [['/admin','desktop-dashboard-1440'],['/admin/members','desktop-members-1440'],['/admin/member/member-contributor-01','desktop-member-1440'],['/admin/premium','desktop-premium-1440'],['/admin/codes','desktop-codes-1440'],['/admin/scientific','desktop-scientific-1440'],['/admin/services','desktop-services-1440'],['/admin/deployments','desktop-deployments-1440'],['/admin/errors','desktop-errors-1440'],['/admin/audit','desktop-audit-1440']]){await setWidth(1440,1000);await goto(route);await capture(name);}
 // Reload the same session as a standard profile to verify that direct Admin URLs use the common gate.
 await evaluate(`localStorage.setItem('piste.v2.mock-session',JSON.stringify({version:1,authenticated:true,profile:'standard',name:'Sébastien'}))`);
 await cdp('Page.reload');await wait(()=>evaluate(`document.querySelector('.admin-restricted')!==null`),'standard access denied');
 assert.match(await evaluate(`document.querySelector('main').innerText`),/Accès restreint/);
 assert.doesNotMatch(await evaluate(`document.querySelector('main').innerText`),/Membres inscrits|BROWSER-CODE/);
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(apiRequests,[]);
 const report={passed:true,responsiveWidths:[320,375,390,430,1024,1280,1440],checks,captures,consoleErrors:errors,externalRequests:external,apiRequests,verified:['owner Admin shell','shared code form','JUMOLF entitlement remains non-active','scientific consent has no Admin mutation form','standard profile denied on direct route','bottom navigation intact']};
 await writeFile(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{server.kill('SIGTERM');chrome.kill('SIGTERM');await Promise.all([server,chrome].map(child=>child.exitCode!==null?Promise.resolve():new Promise(resolve=>{child.once('exit',resolve);setTimeout(resolve,3000).unref?.();})));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
