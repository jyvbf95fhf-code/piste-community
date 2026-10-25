import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
import {createSmartTrackController} from '../src/track-smart-controller.mjs';import {GeographicTrackCockpit} from '../src/track-editor-cockpit.mjs';import {createTrackDraft} from '../src/track-editor.mjs';
const source=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
test('changing a criterion before tapping submit keeps the target and starts the real generation controller',async()=>{
 const elements=Array.from({length:60},(_,i)=>({type:'node',id:i+1,lon:7.3845+i*.001,lat:48.2831}));elements.push({type:'way',id:101,nodes:Array.from({length:18},(_,i)=>i+1),tags:{highway:'residential',surface:'asphalt'}},{type:'way',id:102,nodes:Array.from({length:43},(_,i)=>i+18),tags:{highway:'track',surface:'grass'}});
 let calls=0,connected=true;const controller=createSmartTrackController({getContext:()=>({ownerId:'u',key:'k',fingerprint:'d',access:{entitlement_valid:true,entitlement:'premium'}}),service:{searchCommunes:async()=>[{code:'67073',name:'Châtenois',center:[7.3845,48.2831]}],loadNetwork:async(commune,km,{center})=>{calls++;assert.deepEqual(commune.center,[7.3845,48.2831]);assert.equal(km,2.5);assert.equal(center,null,'An empty draft must preserve the provider commune center');return {elements};}}});controller.setQuery('Châtenois');await controller.search();controller.chooseCommune('67073');
 const start=source.indexOf(" if(field.matches('[data-smart-option]'))"),end=source.indexOf(" if(field.matches('[data-editor-gpx-file]'))",start);assert.ok(start>=0);const field={value:'2.5',dataset:{smartOption:'distanceKm'},matches:()=>true};runInNewContext(`(()=>{${source.slice(start,end)}})()`,{field,trackSmart:controller,render:()=>connected=false,document:{querySelector:()=>null}});
 assert.equal(connected,true,'Changing distance must preserve the submit target');
 {const a=source.indexOf(" if(event.target.matches('[data-smart-generate-form]'))"),b=source.indexOf(' const editorForm=',a);class FormData{entries(){return [['distanceKm','2.5'],['terrain','mixed'],['transitions','few']][Symbol.iterator]();}}runInNewContext(`(()=>{${source.slice(a,b)}})()`,{trackEditor:{draft:createTrackDraft({geographic:true})},trackSmart:controller,event:{target:{matches:()=>true},preventDefault(){}},FormData});}
 await Promise.resolve();assert.equal(calls,1);assert.equal(controller.view().distanceKm,2.5);assert.ok(controller.view().proposals.length>0);assert.equal(Math.round(controller.view().proposals[0].distanceM),2500);
});
test('intelligent shortcut stays beside Menu for free, active and expired accounts',()=>{
 const render=access=>GeographicTrackCockpit({draft:createTrackDraft({geographic:true}),premiumAccess:access});for(const access of [{entitlement:'none',entitlement_valid:false},{entitlement:'premium',entitlement_valid:false},{entitlement:'access_code',entitlement_valid:true}])assert.match(render(access),/data-editor-action="open-smart"/);
 const h=render({entitlement:'premium',entitlement_valid:true});assert.doesNotMatch(h.slice(0,h.indexOf('</header>')),/data-editor-action="open-smart"/);assert.match(h,/class="creator-menu-row"/);const row=h.slice(h.indexOf('class="creator-menu-row"'));assert.match(row,/data-editor-action="open-smart"/);assert.match(row,/creator-menu-shortcut/);
});

test('empty geographic submission without a commune requests a location instead of inventing one',async()=>{
 const controller=createSmartTrackController({getContext:()=>({ownerId:'u',key:'k',fingerprint:'d',access:{entitlement_valid:true,entitlement:'premium'}}),service:{loadNetwork:async()=>assert.fail('A real location is required before network lookup')}});
 const start=source.indexOf(" if(event.target.matches('[data-smart-generate-form]'))"),end=source.indexOf(' const editorForm=',start);class FormData{entries(){return [['distanceKm','2.5'],['terrain','mixed'],['transitions','few']][Symbol.iterator]();}}
 runInNewContext(`(()=>{${source.slice(start,end)}})()`,{trackEditor:{draft:createTrackDraft({geographic:true})},trackSmart:controller,event:{target:{matches:()=>true},preventDefault(){}},FormData});
 await Promise.resolve();assert.match(controller.view().error,/Sélectionnez une commune/);assert.equal(controller.view().startPoint,null);assert.equal(controller.view().proposals.length,0);
});
