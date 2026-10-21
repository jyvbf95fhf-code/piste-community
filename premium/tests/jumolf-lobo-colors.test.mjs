import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/jumolf-lobo-colors.css',import.meta.url),'utf8');
const luminance=hex=>{const values=hex.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return values[0]*.2126+values[1]*.7152+values[2]*.0722;};
const contrast=(a,b)=>{const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+.05)/(values[1]+.05);};
const token=name=>css.match(new RegExp(`--lobo-${name}:(#[a-f\\d]{6})`))[1];

test('Lobo CSS keeps every rule inside JUMOLF, Mission Control or its save dialog',()=>{
 const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
 const starts=[...clean.matchAll(/([^{}]+)\{/g)].map(m=>m[1].trim()).filter(x=>!x.startsWith('@'));
 assert.ok(starts.length>25);
 for(const rule of starts)assert.match(rule,/^(?:\.jumolf-shell|\.mission-map|\.track-creator-cockpit:has\(\.canine-controls\)|\.proposal-save-dialog)/,rule);
 assert.doesNotMatch(css,/\.coaching-|\.operational-|:root|body\s*\{/);
});

test('semantic accents and readable text meet WCAG AA on their surfaces',()=>{
 for(const accent of ['cyan','green','violet','coral']){
  assert.ok(contrast(token(accent),token('surface'))>=4.5,accent+' text on panel');
  assert.ok(contrast(token(accent),token('dark'))>=4.5,accent+' button label');
 }
 for(const foreground of ['ink','muted'])assert.ok(contrast(token(foreground),token('surface'))>=4.5,foreground);
 assert.ok(contrast(token('violet'),'#29243f')>=4.5);
 assert.ok(contrast(token('coral'),'#38262e')>=4.5);
 // Catch any newly introduced amber/yellow hex instead of relying on its name.
 for(const [,hex] of css.matchAll(/:\s*(#[a-f\d]{6})\b/gi)){
  const [r,g,b]=hex.slice(1).match(/../g).map(x=>parseInt(x,16));
  assert.ok(!(r>g&&g>b&&g-b>25&&r>130),'warm legacy color '+hex);
 }
});

test('existing semantic hooks cover preparation, positive actions, analysis, and alerts',()=>{
 const mission=readFileSync(new URL('../src/track-mission-screen.mjs',import.meta.url),'utf8');
 assert.match(mission,/data-mission-action/);
 for(const action of ['adjust','save','prepare','coaching']){
  assert.ok(mission.includes(`button('${action}'`));
  assert.ok(css.includes(`[data-mission-action=${action}]`));
 }
 assert.match(css,/data-jumolf-action\*="analy"/);
 assert.match(css,/\.mission-poi\s*\{ fill:var\(--lobo-violet\)/);
 assert.match(css,/\[stroke="#e4d2ab"\]/);
 assert.match(css,/\.mission-control \.mission-error\s*\{ color:var\(--lobo-coral\)/);
});

test('small screen and focus rules preserve touch targets and avoid heavy effects',()=>{
 assert.match(css,/@media\(max-width:430px\)/);
 assert.match(css,/min-height:48px/);
 assert.match(css,/focus-visible[\s\S]*outline:3px solid var\(--lobo-cyan\)/);
 assert.match(css,/backdrop-filter:none/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/blur\(|drop-shadow\(|@keyframes/);
});
