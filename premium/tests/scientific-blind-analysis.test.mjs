import test from 'node:test';
import assert from 'node:assert/strict';
import {generateJumolfSyntheticDataset} from '../src/jumolf-synthetic-dataset.mjs';
import {blindProjection,validateBlindAnalysis,revealBlindAnalysis} from '../src/scientific-blind-analysis.mjs';
import {createScientificStore} from '../src/scientific-store.mjs';

test('blind projection hides outcome, context and JUMOLF interpretation until reveal',()=>{
 const row=generateJumolfSyntheticDataset().sessions.find(item=>item.blind_analysis_available),view=blindProjection(row);
 assert.equal(view.sessionId,row.id);assert.equal('result' in view,false);assert.equal('weather' in view,false);assert.equal('confidence' in view,false);assert.ok(view.events.length>0);
});
test('validated blind hypothesis stays immutable and reveal appends a separate record',()=>{
 const actor={name:'Sébastien',permissions:{research:true}},store=createScientificStore({actor,clock:()=> '2026-10-07T10:00:00Z'}),row=generateJumolfSyntheticDataset().sessions.find(item=>item.blind_analysis_available),record=validateBlindAnalysis(store,row,{hypothesis:'Hésitation possible',confidence:55,comment:'À examiner'});
 revealBlindAnalysis(store,record.id,row,null);const snapshot=store.snapshot();
 assert.equal(snapshot.blindRecords[0].initialHypothesis,'Hésitation possible');assert.equal(snapshot.blindRecords[0].status,'validated');assert.equal(snapshot.blindRecords[1].kind,'reveal');assert.equal(snapshot.blindRecords[1].hiddenData.result,row.result);
});
