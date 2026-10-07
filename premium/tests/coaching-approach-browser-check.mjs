import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');const base=process.env.BASE_URL||'http://localhost:4173',dest=process.env.ARTIFACT_DIR||'/private/tmp/approach-browser';await mkdir(dest,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome 2.app/Contents/MacOS/Google Chrome'}),context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});const errors=[],api=[],external=[],checks=[],captures=[];context.on('request',r=>{if(['fetch','xhr','websocket'].includes(r.resourceType()))api.push(r.url());if(!r.url().startsWith(base+'/')&&!r.url().startsWith('data:'))external.push(r.url());});await context.addInitScript(()=>{window.__gps=0;for(const k of ['getCurrentPosition','watchPosition'])navigator.geolocation[k]=()=>{window.__gps++;throw Error('realGPS');};});const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const click=name=>page.getByRole('button',{name,exact:true}).click();const shot=async name=>{const fullPage=name!=='03-me-declarer-pret'&&!await page.locator('[data-tracer-phase]').count();await page.evaluate(()=>document.activeElement?.blur());if(fullPage)await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:dest+'/'+name+'.png',fullPage});captures.push({name,url:page.url()});};
const sim=async(k,value)=>{if(!await page.locator('[data-prep-simulator]').evaluate(n=>n.open))await page.locator('[data-prep-simulator] summary').click();await page.locator(`[data-prep-sim="${k}"]`).selectOption(value);};
const closeSim=async()=>{if(await page.locator('[data-prep-simulator]').evaluate(n=>n.open))await page.locator('[data-prep-simulator] summary').click();};
await page.goto(base+'/auth/login');await page.getByLabel('Email',{exact:true}).fill('prototype@example.test');await page.getByLabel('Mot de passe',{exact:true}).fill('fictif123');await click('Se connecter');await page.waitForURL(base+'/');
async function create(type,creator,solo=false,noDev=false){await page.goto(base+'/new-session');await page.reload();await click('Commencer');await page.locator('[data-coaching-choice="mode"][data-value="normal"]').click();await click('Continuer');await click('Continuer');await page.locator(`[data-coaching-choice="traceType"][data-value="${type}"]`).click();await click('Continuer');if(['prepared','gpx'].includes(type)){await page.locator('[data-coaching-choice="preparation"]').first().click();await click('Continuer');}await page.locator(`[data-coaching="creator"][data-role="${creator}"]`).click();if(solo){await page.locator('#coaching-traceur').selectOption('self');await page.locator('#coaching-driver').selectOption('self');}await click('Continuer');await click('Créer la session');await page.getByRole('link',{name:'Ouvrir la préparation',exact:true}).click();if(await page.locator('[data-search-phase]').count()){await page.getByRole('button',{name:'Simulateur Conducteur',exact:true}).click();await page.getByRole('button',{name:'Préparation (DEV)',exact:true}).click();}if(noDev)return;if(!solo)await sim('viewerRole','traceur');await sim('gps','fresh');await closeSim();}
for(const type of ['prepared','gpx','direct','none'])for(const creator of ['coach','driver','traceur']){
 await create(type,creator);const known=['prepared','gpx'].includes(type);
 assert.equal(await page.getByRole('button',{name:'Rejoindre le départ',exact:true}).count(),known?1:0);
 if(known){
  if(type==='prepared'&&creator==='traceur')await shot('01-preparation-bouton');
  await click('Rejoindre le départ');assert.equal(await page.locator('[data-tracer-phase]').getAttribute('data-tracer-phase'),'approaching');
  assert.equal(await page.locator('[data-preparation-phase]').count(),0);assert.equal(await page.locator('[data-tracer="back"]').count(),0);
  assert.equal(await page.locator('[data-map-path="reference"]').count(),1);assert.equal(await page.locator('[data-map-path="pose"]').count(),0);
  assert.match(await page.locator('.tracer-hud').innerText(),/180 m/);assert.doesNotMatch(await page.locator('.tracer-hud').innerText(),/km|00:00/);
  assert.equal(await page.locator('[data-tracer="arrive"]').isEnabled(),true);
  if(type==='prepared'&&creator==='traceur')await shot('02-grande-carte-approche');
  await page.locator('[data-tracer="messages"]').click();assert.equal(await page.locator('.tracer-sheet').count(),1);await click('Fermer les messages');
  await page.locator('[data-tracer="arrive"]').tap();
  assert.equal(await page.locator('[data-tracer-phase]').getAttribute('data-tracer-phase'),'arrived');assert.equal(await page.locator('[data-map-path="pose"]').count(),0);
  if(type==='prepared'&&creator==='traceur')await shot('03-arrive-pret');
 }
 await click('Me déclarer prêt à tracer');assert.equal(await page.locator('[data-tracer-phase]').getAttribute('data-tracer-phase'),'before');
 assert.equal(await page.locator('[data-preparation-phase]').count(),0);assert.equal(await page.locator('[data-tracer="start"]').isEnabled(),true);
 assert.match(await page.locator('.tracer-hud').innerText(),/0,00 km/);assert.match(await page.locator('.tracer-hud').innerText(),/00:00/);
 assert.equal(await page.locator('[data-map-path="pose"]').count(),0);assert.equal(await page.locator('[data-tracer="center"]').count(),1);
 if(type==='prepared'&&creator==='traceur')await shot('04-pret-demarrer');
 await click('Tracer la piste');await click('Simulateur terrain');await click('Avancer le scénario (+30 s mock)');await click('Fermer le simulateur');
 assert.equal(await page.locator('[data-tracer-phase]').getAttribute('data-tracer-phase'),'active');assert.equal(await page.locator('[data-map-path="pose"]').count(),1);
 checks.push({type,creator,known,unifiedCockpit:true,origin:page.url()});
 if(type==='prepared'&&creator==='traceur'){
  await shot('05-pose-active');await click('Simulateur terrain');await page.locator('[data-tracer-sim="messages"]').selectOption('2');await click('Fermer le simulateur');
  assert.equal(await page.locator('[data-tracer-unread]').innerText(),'2');await page.locator('[data-tracer="messages"]').click();await page.locator('[data-tracer="reply"][data-text="J’arrive"]').click();await shot('06-messages');await click('Fermer les messages');
  await click('Simulateur terrain');await page.locator('[data-tracer-sim="gps"]').selectOption('unavailable');const old=await page.locator('[data-map-path="pose"]').evaluateAll(ns=>ns.map(n=>n.getAttribute('d')));await click('Avancer le scénario (+30 s mock)');assert.deepEqual(await page.locator('[data-map-path="pose"]').evaluateAll(ns=>ns.map(n=>n.getAttribute('d'))),old);await click('Fermer le simulateur');await shot('07-interruption');
  await click('Simulateur terrain');await page.locator('[data-tracer-sim="gps"]').selectOption('fresh');await click('Avancer le scénario (+30 s mock)');await click('Fermer le simulateur');assert.equal(await page.locator('[data-map-path="pose"]').count(),2);await shot('08-reprise');await click('Terminer la piste');await shot('09-pose-terminee');await click('Je suis en place');await shot('10-en-place');
 }
}
await create('prepared','driver',true);await click('Rejoindre le départ');await page.locator('[data-tracer="arrive"]').tap();await click('Me déclarer prêt à tracer');assert.equal(await page.locator('[data-tracer-phase]').getAttribute('data-tracer-phase'),'before');checks.push({soloSelfTrace:true,approachRequired:true});
for(const interaction of ['click','tap'])for(const type of ['prepared','gpx']){
 await create(type,'traceur',false,true);
 const act=async name=>page.getByRole('button',{name,exact:true})[interaction]();
 await act('Rejoindre le départ');assert.equal(await page.locator('[data-tracer-phase]').getAttribute('data-tracer-phase'),'approaching');
 assert.equal(await page.locator('[data-map-path="pose"]').count(),0);
 await page.locator('[data-tracer="arrive"]')[interaction]();assert.equal(await page.locator('[data-tracer-phase]').getAttribute('data-tracer-phase'),'arrived');
 assert.equal(await page.locator('[data-map-path="pose"]').count(),0);
 await act('Me déclarer prêt à tracer');assert.equal(await page.locator('[data-tracer-phase]').getAttribute('data-tracer-phase'),'before');
 assert.match(await page.locator('.tracer-hud').innerText(),/0,00 km/);assert.match(await page.locator('.tracer-hud').innerText(),/00:00/);
 assert.equal(await page.getByRole('button',{name:'Démarrer la piste',exact:true}).count(),0);
 await act('Tracer la piste');assert.equal(await page.locator('[data-tracer-phase]').getAttribute('data-tracer-phase'),'active');
 await act('Terminer la piste');await act('Je suis en place');assert.match(await page.locator('.tracer-in-place').innerText(),/Vous êtes en place/);
 checks.push({type,interaction,arrivalWithoutDev:true,gps:'acquiring',fullUserFlow:true});
}
for(const phase of ['approaching','arrived','before']){
 await click('Simulateur terrain');await page.locator('[data-tracer-sim="phase"]').selectOption(phase);await click('Fermer le simulateur');
 for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[844,390]]){await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const a=await page.locator('.tracer-actions').boundingBox();assert.ok(a.y+a.height<=height+1);checks.push({phase,width,height,overflow:false});}
}
await page.setViewportSize({width:390,height:844});await click('Simulateur terrain');await page.locator('[data-tracer-sim="phase"]').selectOption('approaching');await page.locator('[data-tracer-sim="gps"]').selectOption('unavailable');await click('Fermer le simulateur');assert.equal(await page.locator('[data-map-actor="self"]').count(),0);assert.match(await page.locator('.tracer-hud').innerText(),/Distance indisponible/);assert.equal(await page.locator('[data-map-path="pose"]').count(),0);await shot('11-approche-gps-indisponible');await click('Simulateur terrain');await click('Simuler la reprise GPS');await click('Fermer le simulateur');assert.equal(await page.locator('[data-tracer-phase]').getAttribute('data-tracer-phase'),'approaching');assert.equal(await page.locator('[data-map-path="pose"]').count(),0);assert.match(await page.locator('.tracer-hud').innerText(),/180 m/);
assert.deepEqual(errors,[]);assert.deepEqual(api,[]);assert.deepEqual(external,[]);assert.equal(await page.evaluate(()=>window.__gps),0);await writeFile(dest+'/report.json',JSON.stringify({passed:true,base,checks,captures,errors,api,external,gps:0},null,2));console.log(JSON.stringify({passed:true,checks:checks.length,captures:captures.length,errors,api,gps:0}));await browser.close();
