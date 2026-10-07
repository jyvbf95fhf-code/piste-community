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
test('aucun moteur V1, API réseau, GPS, stockage métier ou service worker importé',async()=>{
 for(const file of await readdir(new URL('../src/',import.meta.url))) {
  if(!file.endsWith('.mjs'))continue;
  const source=await readFile(new URL(`../src/${file}`,import.meta.url),'utf8');
  const withoutAdminServiceLabel=file==='admin-services.mjs'?source.replace("id:'supabase'", "id:'fixture-service'").replace("name:'Supabase'", "name:'Service fixture'"):source;
  assert.doesNotMatch(withoutAdminServiceLabel,/\b(fetch|XMLHttpRequest|WebSocket|EventSource|geolocation|supabase|serviceWorker|indexedDB)\b/,file);
  if(file!=='app.mjs')assert.doesNotMatch(source,/\blocalStorage\b/,file);
  assert.doesNotMatch(source,/\b(sessionStorage|document\.cookie)\b/,file);
  for(const [,name] of source.matchAll(/from ['"]([^'"]+)['"]/g))assert.match(name,/^\.\/[^/]+\.mjs$/,file);
 }
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/connect-src 'none'/);
 assert.doesNotMatch(html,/https?:\/\//);
});
test('les chaînes de composants sont échappées',()=>assert.equal(escapeHTML('<script>"&'), '&lt;script&gt;&quot;&amp;'));
