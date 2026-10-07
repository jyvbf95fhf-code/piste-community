import test from 'node:test';
import assert from 'node:assert/strict';
import {buildJumolfDogProfile} from '../src/jumolf-dog-profile.mjs';

test('dog profile aggregates supported trends and recent analyses without ranking',()=>{
 const analyses=[{id:'a',dog_id:'nox',generated_at:'2026-10-06',metrics:{speed_m_s:{value:0.5},ruptures:{value:1},resumptions:{value:1},track_age:{value:600}},input_quality:{level:'medium'},profile_snapshot:{handler:'Alex',fatigue:'unknown'}},{id:'b',dog_id:'nox',generated_at:'2026-10-07',metrics:{speed_m_s:{value:0.7},ruptures:{value:0},resumptions:{value:1},track_age:{value:900}},input_quality:{level:'high'}}];
 const result=buildJumolfDogProfile('nox',analyses,{id:'nox',name:'Nox',age:'3 ans',specialty:'Pistage'});
 assert.equal(result.dog.name,'Nox');
 assert.equal(result.trends.speed_m_s.value,0.6);
 assert.equal(result.trends.ruptures.value,0.5);
 assert.equal(result.recentAnalyses.length,2);
 assert.equal(result.ranking,undefined);
});

test('dog profile marks unsupported observations unavailable and filters other dogs',()=>{
 const result=buildJumolfDogProfile('nox',[{id:'other',dog_id:'uma',metrics:{speed_m_s:{value:1}}}],{id:'nox',name:'Nox'});
 assert.equal(result.analysisCount,0);
 assert.equal(result.trends.speed_m_s.value,null);
 assert.equal(result.trends.wind_reaction.value,'indisponible');
});
