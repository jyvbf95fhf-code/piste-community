import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
import {TrackBuilderScreen} from '../src/track-builder-screen.mjs';import {createTrackDraft} from '../src/track-editor.mjs';import {SmartTrackSection} from '../src/track-smart-screen.mjs';
const source=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
test('actual creator screen exposes an intelligent shortcut outside collapsed menu',()=>{const html=TrackBuilderScreen({editorDraft:createTrackDraft({geographic:true}),premiumAccess:{entitlement_valid:true,entitlement:'premium'}},[]);const header=html.slice(0,html.indexOf('</header>'));assert.doesNotMatch(header,/data-editor-action="open-smart"/);assert.match(html.slice(html.indexOf('class="creator-menu-row"')),/data-editor-action="open-smart"/);assert.match(html,/data-smart-generate-form/);
 const menu=html.slice(html.indexOf('<details class="creator-panel"'),html.indexOf('</footer>'));assert.doesNotMatch(menu,/data-creator-section="smart"/);
 assert.match(html,/<dialog[^>]*data-smart-panel/);});
test('opening the intelligent shortcut opens only its dedicated dialog and focuses the actual form',()=>{
 const start=source.indexOf('function openSmartTrackPanel('),end=source.indexOf('\nfunction selectSmartProposal(',start);assert.ok(start>=0);
 let focused=false;const panel={open:false,showModal(){this.open=true;},querySelector:()=>({focus:()=>focused=true})},menu={open:true};
 // An empty geographic editor is the normal first visit to the creator.
 const context={trackEditor:{draft:createTrackDraft({geographic:true})},document:{querySelector:s=>s==='[data-smart-panel]'?panel:menu}};
 runInNewContext(source.slice(start,end),context);context.openSmartTrackPanel();assert.equal(panel.open,true);assert.equal(menu.open,false);assert.equal(focused,true);
});

test('Premium entry retains an explicit smart creator return intent',()=>{assert.match(SmartTrackSection({},{}),/href="\/jumolf\/premium\?from=smart-track"/);const page=readFileSync(new URL('../src/jumolf-premium-screen.mjs',import.meta.url),'utf8');assert.match(page,/href="\/track-builder\?tool=smart"/);});
test('creator automatically consumes a smart entry intent once while regular creator remains closed',()=>{assert.ok(source.includes('function restoreSmartTrackEntry('));const start=source.indexOf('function restoreSmartTrackEntry('),end=source.indexOf('\nfunction openSmartTrackPanel(',start);let opens=0;const context={URLSearchParams,location:{pathname:'/track-builder',search:'?tool=smart'},trackEditor:{routeKey:'k'},smartEntryOpenedKey:null,openSmartTrackPanel:()=>opens++};runInNewContext(source.slice(start,end),context);context.restoreSmartTrackEntry();context.restoreSmartTrackEntry();assert.equal(opens,1);context.location.search='';context.trackEditor.routeKey='normal';context.restoreSmartTrackEntry();assert.equal(opens,1);});
test('existing Premium simulation returns to smart creator only for its explicit entry',()=>{const controller=readFileSync(new URL('../src/jumolf-controller.mjs',import.meta.url),'utf8'),start=controller.indexOf("else if(action==='simulate-premium')"),end=controller.indexOf("else if(action==='demo-profile')",start),branch=controller.slice(start,end);for(const [query,expected] of [['?from=smart-track','/track-builder?tool=smart'],['','/jumolf/activate'],['?from=https://other.example','/jumolf/activate']]){let destination,profile;const context={action:'simulate-premium',store:{applyDemoProfile:p=>profile=p},formMessage:'old',navigate:p=>destination=p,location:{search:query},URLSearchParams};runInNewContext('if(false){} '+branch,context);assert.equal(destination,expected);assert.equal(profile,'PREMIUM_NON_ACTIVE');assert.equal(context.formMessage,'');}});

test('opening smart generation detects the current geographic start once without stealing focus on rerender',()=>{
 const start=source.indexOf('function openSmartTrackPanel('),end=source.indexOf('\nfunction selectSmartProposal(',start);let focused=0,opens=0;const detected=[];
 const panel={open:false,showModal(){this.open=true;opens++;},querySelector:()=>({focus:()=>focused++})};
 const context={trackEditor:{draft:{coordinateSpace:'wgs84',points:[{kind:'start',x:7,y:48}]}},trackSmart:{view:()=>({startPoint:detected.at(-1)}),detectCommune:point=>detected.push(point)},document:{querySelector:s=>s==='[data-smart-panel]'?panel:null}};
 runInNewContext(source.slice(start,end),context);context.openSmartTrackPanel();context.openSmartTrackPanel({focus:false});
 assert.deepEqual(JSON.parse(JSON.stringify(detected)),[[7,48]]);assert.equal(opens,1);assert.equal(focused,1);
});
