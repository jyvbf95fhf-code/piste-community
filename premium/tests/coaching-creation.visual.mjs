// Local UI fixture: actual wizard, creator markup/library and production save handler.
// No remote session creation, personal account or server deployment.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdtemp,rm,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import os from 'node:os';import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const app=await readFile(path.join(root,'src/app.mjs'),'utf8');
const saveStart=app.indexOf(" const editorForm=event.target.closest('form[data-track-editor-form]');"),saveEnd=app.indexOf(' const trackRename=',saveStart);
assert.ok(saveStart>0&&saveEnd>saveStart);
const client=`import {createSharedCoachingWizard,coachingTrackReturnState} from '/src/coaching-shared-wizard.mjs';
import {GeographicTrackCockpit} from '/src/track-editor-cockpit.mjs';import {createTrackDraft} from '/src/track-editor.mjs';import {trackHasPendingRoutes} from '/src/track-route-segments.mjs';import {createTrackLibrary} from '/src/track-library.mjs';
const currentUser={user_id:'isolated-QA'},profile={id:currentUser.user_id,name:'QA'},dogs=[{id:'nox',name:'Nox'},{id:'rex',name:'Rex'}],trackLibrary=createTrackLibrary({storage:localStorage,ownerId:currentUser.user_id});let coachingWizardState=null,wizard=null,trackEditorActive=false,trackEditor={draft:null,routeKey:'',copySource:null},created=null;
const makeWizard=()=>createSharedCoachingWizard({profile,dogs,getTracks:()=>trackLibrary.list(),initialState:coachingWizardState,onChange:s=>coachingWizardState=s});
function render(){if(location.pathname==='/track-builder'){if(!trackEditor.draft)trackEditor.draft=createTrackDraft({geographic:true,track:{name:'Nouvelle piste QA',geometry:{points:[{x:7,y:48,space:'wgs84'},{x:7.01,y:48.01,space:'wgs84'}]}}});document.querySelector('#app').innerHTML=GeographicTrackCockpit({draft:trackEditor.draft});return;}if(location.pathname==='/new-session'){if(!wizard)wizard=makeWizard();document.querySelector('#app').innerHTML=wizard.render();return;}document.querySelector('#app').innerHTML='<h1>Tracé enregistré</h1>';}
document.addEventListener('submit',event=>{${app.slice(saveStart,saveEnd)}});
document.addEventListener('click',event=>{const a=event.target.closest('a');if(a){event.preventDefault();history.pushState({},'',a.getAttribute('href'));wizard=null;render();return;}const c=event.target.closest('[data-coaching-choice]'),b=event.target.closest('[data-coaching]');if(c||b){const r=wizard.dispatch(c?{field:c.dataset.coachingChoice,value:c.dataset.value}:{action:b.dataset.coaching,value:b.dataset.role,step:b.dataset.step});if(r.type==='create')created=r;render();}});
window.__qa={state:()=>wizard?.snapshot(),saved:()=>trackLibrary.list(),created:()=>created,standalone:()=>{history.pushState({},'','/track-builder');trackEditor.draft=null;render();}};render();`;
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://local');let text,type='text/html';if(u.pathname==='/__fixture.mjs'){text=client;type='text/javascript';}else if(u.pathname.startsWith('/src/')){const f=path.resolve(root,'.'+u.pathname);if(!f.startsWith(root+'/src/'))throw Error('invalid path');text=await readFile(f);type=f.endsWith('.mjs')?'text/javascript':f.endsWith('.css')?'text/css':'image/png';}else{text=(await readFile(path.join(root,'index.html'),'utf8')).replace('/src/app.mjs','/__fixture.mjs');}res.writeHead(200,{'Content-Type':type});res.end(text);}catch{res.writeHead(500).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const temp=await mkdtemp(path.join(os.tmpdir(),'piste-smart-')),debugPort=9300+Math.floor(Math.random()*500),chrome=spawn(process.env.CHROME_PATH||'/workspace/scratch/1f82a0a801c3/chromium',['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-proxy-server',`--remote-debugging-port=${debugPort}`,`--user-data-dir=${temp}`,'about:blank'],{stdio:'ignore'});
let socket,id=1;const pending=new Map(),errors=[];const delay=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async(fn)=>{for(let i=0;i<150;i++){try{if(await fn())return;}catch{}await delay(50);}throw Error('UI timeout; '+JSON.stringify(errors))};
try{let target;await wait(async()=>{target=(await(await fetch('http://127.0.0.1:'+debugPort+'/json/list')).json()).find(x=>x.type==='page');return target;});socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails)};
 const cdp=(method,params={})=>new Promise(r=>{const n=id++;pending.set(n,r);socket.send(JSON.stringify({id:n,method,params}));});const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.result?.exceptionDetails)throw Error(JSON.stringify(r.result.exceptionDetails));return r.result?.result?.value;};const click=s=>evaluate(`document.querySelector(${JSON.stringify(s)}).click()`);const submit=s=>evaluate(`document.querySelector(${JSON.stringify(s)}).requestSubmit()`);
 await cdp('Runtime.enable');await cdp('Page.enable');const widths=[320,390,430,1280];
 for(const width of widths){await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<768});await cdp('Page.navigate',{url:base+'/new-session'});await wait(()=>evaluate('Boolean(window.__qa)'));
 await click('[data-coaching-choice="mode"][data-value="normal"]');await click('[data-coaching-choice="traceType"][data-value="prepared"]');
 assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth"),false,'configuration overflow '+width);
 await click('[data-coaching="next"]');await click('a[href="/track-builder?from=coaching"]');assert.equal(await evaluate('location.pathname'),'/track-builder');
 await evaluate("document.querySelector('[data-creator-panel]').open=true");await evaluate("document.querySelector('[name=name]').value='Piste QA créée'");await submit('[data-track-editor-form]');
 assert.equal(await evaluate('location.pathname'),'/new-session');assert.equal(await evaluate("document.querySelector('[data-wizard-step]').dataset.wizardStep"),'prepare');
 assert.equal(await evaluate("document.querySelectorAll('[data-coaching-choice=preparation][aria-pressed=true]').length"),1);
 assert.equal(await evaluate("__qa.state().draft.mode"),'normal');await click('[data-coaching="next"]');await click('[data-coaching-choice="dogId"][data-value="rex"]');await click('[data-coaching="next"]');
 assert.match(await evaluate("document.querySelector('#app').textContent"),/Votre équipe/);await click('[data-coaching="creator"][data-role="traceur"]');await click('[data-coaching="back"]');
 assert.equal(await evaluate("document.querySelector('[data-coaching-choice=dogId][aria-pressed=true]').dataset.value"),'rex');await click('[data-coaching="next"]');await click('[data-coaching="next"]');
 assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false,'review overflow '+width);assert.match(await evaluate("document.querySelector('#app').textContent"),/Piste QA créée/);
 await click('[data-coaching="create"]');assert.equal(await evaluate('__qa.created().payload.dogName'),'Rex');assert.equal(await evaluate('__qa.created().payload.role'),'traceur');assert.equal(await evaluate('__qa.created().reference.coordinates.length'),2);
 if(width===390){const dir=path.join(root,'screenshots/coaching-creation');await mkdir(dir,{recursive:true});const shot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(path.join(dir,'review-iphone.png'),Buffer.from(shot.result.data,'base64'));}
 await evaluate('__qa.standalone()');await evaluate("document.querySelector('[data-creator-panel]').open=true");await submit('[data-track-editor-form]');assert.match(await evaluate('location.pathname'),/^\/tracks\/prepared/);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,widths,actualCreatorSaveHandler:true,returnWithSelection:true,backKeepsDog:true,standaloneUnchanged:true,localFixtureOnly:true}));
}finally{socket?.close();chrome.kill('SIGTERM');server.close();await delay(100);await rm(temp,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
