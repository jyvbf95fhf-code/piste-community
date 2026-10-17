import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {AppShell,BottomNavigation} from '../src/components.mjs';
const previous=execFileSync('git',['show','13ff8d3dde08b6a5b872cb197f5e381f3372b334:premium/src/components.mjs'],{encoding:'utf8'}).replace("from './icons.mjs'",`from '${new URL('../src/icons.mjs',import.meta.url).href}'`);
const old=await import('data:text/javascript;base64,'+Buffer.from(previous).toString('base64'));
const routes=['/sessions','/sessions/session-id/debrief','/operational','/operational/mission-id/replay','/live','/live/ops/mission-id','/new-session','/coaching/session','/dogs','/dogs/dog-id','/profile','/profile/access','/scientific','/scientific/sessions/id','/track-builder','/tracks/id','/statistics','/community','/notifications','/admin','/admin/member/id'];
test('one visible official wordmark is centralized across signed-in sections and their subroutes',()=>{
 for(const route of routes){const html=AppShell('<section><h1>Rubrique conservée</h1><button data-action="unchanged">Action</button></section>',route,'Sébastien','SL','base',3);assert.equal((html.match(/class="shared-official-logo"/g)||[]).length,1,route);assert.match(html,/class="brand-official-sizing" aria-hidden="true"/);assert.match(html,/Notifications, 3 non lues/);}
});
test('outside the shared header all markup, actions, links and navigation stay identical',()=>{
 const strip=html=>html.replace(/<header class="screen-header">[\s\S]*?<\/header>/,'');
 for(const route of routes){const args=['<section><h1>Titre</h1><button data-action="unchanged">Action</button></section>',route,'Sébastien','SL','base',3];assert.equal(strip(AppShell(...args)),strip(old.AppShell(...args)),route);assert.equal(BottomNavigation(route),old.BottomNavigation(route));}
});
test('Home and every JUMOLF route keep their exact previous shell',()=>{
 for(const route of ['/','/jumolf','/jumolf/session/id','/jumolf/learning','/olfactory-twin']){const args=['<article>Contenu inchangé</article>',route,'Sébastien','SL','base',2];assert.equal(AppShell(...args),old.AppShell(...args),route);}
});
test('the new branch cannot trigger an automatic Vercel deployment',async()=>{
 for(const url of [new URL('../vercel.json',import.meta.url),new URL('../../vercel.json',import.meta.url)])assert.equal(JSON.parse(await readFile(url)).git.deploymentEnabled['feature/v2-premium-shared-brand'],false);
});
