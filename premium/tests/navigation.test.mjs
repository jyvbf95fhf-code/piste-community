import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BottomNavigation} from '../src/components.mjs';
import {HomeScreen,routes} from '../src/screens.mjs';
import {LiveScreen} from '../src/live-screen.mjs';
test('terrain navigation has exact order and dedicated icons',()=>{
 const html=BottomNavigation('/');
 const links=[...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(links,['/','/dogs','/live','/sessions','/profile']);
 assert.deepEqual([...html.matchAll(/<span>([^<]+)<\/span>/g)].map(m=>m[1]),['Accueil','Chiens','Live','Sessions','Profil']);
 assert.doesNotMatch(html,/olfactory-twin|community/);
 assert.match(html,/navigation-icon/);
});
test('Live has functional mock sections and nav marks one active item',()=>{
 assert.ok(routes['/live']);
 assert.match(LiveScreen(),/Mes sessions en cours[\s\S]*Sessions de mes contacts autorisées[\s\S]*Invitations Live/);
 assert.equal((BottomNavigation('/live').match(/aria-current="page"/g)||[]).length,1);
 assert.match(BottomNavigation('/live'),/href="\/live" aria-current/);
});
test('dog profile routes keep the Dogs tab active',()=>{
 const html=BottomNavigation('/dogs/nox');
 assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
 assert.match(html,/href="\/dogs" aria-current="page"/);
});
test('bottom navigation keeps the parent tab active on supported module subroutes',()=>{
 for(const [route,parent] of [
  ['/profile/account','/profile'],
  ['/profile/research/data','/profile'],
  ['/live/coaching/session-1','/live'],
  ['/sessions/session-1/replay','/sessions'],
  ['/tracks','/sessions'],
  ['/tracks/prepared:track-1','/sessions'],
  ['/track-builder','/sessions'],
 ]){
  const html=BottomNavigation(route);
  assert.equal((html.match(/aria-current="page"/g)||[]).length,1,route);
  assert.match(html,new RegExp(`href="${parent.replaceAll('/','\\/')}" aria-current="page"`),route);
 }
});
test('Home Mes pistes opens the track library while Sessions navigation stays separate',()=>{
 const home=HomeScreen();
 assert.match(home,/<a class="feature-tile card gold" href="\/tracks"/);
 assert.match(home,/href="\/sessions">Voir tout/);
 assert.match(BottomNavigation('/sessions'),/href="\/sessions" aria-current="page"/);
});
