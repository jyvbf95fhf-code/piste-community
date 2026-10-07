import test from 'node:test';
import assert from 'node:assert/strict';
import {buildJumolfSources} from '../src/jumolf-adapter.mjs';
import {summarizeProvenance} from '../src/jumolf-provenance.mjs';
import {assessInputQuality} from '../src/jumolf-quality.mjs';

test('source snapshots are detached and unavailable values stay absent',()=>{
 const session={id:'s-1',kind:'coaching',title:'Lisière',status:'Terminée',dog:{id:'nox',name:'Nox'},searchTrace:null};
 const sources=buildJumolfSources({sessions:[session]});
 sources.sessions[0].dog.name='changed';
 assert.equal(session.dog.name,'Nox');
 assert.equal(sources.sessions[0].trace,null);
 assert.equal(sources.sessions[0].weather,null);
});

test('OPS projection allowlists fields and excludes sensitive mission data',()=>{
 const mission={id:'ops-1',kind:'operational',status:'En cours',trackingState:'active',dog:{id:'nox',name:'Nox'},handler:{name:'Alex'},time:{trackAgeAtStart:{label:'20 min'}},trace:[{sequence:1,x:20,y:30,timestamp:'2026-10-07T08:00:00Z',secret:'x',personName:'hidden'}],events:[{type:'Indice',shareable:true,note:'hidden note'},{type:'Zone privée',shareable:false}],person:{name:'protected'},details:{risk:'protected'},notes:'protected'};
 const row=buildJumolfSources({operational:[mission]}).operational[0];
 assert.equal(row.dog.name,'Nox');
 assert.equal(row.handlerName,'Alex');
 assert.deepEqual(row.trace,[{sequence:1,x:20,y:30,timestamp:'2026-10-07T08:00:00Z'}]);
 assert.deepEqual(row.events,[{type:'Indice'}]);
 for(const key of ['person','details','notes','handler','risk'])assert.equal(Object.hasOwn(row,key),false);
 assert.equal(JSON.stringify(row).includes('protected'),false);
});

test('provenance and input quality identify missing versus available data',()=>{
 const session={id:'s-2',dog:{id:'nox',name:'Nox'},trace:[{x:1,y:2}],referenceTrace:null,terrain:'lisière',weather:{provenance:'historical_weather'},wind:null};
 const provenance=summarizeProvenance(session);
 assert.equal(provenance.trace,'manual');
 assert.equal(provenance.weather,'historical_weather');
 const quality=assessInputQuality(session);
 assert.equal(quality.level,'medium');
 assert.ok(quality.missingInputs.includes('referenceTrace'));
});

test('unknown input has insufficient quality and does not get mock values filled in',()=>{
 const quality=assessInputQuality({id:'empty'});
 assert.equal(quality.level,'insufficient');
 assert.deepEqual(quality.availableInputs,[]);
 assert.equal(quality.missingInputs.includes('weather'),true);
});
