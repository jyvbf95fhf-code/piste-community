import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeScientificValues} from '../src/scientific-statistics.mjs';

test('descriptive distribution counts missing values and computes quartiles',()=>{
 const s=summarizeScientificValues([1,2,3,4,5,null]);
 assert.deepEqual({n:s.n,missing:s.missing,min:s.min,q1:s.q1,median:s.median,q3:s.q3,max:s.max},{n:5,missing:1,min:1,q1:2,median:3,q3:4,max:5});
});
test('empty distributions remain unavailable',()=>assert.equal(summarizeScientificValues([null,undefined]).median,null));

test('filtered statistics retain zero, count missing pairs and apply strict age boundaries',async()=>{
 const {buildFilteredScientificAnalysis,pairedRankCorrelation}=await import('../src/scientific-filtered-analysis.mjs');
 const rows=[
  {id:'zero',source:'account',kind:'training',trackAge:{seconds:0},durationMinutes:0,poseWind:{wind_speed_kmh:0,wind_direction_deg:0}},
  {id:'boundary',source:'account',kind:'training',trackAge:{seconds:1800},durationMinutes:10},
  {id:'unknown',source:'account',kind:'operational',trackAge:{seconds:null},durationMinutes:50},
  {id:'long',source:'account',kind:'operational',trackAge:{seconds:43200},durationMinutes:null}
 ];
 const a=buildFilteredScientificAnalysis(rows);
 assert.equal(a.total,4);
 assert.equal(a.observations.wind,1);
 assert.deepEqual(a.ages.map(({count})=>count),[1,1,0,0,0,1]);
 assert.equal(a.missingPairs,2);
 assert.equal(a.rho,null);
 assert.equal(a.metrics.find(metric=>metric.key==='duration').summary.median,10);
 assert.equal(pairedRankCorrelation([{x:1,y:3},{x:2,y:2},{x:3,y:1}]),-1);
 assert.equal(pairedRankCorrelation([{x:1,y:2},{x:1,y:3},{x:2,y:4}]).toFixed(3),'0.866');
 assert.equal(pairedRankCorrelation([{x:1,y:2},{x:1,y:3},{x:1,y:4}]),null);
});
