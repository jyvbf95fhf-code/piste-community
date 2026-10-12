import {isExitClosure,isCollectivelyClosed,canParticipate} from '../src/coaching-session-control.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {EmptyState} from '../src/components.mjs';
import * as preparation from '../src/coaching-preparation.mjs';
import * as tracer from '../src/coaching-tracer.mjs';
import {PreparationScreen} from '../src/coaching-preparation-screen.mjs';
import {SearchScreen} from '../src/coaching-search-screen.mjs';
import {CoachScreen,ObserverScreen,SessionNotice} from '../src/coaching-session-screen.mjs';
import {createCoachingQa,selectQaPerspective} from '../src/coaching-qa.mjs';
import {syncSession} from '../src/coaching-session-flow.mjs';
const source=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
function context(preparationState=null,qa=null){
 const c=createContext({renderSessionExitMenu:()=>'',isExitClosure,isCollectivelyClosed,canParticipate,cleanupCoachingExit:()=>{},exitSavePending:false,normalCoachingBeforeQa:null,preparationState,preparation,tracer,EmptyState,PreparationScreen,SearchScreen,CoachScreen,ObserverScreen,SessionNotice,syncSession,
  searchState:qa?.search||{phase:'PREPARATION'},tracerState:qa?.tracer||{},coachingDraft:{session:qa?.preparation.session||null,knownPeople:[],dogs:[{id:'nox',name:'Nox'}]},terrainOpen:false,preparationUI:{},searchUI:{},qaInitialized:false,
  coachingReferenceResponseView:()=>null,trackLibrary:{list:()=>[]},coachingReferenceAssignment:null,notifiedCoachingStarts:new Set(),communityLiveStore:{notifySessionStarted(){throw Error('must not notify');}}});
 const start=source.indexOf('function renderPreparation()');runInContext(source.slice(start,source.indexOf('function filterSessions()',start)),c);return c;
}
for(const missing of [null,undefined])test(`reload route with ${missing} preparation renders history access without creating a session`,()=>{
 const c=context();c.preparationState=missing;const before=structuredClone({draft:c.coachingDraft,search:c.searchState,tracer:c.tracerState});const html=c.renderPreparation();
 assert.match(html,/Aucune session en cours/);assert.match(html,/href="\/sessions"/);assert.match(html,/sessions terminées et archivées/i);assert.match(html,/data-coaching-no-current-session/);
 assert.doesNotMatch(html,/data-search=|data-tracer=|data-prep-action=|data-coaching="create"/);assert.deepEqual({draft:c.coachingDraft,search:c.searchState,tracer:c.tracerState},before);assert.equal(c.notifiedCoachingStarts.size,0);
});
for(const mode of ['normal','simple_blind','full_blind'])for(const role of ['driver','traceur','coach','observer'])test(`current session retains its existing screen ${role}/${mode}`,()=>{
 const qa=createCoachingQa(mode,{name:'Owner'},[{id:'nox',name:'Nox'}]);const p=selectQaPerspective(qa.preparation,role),c=context(p,qa),before=structuredClone(p);const html=c.renderPreparation();
 assert.doesNotMatch(html,/data-coaching-no-current-session/);assert.match(html,/data-(preparation-phase|session-role|search-phase)/);assert.deepEqual(c.preparationState,before);assert.equal(c.coachingDraft.session.id,p.session.id);
});
