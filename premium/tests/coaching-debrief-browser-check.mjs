import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://localhost:4173';
const dest=process.env.ARTIFACT_DIR||'premium/screenshots/debrief-v2';
await mkdir(dest,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome 2.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
const errors=[],network=[],checks=[],captures=[];
context.on('request',r=>{if((!r.url().startsWith(base+'/')&&!r.url().startsWith('data:'))||['fetch','xhr','websocket'].includes(r.resourceType()))network.push(r.url());});
await context.addInitScript(()=>{window.__gps=0;for(const k of ['getCurrentPosition','watchPosition'])navigator.geolocation[k]=()=>{window.__gps++;throw Error('GPS real forbidden');};});

async function watch(page){page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});}
async function tap(page,label){await page.getByRole('button',{name:label,exact:true}).tap();}
async function login(page){await page.goto(base+'/auth/login');await page.getByLabel('Email',{exact:true}).fill('prototype@example.test');await page.getByLabel('Mot de passe',{exact:true}).fill('fictif123');await tap(page,'Se connecter');await page.waitForURL(base+'/');}
async function completeSession(page,mode,captureAge=false){
 await login(page);await page.goto(base+'/new-session');await tap(page,'Commencer');await page.locator(`[data-coaching-choice="mode"][data-value="${mode}"]`).tap();await tap(page,'Continuer');await tap(page,'Continuer');await page.locator('[data-coaching-choice="traceType"][data-value="direct"]').tap();await tap(page,'Continuer');await page.locator('[data-coaching-observer="lea"]').check();await tap(page,'Continuer');await tap(page,'Créer la session');await page.getByRole('link',{name:'Ouvrir la préparation',exact:true}).tap();
 await tap(page,'Simulateur Conducteur');await tap(page,'Préparation (DEV)');await page.locator('[data-prep-simulator] summary').tap();await page.locator('[data-prep-sim="viewerRole"]').selectOption('traceur');await page.locator('[data-prep-sim="gps"]').selectOption('fresh');await page.locator('[data-prep-simulator] summary').tap();await tap(page,'Me déclarer prêt à tracer');await tap(page,'Tracer la piste');await tap(page,'Simulateur terrain');await tap(page,'Avancer le scénario (+30 s mock)');await tap(page,'Fermer le simulateur');await tap(page,'Terminer la piste');await tap(page,'Je suis en place');await tap(page,'Simulateur terrain');await tap(page,'Préparation (DEV)');if(!await page.locator('[data-prep-simulator]').evaluate(n=>n.open))await page.locator('[data-prep-simulator] summary').tap();await page.locator('[data-prep-sim="viewerRole"]').selectOption('driver');await tap(page,'Ouvrir le cockpit Conducteur (DEV)');assert.equal(await page.locator('[data-search-phase]').getAttribute('data-search-phase'),'SEARCH_READY');if(captureAge)await page.screenshot({path:dest+'/coaching-track-age-waiting-iphone.png',fullPage:true});await tap(page,'Démarrer la recherche');if(captureAge)await page.screenshot({path:dest+'/coaching-track-age-cockpit-iphone.png',fullPage:true});await tap(page,'Simulateur Conducteur');await tap(page,'Avancer la recherche (+30 s mock)');await tap(page,'Fermer le simulateur Conducteur');await tap(page,'Terminer la recherche');await tap(page,'Confirmer la fin');
 assert.equal(await page.locator('[data-debrief-phase]').getAttribute('data-debrief-phase'),'DEBRIEF');assert.notEqual(await page.locator('.bottom-nav').evaluate(n=>getComputedStyle(n).position),'fixed','debrief navigation must not cover report content');
}
async function fullShot(page,name){await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0)});await page.screenshot({path:dest+'/'+name+'.png',fullPage:true});captures.push(name);}
async function mapScreenshot(mode,name){const page=await context.newPage();await watch(page);await completeSession(page,mode);await tap(page,'Carte');assert.ok(await page.locator('[data-map-path="pose"]').count(),mode+' Traceur path');assert.ok(await page.locator('[data-map-path="search"]').count(),mode+' Conducteur path');assert.ok(await page.locator('[data-map-start]').count(),mode+' departure');assert.ok(await page.locator('[data-map-arrival]').count(),mode+' arrival');assert.ok(await page.locator('[data-map-actor].traceur').count(),mode+' Traceur marker');assert.ok(await page.locator('[data-map-actor].driver').count(),mode+' Conducteur marker');await fullShot(page,name);await page.close();checks.push({mode,postSessionMap:'complete'});}

