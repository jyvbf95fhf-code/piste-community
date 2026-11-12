// Archive dossier + actual Leaflet and historical corridor controller; no account/backend writes.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname),origin='https://ops-corridor.test';
const now=Date.now(),pose={sessionId:'review-s',provenance:'device-geolocation',phase:'finished',elapsedMs:60000,distanceM:150,segments:[[{latitude:48.29,longitude:7.39,timestamp:now-60000,accuracy:5},{latitude:48.291,longitude:7.391,timestamp:now-30000,accuracy:5}]]},view={id:'review-s',phase:'DEBRIEF',mode:'normal',role:'driver',dog:'QA',pose,search:{...pose,segments:pose.segments.map(s=>s.map(p=>({...p,longitude:p.longitude+.0001})))},searchActiveMs:60000,team:[],events:[],notes:[],weatherHistory:[{kind:'pose',weather:{source:'Open-Meteo',provenance:'estimated',capturedAt:now-30000,observedAt:now-30000,fetchedAt:now-30000,wind_speed_kmh:9,wind_direction_deg:270}}]};
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];let weatherCalls=0;
 page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='api.open-meteo.com'){weatherCalls++;return route.fulfill({json:{current:{time:Math.floor(now/1000),wind_speed_10m:9,wind_direction_10m:270,temperature_2m:15,relative_humidity_2m:65}}});}
  if(u.origin!==origin)return route.abort();
  if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/tokens.css"><link rel="stylesheet" href="/src/styles.css"><link rel="stylesheet" href="/src/vendor/leaflet.css"><link rel="stylesheet" href="/src/coaching-gps.css"><link rel="stylesheet" href="/src/track-editor-real-map.css"><link rel="stylesheet" href="/src/operational-gps.css"><link rel="stylesheet" href="/src/coaching-corridor.css"><script src="/src/vendor/leaflet.js"></script><main></main><script type="module">import {sharedSessionDossier,SessionDossierScreen} from '/src/session-dossier.mjs';import {mountGpsMaps,destroyGpsMaps} from '/src/coaching-gps-screen.mjs';window.renderMission=v=>{destroyGpsMaps();document.querySelector('main').innerHTML=SessionDossierScreen(sharedSessionDossier({...v,phase:"ARCHIVED"}),{tab:"map"});mountGpsMaps();};</script>`});
  try{return route.fulfill({body:await readFile(path.join(root,u.pathname)),contentType:/\.(mjs|js)$/.test(u.pathname)?'text/javascript':u.pathname.endsWith('.css')?'text/css':undefined});}catch{return route.fulfill({status:404,body:''});}
 });
 await page.goto(origin);await page.waitForFunction(()=>!!window.renderMission);await page.evaluate(v=>renderMission(v),view);
 const polygons=()=>page.locator('.leaflet-gpsCorridor-pane path');
 await page.waitForFunction(()=>document.querySelectorAll('.leaflet-gpsCorridor-pane path').length===2);
 assert.ok(!(await page.locator('body').innerText()).includes('Météo historique indisponible'));
 await page.locator('[data-corridor-summary]').click();
 await page.getByRole('button',{name:'Masquer le couloir',exact:true}).click();assert.equal(await polygons().count(),0);
 await page.getByText('Couloir historique masqué.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Afficher le couloir',exact:true}).click();assert.equal(await polygons().count(),2);
 await page.evaluate(v=>renderMission({...v,weatherHistory:[{weather:{...v.weatherHistory[0].weather,wind_direction_deg:undefined}}]}),view);
 assert.equal(await polygons().count(),0);assert.equal(await page.getByRole('button',{name:'Météo historique indisponible',exact:true,includeHidden:true}).isDisabled(),true);
 assert.match(await page.locator('[data-corridor-status]').textContent(),/vent exploitable/);
 await page.evaluate(v=>renderMission({...v,weatherHistory:[]}),view);assert.equal(await polygons().count(),0);assert.equal(await page.getByRole('button',{name:'Météo historique indisponible',exact:true,includeHidden:true}).isDisabled(),true);
 await page.evaluate(v=>renderMission({...v,mode:'full_blind',pose:null,weatherHistory:[]}),view);assert.equal(await page.locator('[data-corridor-toggle]').count(),0);
 for(const width of [320,390,430]){await page.setViewportSize({width,height:844});await page.evaluate(v=>renderMission(v),view);await page.locator('[data-corridor-summary]').click();const box=await page.locator('.gps-corridor-info').boundingBox();const stage=await page.locator('.gps-map-stage').boundingBox();assert.ok(box&&stage&&box.x>=stage.x&&box.x+box.width<=stage.x+stage.width&&box.y+box.height<=stage.y+stage.height);assert.ok(box.x>=0&&box.x+box.width<=width);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/archive-corridor-'+width+'.png',fullPage:true});}
 assert.equal(weatherCalls,0);assert.deepEqual(errors,[]);console.log('PASS archive historical corridor: correct availability labels, real Leaflet corridor, hide/show, incomplete/absent wind disabled, blind restrictions, zero current weather requests.');
}finally{await browser.close();}
