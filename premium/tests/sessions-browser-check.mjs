import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://localhost:4173';
const dest=process.env.ARTIFACT_DIR||'premium/screenshots/sessions-v2';
await mkdir(dest,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
const errors=[],network=[],failed=[],checks=[],captures=[];
context.on('request',request=>{if(!request.url().startsWith(base+'/')&&!request.url().startsWith('data:'))network.push(request.url());if(['fetch','xhr','websocket'].includes(request.resourceType()))network.push(request.url());});
context.on('requestfailed',request=>{if(request.failure()?.errorText!=='net::ERR_ABORTED')failed.push(request.url());});
await context.addInitScript(()=>{
 window.__gps=0;window.__storageWrites=[];
 for(const method of ['getCurrentPosition','watchPosition'])navigator.geolocation[method]=()=>{window.__gps++;throw Error('Real GPS is forbidden');};
 const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){window.__storageWrites.push(key);return original.call(this,key,value);};
});
const page=await context.newPage();page.setDefaultTimeout(12000);
page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
const tap=async name=>page.getByRole('button',{name,exact:true}).tap();
async function check(label){
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${label}: horizontal overflow`);
 assert.equal(await page.evaluate(()=>window.__gps),0,`${label}: GPS access`);
 checks.push(label);
}
async function shot(name,selector){
 if(selector)await page.locator(selector).first().scrollIntoViewIfNeeded();else await page.evaluate(()=>scrollTo(0,0));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const path=`${dest}/${name}.png`;await page.screenshot({path,fullPage:true});captures.push(path);
}
async function login(){
 await page.goto(base+'/auth/login');await page.getByLabel('Email',{exact:true}).fill('sessions@example.test');await page.getByLabel('Mot de passe',{exact:true}).fill('fictif123');await tap('Se connecter');await page.waitForURL(base+'/');
}
async function navigate(path){await page.evaluate(target=>{history.pushState({},'',target);dispatchEvent(new PopStateEvent('popstate'));},path);await page.waitForFunction(target=>location.pathname+location.search===target,path);}
async function createActiveSession(traceType='direct'){
 await page.goto(base+'/new-session');await tap('Commencer');await page.locator('[data-coaching-choice="mode"][data-value="normal"]').tap();await tap('Continuer');await tap('Continuer');
 await page.locator(`[data-coaching-choice="traceType"][data-value="${traceType}"]`).tap();await tap('Continuer');
 if(traceType==='prepared'){await page.locator('[data-coaching-choice="preparation"][data-value="track-clairiere"]').tap();await tap('Continuer');}await page.locator('[data-coaching-observer="lea"]').check();await tap('Continuer');await tap('Créer la session');
 const code=await page.getByLabel('Code session mock',{exact:true}).inputValue();assert.match(code,/^PC-[A-Z0-9]{4}$/);
 await page.getByRole('link',{name:'Ouvrir la préparation',exact:true}).tap();return code;
}
async function finishSession(){
 await tap('Simulateur Conducteur');await tap('Préparation (DEV)');await page.locator('[data-prep-simulator] summary').tap();await page.locator('[data-prep-sim="viewerRole"]').selectOption('traceur');await page.locator('[data-prep-sim="gps"]').selectOption('fresh');await page.locator('[data-prep-simulator] summary').tap();
 if(await page.locator('[data-prep-action="approach"]').count()){await page.locator('[data-prep-action="approach"]').tap();await page.locator('[data-tracer="arrive"]').tap();}
 await tap('Me déclarer prêt à tracer');await tap('Tracer la piste');await tap('Simulateur terrain');await tap('Avancer le scénario (+30 s mock)');await tap('Fermer le simulateur');await tap('Terminer la piste');await tap('Je suis en place');
 await tap('Simulateur terrain');await tap('Préparation (DEV)');if(!await page.locator('[data-prep-simulator]').evaluate(node=>node.open))await page.locator('[data-prep-simulator] summary').tap();await page.locator('[data-prep-sim="viewerRole"]').selectOption('driver');await tap('Ouvrir le cockpit Conducteur (DEV)');
 await tap('Démarrer la recherche');await tap('Simulateur Conducteur');await tap('Avancer la recherche (+30 s mock)');await tap('Fermer le simulateur Conducteur');await tap('Terminer la recherche');await tap('Confirmer la fin');
 assert.equal(await page.locator('[data-debrief-phase]').getAttribute('data-debrief-phase'),'DEBRIEF');
}

await login();
const persistentState=await page.evaluate(()=>JSON.stringify({...localStorage}));
await page.locator('.bottom-nav a[href="/sessions"]').tap();assert.equal(new URL(page.url()).pathname,'/sessions');assert.match(await page.locator('h1').innerText(),/Sessions/);await page.locator('[data-session-filter="En cours"]').tap();assert.equal(await page.locator('[data-session-kind="summary-demo"]').count(),2,'both Home demo sessions are in the global active filter');await page.locator('[data-session-filter="Toutes"]').tap();await check('Sessions bottom-nav and Home session parity');
const code=await createActiveSession();
const initialStorageWrites=await page.evaluate(()=>JSON.stringify(window.__storageWrites));
await navigate('/');assert.equal(await page.locator('.active-sessions .active-session-card').count(),1,'Home shows the active Coaching session');assert.equal(await page.locator('.active-sessions .active-session-card').getAttribute('href'),'/coaching/session');await check('Home active session');await shot('home-sessions-active-iphone');
await page.locator('.bottom-nav a[href="/sessions"]').tap();
const activeRow=page.locator('[data-session-kind="coaching"][data-session-id]');
assert.equal(await activeRow.count(),1,'current Coaching session is listed');await activeRow.tap();assert.equal(new URL(page.url()).pathname,'/coaching/session','active session returns to Coaching');assert.equal(await page.locator('[data-search-phase="PREPARATION"]').count(),1,'existing Coaching cockpit is used');checks.push('active session returns to Coaching');
await finishSession();
await page.locator('.debrief-archive').tap();assert.equal(await page.locator('[data-debrief-phase]').getAttribute('data-debrief-phase'),'ARCHIVED');
await navigate('/');assert.equal(await page.locator('.active-sessions').count(),0,'archived session is absent from Home active sessions');await check('Home hides archived session');await shot('home-no-completed-sessions-iphone');
await page.locator('.bottom-nav a[href="/sessions"]').tap();await page.locator('[data-session-filter="Archivées"]').tap();assert.equal(await page.locator('[data-session-kind="coaching"]').count(),1,'archived session is listed');await page.locator('[data-session-filter="Toutes"]').tap();
const coachingRow=page.locator('[data-session-kind="coaching"]');assert.equal(await coachingRow.count(),1);const title=await coachingRow.locator('strong').innerText();await coachingRow.tap();assert.equal(new URL(page.url()).pathname.split('/').length,3);assert.match(await page.locator('[data-consultation-view="session-detail"]').innerText().catch(async()=>`url=${page.url()} main=${await page.locator('main').innerText()}`),/Lecture seule/);assert.equal(await page.locator('[data-search],[data-tracer],[data-prep-action]').count(),0,'historical detail exposes no operational controls');
const sessionId=new URL(page.url()).pathname.split('/').at(-1);await shot('session-detail-iphone');
await navigate(`/sessions/${sessionId}/replay`);assert.equal(await page.locator('[data-session-replay]').count(),1,`session replay renders for ${page.url()}: ${await page.locator('main').innerText()}`);assert.match(await page.locator('.session-replay-legend').innerText(),/Pose Traceur/);assert.match(await page.locator('.session-replay-legend').innerText(),/Relève Conducteur/);assert.ok(await page.locator('[data-map-path="pose"]').count());assert.ok(await page.locator('[data-map-path="search"]').count());await check('static replay with available paths');await shot('session-replay-iphone');
await navigate('/sessions');await page.locator('[data-session-filter="Archivées"]').tap();await check('Archives');await shot('sessions-archives-iphone');
await navigate('/');const tracksHome=page.locator('.feature-tile[href="/tracks"]');assert.equal(await tracksHome.count(),1,'Home Mes pistes links to /tracks');await tracksHome.tap();assert.equal(new URL(page.url()).pathname,'/tracks');assert.match(await page.locator('h1').innerText(),/Mes pistes/);assert.equal(await page.locator('[data-history-session]').count(),2,'Mes pistes exposes archived Coaching and summary-only demo history');assert.equal(await page.locator('[data-history-session] a[href$="/replay"]').count(),1,'only sessions with available debrief data link to replay');await check('Tracks home CTA and session history');await shot('tracks-history-iphone');
const editorLink=page.getByRole('link',{name:'Ouvrir le créateur de tracé',exact:true});
assert.equal(await editorLink.count(),1);assert.equal(await editorLink.getAttribute('href'),'/track-builder');
const firstTrack=page.locator('.track-record-card[data-track-id^="session:"]').first();assert.ok(await firstTrack.count(),'session-derived traces are listed');
const sourceTrackId=await firstTrack.getAttribute('data-track-id');await firstTrack.tap();assert.ok(await page.locator('[data-track-detail]').count());
const sourceDetail=await page.locator('[data-track-detail]').innerHTML();
assert.equal(await page.locator('[data-track-action="edit"],[data-track-action="delete"],[data-track-action="duplicate"],[data-track-rename]').count(),0,'historical trace is not directly editable');
assert.equal(await page.getByRole('link',{name:'Consulter la session source',exact:true}).getAttribute('href'),`/sessions/${encodeURIComponent(sessionId)}`);
const copy=page.getByRole('button',{name:'Créer une copie modifiable',exact:true});assert.equal(await copy.count(),1);await copy.tap();
await page.waitForURL(base+'/track-builder?copy='+encodeURIComponent(sourceTrackId));
assert.equal(new URL(page.url()).searchParams.get('copy'),sourceTrackId);assert.ok(await page.locator('[data-editor-map]').count(),'copy opens the actual editor');
await check('historical trace opens a separate editable copy');
await page.locator('.bottom-nav a[href="/"]').tap();
assert.match(await page.locator('dialog').innerText(),/Quitter sans enregistrer/);await page.locator('dialog [data-confirm]').tap();await page.waitForURL(base+'/');
await navigate('/tracks/'+encodeURIComponent(sourceTrackId));assert.equal(await page.locator('[data-track-detail]').innerHTML(),sourceDetail,'opening a copy leaves the source unchanged');
await check('track detail is read-only and preserves its source');

await navigate('/dogs/nox');await page.getByRole('link',{name:'Voir les sessions de ce chien',exact:true}).tap();assert.equal(new URL(page.url()).pathname,'/sessions');assert.equal(new URL(page.url()).searchParams.get('dog'),'nox');assert.ok(await page.locator('[data-filter-dog="nox"]').count());checks.push('dog filter query preserved');
assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),persistentState,'session and track consultation does not add browser storage');assert.equal(await page.evaluate(()=>JSON.stringify(window.__storageWrites)),initialStorageWrites,'no new persistent browser writes');

for(const width of [320,375,390,430]){
 await page.setViewportSize({width,height:844});
 for(const [path,label] of [['/','Home'],['/sessions','sessions'],['/tracks','tracks'],[`/sessions/${sessionId}`,'session detail'],[`/sessions/${sessionId}/replay`,'replay'],['/tracks/session%3A'+encodeURIComponent(`${sessionId}:pose`),'track detail']]){
  await navigate(path);await check(`${label} ${width}px`);
  const main=page.locator('main');const nav=page.locator('.bottom-nav');
  const actions=main.locator('a.button,button');
  if(await actions.count()){
   const action=actions.last();await action.scrollIntoViewIfNeeded();
   const box=await action.boundingBox(),navBox=await nav.boundingBox();
   if(box&&navBox)assert.ok(box.y+box.height<=navBox.y+1,`${label} ${width}px: last action must clear the bottom navigation`);
  }
 }
}
// A prepared reference is visible in the replay, but has no recorded points to copy.
await page.setViewportSize({width:390,height:844});
await createActiveSession('prepared');await finishSession();await page.locator('.debrief-archive').tap();await navigate('/tracks');
const reference=page.locator('.track-record-card[data-track-id^="session:"][data-track-id$=":reference"]').first();
assert.equal(await reference.count(),1,'prepared session exposes its reference trace');await reference.tap();
assert.equal(await page.locator('[data-track-detail]').count(),1);
assert.equal(await page.getByRole('button',{name:'Créer une copie modifiable',exact:true}).count(),0,'reference without copyable points cannot be copied');
assert.match(await page.locator('.track-detail-card').innerText(),/Copie indisponible/);
assert.equal(await page.locator('[data-track-action="edit"],[data-track-action="delete"],[data-track-action="duplicate"],[data-track-rename]').count(),0);
for(const width of [320,375,390,430]){await page.setViewportSize({width,height:844});await check('non-copyable source '+width);}
assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),persistentState,'all scenarios preserve persistent storage');
assert.equal(await page.evaluate(()=>JSON.stringify(window.__storageWrites)),initialStorageWrites,'all scenarios add no persistent writes');
assert.deepEqual(errors,[]);assert.deepEqual(network,[]);assert.deepEqual(failed,[]);
const report={passed:true,base,checks,captures,errors,network,failed,gps:0,storageWrites:[],sessionCode:code,sessionTitle:title};
await writeFile(`${dest}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));await browser.close();
