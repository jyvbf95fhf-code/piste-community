import test from 'node:test';
import assert from 'node:assert/strict';
import {generateJumolfSyntheticDataset} from '../src/jumolf-synthetic-dataset.mjs';
import {listScientificBenchmarks} from '../src/scientific-benchmarks.mjs';

test('benchmark catalogue reuses only tagged source sessions and labels demo cases',()=>{
 const rows=generateJumolfSyntheticDataset().sessions,benchmarks=listScientificBenchmarks(rows);
 assert.equal(benchmarks.length,rows.filter(row=>row.benchmark_session).length);assert.ok(benchmarks.every(row=>row.sessionId&&row.synthetic&&row.label==='Benchmark synthétique'));
});
