import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PROTOTYPE_MODE, debugSnapshot } from '../src/config.mjs';
import { HomeScreen, PlaceholderScreen, routes } from '../src/screens.mjs';
import { escapeHTML } from '../src/components.mjs';
test('prototype fermé aux adaptateurs réels et debug centralisé',()=>{
 assert.equal(PROTOTYPE_MODE,true);
 assert.deepEqual(debugSnapshot('/dogs'),{route:'/dogs',prototypeMode:true,mockScenario:'terrain-morning'});
});
test('chaque accès accueil et chaque navigation résout une route',()=>{
 for(const match of HomeScreen().matchAll(/href="([^"]+)"/g)) assert.ok(routes[match[1]],match[1]);
 for(const route of Object.keys(routes)) assert.ok((route==='/'?HomeScreen():PlaceholderScreen(route)).length>100);
});
test('aucun moteur V1 ni transport réseau ; capteur GPS limité à son adaptateur dédié',async()=>{
 for(const file of await readdir(new URL('../src/',import.meta.url))) {
  if(!file.endsWith('.mjs'))continue;
  const source=await readFile(new URL(`../src/${file}`,import.meta.url),'utf8');
  const withoutAdminServiceLabel=file==='admin-services.mjs'?source.replace("id:'supabase'", "id:'fixture-service'").replace("name:'Supabase'", "name:'Service fixture'"):source;
  const boundedCapability=withoutAdminServiceLabel.replaceAll('device-geolocation','device-position');
  const isolatedCapability=file==='coaching-gps-sensor.mjs'?boundedCapability.replaceAll('geolocation','devicePosition'):boundedCapability;
  assert.doesNotMatch(isolatedCapability,/\b(fetch|XMLHttpRequest|WebSocket|EventSource|geolocation|supabase|serviceWorker|indexedDB)\b/,file);
  if(file!=='app.mjs')assert.doesNotMatch(source,/\blocalStorage\b/,file);
  assert.doesNotMatch(source,/\b(sessionStorage|document\.cookie)\b/,file);
  for(const [,name] of source.matchAll(/from ['"]([^'"]+)['"]/g))assert.match(name,/^\.\/[^/]+\.mjs$/,file);
 }
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/img-src 'self' data: https:\/\/tile\.openstreetmap\.org/);
 assert.doesNotMatch(html.replace('https://tile.openstreetmap.org','').replace('https://data.geopf.fr',''),/https?:\/\//);
 assert.match(html,/img-src 'self' data: https:\/\/tile\.openstreetmap\.org https:\/\/data\.geopf\.fr;/);
 assert.match(html,/referrer" content="strict-origin-when-cross-origin/);
});
test('les chaînes de composants sont échappées',()=>assert.equal(escapeHTML('<script>"&'), '&lt;script&gt;&quot;&amp;'));
