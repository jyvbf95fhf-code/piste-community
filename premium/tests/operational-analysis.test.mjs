import test from 'node:test';
import assert from 'node:assert/strict';
import { operationalAnalysisProjection } from '../src/operational-data.mjs';
import { createOperationalMissionStore } from '../src/operational-missions.mjs';
import { operationalReplayView } from '../src/operational-views.mjs';

const dog={id:'nox',name:'Nox'};
const handler={id:'handler',name:'Sébastien'};

test('Départ rapide et mission préparée partagent exactement le contrat JUMOLF sans compléter les absences',()=>{
  const store=createOperationalMissionStore({idFactory:(()=>{let i=0;return()=>`ops-${++i}`;})(),clock:()=>1_800_000_000_000});
  const quick=store.createDraft({dog,handler,entryMode:'quick'});
  const prepared=store.createDraft({dog,handler,entryMode:'prepared',person:{ageRange:'adulte'},places:{interventionAddress:'Poste de commandement'}});
  const a=operationalAnalysisProjection(quick),b=operationalAnalysisProjection(prepared);
  assert.deepEqual(Object.keys(a),Object.keys(b));
  assert.equal(a.person.ageRange,null);
  assert.equal(a.places.interventionAddress,null);
  assert.equal(a.places.confirmedTrackStart,null);
  assert.equal(b.places.confirmedTrackStart,null);
  assert.equal(a.time.trackAgeAtStart,null);
  assert.deepEqual(a.trace,[]);
  assert.equal(a.weather,null);
});

test('la projection conserve lieu confirmé, pauses, provenance, évaluations, couloir et métadonnées sans interprétation',()=>{
  const store=createOperationalMissionStore({idFactory:()=> 'contract',clock:()=>1_800_000_000_000});
  let mission=store.createDraft({dog,handler,entryMode:'quick',places:{interventionAddress:'Gare',lastKnownDescription:'Parc',probableTrackStart:'Entrée nord'}});
  mission=store.startTracking(mission.id);
  mission=store.updateDetails(mission.id,{confirmedTrackStart:'Lisière confirmée'});
  store.pauseTracking(mission.id);
  mission=store.resumeTracking(mission.id);
  store.stopTracking(mission.id);
  store.setSourceDevice(mission.id,{manufacturer:'Garmin',deviceModel:'Fenix 8',sourceType:'external_gps',importType:'manual_metadata'});
  store.attachGpxDemo(mission.id,'gpx-pins');
  store.saveEvaluation(mission.id,{dog:{motivation:4,comment:'Concentré.'}});
  store.setCorridorEnabled(mission.id,true);
  mission=store.complete(mission.id);
  const projection=operationalAnalysisProjection(mission);
  assert.equal(projection.places.interventionAddress,'Gare');
  assert.equal(projection.places.lastKnownDescription,'Parc');
  assert.equal(projection.places.probableTrackStart,'Entrée nord');
  assert.equal(projection.places.confirmedTrackStart.description,'Lisière confirmée');
  assert.equal(projection.sourceDevice.manufacturer,'Garmin');
  assert.equal(projection.gpxAttachment.geometry,null);
  assert.equal(projection.gpxAttachment.metadata.importType,'mock_fixture');
  assert.equal(projection.dogEvaluation.motivation,4);
  assert.equal(projection.dogEvaluation.comment,'Concentré.');
  assert.equal(projection.pauses[0].classification,'manual_pause');
  assert.equal(projection.time.trackAgeAtStart,null);
  assert.equal(projection.corridor.label,'ESTIMÉ · simulation');
  assert.equal(projection.provenance.gpxAttachment,'fixture');
});

test('le replay affiche uniquement un départ confirmé et conserve les classifications de pause',()=>{
  const store=createOperationalMissionStore({idFactory:()=> 'replay-contract',clock:()=>1_800_000_000_000});
  const draft=store.createDraft({dog,handler,places:{interventionAddress:'Base',probableTrackStart:'Bois'}});
  store.start(draft.id);
  store.stopTracking(draft.id);
  const view=operationalReplayView(store.complete(draft.id));
  assert.equal(view.places.interventionAddress,'Base');
  assert.equal(view.places.probableTrackStart,'Bois');
  assert.equal(view.places.confirmedTrackStart,null);
  assert.deepEqual(view.pauseObservations,[]);
});

test('les événements ne reçoivent un âge de piste calculé que si une heure source existe',()=>{
  let now=1_800_000_000_000;
  let next=0;
  const store=createOperationalMissionStore({idFactory:()=> `event-age-${++next}`,clock:()=>now});
  const dated=store.createDraft({dog,handler,time:{disappearanceAt:new Date(now-3_600_000).toISOString()}});
  store.start(dated.id);
  const withAge=store.addEvent(dated.id,{type:'Indice'}).events[0];
  assert.equal(withAge.trackAge.totalMinutes,60);
  assert.equal(withAge.trackAge.source,'disappearanceAt');
  const undated=store.createDraft({dog,handler});
  store.start(undated.id);
  assert.equal(store.addEvent(undated.id,{type:'Indice'}).events[0].trackAge,null);
});
