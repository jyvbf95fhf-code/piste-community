// Real OPS adapter + Leaflet + corridor controller; no account/backend writes.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname),origin='https://ops-corridor.test';
const now=Date.now(),view={kind:'operational',id:'ops-reader',status:'À compléter',trackingState:'stopped',time:{disappearanceAt:new Date(now-7200000).toISOString()},gpsTrack:{sessionId:'ops-reader-gps',provenance:'device-geolocation',phase:'finished',segments:[[{latitude:48.29,longitude:7.39,timestamp:now-60000,accuracy:5},{latitude:48.291,longitude:7.391,timestamp:now-30000,accuracy:5}]]},events:[]};
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];let weatherCalls=0;
 page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='api.open-meteo.com'){weatherCalls++;return route.fulfill({json:{current:{time:Math.floor(now/1000),wind_speed_10m:9,wind_direction_10m:270,temperature_2m:15,relative_humidity_2m:65}}});}
  if(u.origin!==origin)return route.abort();
  if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/src/vendor/leaflet.css"><link rel="stylesheet" href="/src/coaching-gps.css"><link rel="stylesheet" href="/src/track-editor-real-map.css"><link rel="stylesheet" href="/src/operational-gps.css"><link rel="stylesheet" href="/src/coaching-corridor.css"><script src="/src/vendor/leaflet.js"></script><main></main><script type="module">import {OperationalMap} from '/src/operational-map.mjs';import {mountGpsMaps,destroyGpsMaps} from '/src/coaching-gps-screen.mjs';window.renderMission=v=>{destroyGpsMaps();document.querySelector('main').innerHTML=OperationalMap(v);mountGpsMaps();};</script>`});
  try{return route.fulfill({body:await readFile(path.join(root,u.pathname)),contentType:/\.(mjs|js)$/.test(u.pathname)?'text/javascript':u.pathname.endsWith('.css')?'text/css':undefined});}catch{return route.fulfill({status:404,body:''});}
 });
 await page.goto(origin);await page.waitForFunction(()=>!!window.renderMission);await page.evaluate(v=>renderMission(v),view);
 await page.locator('[data-corridor-summary][data-active="true"]').waitFor();
 const polygons=()=>page.locator('.leaflet-gpsCorridor-pane path');assert.equal(await polygons().count(),2);assert.ok(weatherCalls>0);
 await page.locator('[data-corridor-summary]').click();await page.getByRole('button',{name:'Masquer le couloir',exact:true}).click();assert.equal(await polygons().count(),0);
 await page.evaluate(v=>renderMission(v),view);assert.equal(await polygons().count(),0);await page.locator('[data-corridor-summary]').click();await page.getByRole('button',{name:'Afficher le couloir',exact:true}).click();await page.locator('[data-corridor-summary][data-active="true"]').waitFor();assert.equal(await polygons().count(),2);
 for(const width of [320,390,430]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.evaluate(v=>renderMission({...v,time:{}}),view);await page.locator('[data-corridor-summary]').click();await page.getByText(/Heure de disparition ou de dernier contact inconnue/).waitFor();assert.equal(await polygons().count(),0);
 await page.evaluate(v=>renderMission({...v,gpsTrack:null,progress:[]}),view);assert.equal(await page.locator('[data-corridor-summary]').count(),0);
 assert.deepEqual(errors,[]);await context.close();console.log('PASS OPS read-only corridor: real Leaflet polygons, shared saved toggle, missing-age explanation, no invented route, mobile 320/390/430. All external transports simulated.');
}finally{await browser.close();}
