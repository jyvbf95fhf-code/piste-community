// Isolated provenance ledger. Evidence is supplied by the caller, never verified
// against GPS, accounts or a server here. This module grants no permissions.
const fail=message=>{throw new TypeError(message);};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const id=value=>typeof value==='string'&&value.trim()===value&&value.length>0;
function keys(value,required,optional=[]){
 if(!object(value)||required.some(key=>!Object.hasOwn(value,key))||Object.keys(value).some(key=>![...required,...optional].includes(key)))fail('Invalid fields');
}
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
const copy=value=>structuredClone(value);
function actor(value,participants){
 if(value===null)return;
 keys(value,['kind','id'],['label']);
 if(value.kind==='participant'){
  if(!id(value.id)||!participants.some(p=>p.id===value.id)||Object.hasOwn(value,'label'))fail('Unknown participant');
 }else if(value.kind==='external'){
  if(value.id!==null&&!id(value.id))fail('Invalid external identity');
  if(Object.hasOwn(value,'label')&&value.label!==null&&!id(value.label))fail('Invalid external label');
 }else fail('Invalid actor kind');
}
function timestamp(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)||!Number.isFinite(Date.parse(value)))fail('Explicit UTC timestamp required');
 if(new Date(value).toISOString()!==value.replace(/Z$/,value.includes('.')?'Z':'.000Z'))fail('Invalid calendar timestamp');
}
function base(input){
 keys(input,['sessionId','participants','references'],['creatorId']);
 if(!id(input.sessionId)||!Array.isArray(input.participants)||!Array.isArray(input.references))fail('Invalid session');
 const seen=new Set();
 for(const p of input.participants){
  keys(p,['id','functions']);
  if(!id(p.id)||seen.has(p.id)||!Array.isArray(p.functions)||!p.functions.length||new Set(p.functions).size!==p.functions.length||p.functions.some(f=>!['driver','traceur','coach','observer'].includes(f)))fail('Invalid participant');
  seen.add(p.id);
 }
 if(input.creatorId!==undefined&&input.creatorId!==null&&!seen.has(input.creatorId))fail('Invalid creator');
 seen.clear();
 for(const r of input.references){
  keys(r,['id','type','geometryAvailable','originalSourceId']);
  if(!id(r.id)||seen.has(r.id)||!['prepared','gpx','recorded'].includes(r.type)||typeof r.geometryAvailable!=='boolean'||r.originalSourceId!==null&&!id(r.originalSourceId))fail('Invalid reference');
  seen.add(r.id);
 }
 return {...copy(input),creatorId:input.creatorId??null};
}
function blank(reference){return {referenceId:reference.id,type:reference.type,geometryAvailable:reference.geometryAvailable,originalSourceId:reference.originalSourceId,owner:null,preparer:null,designatedTracer:null,effectivePoser:null,recorder:null,assignments:[],imports:[],derivedFromReferenceId:null,derivation:null,preparationStatus:'unknown',layingStatus:'unknown'};}
function relation(event){return {actor:copy(event.subject),eventId:event.id,authorId:event.authorId,at:event.at,proof:copy(event.proof)};}
function apply(state,views,event,seen){
 keys(event,['id','sessionId','referenceId','type','authorId','subject','at','proof','details']);
 if(!id(event.id)||seen.has(event.id))fail('Duplicate or missing event identity');
 if(event.sessionId!==state.sessionId)fail('Event session mismatch');
 const view=id(event.referenceId)&&Object.hasOwn(views,event.referenceId)?views[event.referenceId]:null;
 if(!view)fail('Unknown event reference');
 if(event.authorId!==null&&(!id(event.authorId)||!state.participants.some(p=>p.id===event.authorId)))fail('Unknown event author');
 actor(event.subject,state.participants);timestamp(event.at);
 keys(event.proof,['kind','origin'],['recordingId','simulatedBasis']);
 if(!['simulation','declaration','recording','metadata'].includes(event.proof.kind)||!id(event.proof.origin))fail('Invalid evidence');
 if(event.proof.kind==='simulation'?!['declaration','recording','metadata'].includes(event.proof.simulatedBasis):Object.hasOwn(event.proof,'simulatedBasis'))fail('Explicit simulation basis required');
 const basis=event.proof.kind==='simulation'?event.proof.simulatedBasis:event.proof.kind;
 if(Object.hasOwn(event.proof,'recordingId')&&!id(event.proof.recordingId))fail('Invalid recording identity');
 if(basis==='recording'?!id(event.proof.recordingId):Object.hasOwn(event.proof,'recordingId'))fail('Recording identity requires recording evidence');
 if(!object(event.details))fail('Invalid event details');
 const rel=relation(event);
 const single=key=>{if(view[key]!==null)fail('Repeated or contradictory relation');view[key]=rel;};
 switch(event.type){
 case 'owner': case 'preparer': case 'designated_tracer': {
  keys(event.details,[]);
  if(event.subject===null||!['metadata','declaration'].includes(basis))fail('Explicit relation required');
  if(event.type!=='owner'&&event.subject.kind!=='participant')fail('Participant relation required');
  if(event.type==='designated_tracer'&&!state.participants.find(p=>p.id===event.subject.id).functions.includes('traceur'))fail('Traceur function required');
  single({owner:'owner',preparer:'preparer',designated_tracer:'designatedTracer'}[event.type]);break;
 }
 case 'assignment': {
  keys(event.details,['purpose']);
  if(event.authorId===null||event.subject?.kind!=='participant'||!['preparation','laying','both'].includes(event.details.purpose)||basis!=='declaration')fail('Explicit assignment required');
  if(!state.participants.find(p=>p.id===event.subject.id).functions.includes('traceur'))fail('Traceur beneficiary required');
  if(view.assignments.some(a=>a.actor.id===event.subject.id))fail('Repeated assignment');
  view.assignments.push({...rel,purpose:event.details.purpose});break;
 }
 case 'pose_attestation': {
  keys(event.details,['status']);
  if(!['in_progress','completed','interrupted'].includes(event.details.status)||!['declaration','recording','simulation'].includes(event.proof.kind))fail('Explicit pose attestation required');
  if(view.layingStatus!=='unknown')fail('Repeated or contradictory pose attestation');
  if(basis==='recording'){
   if(event.subject?.kind!=='participant'||!id(event.proof.recordingId)||!view.recorder||view.recorder.recordingId!==event.proof.recordingId||view.recorder.proof.kind!==event.proof.kind)fail('Associated participant recording required');
  }
  if(event.subject?.kind==='external'){
   const author=state.participants.find(p=>p.id===event.authorId);
   if(basis!=='declaration'||!author||!(state.creatorId===author.id||author.functions.some(f=>['coach','driver'].includes(f))))fail('External poser declaration requires creator, Coach or Conducteur');
  }
  if(basis==='metadata'||basis==='declaration'&&event.authorId===null)fail('Explicit attestation author and basis required');
  view.effectivePoser=event.subject===null?null:rel;view.layingStatus=event.details.status;
  view.poseAttestation=rel;break;
 }
 case 'recording': {
  keys(event.details,['recordingId','pointSource','originalPointsId']);
  if(event.subject?.kind!=='participant'||!id(event.details.recordingId)||!id(event.details.originalPointsId)||!['simulation','device_gps'].includes(event.details.pointSource))fail('Explicit recorder and point source required');
  if(event.details.pointSource==='simulation'?event.proof.kind!=='simulation':event.proof.kind!=='recording')fail('Point source and evidence disagree');
  if(basis!=='recording')fail('Recording evidence required');
  if(event.proof.recordingId!==event.details.recordingId)fail('Recording evidence mismatch');
  single('recorder');view.recorder={...rel,...copy(event.details)};break;
 }
 case 'gpx_import': {
  keys(event.details,['sourceFileId','declaredOwner']);
  if(view.type!=='gpx'||event.subject?.kind!=='participant'||event.authorId!==event.subject.id||!id(event.details.sourceFileId)||event.details.sourceFileId!==view.originalSourceId||!['metadata','declaration'].includes(basis))fail('Explicit GPX import required');
  actor(event.details.declaredOwner,state.participants);
  if(view.imports.length||view.owner!==null)fail('Repeated or contradictory GPX import');
  view.imports.push({...rel,...copy(event.details)});
  if(event.details.declaredOwner!==null)view.owner={...rel,actor:copy(event.details.declaredOwner),proof:{kind:event.proof.kind==='simulation'?'simulation':'declaration',origin:event.proof.origin,...(event.proof.kind==='simulation'?{simulatedBasis:'declaration'}:{})}};
  break;
 }
 case 'preparation_ready': {
  keys(event.details,[]);
  if(view.preparationStatus!=='unknown'||event.subject!==null||!['metadata','declaration'].includes(basis))fail('Invalid preparation status');
  view.preparationStatus='ready';break;
 }
 case 'derivation': {
  keys(event.details,['sourceReferenceId']);
  const source=event.details.sourceReferenceId;
  if(!id(source)||!Object.hasOwn(views,source)||source===event.referenceId||view.derivedFromReferenceId!==null||event.subject!==null||!['metadata','declaration'].includes(basis))fail('Invalid reference derivation');
  let cursor=source;while(cursor!==null){if(cursor===event.referenceId)fail('Cyclic reference derivation');cursor=views[cursor].derivedFromReferenceId;}
  view.derivedFromReferenceId=source;view.derivation=rel;break;
 }
 default: fail('Unknown provenance event');
 }
 seen.add(event.id);
}
function inspect(state){
 keys(state,['schemaVersion','sessionId','participants','references','creatorId','events']);
 if(state.schemaVersion!==1||!Array.isArray(state.events))fail('Invalid provenance state');
 const checked=base({sessionId:state.sessionId,participants:state.participants,references:state.references,creatorId:state.creatorId});
 const views=Object.fromEntries(checked.references.map(r=>[r.id,blank(r)])),seen=new Set();
 for(const event of state.events)apply(checked,views,event,seen);
 return {checked,views,seen};
}

