import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HomeScreen} from '../src/screens.mjs';
import {mock} from '../src/data.mjs';
test('canonical hierarchy and exact copy',()=>{
 const html=HomeScreen();
 const selectors=['home-intro','discovery-hero','feature-grid','active-sessions','twin-card','explore-section'];
 const positions=selectors.map(s=>html.indexOf(s));
 assert.ok(positions.every((p,i)=>p>=0&&(i===0||p>positions[i-1])));
 for(const text of ['Chaque sortie','révèle un peu plus.','Piste opérationnelle','Créer un exercice avec coaching','Historique et replay','Partager et découvrir','Suivi et progression','Sessions en cours','Sous les pins','Crête du Nord']) assert.ok(html.includes(text),text);
});
test('zero, one and several active sessions, no empty reserved panel',()=>{
 assert.doesNotMatch(HomeScreen(mock.user,[]),/active-sessions/);
 const one=HomeScreen(mock.user,[mock.activeSessions[0]]);
 assert.equal((one.match(/active-session-card/g)||[]).length,1);
 assert.equal((HomeScreen().match(/active-session-card/g)||[]).length,2);
});
test('Home session cards link to their active route and the single Mes pistes shortcut stays distinct from the editor',()=>{
 const active=HomeScreen(mock.user,[{...mock.activeSessions[0],href:'/coaching/session'}]);
 assert.match(active,/class="active-session-card card" href="\/coaching\/session"/);
 assert.equal((active.match(/class="feature-tile card gold" href="\/tracks"/g)||[]).length,1);
 assert.equal((active.match(/href="\/track-builder"/g)||[]).length,1);
});
test('standard profile has no expert links while keeping twin and sessions',()=>{
 const html=HomeScreen({name:'Camille',permissions:{}});
 assert.doesNotMatch(html,/explore-section|href="\/(admin|research)"/);
 assert.ok(html.indexOf('active-sessions')<html.indexOf('twin-card'));
});
test('compact satellite sessions use exact statuses, routes and metrics',()=>{
 const html=HomeScreen();
 for(const value of ['EN COURS','EN PAUSE','3,6 km','1 h 12','Aujourd’hui · 06:15','satellite-forest','satellite-ridge','trace-red','trace-blue'])assert.ok(html.includes(value),value);
 assert.doesNotMatch(html,/map-contour/);
 assert.match(html,/olfactory-dog-science/);
});

test('Home shows one Premium badge on JUMOLF for every access state without changing links or other content',async()=>{
 const {execFileSync}=await import('node:child_process');
 const source=execFileSync('git',['show','d6f98d41912eac6d0a3738b0a4d083c093360612:premium/src/screens.mjs'],{encoding:'utf8'}).replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${new URL('../src/'+p.slice(2),import.meta.url).href}'`);
 const previous=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 for(const access of [{entitlement_valid:false,jumolf_enabled:false},{entitlement_valid:true,jumolf_enabled:false},{entitlement_valid:true,jumolf_enabled:true}]){
  const html=HomeScreen(mock.user,mock.activeSessions,access);
  assert.equal((html.match(/class="smart-premium-badge jumolf-home-premium"/g)||[]).length,1);
  assert.match(html,/<h2>[^<]+<b class="smart-premium-badge jumolf-home-premium">PREMIUM<\/b><\/h2>/);
  assert.doesNotMatch(html,/<div class="twin-heading">[^]*?jumolf-home-premium[^]*?<\/div><div class="twin-content">/);
  assert.equal(html.replace('<b class="smart-premium-badge jumolf-home-premium">PREMIUM</b>',''),previous.HomeScreen(mock.user,mock.activeSessions,access).replace('<span class="badge gold jumolf-home-premium">PREMIUM</span>',''));
 }
});
