import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {routes,PlaceholderScreen} from '../src/screens.mjs';
const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
const fallback=pathname=>config.rewrites.some(r=>new RegExp('^'+r.source+'$').test(pathname)&&r.destination==='/index.html');
test('SPA fallback serves every application route and keeps unknown pages in the existing client router',()=>{
 for(const pathname of Object.keys(routes))assert.equal(fallback(pathname),true,pathname);
 assert.equal(fallback('/route-vraiment-inconnue'),true);assert.match(PlaceholderScreen('/route-vraiment-inconnue'),/Page introuvable/);
});
test('SPA fallback cannot swallow static resources or reserved API namespaces',()=>{
 for(const pathname of ['/src','/src/app.mjs','/src/missing','/src/assets/missing.png','/api','/api/session','/assets','/assets/missing','/.well-known/security.txt','/missing.png','/missing.css','/missing.mjs','/favicon.ico','/robots.txt','/index.html'])assert.equal(fallback(pathname),false,pathname);
});
