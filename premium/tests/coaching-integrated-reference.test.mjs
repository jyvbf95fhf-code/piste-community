import {test} from 'node:test';import assert from 'node:assert/strict';
import {TraceurSourceActions} from '../src/coaching-shared-review.mjs';
import {sharedCoachingEntry} from '../src/coaching-shared-entry.mjs';
import {SharedCoachingCockpit} from '../src/coaching-shared-cockpit.mjs';
const geometry={provenance:'prepared-geographic',segments:[[{latitude:48,longitude:7},{latitude:48.01,longitude:7.01}]]};
const base={id:'session',scenario:'connected_traceur',role:'traceur',poseRecorder:'traceur',phase:'PREPARATION',traceType:'prepared',referenceStatus:'available',reference:{name:'Bin',geometry},approachPhase:'ready',dog:'Nox',canProposeReference:true};
test('already integrated prepared or GPX routes do not offer redundant source choices in any mode',()=>{
 for(const mode of ['normal','simple_blind','full_blind'])for(const traceType of ['prepared','gpx']){
  const p={...base,mode,traceType};assert.equal(TraceurSourceActions(p),'');assert.equal(sharedCoachingEntry(p).label,'Commencer la pose sur ce tracé');
  const html=SharedCoachingCockpit(p,{});assert.match(html,/Tracé intégré · Bin/);assert.match(html,/Modifier le tracé/);assert.doesNotMatch(html,/distinct de la pose GPS|Importer ou choisir un autre tracé/);
 }
});
test('missing references still offer initial choices; a valid proposal first needs acceptance',()=>{
 const missing={...base,reference:null,referenceStatus:'required'};assert.match(TraceurSourceActions(missing),/choose-direct/);assert.match(TraceurSourceActions(missing),/choose-prepared/);
 const proposed={...missing,referenceProposal:{reference:{name:'Proposé',geometry:{points:[{space:'wgs84',x:7,y:48},{space:'wgs84',x:7.01,y:48.01}]}}}};assert.equal(TraceurSourceActions(proposed),'');assert.equal(sharedCoachingEntry(proposed).action,'accept-reference');
 for(const role of ['driver','coach','observer'])assert.equal(TraceurSourceActions({...missing,role}),'');
});
test('reference attachment does not bypass departure confirmation or create recorded GPS',()=>{
 for(const approachPhase of ['needed','approaching','arrived'])assert.equal(sharedCoachingEntry({...base,approachPhase}).action,'confirm-departure');
 const html=SharedCoachingCockpit(base,{});assert.match(html,/data-gps-planned=/);assert.doesNotMatch(html,/data-gps-reference=/);
});
