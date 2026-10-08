import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://localhost:4173';
const remote=!base.includes('localhost');
const dest=process.env.ARTIFACT_DIR?new URL('file://'+process.env.ARTIFACT_DIR.replace(/\/$/,'')+'/'):new URL('../screenshots/coaching-preparation/',import.meta.url);
await mkdir(dest,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome 2.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
const errors=[],external=[],api=[],failed=[],checks=[],captures=[],sourceMatches=[];
let inspecting=false;
context.on('request',r=>{if(!inspecting)return;if(!r.url().startsWith(base+'/')&&!r.url().startsWith('data:'))external.push(r.url());if(['fetch','xhr','websocket'].includes(r.resourceType()))api.push(r.url());});
context.on('requestfailed',r=>{if(inspecting)failed.push(r.url().split('?')[0]);});
await context.addInitScript(()=>{
 window.__gps=0;for(const key of ['getCurrentPosition','watchPosition'])navigator.geolocation[key]=()=>{window.__gps++;throw Error('Unexpected real GPS');};
 window.__businessWrites=0;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k!=='piste.v2.mock-session')window.__businessWrites++;return original.call(this,k,v);};
});
const page=await context.newPage();page.setDefaultTimeout(15000);
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(inspecting&&m.type()==='error')errors.push(m.text());});
const sourceTasks=[];
page.on('response',r=>{if(!remote)return;const path=r.url().slice(base.length).split('?')[0];if(['/src/app.mjs','/src/coaching-preparation.mjs','/src/coaching-preparation-screen.mjs','/src/map-shell.mjs','/src/styles.css'].includes(path))sourceTasks.push((async()=>{const bytes=await r.body(),local=await readFile(new URL('..'+path,import.meta.url));sourceMatches.push({path,status:r.status(),matchesWorktree:bytes.equals(local),sha256:createHash('sha256').update(bytes).digest('hex')});})());});
if(process.env.ACCESS_FILE){const access=JSON.parse(await readFile(process.env.ACCESS_FILE,'utf8'));await page.goto(access.shareableUrl,{waitUntil:'networkidle'});assert.equal(new URL(page.url()).origin,base);}
inspecting=true;
await page.goto(base+'/auth/login');await page.getByLabel('Email',{exact:true}).fill('prototype@example.test');await page.getByLabel('Mot de passe',{exact:true}).fill('fictif123');await page.getByRole('button',{name:'Se connecter',exact:true}).click();await page.waitForURL(base+'/');
const storageBefore=await page.evaluate(()=>JSON.stringify({...localStorage}));
const click=label=>page.getByRole('button',{name:label,exact:true}).click();
async function createPreparationSession(){
 await page.goto(base+'/new-session');await click('Commencer');await page.locator('[data-coaching-choice="mode"][data-value="normal"]').click();await click('Continuer');await click('Continuer');await page.locator('[data-coaching-choice="traceType"][data-value="direct"]').click();await click('Continuer');await page.locator('[data-coaching-observer="lea"]').check();await page.locator('[data-coaching-observer="hugo"]').check();await click('Continuer');await click('Créer la session');await page.getByRole('link',{name:'Ouvrir la préparation',exact:true}).click();if(await page.locator('[data-search-phase]').count()){await page.getByRole('button',{name:'Simulateur Conducteur',exact:true}).click();await page.getByRole('button',{name:'Préparation (DEV)',exact:true}).click();}await page.waitForURL(base+'/coaching/session');
}
await createPreparationSession();
const simOpen=async()=>{if(!await page.locator('[data-prep-simulator]').getAttribute('open')){if(!await page.locator('[data-prep-simulator]').evaluate(n=>n.open))await page.locator('[data-prep-simulator] summary').click();}};
const sim=async(key,value)=>{await simOpen();const el=page.locator(`[data-prep-sim="${key}"]`);if(typeof value==='boolean')await el.setChecked(value);else await el.selectOption(value);};
const markers=()=>page.locator('[data-map-actor]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.mapActor,freshness:n.dataset.freshness,role:n.getAttribute('class').split(' ')[1]})));
const check=async label=>{
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,label+' overflow');
 assert.equal(await page.evaluate(()=>window.__gps),0);assert.equal(await page.evaluate(()=>window.__businessWrites),0);
 assert.equal(await page.locator('input[type=file]').count(),0);
 const bad=await page.locator('.prep-flow button,.prep-flow select,.prep-flow a,.prep-simulator summary').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).filter(n=>{const r=n.getBoundingClientRect();return r.width<44||r.height<44;}).map(n=>n.textContent));assert.deepEqual(bad,[],label+' touch controls');
 checks.push({label,url:page.url(),markers:await markers(),paths:await page.locator('[data-map-path]').evaluateAll(n=>n.map(x=>x.dataset.mapPath))});
};
const capture=async name=>{
 if(await page.locator('[data-prep-simulator]').count()&&await page.locator('[data-prep-simulator]').evaluate(n=>n.open))await page.locator('[data-prep-simulator] summary').click();
 await page.evaluate(()=>scrollTo(0,0));const filename=(remote?'remote-':'local-')+name+'.png';await page.screenshot({path:new URL(filename,dest).pathname,fullPage:true});captures.push({file:filename,url:page.url()});
};
await check('session créée GPS acquisition');await capture('01-created-acquisition');
for(const mode of ['normal','simple_blind','full_blind'])for(const role of ['coach','traceur','driver','observer']){
 // Each perspective starts with the same real wizard session and team.
 await createPreparationSession();
 await sim('mode',mode);await sim('gps','fresh');await sim('layers',true);await sim('viewerRole',role);
 const m=await markers();const expectedCount=mode==='full_blind'&&['coach','observer'].includes(role)?0:mode==='full_blind'&&role!=='traceur'?1:mode==='simple_blind'&&role==='driver'?4:5;assert.equal(m.length,expectedCount,mode+'/'+role+' position count');
 if(mode==='simple_blind'&&['coach','observer'].includes(role))assert.ok(m.some(p=>p.role==='traceur'),mode+'/'+role+' must see tracer');
 if(mode==='full_blind'&&role!=='traceur'){assert.equal(m.length,['coach','observer'].includes(role)?0:1);if(!['coach','observer'].includes(role))assert.equal(m[0].role,role);assert.equal(await page.locator('[data-map-path], [data-map-arrival]').count(),0);}
 if(mode==='simple_blind'&&role==='driver'){assert.ok(m.every(p=>p.role!=='traceur'));assert.equal(await page.locator('[data-map-path]').count(),0);assert.ok(m.some(p=>p.role==='coach'));assert.ok(m.some(p=>p.role==='observer'));}
 if(role==='observer'){
  assert.equal(await page.locator('[data-prep-action],[data-search],[data-tracer],[data-prep-simulator], [data-prep-sim]').count(),0,'Observer has no business or DEV controls');
  assert.equal(await page.locator('[data-session-role="observer"]').count(),1);
  for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[844,390]]){await page.setViewportSize({width,height});await check(mode+'/observer '+width);}
  await page.setViewportSize({width:390,height:844});
 }
 await check(mode+'/'+role);
 if(mode==='simple_blind'&&['coach','observer','traceur'].includes(role))await capture('simple-'+role);
 if(role==='driver')await capture(mode==='normal'?'02-normal-team':mode==='simple_blind'?'03-simple-driver':'04-double-driver');
 if(mode==='full_blind'&&role==='traceur')await capture('05-double-tracer');
}
await createPreparationSession();
await sim('mode','normal');await sim('viewerRole','traceur');await sim('phase','created');await sim('gps','acquiring');await page.locator('[data-prep-action="ready"]').click();await page.getByRole('button',{name:'Simulateur terrain',exact:true}).click();await page.getByRole('button',{name:'Préparation (DEV)',exact:true}).click();assert.equal(await page.locator('[data-preparation-phase]').getAttribute('data-preparation-phase'),'ready');await check('ready sans premier point');await capture('06-ready-acquisition');
await sim('viewerRole','driver');await sim('gps','stale');await check('position ancienne');assert.equal((await markers()).find(p=>p.role==='driver').freshness,'stale');await capture('07-stale');
await sim('gps','unavailable');assert.ok((await markers()).every(p=>p.role!=='driver'));await check('GPS indisponible');await capture('08-unavailable');
await sim('positionsPresent',false);assert.equal((await markers()).length,0);assert.equal(await page.locator('[data-gps-state]').getAttribute('data-gps-state'),'unavailable');await check('positions absentes');await sim('positionsPresent',true);await sim('gps','fresh');
await sim('traceurKind','external');await sim('phase','external_ready');await check('normal externe déclaré prêt');assert.equal(await page.locator('.prep-external').count(),1);assert.ok((await markers()).every(p=>p.role!=='traceur'));assert.equal(await page.locator('[data-map-path="pose"]').count(),0);await capture('09-external-normal');
await sim('mode','full_blind');assert.equal(await page.locator('.prep-external').count(),0);assert.equal(await page.locator('[data-map-path], [data-map-arrival]').count(),0);await check('double externe');await capture('10-external-double');
await sim('traceurKind','internal');await sim('scenario','solo');await sim('viewerRole','traceur');await sim('gps','fresh');await sim('phase','created');assert.ok(await page.locator('[data-prep-action]').count());await check('solo traceur');await capture('11-solo-tracer');
await sim('viewerFunction','driver');assert.equal(await page.locator('[data-prep-action], [data-map-path]').count(),0);await check('solo conducteur droits non cumulés');await capture('12-solo-driver');
await sim('scenario','team');await sim('mode','normal');await check('Coach Traceur Conducteur');await sim('scenario','observers');await check('équipe plusieurs Observateurs');
for(const type of ['direct','prepared','gpx','none']){await sim('traceType',type);await check('type '+type);assert.equal(await page.locator('[data-map-path="reference"]').count(),['prepared','gpx'].includes(type)?1:0);}
await sim('mode','full_blind');await sim('viewerRole','coach');await sim('traceType','gpx');assert.equal(await page.locator('[data-map-path]').count(),0);await check('GPX coach aveugle');
for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[844,390]]){await page.setViewportSize({width,height});await check('simulator open '+width);await page.locator('[data-prep-simulator] summary').click();await check('simulator closed '+width);await simOpen();}
assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),storageBefore);
await page.reload();assert.match(await page.locator('h1').innerText(),/Aucune session en mémoire/);await page.getByRole('link',{name:'Créer une session',exact:true}).click();await click('Commencer');assert.match(await page.locator('h1').innerText(),/Quel mode/);
const directRoutes=[];for(const route of ['/','/auth/login','/new-session','/coaching/session','/route-vraiment-inconnue']){const first=await page.goto(base+route);assert.equal(first.status(),200,route+' direct');await page.locator('h1').waitFor();const second=await page.reload();assert.equal(second.status(),200,route+' reload');await page.locator('h1').waitFor();if(route==='/coaching/session')assert.match(await page.locator('h1').innerText(),/Aucune session en mémoire/);if(route==='/route-vraiment-inconnue')assert.match(await page.locator('h1').innerText(),/Page introuvable/);directRoutes.push({route,direct:first.status(),reload:second.status()});}
 await Promise.all(sourceTasks);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(api,[]);assert.deepEqual(failed,[]);if(remote){assert.equal(new Set(sourceMatches.map(s=>s.path)).size,5);assert.ok(sourceMatches.every(s=>s.matchesWorktree));}
const report={passed:true,origin:base,remote,checks,captures,errors,external,api,failed,gps:0,businessWrites:0,reloadClears:true,directRoutes,sourceMatches};await writeFile(new URL((remote?'remote':'local')+'-runtime.json',dest),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,origin:base,checks:checks.length,captures,errors,external,api,gps:0,directRoutes,sourceMatches},null,2));await browser.close();
