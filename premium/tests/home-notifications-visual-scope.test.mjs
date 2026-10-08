import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AppShell} from '../src/components.mjs';

const css=await readFile(new URL('../src/styles.css',import.meta.url),'utf8');
const marker='/* Home / Notifications depth pass';
const start=css.lastIndexOf(marker),learningMarker=css.indexOf('/* JUMOLF learning: scoped',start),scoped=css.slice(start,learningMarker<0?undefined:learningMarker),jumolfScoped=learningMarker<0?'':css.slice(learningMarker,css.indexOf('/* Connected Home:')<0?undefined:css.indexOf('/* Connected Home:'));

test('Home and Notifications receive scoped night surfaces while Community stays stone and JUMOLF learning stays separately scoped',()=>{
 assert.notEqual(scoped,css,'the scoped visual pass exists at the end of the stylesheet');
 assert.match(scoped,/\.home-shell\s*\{[^}]*#07111f/is);
 assert.match(scoped,/--home-paper:#e9e4da/i);
 assert.match(scoped,/\.home-shell \.feature-tile\[href=['"]\/community['"]\][^{]*\{[^}]*var\(--home-paper\)/is);
 assert.match(scoped,/\.app-shell\.notifications-shell\[data-module-theme=['"]community['"]\]/i);
 assert.doesNotMatch(scoped,/:has\(/i);
 assert.match(scoped,/\.notification-card\.is-unread\s*\{[^}]*rgba\(18,\s*39,\s*58,\s*\.94\)/is);
 assert.match(scoped,/\.notification-card\.is-read\s*\{[^}]*rgba\(14,\s*29,\s*44,\s*\.84\)/is);
 assert.doesNotMatch(scoped,/\.jumolf-|--jumolf-/i);
 assert.match(jumolfScoped,/\.jumolf-learning-page/);
 assert.doesNotMatch(jumolfScoped,/\.home-shell|notifications-shell|\.card\s*\{|\.screen\s*\{/i);
 assert.doesNotMatch(scoped,/(^|\s)(\.card|\.screen|\.panel)\s*\{/i);
 assert.match(AppShell('<section class="notifications-page"></section>','/notifications','Sébastien','SL','community'),/class="app-shell\s+notifications-shell"/);
 assert.doesNotMatch(AppShell('<section></section>','/community','Sébastien','SL','community'),/notifications-shell/);
 assert.doesNotMatch(AppShell('<section></section>','/jumolf','Sébastien','SL','science'),/notifications-shell/);
});
