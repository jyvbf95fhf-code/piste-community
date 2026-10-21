import test from 'node:test';import assert from 'node:assert/strict';
import {mountMissionControl} from '../src/track-mission-view.mjs';
import {MissionControlPanel} from '../src/track-mission-screen.mjs';
function harness(){
 const targets=new Map(),get=selector=>{if(!targets.has(selector))targets.set(selector,{textContent:'',innerHTML:'',setAttribute(){}});return targets.get(selector);};
 let listener;const state={active:true,route:{valid:true,distanceM:100,stations:[],unchanged:true},timeline:{valid:false},environment:{weather:null,direction:null,basis:'unavailable',changes:[]},sample:{distanceM:0},progress:0};
 const context={dog:{name:'Rex'},options:{},canPrepare:true};
 const root={isConnected:true,dataset:{},querySelector:get,closest:()=>null,addEventListener(){},removeEventListener(){}};
 const controller={snapshot:()=>state,subscribe:fn=>(listener=fn,()=>{}),setReducedMotion(){},pause(){}};
 const doc={hidden:false,addEventListener(){},removeEventListener(){}};
 const win={matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}})};
 const mounted=mountMissionControl({root,controller,context,draw(){},window:win,document:doc});
 return {state,context,get,paint:()=>listener(),dispose:()=>mounted.dispose()};
}
test('briefing refreshes current geometry and dog even when timeline and weather do not change',()=>{
 const h=harness();assert.match(h.get('[data-mission-brief-content]').innerHTML,/100 m/);
 h.state.route={...h.state.route,distanceM:250,unchanged:false};h.context.dog={name:'Nova'};h.paint();
 const html=h.get('[data-mission-brief-content]').innerHTML;assert.match(html,/250 m/);assert.match(html,/Nova/);assert.match(html,/Tracé modifié/);h.dispose();
});

test('timeline label retains the same local time and timezone before and after painting',()=>{
 const h=harness(),at=Date.parse('2026-10-21T10:00:00Z');
 h.state.timeline={valid:true,start:at,end:at+3600000,at,ageSeconds:0,plannedAgeSeconds:3600};
 const initial=MissionControlPanel(h.state,h.context).match(/<output data-mission-age>(.*?)<\/output>/)[1];
 h.paint();assert.equal(h.get('[data-mission-age]').textContent,initial);h.dispose();
});
