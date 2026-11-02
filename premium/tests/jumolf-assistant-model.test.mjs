import test from 'node:test';
import assert from 'node:assert/strict';
import {durationLabel,missingGroups,assistantReading} from '../src/jumolf-assistant-model.mjs';
test('durations are readable; zero is preserved and absence stays unknown',()=>{assert.equal(durationLabel(4117),'1 h 8 min 37 s');assert.equal(durationLabel(0),'0 s');assert.equal(durationLabel(null),'Non disponible');});
test('missing inputs are grouped into plain French without technical keys',()=>{const s=missingGroups(['referenceTrace','reference_point_mean_m','reference_point_max_m','wind','weather','ruptures']);assert.equal(s.length,3);assert.ok(!s.join(' ').includes('reference_'));});
test('incomplete session never gets an invented interpretation',()=>{const v=assistantReading({source:{id:'ops:1'},analysis:{metrics:{},missing_inputs:['events']}});assert.equal(v.hypotheses.length,0);assert.equal(v.proposals.length,0);assert.ok(v.summary.includes('limité'));});
test('only existing supported personal proposals and actual hypotheses are exposed',()=>{const v=assistantReading({source:{id:'x'},analysis:{hypotheses:[{title:'Fait fictif'}]},learning:{recommendations:[{personalized:false,evidence:[]},{personalized:true,evidence:[{sessionId:'ops:1'}],title:'Observer'}]}});assert.equal(v.hypotheses.length,0);assert.equal(v.proposals.length,1);assert.equal(v.proposals[0].evidence[0].sessionId,'ops:1');});
