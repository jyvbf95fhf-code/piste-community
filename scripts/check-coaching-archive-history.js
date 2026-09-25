const fs=require('fs'),assert=require('assert/strict');
const app=fs.readFileSync('app.js','utf8');
const spec=fs.readFileSync('docs/superpowers/specs/2026-09-21-v10-49-3-coaching-archives-history-pdf-design.md','utf8');
const plan=fs.readFileSync('docs/superpowers/plans/2026-09-21-v10-49-3-coaching-archives-history-pdf.md','utf8');
function source(name){const start=app.search(new RegExp(`(?:async )?function ${name}\\(`));assert(start>=0,`missing ${name}`);const rest=app.slice(start),next=rest.slice(1).search(/\n(?:async )?function \w+\(/);return next<0?rest:rest.slice(0,next+1)}
assert.match(spec,/coachingArchiveRouting/);assert.match(plan,/subagent-driven-development/);
const routing=source('coachingArchiveRouting');assert.match(routing,/mode:resumable\?'session':'archive'/);assert.match(routing,/waiting|live/);assert.match(routing,/coachingGlobalPhase/);
const opener=source('openLibraryItem');assert.match(opener,/coachingArchiveRouting/);assert.match(opener,/openMissionDossier\('coaching',id\)/);assert.match(opener,/openCoachingSession\(id\)/);
const list=source('renderCoachingSessions');assert.match(list,/openLibraryItem\('coaching',b\.dataset\.id\)/);
const sourceFn=source('reportActivitySource');for(const token of ["get_coaching_scenario_v10492","coaching_debrief_observations","scenarioPhotos","observations"] )assert.match(sourceFn,new RegExp(token));
const dossier=source('renderMissionDossier');assert.match(dossier,/SCÉNARIO/);assert.match(dossier,/bindScenarioPhotoViewer/);assert.match(dossier,/coachingArchiveRouting/);assert.doesNotMatch(dossier,/startCoachingPresence|startTraceurTracking/);
const report=source('missionReportModel');assert.match(report,/source\.scenario/);assert.match(report,/participant_observations/);assert.match(report,/buildProfessionalReportModel/);
assert.match(source('openMissionDossier'),/renderMissionDossier/);assert.match(source('renderMissionReport'),/buildProfessionalPdfBlob/);
for(const forbidden of ['create_coaching','set_coaching_pause','finish_coaching','startTraceurTracking'])assert(!routing.includes(forbidden),`archive routing invokes terrain: ${forbidden}`);
assert(!fs.readdirSync('.').some(name=>name.endsWith('.sql')&&name.includes('10.49.3')),'no SQL/backend archive migration');
console.log('Coaching archive/history guard: PASS');
