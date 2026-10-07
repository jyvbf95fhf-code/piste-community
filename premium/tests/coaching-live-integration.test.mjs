import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommunityStore} from '../src/community-store.mjs';
import {createDraft} from '../src/coaching.mjs';
import {CoachingScreen} from '../src/coaching-screen.mjs';
import {coachingDraftWithContacts,ensureCoachingContactParticipant} from '../src/community-coaching-contacts.mjs';

const storeWithContact=authorized=>createCommunityStore({profiles:[{id:'self',displayName:'Moi'},{id:'camille',displayName:'Camille Dumas',role:'Coach terrain'},{id:'alex',displayName:'Alex Martin',role:'Conducteur cynophile',specialty:'Pistage'}],contacts:[{userIds:['self','alex'],quick_coaching_invite_authorized:authorized}],posts:[],contactRequests:[],follows:[],notifications:[]});

test('Coaching presents only accepted Contacts authorized for quick invitations in a separate group',()=>{
 const store=storeWithContact(true),draft=createDraft({name:'Moi'},[]);draft.step='roles';draft.dogs=[{id:'nox',name:'Nox'}];
 const renderedDraft=coachingDraftWithContacts(draft,store);
 const html=CoachingScreen(renderedDraft,'',[],store.getContacts());
 assert.match(html,/<optgroup label="Mes contacts">[\s\S]*Alex Martin[\s\S]*<\/optgroup>/);
 assert.equal(renderedDraft.roles.coach,draft.roles.coach);
 assert.equal(renderedDraft.roles.traceur,draft.roles.traceur);
 assert.equal(renderedDraft.roles.driver,draft.roles.driver);
});

test('unselected, pending, and unauthorized people are not injected as Coaching contacts',()=>{
 const unauthorized=storeWithContact(false),draft=createDraft({name:'Moi'},[]);
 assert.deepEqual(coachingDraftWithContacts(draft,unauthorized).participants,draft.participants);
 assert.equal(ensureCoachingContactParticipant(draft,'alex',unauthorized),draft);
});

test('choosing an authorized Contact makes that person selectable without assigning a role automatically',()=>{
 const store=storeWithContact(true),draft=createDraft({name:'Moi'},[]);
 const next=ensureCoachingContactParticipant(draft,'alex',store);
 assert.ok(next.participants.some(person=>person.id==='alex'&&person.name==='Alex Martin'));
 assert.equal(next.roles.coach,draft.roles.coach);
 assert.equal(next.roles.traceur,draft.roles.traceur);
 assert.equal(next.roles.driver,draft.roles.driver);
});

test('Coaching session sharing and observer notification are independent controls and share is off by default',()=>{
 const draft=createDraft({name:'Moi'},[]);draft.mode='normal';draft.trackingScenario='connected_traceur';draft.traceType='none';draft.dogs=[{id:'nox',name:'Nox'}];draft.dogId='nox';draft.session={id:'coaching-live-9',code:'PC-0009'};
 const html=CoachingScreen(draft,'',[],[],{share_live:false,notify_observers:true});
 assert.match(html,/Partager cette session avec mes observateurs autorisés/);
 assert.match(html,/Prévenir mes observateurs autorisés/);
 assert.match(html,/<input type="checkbox" data-live-policy="share_live"/);
 assert.doesNotMatch(html,/data-live-policy="share_live"[^>]*checked/);
 assert.match(html,/data-live-policy="notify_observers"[^>]*checked/);
});