export function createReferenceProvenance(input){return freeze({schemaVersion:1,...base(input),events:[]});}
export function addProvenanceEvent(state,event){
 const {checked,views,seen}=inspect(state);apply(checked,views,event,seen);
 return freeze({...copy(state),events:[...copy(state.events),copy(event)]});
}
export function getReferenceRelations(state,referenceId){
 const {views}=inspect(state);if(!id(referenceId)||!Object.hasOwn(views,referenceId))fail('Unknown reference');
 return freeze(copy(views[referenceId]));
}
export function linkDerivedReference(state,event){
 if(event?.type!=='derivation')fail('Derivation event required');
 return addProvenanceEvent(state,event);
}
export function getMissingProvenance(state,referenceId){
 const view=getReferenceRelations(state,referenceId);
 const missing=['owner','preparer','designatedTracer','effectivePoser','recorder'].filter(key=>view[key]===null||view[key].actor===null||view[key].actor.kind==='external'&&view[key].actor.id===null&&!view[key].actor.label);
 const known=['owner','preparer','designatedTracer','effectivePoser','recorder'].some(key=>!missing.includes(key))||view.assignments.length>0||view.imports.length>0;
 return freeze({referenceId,missing,status:known?'documented':'unknown',label:known?'Provenance documentée':'Provenance non renseignée'});
}
