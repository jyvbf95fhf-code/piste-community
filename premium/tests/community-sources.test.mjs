import test from 'node:test';
import assert from 'node:assert/strict';
import {communitySourceOptions} from '../src/community-sources.mjs';
import {createTrackLibrary} from '../src/track-library.mjs';
import {createCoachingQa} from '../src/coaching-qa.mjs';
import {mock} from '../src/data.mjs';

function record(id,phase){
 const qa=createCoachingQa('normal',mock.user,[{id:'nox',...mock.dog}]);
 return {session:{...qa.preparation.session,id,title:`Session ${id}`},searchState:{...qa.search,phase},preparationState:qa.preparation,tracerState:qa.tracer};
}

test('only completed Coaching sessions and existing tracks become explicit share choices',()=>{
 const tracks=createTrackLibrary().list();
 const options=communitySourceOptions({sessionRecords:[record('active','SEARCH_RUNNING'),record('done','DEBRIEF')],tracks,dogs:[{id:'nox',name:'Nox',disciplines:['tracking']} ]});
 const session=options.find(item=>item.type==='session'),track=options.find(item=>item.type==='track');
 assert.equal(session.id,'done');
 assert.equal(session.data.dog.name,'Nox');
 assert.equal(session.availableFields.includes('trackAge'),false,'unavailable track age is omitted');
 assert.ok(track);
 assert.equal(track.data.provenance,'Préparé manuellement');
 assert.ok(options.every(item=>item.type!=='operational'));
});

test('active and unavailable source records are omitted rather than filled with invented values',()=>{
 const options=communitySourceOptions({sessionRecords:[record('active','SEARCH_RUNNING')],tracks:[],dogs:[]});
 assert.deepEqual(options,[]);
});