const page=await context.newPage();await watch(page);await completeSession(page,'normal',true);
assert.deepEqual(await page.locator('[data-session-event]').evaluateAll(ns=>ns.map(n=>n.dataset.sessionEvent)),['LAYING_STARTED','LAYING_FINISHED','TRACEUR_IN_POSITION','SEARCH_READY','SEARCH_STARTED','SEARCH_FINISHED','DEBRIEF_ENTERED']);
assert.equal(await page.locator('[data-debrief="archive"]').count(),1);
await tap(page,'Synthèse');assert.match(await page.locator('[data-debrief-panel="summary"]').innerText(),/Nox/);assert.match(await page.locator('[data-debrief-panel="summary"]').innerText(),/35 m/);assert.match(await page.locator('[data-debrief-panel="summary"]').innerText(),/Âge de piste au départ recherche/);assert.match(await page.locator('[data-debrief-panel="summary"]').innerText(),/Fin de pose/);assert.doesNotMatch(await page.locator('[data-debrief-panel="summary"]').innerText(),/09:00/);await fullShot(page,'debrief-synthese-iphone');await page.screenshot({path:dest+'/coaching-track-age-debrief-iphone.png',fullPage:true});
await tap(page,'Carte');assert.ok(await page.locator('[data-map-path="pose"]').count());assert.ok(await page.locator('[data-map-path="search"]').count());assert.ok(await page.locator('[data-map-start]').count());assert.ok(await page.locator('[data-map-arrival]').count());await fullShot(page,'debrief-carte-normal-iphone');
await tap(page,'Données / science');assert.match(await page.locator('[data-debrief-panel="science"]').innerText(),/ESTIMÉ/);assert.match(await page.locator('[data-debrief-panel="science"]').innerText(),/calculé/);await fullShot(page,'debrief-donnees-science-iphone');
await tap(page,'Observations');assert.match(await page.locator('[data-debrief-panel="observations"]').innerText(),/non enregistrées/);await fullShot(page,'debrief-observations-iphone');
await page.locator('.debrief-events').screenshot({path:dest+'/debrief-journal-session-iphone.png'});captures.push('debrief-journal-session-iphone');
await page.locator('.debrief-archive').scrollIntoViewIfNeeded();await page.locator('.debrief-archive').screenshot({path:dest+'/debrief-cloture-iphone.png'});captures.push('debrief-cloture-iphone');
assert.equal(await page.evaluate(()=>window.__gps),0);
for(const width of [320,375,390,430]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks.push({width,overflow:false});}await page.setViewportSize({width:390,height:844});
await tap(page,'Clôturer le débrief');assert.equal(await page.locator('[data-debrief-phase]').getAttribute('data-debrief-phase'),'ARCHIVED');assert.equal(await page.locator('[data-debrief="archive"]').count(),0);assert.equal(await page.locator('[data-search],[data-tracer],[data-prep-action]').count(),0);checks.push({archiveReadOnly:true});await page.close();
await mapScreenshot('simple_blind','debrief-carte-simple-aveugle-iphone');
await mapScreenshot('full_blind','debrief-carte-double-aveugle-iphone');
assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
await writeFile(dest+'/report.json',JSON.stringify({passed:true,base,checks,captures,errors,network,gps:0},null,2));
console.log(JSON.stringify({passed:true,checks:checks.length,captures,errors,network,gps:0},null,2));
await browser.close();
