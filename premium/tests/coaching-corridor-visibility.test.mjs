import {test} from 'node:test';import assert from 'node:assert/strict';
import {fixture} from './coaching-exit-fixtures.mjs';
import {simulate} from '../src/coaching-preparation.mjs';
import {createGpsPose} from '../src/coaching-gps-model.mjs';
import {SearchScreen} from '../src/coaching-search-screen.mjs';
for(const mode of ['simple_blind','full_blind'])test(`${mode} rejects an unfiltered GPS reference supplied to driver UI`,()=>{const r=fixture({mode,role:'driver',phase:'SEARCH_READY'}),p=simulate(r.preparationState,{viewerRole:'driver'});r.searchState.gpsSearch=createGpsPose(r.session.id,p.viewerId);const html=SearchScreen(r.searchState,p,{pose:{sessionId:r.session.id,segments:[[{latitude:48.1234567,longitude:7.7654321,timestamp:Date.now()}]]}});assert.doesNotMatch(html,/48\.1234567|data-gps-reference/);assert.match(html,/data-gps-corridor-allowed="false"/);});
