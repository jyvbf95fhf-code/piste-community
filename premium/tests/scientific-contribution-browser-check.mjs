import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url)),out=path.join(root,'screenshots','scientific-contributions');
const chromePath=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const wait=async(fn,label,timeout=15000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{const value=await fn();if(value)return value;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}throw Error(`Timeout: ${label}`);};
const port=()=>new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const value=server.address().port;server.close(()=>resolve(value));});});
await mkdir(out,{recursive:true});
const serverPort=await port(),debugPort=await port(),profile=await mkdtemp(path.join(os.tmpdir(),'piste-scientific-contributions-'));
const base=`http://localhost:${serverPort}`,server=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(serverPort)},stdio:'ignore'});
const chrome=spawn(chromePath,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-default-browser-check','--no-proxy-server',`--remote-debugging-port=${debugPort}`,`--user-data-dir=${profile}`,'--window-size=1440,1000','about:blank'],{stdio:'ignore'});
let socket,id=1;const pending=new Map(),errors=[],external=[],api=[];
const cdp=(method,params={})=>new Promise((resolve,reject)=>{const requestId=id++;pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}));setTimeout(()=>{if(pending.has(requestId)){pending.delete(requestId);reject(Error(`CDP timeout: ${method}`));}},15000).unref?.();});
const evaluate=async expression=>{const response=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.result?.exceptionDetails)throw Error(JSON.stringify(response.result.exceptionDetails));return response.result?.result?.value;};
const delay=()=>new Promise(resolve=>setTimeout(resolve,180));let first=true;
async function goto(route){if(first){first=false;await cdp('Page.navigate',{url:`${base}${route}`});}else await evaluate(`(()=>{history.pushState({},'',${JSON.stringify(route)});dispatchEvent(new PopStateEvent('popstate'))})()`);await wait(()=>evaluate(`document.readyState==='complete'&&Boolean(document.querySelector('.app-shell'))`),route);await delay();}
async function viewport(width,height=844,mobile=true){await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:mobile?2:1,mobile,screenWidth:width,screenHeight:height});await delay();const m=await evaluate(`(()=>({document:document.documentElement.scrollWidth,body:document.body.scrollWidth,app:Math.round(document.querySelector('#app')?.getBoundingClientRect().width||0)}))()`);assert.ok(m.document<=width&&m.body<=width&&m.app<=width,`Overflow ${width}px: ${JSON.stringify(m)}`);return m;}
async function capture(name,width=390,height=844,mobile=true){await viewport(width,height,mobile);const image=await cdp('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:true});const file=path.join(out,`${name}-${width}.png`);await writeFile(file,Buffer.from(image.result.data,'base64'));return file;}
try{
 await wait(async()=>{const r=await fetch(base);return r.ok;},'server');
 let targets=await wait(async()=>{const r=await fetch(`http://127.0.0.1:${debugPort}/json/list`);return r.ok?r.json():null;},'Chrome');
 if(!targets.some(row=>row.type==='page')){await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`,{method:'PUT'});targets=await wait(async()=>{const r=await fetch(`http://127.0.0.1:${debugPort}/json/list`);return r.ok?r.json():null;},'Chrome page');}
 socket=new WebSocket(targets.find(row=>row.type==='page').webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 socket.addEventListener('message',event=>{const msg=JSON.parse(event.data);if(msg.id&&pending.has(msg.id)){pending.get(msg.id).resolve(msg);pending.delete(msg.id);return;}if(msg.method==='Runtime.exceptionThrown')errors.push(JSON.stringify(msg.params.exceptionDetails));if(msg.method==='Log.entryAdded'&&msg.params.entry.level==='error')errors.push(msg.params.entry.text);if(msg.method==='Network.requestWillBeSent'){const url=msg.params.request.url;if(!url.startsWith(`${base}/`)&&!url.startsWith('data:'))external.push(url);if(['Fetch','XHR','WebSocket','EventSource'].includes(msg.params.type))api.push(url);}});
 await Promise.all(['Page.enable','Runtime.enable','Log.enable','Network.enable'].map(method=>cdp(method)));
 await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`if(!window.structuredClone)window.structuredClone=value=>JSON.parse(JSON.stringify(value));try{localStorage.setItem('piste.v2.mock-session',JSON.stringify({version:1,authenticated:true,profile:'expert',name:'Sébastien'}))}catch{}`});
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true,screenWidth:390,screenHeight:844});
 const captures=[],checks=[];
 await goto('/profile/research');
 assert.match(await evaluate(`document.querySelector('[data-scientific-contribution-page]')?.innerText||''`),/Désactivée par défaut/);
 assert.equal(await evaluate(`document.querySelectorAll('[data-scientific-category]:checked').length`),0);
 captures.push(await capture('contribution-off'));
 await evaluate(`document.querySelector('[data-scientific-contribution-action="participate"]').click()`);await delay();
 assert.equal(await evaluate(`document.querySelectorAll('[data-scientific-category]:checked').length`),0);
 await evaluate(`document.querySelector('[data-scientific-category="weather"]').click()`);await delay();
 assert.equal(await evaluate(`document.querySelector('[data-scientific-category="weather"]').checked`),true);
 assert.equal(await evaluate(`document.querySelector('[data-scientific-category="ops:tracking_metrics"]').checked`),false);
 captures.push(await capture('consent-categories'));
 await evaluate(`document.querySelector('.scientific-ops-consent').open=true`);await delay();captures.push(await capture('ops-warning'));
 await goto('/profile/research/data');assert.match(await evaluate(`document.querySelector('[data-scientific-contribution-page]').innerText`),/Historique append-only/);captures.push(await capture('my-research-data'));
 // Capture the withdrawal decision screen before confirmation; no consent is revoked during QA.
 assert.match(await evaluate(`document.querySelector('.scientific-withdraw-panel')?.innerText||''`),/Retirer ma participation/);
 captures.push(await capture('withdrawal-review'));
 await goto('/profile/research/transparency');captures.push(await capture('transparency'));
 await goto('/scientific');assert.match(await evaluate(`document.querySelector('.scientific-shell')?.innerText||''`),/Corpus/);
 await goto('/scientific/corpus');assert.match(await evaluate(`document.querySelector('.scientific-corpus-page')?.innerText||''`),/Simulation de corpus scientifique/);
 assert.doesNotMatch(await evaluate(`document.querySelector('.scientific-corpus-page').innerText`),/Contributeur fictif 0[1-9]|synthetic-contributor-|synthetic-session-/);
 captures.push(await capture('corpus-summary-mobile'));
 const dogHref=await evaluate(`document.querySelector('.scientific-corpus-results a[href*="/scientific/corpus/dog/"]')?.getAttribute('href')||''`);assert.ok(dogHref,'pseudonymous dog profile link should be available when consented rows have longitudinal linkage');await goto(dogHref);assert.match(await evaluate(`document.querySelector('.scientific-corpus-page')?.innerText||''`),/Profil longitudinal/);captures.push(await capture('pseudonymous-dog-profile-mobile'));
 await goto('/scientific/corpus');
 for(const name of ['Cohorte globale A','Cohorte globale B']){await evaluate(`(()=>{const f=document.querySelector('[data-scientific-corpus-form="cohort"]');f.elements.name.value=${JSON.stringify(name)};f.requestSubmit();return true})()`);await delay();}
 assert.equal(await evaluate(`document.querySelectorAll('[data-scientific-corpus-form="rename-cohort"]').length`),2);
 await evaluate(`(()=>{const f=document.querySelector('[data-scientific-corpus-form="compare-cohorts"]');if(!f)return false;f.requestSubmit();return true})()`);await delay();assert.match(await evaluate(`document.querySelector('.scientific-corpus-comparison')?.innerText||''`),/Différence observée dans cet échantillon|Échantillon insuffisant/);captures.push(await capture('multi-dog-cohort-compare-mobile'));
 await goto('/scientific/corpus?type=training&quality=high');captures.push(await capture('corpus-filters-mobile'));
 for(const route of ['/profile/research','/profile/research/data','/profile/research/transparency','/scientific/corpus','/scientific/corpus/dog/DOG-339'])for(const width of [320,375,390,430])checks.push({route,width,...await viewport(width)});
 for(const route of ['/scientific/corpus','/scientific/corpus?type=training','/scientific/corpus/dog/DOG-339','/profile/research/data'])for(const width of [1024,1280,1440]){await goto(route);const size=await viewport(width,1000,false);checks.push({route,width,...size});if(width===1440)captures.push(await capture(`desktop-${route.includes('/dog/')?'pseudonymous-dog':route.includes('corpus')?'corpus':'my-data'}`,width,1000,false));}
 await goto('/scientific/corpus');captures.push(await capture('desktop-multi-dog-cohort-compare',1440,1000,false));
 await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('piste.v2.mock-session',JSON.stringify({version:1,authenticated:true,profile:'standard',name:'Camille'}))`});await cdp('Page.navigate',{url:`${base}/scientific/corpus`});await wait(()=>evaluate(`Boolean(document.querySelector('.scientific-gate,.auth-shell,.app-shell'))`),'standard shell');const standardState=await evaluate(`({url:location.href,body:document.body.innerText.slice(0,240),saved:localStorage.getItem('piste.v2.mock-session')})`);if(!await evaluate(`Boolean(document.querySelector('.scientific-gate'))`))throw Error(`Standard profile did not render expected gate: ${JSON.stringify(standardState)}`);assert.match(await evaluate(`document.querySelector('.scientific-gate')?.innerText||''`),/Accès restreint aux membres autorisés/);assert.equal(await evaluate(`Boolean(document.querySelector('.scientific-corpus-page'))`),false);
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(api,[]);
 const report={passed:true,mobile:[320,375,390,430],desktop:[1024,1280,1440],checks,captures,errors,externalRequests:external,apiRequests:api,identityLeak:'none in corpus UI',standardAccess:'denied'};
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{socket?.close();server.kill('SIGTERM');chrome.kill('SIGTERM');await Promise.all([server,chrome].map(child=>child.exitCode!==null?Promise.resolve():new Promise(resolve=>{child.once('exit',resolve);setTimeout(resolve,3000).unref?.();})));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
