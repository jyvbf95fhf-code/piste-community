import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as provenance from '../src/coaching-reference-provenance.mjs';
const {createReferenceProvenance,addProvenanceEvent,getReferenceRelations,linkDerivedReference,getMissingProvenance}=provenance;
const at='2026-10-10T09:12:34.000Z';
const participant=id=>({kind:'participant',id});
const external=(id,label)=>({kind:'external',id,label});
function input(){return {sessionId:'session-701',creatorId:'creator-11',participants:[
 {id:'creator-11',functions:['driver']},{id:'tracer-23',functions:['traceur']},
 {id:'coach-37',functions:['coach','traceur']},{id:'owner-41',functions:['observer']}
],references:[
 {id:'prepared-101',type:'prepared',geometryAvailable:true,originalSourceId:'library-original'},
 {id:'gpx-103',type:'gpx',geometryAvailable:true,originalSourceId:'original-file-103'},
 {id:'recorded-107',type:'recorded',geometryAvailable:false,originalSourceId:null}
]};}
const state=()=>createReferenceProvenance(input());
// All positive scenario evidence is explicitly simulation, never actual GPS.
function event(type,subject=participant('tracer-23'),details={},patch={}){return {
 id:`event-${type}`,sessionId:'session-701',referenceId:'prepared-101',type,
 authorId:'creator-11',subject,at,proof:{kind:'simulation',origin:'contract-test-fixture',simulatedBasis:type==='pose_attestation'||type==='assignment'?'declaration':'metadata'},details,...patch
};}
const read=s=>getReferenceRelations(s,'prepared-101');
const add=(s,type,subject,details,patch)=>addProvenanceEvent(s,event(type,subject,details,patch));
function recording(patch={}){return event('recording',participant('creator-11'),{recordingId:'rec-503',pointSource:'simulation',originalPointsId:'original-points-503'},{proof:{kind:'simulation',origin:'contract-test-fixture',simulatedBasis:'recording',recordingId:'rec-503'},...patch});}
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}

