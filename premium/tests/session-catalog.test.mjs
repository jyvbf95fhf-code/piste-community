import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionCatalog} from '../src/session-catalog.mjs';

const snapshot=(id,phase)=>({
 session:{id,prototype:true},
 searchState:{phase,events:[]},
 preparationState:{session:{id},team:[]},
 tracerState:{segments:[]}
});

test('catalogue preserves distinct sessions and updates an existing session by id',()=>{
 const catalog=createSessionCatalog();
 catalog.capture(snapshot('mock-1','DEBRIEF'));
 catalog.capture(snapshot('mock-2','SEARCH_RUNNING'));
 catalog.capture(snapshot('mock-1','ARCHIVED'));
 assert.deepEqual(catalog.list().map(item=>[item.session.id,item.searchState.phase]),[
  ['mock-1','ARCHIVED'],['mock-2','SEARCH_RUNNING']
 ]);
});

test('catalogue snapshots and returned records are isolated copies',()=>{
 const catalog=createSessionCatalog(),input=snapshot('mock-1','DEBRIEF');
 catalog.capture(input);
 input.searchState.events.push({type:'mutated'});
 const result=catalog.get('mock-1');
 result.preparationState.team.push({id:'mutated'});
 assert.deepEqual(catalog.get('mock-1').searchState.events,[]);
 assert.deepEqual(catalog.get('mock-1').preparationState.team,[]);
});

test('catalogue ignores missing sessions and can clear only its in-memory records',()=>{
 const catalog=createSessionCatalog();
 catalog.capture({searchState:{phase:'DEBRIEF'}});
 assert.deepEqual(catalog.list(),[]);
 catalog.capture(snapshot('mock-1','DEBRIEF'));
 catalog.clear();
 assert.deepEqual(catalog.list(),[]);
});
