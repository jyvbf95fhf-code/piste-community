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
test('production adapters and content policy remain confined to V2 and declared service origins',async()=>{
 const {COACHING_REMOTE}=await import('../src/coaching-remote-config.mjs');
 assert.equal(COACHING_REMOTE.projectRef,'shnwqdkiapgcftbnhilh');assert.equal(new URL(COACHING_REMOTE.endpoint).hostname,'shnwqdkiapgcftbnhilh.supabase.co');
 for(const file of await readdir(new URL('../src/',import.meta.url))){
  if(!file.endsWith('.mjs'))continue;const source=await readFile(new URL('../src/'+file,import.meta.url),'utf8');
  for(const [,name] of source.matchAll(/from ['"]([^'"]+)['"]/g)){assert.match(name,/^\.\/[a-z0-9_./-]+\.mjs$/i,file);assert.ok(!name.includes('..'),file+' must not import V1 outside Premium');}
  for(const url of source.matchAll(/https:\/\/([a-z0-9]+)\.supabase\.co/g))assert.equal(url[1],'shnwqdkiapgcftbnhilh',file);
  assert.doesNotMatch(source,/navigator\.mediaDevices|navigator\.contacts|document\.cookie\s*=/,file);
 }
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');const csp=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
 const connect=csp.match(/connect-src ([^;]+)/)[1].split(' ');
 assert.deepEqual(connect,["'self'",'https://shnwqdkiapgcftbnhilh.supabase.co','wss://shnwqdkiapgcftbnhilh.supabase.co','https://api.open-meteo.com','https://data.geopf.fr','https://geo.api.gouv.fr']);
 assert.match(csp,/script-src 'self';/);assert.match(csp,/object-src 'none';/);assert.match(csp,/img-src 'self' data: https:\/\/tile\.openstreetmap\.org https:\/\/data\.geopf\.fr;/);
 assert.doesNotMatch(csp,/\*|'unsafe-eval'|'unsafe-inline'/);assert.match(html,/referrer" content="strict-origin-when-cross-origin/);
});
test('les chaînes de composants sont échappées',()=>assert.equal(escapeHTML('<script>"&'), '&lt;script&gt;&quot;&amp;'));