test('exact public interface contains five pure operations and no permission operation',()=>{
 assert.deepEqual(Object.keys(provenance).sort(),['addProvenanceEvent','createReferenceProvenance','getMissingProvenance','getReferenceRelations','linkDerivedReference'].sort());
});
test('unknown relations remain explicit null despite available geometry',()=>{
 const s=state(),v=read(s);
 for(const key of ['owner','preparer','designatedTracer','effectivePoser','recorder'])assert.equal(v[key],null);
 assert.equal(v.geometryAvailable,true);assert.equal(v.layingStatus,'unknown');
 assert.deepEqual(getMissingProvenance(s,'prepared-101'),{referenceId:'prepared-101',missing:['owner','preparer','designatedTracer','effectivePoser','recorder'],status:'unknown',label:'Provenance non renseignée'});
});
test('owner, preparer and designated Traceur are three independent people',()=>{
 let s=add(state(),'owner',participant('owner-41'));
 s=add(s,'preparer',participant('coach-37'));s=add(s,'designated_tracer',participant('tracer-23'));
 const v=read(s);assert.equal(v.owner.actor.id,'owner-41');assert.equal(v.preparer.actor.id,'coach-37');assert.equal(v.designatedTracer.actor.id,'tracer-23');assert.equal(v.effectivePoser,null);
});
test('one person can hold several explicit relations without automatic union',()=>{
 let s=add(state(),'owner',participant('coach-37'));assert.equal(read(s).preparer,null);
 s=add(s,'preparer',participant('coach-37'));s=add(s,'designated_tracer',participant('coach-37'));
 assert.equal(read(s).designatedTracer.actor.id,'coach-37');assert.equal(read(s).effectivePoser,null);assert.equal(read(s).recorder,null);
 assert.deepEqual(s.participants.find(p=>p.id==='coach-37').functions,['coach','traceur']);
});
for(const beneficiary of ['tracer-23','coach-37'])test(`explicit pre-pose attribution to non-owner ${beneficiary}`,()=>{
 let s=add(state(),'owner',participant('owner-41'));
 s=add(s,'assignment',participant(beneficiary),{purpose:'both'});
 const v=read(s),a=v.assignments[0];assert.equal(a.actor.id,beneficiary);assert.equal(a.authorId,'creator-11');assert.equal(a.at,at);assert.equal(a.proof.kind,'simulation');
 assert.equal(s.events.at(-1).sessionId,s.sessionId);assert.equal(s.events.at(-1).referenceId,'prepared-101');
 assert.equal(v.effectivePoser,null);assert.equal(v.layingStatus,'unknown');assert.equal(v.owner.actor.id,'owner-41');
});
test('designation and preparation ready do not attest pose',()=>{
 let s=add(state(),'designated_tracer',participant('tracer-23'));s=add(s,'preparation_ready',null);
 assert.equal(read(s).preparationStatus,'ready');assert.equal(read(s).effectivePoser,null);
});
test('explicit simulated pose attestation retains subject, author, time and origin',()=>{
 const s=add(state(),'pose_attestation',participant('tracer-23'),{status:'completed'}),v=read(s);
 assert.equal(v.effectivePoser.actor.id,'tracer-23');assert.equal(v.effectivePoser.proof.kind,'simulation');assert.equal(v.effectivePoser.proof.origin,'contract-test-fixture');assert.equal(v.layingStatus,'completed');assert.equal(v.recorder,null);
});
test('simulated recorder differs from the explicitly attested poser',()=>{
 let s=addProvenanceEvent(state(),recording());s=add(s,'pose_attestation',participant('tracer-23'),{status:'in_progress'});
 assert.equal(read(s).recorder.actor.id,'creator-11');assert.equal(read(s).effectivePoser.actor.id,'tracer-23');assert.equal(read(s).recorder.pointSource,'simulation');
});
test('recording alone never establishes a physical poser',()=>{
 const v=read(addProvenanceEvent(state(),recording()));assert.equal(v.effectivePoser,null);assert.equal(v.layingStatus,'unknown');
});
test('explicit simulated recording attestation links identified poser to original recording',()=>{
 const initial=addProvenanceEvent(state(),recording());
 const proof={kind:'simulation',origin:'contract-test-fixture',simulatedBasis:'recording',recordingId:'rec-503'};
 const s=add(initial,'pose_attestation',participant('tracer-23'),{status:'completed'},{proof});
 assert.deepEqual(read(s).effectivePoser.proof,proof);assert.equal(read(s).effectivePoser.actor.id,'tracer-23');assert.equal(read(s).recorder.actor.id,'creator-11');assert.equal(read(initial).effectivePoser,null);
});
test('simulated recording attestation cannot link wrong recording identity',()=>{
 const s=addProvenanceEvent(state(),recording());
 assert.throws(()=>add(s,'pose_attestation',participant('tracer-23'),{status:'completed'},{proof:{kind:'simulation',origin:'contract-test-fixture',simulatedBasis:'recording',recordingId:'wrong-recording'}}),TypeError);
});
test('human declaration remains declared and unverified, never GPS evidence',()=>{
 const s=add(state(),'pose_attestation',participant('tracer-23'),{status:'completed'},{proof:{kind:'declaration',origin:'human-statement-fixture'}});
 assert.deepEqual(read(s).effectivePoser.proof,{kind:'declaration',origin:'human-statement-fixture'});assert.equal(read(s).recorder,null);
});
test('unattested absence is preserved without timestamps or actor fabrication',()=>{
 const s=state();assert.deepEqual(s.events,[]);assert.equal(read(s).effectivePoser,null);assert.equal(read(s).poseAttestation,undefined);
});
test('declared unknown poser remains unknown',()=>{
 const s=add(state(),'pose_attestation',null,{status:'completed'},{proof:{kind:'declaration',origin:'human-statement-fixture'}});
 assert.equal(read(s).effectivePoser,null);assert.equal(read(s).poseAttestation.actor,null);assert.ok(getMissingProvenance(s,'prepared-101').missing.includes('effectivePoser'));
});
for(const authorId of ['creator-11','coach-37'])test(`external no-account poser declared by ${authorId}`,()=>{
 const s=add(state(),'pose_attestation',external('external-59','Traceur déclaré'),{status:'completed'},{authorId,proof:{kind:'declaration',origin:'human-statement-fixture'}});
 const v=read(s);assert.equal(v.effectivePoser.actor.kind,'external');assert.equal(v.effectivePoser.proof.kind,'declaration');assert.equal(v.effectivePoser.authorId,authorId);assert.equal(v.effectivePoser.at,at);
 assert.equal(s.participants.length,4);assert.ok(!s.participants.some(p=>p.id==='external-59'));assert.equal(v.recorder,null);
});
test('noncreator Conducteur may declare an external poser',()=>{
 const i=input();i.creatorId='owner-41';const s=add(createReferenceProvenance(i),'pose_attestation',external('external-59','Traceur'),{status:'completed'},{proof:{kind:'declaration',origin:'human-statement-fixture'}});assert.equal(read(s).effectivePoser.authorId,'creator-11');
});
test('external unknown identity preserved without a fake participant or GPS association',()=>{
 let s=addProvenanceEvent(state(),recording());s=add(s,'pose_attestation',external(null,null),{status:'completed'},{proof:{kind:'declaration',origin:'human-statement-fixture'}});
 assert.deepEqual(read(s).effectivePoser.actor,external(null,null));assert.equal(read(s).recorder.actor.id,'creator-11');assert.ok(getMissingProvenance(s,'prepared-101').missing.includes('effectivePoser'));assert.equal(s.participants.length,4);
});
test('GPX importer and declared external owner remain distinct from pose and membership',()=>{
 const e=event('gpx_import',participant('creator-11'),{sourceFileId:'original-file-103',declaredOwner:external('external-author-67','Auteur déclaré')},{referenceId:'gpx-103'});
 const s=addProvenanceEvent(state(),e),v=getReferenceRelations(s,'gpx-103');
 assert.equal(v.imports[0].actor.id,'creator-11');assert.equal(v.imports[0].at,at);assert.equal(v.imports[0].sourceFileId,'original-file-103');assert.equal(v.owner.actor.id,'external-author-67');assert.equal(v.owner.proof.kind,'simulation');assert.equal(v.effectivePoser,null);assert.equal(s.participants.length,4);
});
test('non-simulated GPX metadata preserves owner as declaration, not recording proof',()=>{
 const s=add(state(),'gpx_import',participant('creator-11'),{sourceFileId:'original-file-103',declaredOwner:external('external-author-67','Auteur déclaré')},{referenceId:'gpx-103',proof:{kind:'metadata',origin:'import-metadata-fixture'}});
 assert.equal(getReferenceRelations(s,'gpx-103').owner.proof.kind,'declaration');
});
test('GPX import with unknown owner does not invent owner or poser',()=>{
 const s=add(state(),'gpx_import',participant('creator-11'),{sourceFileId:'original-file-103',declaredOwner:null},{referenceId:'gpx-103'});
 const v=getReferenceRelations(s,'gpx-103');assert.equal(v.owner,null);assert.equal(v.effectivePoser,null);assert.equal(v.imports.length,1);
});
test('derived recording links to GPX without copying identities or replacing originals',()=>{
 const initial=freeze(state()),before=structuredClone(initial);
 const e=event('derivation',null,{sourceReferenceId:'gpx-103'},{referenceId:'recorded-107'});
 const next=linkDerivedReference(initial,freeze(e));
 assert.equal(getReferenceRelations(next,'recorded-107').derivedFromReferenceId,'gpx-103');assert.equal(getReferenceRelations(next,'recorded-107').owner,null);assert.equal(getReferenceRelations(next,'gpx-103').derivedFromReferenceId,null);assert.deepEqual(next.references,initial.references);assert.deepEqual(initial,before);
});
test('history is append-only and previous frozen results stay unchanged',()=>{
 const initial=state(),first=add(initial,'owner',participant('owner-41')),snapshot=structuredClone(first),v=read(first);
 const second=add(first,'preparer',participant('coach-37'));
 assert.equal(initial.events.length,0);assert.equal(first.events.length,1);assert.equal(second.events.length,2);assert.deepEqual(second.events[0],first.events[0]);assert.deepEqual(first,snapshot);assert.equal(v.preparer,null);
 assert.throws(()=>{second.events.push({});},TypeError);assert.throws(()=>{v.owner.actor.id='changed';},TypeError);
});
test('frozen input, frozen event and original GPS fixture remain unchanged',()=>{
 const gps=freeze([{latitude:48.712345,longitude:7.123456,accuracy:31,timestamp:at},{latitude:48.712389,longitude:7.123501,accuracy:44,timestamp:at}]);
 const before=structuredClone(gps),i=freeze(input()),s=createReferenceProvenance(i),e=freeze(recording());addProvenanceEvent(s,e);
 assert.deepEqual(gps,before);assert.deepEqual(i,input());assert.equal(e.details.originalPointsId,'original-points-503');
 assert.throws(()=>addProvenanceEvent(s,{...recording(),coordinates:gps}),TypeError);
});
test('identical inputs yield deterministic equal results',()=>{
 const e=event('owner',participant('owner-41'));assert.deepEqual(addProvenanceEvent(state(),e),addProvenanceEvent(state(),structuredClone(e)));assert.deepEqual(read(state()),read(state()));
});
test('provenance results never contain a read permission or authorization',()=>{
 let s=add(state(),'assignment',participant('coach-37'),{purpose:'both'});s=add(s,'pose_attestation',participant('coach-37'),{status:'completed'});
 const v=read(s);for(const key of ['allowed','canRead','permissions','referenceHidden'])assert.ok(!Object.hasOwn(v,key));assert.equal(v.assignments[0].actor.id,'coach-37');
});

