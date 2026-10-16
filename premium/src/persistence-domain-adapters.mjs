import {createProfileStore} from './profile-store.mjs';
import {createDogsStore} from './dogs.mjs';
import {createTrackLibrary} from './track-library.mjs';
import {normalizeOperationalMission} from './operational-data.mjs';
import {validGpsPose} from './coaching-gps-model.mjs';
import {OPERATIONAL_MISSION_STATUSES} from './operational-missions.mjs';
const pick=(value,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(value,k)).map(k=>[k,structuredClone(value[k])]));
export function collectPersistenceCandidates({profile,dogs=[],tracks=[],missions=[],associations=[]}={}){
 const candidate=(kind,localId,value)=>({kind,localId,value:structuredClone(value),provenance:'local-personal',requiresSelection:true});
 return [...(profile?[candidate('profile','self',profile)]:[]),...dogs.filter(d=>!['nox','uma','arko'].includes(d.id)).map(d=>candidate('dog',d.id,d)),...tracks.filter(t=>t.ownerId==='self').map(t=>candidate('track',t.id,t)),...missions.filter(m=>m.kind==='operational'&&!m.cloudReadOnly).map(m=>candidate('ops',m.id,m)),...associations.map(a=>candidate('session-dog-link',a.sessionId,a))];
}
export function preparePersistenceCandidate({kind,localId,value}){
 if(typeof localId!=='string'||!localId||!value||typeof value!=='object'||Array.isArray(value))throw Error('Source de sauvegarde invalide.');let payload;
 if(kind==='profile'){const store=createProfileStore();store.setAvatar(value.avatar??'initials');store.setPrimaryDog(value.primary_dog_id??null);store.setPreferences(value.preferences||{});payload=store.snapshot();}
 else if(kind==='dog'){
  const fields=pick(value,['name','officialName','breed','sex','dateOfBirth','retirementDate','age','registrationNumber','specialty','status','portrait','personalPhotoDataUrl','notes','disciplines','sessions']);
  const store=createDogsStore({dogs:[{portrait:'silhouette',...fields,id:localId,status:fields.status||'active'}]});payload=pick(store.update(localId,{}),Object.keys(fields));
 }
 else if(kind==='track'){
  if(!value.geometry?.points?.every(p=>p.space==='wgs84'))throw Error('Géométrie géographique requise.');
  const normalized=createTrackLibrary().createPrepared(pick(value,['name','description','category','difficulty','dogId','notes','source','provenance','fileName','geometry','copiedFrom']));payload=pick(normalized,['name','description','category','difficulty','dogId','notes','source','provenance','fileName','geometry','copiedFrom']);
 }
 else if(kind==='ops'){
  if(value.kind!=='operational'||!OPERATIONAL_MISSION_STATUSES.includes(value.status))throw Error('Dossier OPS invalide.');
  if(value.gpsTrack&&!validGpsPose(value.gpsTrack,'ops:'+localId,value.gpsOwnerId))throw Error('GPS OPS invalide.');
  payload=normalizeOperationalMission(pick(value,['id','kind','schemaVersion','entryMode','status','trackingState','dogId','dog','handler','createdAt','trackingStartedAt','trackingStoppedAt','trackingPausedMs','trackingPausedAt','trackingElapsedMs','details','person','time','places','context','olfactoryCorridor','trace','events','journal','gpsTrack','gpsOwnerId','pauseObservations','dogEvaluation','fieldEvaluation','finalization','weatherSnapshot','startedAt','fieldClosedAt','completedAt','archivedAt','lastKnownPoint','provenance','traceMetadata','dataQuality','environment','result','sourceDevice','gpxAttachment','weatherDemo','olfactoryCorridorEnabled']));payload.consultationOnly=true;payload.requiresExplicitResume=['active','paused','ready'].includes(value.trackingState);
 }
 else if(kind==='session-dog-link'){if(typeof value.sessionId!=='string'||!value.sessionId||typeof value.dogId!=='string'||!value.dogId)throw Error('Association invalide.');payload=pick(value,['sessionId','dogId']);}
 else throw Error('Domaine de sauvegarde inconnu.');
 const result={kind,localId,payload};if(new TextEncoder().encode(JSON.stringify(result)).byteLength+512>200000)throw Error('Dossier trop volumineux : original local conservé.');return result;
}
