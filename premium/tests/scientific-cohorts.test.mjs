import test from 'node:test';
import assert from 'node:assert/strict';
import {generateJumolfSyntheticDataset} from '../src/jumolf-synthetic-dataset.mjs';
import {filterScientificSessions,resolveCohort} from '../src/scientific-cohorts.mjs';

test('advanced cohort filters compose without returning non-synthetic rows',()=>{
 const rows=generateJumolfSyntheticDataset().sessions,filtered=filterScientificSessions(rows,{kind:'training',quality:'high',benchmark:true});
 assert.ok(filtered.length>0);assert.ok(filtered.every(row=>row.synthetic&&row.kind==='training'&&row.quality.level==='high'&&row.benchmark_session));
});
test('cohort summary reports empty samples and missing quality honestly',()=>{
 const rows=generateJumolfSyntheticDataset().sessions,empty=resolveCohort(rows,{name:'none',criteria:{kind:'not-a-kind'}});
 assert.equal(empty.count,0);assert.equal(empty.quality.level,'insufficient');
});
test('advanced scientific filters cover weather, wind, difficulty, event counts and date range',()=>{
 const rows=generateJumolfSyntheticDataset().sessions,row=rows.find(item=>item.weather&&item.weather.humidityPercent>=70&&item.difficulty.level==='difficile');
 const filtered=filterScientificSessions(rows,{kind:row.kind,humidityMin:70,windDirection:row.weather.windDirection,difficulty:row.difficulty.level,rupturesMin:row.ruptures,dateFrom:row.startedAt.slice(0,10),dateTo:row.startedAt.slice(0,10)});
 assert.ok(filtered.length>0);assert.ok(filtered.every(item=>item.kind===row.kind&&item.weather?.humidityPercent>=70&&item.weather?.windDirection===row.weather.windDirection&&item.difficulty.level==='difficile'&&item.ruptures>=row.ruptures&&item.startedAt.slice(0,10)===row.startedAt.slice(0,10)));
 assert.deepEqual(filterScientificSessions(rows,{humidityMin:101}),[]);
 assert.deepEqual(filterScientificSessions(rows,{windDirection:'direction-inconnue'}),[]);
});