const invalidEvents=[
 ['missing event id',e=>delete e.id],['blank event id',e=>e.id=' '],['missing time',e=>delete e.at],['invalid calendar date',e=>e.at='2026-02-30T09:12:34.000Z'],['missing timezone',e=>e.at='2026-10-10T09:12:34'],
 ['wrong session',e=>e.sessionId='another-session'],['unknown reference',e=>e.referenceId='missing'],['prototype name is not reference',e=>e.referenceId='toString'],
 ['missing reference',e=>delete e.referenceId],['unknown author',e=>e.authorId='stranger'],['unknown participant subject',e=>e.subject=participant('stranger')],
 ['invalid external id',e=>e.subject=external('',null)],['missing subject',e=>delete e.subject],['missing evidence',e=>delete e.proof],['unknown evidence kind',e=>e.proof.kind='gps-implied'],['missing evidence origin',e=>delete e.proof.origin],
 ['unknown event type',e=>e.type='gps_position'],['unexpected GPS data',e=>e.details={latitude:48.123,longitude:7.456}],['unexpected permission',e=>e.allowed=true],['recording evidence cannot imply ownership',e=>e.proof={kind:'recording',origin:'fixture',recordingId:'rec-503'}]
];
for(const [name,change] of invalidEvents)test(`refusal: ${name}`,()=>{
 const s=state(),before=structuredClone(s),e=event('owner',participant('owner-41'));change(e);assert.throws(()=>addProvenanceEvent(s,e),TypeError);assert.deepEqual(s,before);
});
const invalidInputs=[
 ['missing session',i=>delete i.sessionId],['missing reference id',i=>delete i.references[0].id],['duplicate reference',i=>i.references.push({...i.references[0]})],['unknown reference type',i=>i.references[0].type='gps'],
 ['duplicate participant',i=>i.participants.push({...i.participants[0]})],['invalid function',i=>i.participants[0].functions=['admin']],['unknown creator',i=>i.creatorId='stranger'],['identity inferred in descriptor',i=>i.references[0].poserId='tracer-23']
];
for(const [name,change] of invalidInputs)test(`invalid creation: ${name}`,()=>{const i=input();change(i);assert.throws(()=>createReferenceProvenance(i),TypeError);});
for(const type of ['owner','preparer','designated_tracer'])test(`repeated and contradictory ${type} relations refused`,()=>{
 const first=event(type,participant('tracer-23')),s=addProvenanceEvent(state(),first);
 assert.throws(()=>addProvenanceEvent(s,first),TypeError);
 assert.throws(()=>addProvenanceEvent(s,{...first,id:'new-event',subject:participant('coach-37')}),TypeError);
});
test('repeated attribution refused without dropping previous event',()=>{
 const e=event('assignment',participant('coach-37'),{purpose:'both'}),s=addProvenanceEvent(state(),e);
 assert.throws(()=>addProvenanceEvent(s,{...e,id:'another-event'}),TypeError);assert.equal(s.events.length,1);
});
test('repeated or contradictory pose attestation refused',()=>{
 const e=event('pose_attestation',participant('tracer-23'),{status:'completed'}),s=addProvenanceEvent(state(),e);
 assert.throws(()=>addProvenanceEvent(s,{...e,id:'another-event',subject:participant('coach-37')}),TypeError);
});
test('unknown or unassigned Traceur cannot receive a Traceur attribution',()=>{
 assert.throws(()=>add(state(),'assignment',participant('owner-41'),{purpose:'laying'}),TypeError);
 assert.throws(()=>add(state(),'assignment',participant('tracer-23'),{purpose:'laying'},{authorId:null}),TypeError);
});
test('external declaration by Observer/noncreator or unknown author refused',()=>{
 for(const authorId of ['owner-41',null])assert.throws(()=>add(state(),'pose_attestation',external('external-59','Externe'),{status:'completed'},{authorId,proof:{kind:'declaration',origin:'human-statement-fixture'}}),TypeError);
});
test('external actor cannot be silently converted to connected recorder',()=>{
 assert.throws(()=>addProvenanceEvent(state(),{...recording(),subject:external('external-59','Externe')}),TypeError);
});
test('simulation cannot be relabelled as device GPS recording',()=>{
 const e=recording();e.details.pointSource='device_gps';assert.throws(()=>addProvenanceEvent(state(),e),TypeError);
});
test('recording proof cannot be relabelled as simulated point source',()=>{
 const e=recording();e.proof.kind='recording';assert.throws(()=>addProvenanceEvent(state(),e),TypeError);
});
test('recording pose evidence requires an associated non-simulated recording',()=>{
 const e=event('pose_attestation',participant('tracer-23'),{status:'completed'},{proof:{kind:'recording',origin:'schema-negative-fixture',recordingId:'rec-503'}});
 assert.throws(()=>addProvenanceEvent(state(),e),TypeError);assert.throws(()=>addProvenanceEvent(addProvenanceEvent(state(),recording()),e),TypeError);
});
test('missing recording identifier or original point identifier refused',()=>{
 for(const key of ['recordingId','originalPointsId']){const e=recording();delete e.details[key];assert.throws(()=>addProvenanceEvent(state(),e),TypeError);}
});
test('GPX source mismatch, wrong reference and false importer refused',()=>{
 const e=event('gpx_import',participant('creator-11'),{sourceFileId:'original-file-103',declaredOwner:null},{referenceId:'gpx-103'});
 for(const wrong of [{...e,referenceId:'prepared-101'},{...e,authorId:'coach-37'},{...e,details:{...e.details,sourceFileId:'other-file'}}])assert.throws(()=>addProvenanceEvent(state(),wrong),TypeError);
});
test('derivation cannot reference nonexistent source or another session',()=>{
 const e=event('derivation',null,{sourceReferenceId:'missing'},{referenceId:'recorded-107'});assert.throws(()=>linkDerivedReference(state(),e),TypeError);
 assert.throws(()=>linkDerivedReference(state(),{...e,sessionId:'another-session',details:{sourceReferenceId:'gpx-103'}}),TypeError);
});
test('self derivation and cycles refused',()=>{
 const e=event('derivation',null,{sourceReferenceId:'gpx-103'},{referenceId:'recorded-107'}),s=linkDerivedReference(state(),e);
 assert.throws(()=>linkDerivedReference(s,{...e,id:'cycle',referenceId:'gpx-103',details:{sourceReferenceId:'recorded-107'}}),TypeError);
 assert.throws(()=>linkDerivedReference(state(),{...e,details:{sourceReferenceId:'recorded-107'}}),TypeError);
});
test('link operation accepts only explicit derivation events',()=>assert.throws(()=>linkDerivedReference(state(),event('owner')),TypeError));
test('unknown query reference refused',()=>{
 assert.throws(()=>getReferenceRelations(state(),'missing'),TypeError);assert.throws(()=>getMissingProvenance(state(),'missing'),TypeError);
});
test('tampered ledger is revalidated on reads and additions',()=>{
 const s=structuredClone(state());s.events.push(event('owner',participant('stranger')));
 assert.throws(()=>read(s),TypeError);assert.throws(()=>addProvenanceEvent(s,event('preparer')),TypeError);
});
test('caller event mutation cannot rewrite stored history',()=>{
 const e=event('owner',participant('owner-41')),s=addProvenanceEvent(state(),e);e.subject.id='coach-37';e.proof.origin='changed';assert.equal(read(s).owner.actor.id,'owner-41');assert.equal(read(s).owner.proof.origin,'contract-test-fixture');
});
test('simulation must explicitly name its simulated evidence basis',()=>{
 const e=event('owner',participant('owner-41'));delete e.proof.simulatedBasis;assert.throws(()=>addProvenanceEvent(state(),e),TypeError);
});
test('metadata simulation cannot masquerade as pose attestation',()=>{
 const e=event('pose_attestation',participant('tracer-23'),{status:'completed'});e.proof.simulatedBasis='metadata';assert.throws(()=>addProvenanceEvent(state(),e),TypeError);
});
test('assignment cannot masquerade as simulated recording evidence',()=>{
 const e=event('assignment',participant('coach-37'),{purpose:'both'});e.proof={kind:'simulation',simulatedBasis:'recording',origin:'contract-test-fixture',recordingId:'rec-503'};assert.throws(()=>addProvenanceEvent(state(),e),TypeError);
});
test('contradictory recording and GPX import events refused',()=>{
 const r=recording(),s=addProvenanceEvent(state(),r);assert.throws(()=>addProvenanceEvent(s,{...r,id:'another-recording'}),TypeError);
 const e=event('gpx_import',participant('creator-11'),{sourceFileId:'original-file-103',declaredOwner:null},{referenceId:'gpx-103'}),g=addProvenanceEvent(state(),e);assert.throws(()=>addProvenanceEvent(g,{...e,id:'another-import'}),TypeError);
});
test('recording on another reference cannot support an attestation',()=>{
 const s=addProvenanceEvent(state(),recording({referenceId:'recorded-107'}));
 assert.throws(()=>add(s,'pose_attestation',participant('tracer-23'),{status:'completed'},{proof:{kind:'simulation',simulatedBasis:'recording',origin:'contract-test-fixture',recordingId:'rec-503'}}),TypeError);
});
test('repeated preparation readiness and derivation refused',()=>{
 const s=add(state(),'preparation_ready',null);assert.throws(()=>add(s,'preparation_ready',null,{}, {id:'another-ready'}),TypeError);
 const e=event('derivation',null,{sourceReferenceId:'gpx-103'},{referenceId:'recorded-107'}),d=linkDerivedReference(state(),e);assert.throws(()=>linkDerivedReference(d,{...e,id:'another-link'}),TypeError);
});
test('event reference must be a string identity rather than an array coercion',()=>{
 const e=event('owner',participant('owner-41'));e.referenceId=['prepared-101'];assert.throws(()=>addProvenanceEvent(state(),e),TypeError);
});
test('event identity stays unique across different references',()=>{
 const e=event('owner',participant('owner-41')),s=addProvenanceEvent(state(),e);assert.throws(()=>addProvenanceEvent(s,{...e,referenceId:'gpx-103'}),TypeError);
});
