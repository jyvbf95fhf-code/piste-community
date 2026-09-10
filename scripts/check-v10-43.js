const fs=require('fs'),assert=require('assert/strict'),vm=require('vm'),{execFileSync}=require('child_process');
const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('v2.css','utf8');
function source(name){const start=app.search(new RegExp(`(?:async )?function ${name}\\(`));assert(start>=0,name);const rest=app.slice(start),next=rest.slice(1).search(/\n(?:async )?function \w+\(/);return next<0?rest:rest.slice(0,next+1)}
const baseline='69f7a51257376cedb7bcd7863e3af46fbc5148b7';
assert.equal(execFileSync('git',['rev-parse','stable-v10.42.3^{}'],{encoding:'utf8'}).trim(),baseline);
execFileSync('git',['merge-base','--is-ancestor',baseline,'HEAD']);
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length);
for(const tab of ['summary','map','timeline','analysis','debrief','report'])assert(html.includes(`data-mission-tab="${tab}"`));
for(const type of ['all','operational','training','coaching'])assert(html.includes(`data-library-filter="${type}"`));
for(const text of ['Toutes vos pistes, bien organisées.','Filtres avancés','missionSort','missionDog','missionSince','missionUntil'])assert(html.includes(text));
assert(source('openLibraryItem').includes('openMissionDossier(type,id)'));assert(app.includes("$('missionBack').onclick=()=>showPage('libraryPage')"));
assert(source('activityLibraryRows').includes('libraryTypeMeta(x._type).label'));assert(source('renderMissionMap').includes("['Tracé prévu',source.planned"));assert(source('renderMissionMap').includes("['Tracé Traceur',source.trace"));assert(source('renderMissionMap').includes("'Parcours Conducteur':'Trace GPS',source.actual"));
assert(!source('activityLibraryCard').includes('createPisteMap'));assert(source('setMissionTab').includes("tab==='map'&&missionSource"));assert(source('closeMissionDossier').includes('missionMap.remove()'));assert(source('openMissionDossier').includes('request!==missionLoadSequence'));
assert(source('missionReportModel').includes('driver_notes'));assert(!source('missionReportModel').includes('mergeReportDraft'));assert(source('renderMissionReport').includes('buildProfessionalPdfBlob(model)'));assert(source('renderMissionDossier').includes('Voir le rapport'));
assert(css.includes('overflow-x:auto'));assert(css.includes('max-width:420px'));assert(css.includes('orientation:landscape'));assert(source('renderMissionMap').includes('ResizeObserver'));
require('./verify-current-assets')();
assert(!source('activityLibraryCard').includes('library-track-preview'));
assert(source('activityLibraryCard').includes('libraryThumbnail(x)'));
assert(source('activityLibraryCard').includes('openLibraryItem'));
assert(source('activityLibraryCard').includes('library-actions-toggle'));
assert(html.includes('class="nav-folder-icon"'));
assert(fs.readFileSync('v2.js','utf8').includes('class="nav-folder-icon"'));
assert(css.includes('.library-thumbnail{width:54px;height:54px'));
// A single immutable palette drives Leaflet, thumbnails, CSS variables and PDF.
const palette=vm.runInNewContext(app.match(/^const TRACE_PALETTE=.*$/m)[0]+';TRACE_PALETTE');
assert.deepEqual({...palette},{planned:'#00D9FF',traceur:'#39FF14',conducteur:'#FF7A00',external:'#E600FF',markers:'#FFE600'});
assert(Object.isFrozen(palette));
for(const key of Object.keys(palette))assert(source('reportMapCanvas').includes(`TRACE_PALETTE.${key}`));
for(const name of ['renderCoachingMap','drawCoachingReplay','renderMissionMap'])for(const key of ['planned','traceur','conducteur'])assert(source(name).includes(`TRACE_PALETTE.${key}`),`${name}: ${key}`);
for(const name of ['renderOperationalLiveGpx','renderOperationalCallMap','renderOperationalGpxList']){assert(source(name).includes('TRACE_PALETTE.external'));assert(!source(name).includes('track.color'))}
assert(source('feedTrackPreview').includes('TRACE_PALETTE[layer]'));
assert(!css.includes('stroke:#168de2'));
for(const name of ['coachingDataVisibility','coachingCanSeeLiveOwner','coachingDriverTrail','saveCoachingDriverFeedback','savePendingFieldMarker','reportActivitySource']){
 const previous=execFileSync('git',['show','ee3ac12:app.js'],{encoding:'utf8'}),start=previous.search(new RegExp(`(?:async )?function ${name}\\(`)),rest=previous.slice(start),next=rest.slice(1).search(/\n(?:async )?function \w+\(/);
 assert.equal(source(name),next<0?rest:rest.slice(0,next+1),`${name}: business/security/data unchanged`);
}
const values={};const ctx=vm.createContext({Date,Set,Map,Number,String,Array,console,$:id=>({value:values[id]||''}),activityLibraryFilters:{status:'all'},libraryName:x=>x.name||'',formatExactDuration:ms=>`${ms} ms`,hasValue:v=>v!==null&&v!==undefined&&v!=='',esc:v=>String(v).replace(/</g,'&lt;'),LIVE_MARKERS:{note:{label:'Note'},loss:{label:'Perte'},recovery:{label:'Reprise'}},libraryRow:()=>({id:'s',planned_route:[{lat:1,lon:1}]}),TerrainBlackBox:{points:x=>Array.isArray(x)?x:[],analyse:()=>({}),facts:()=>[]}});
for(const name of ['missionDate','missionDateLabel','missionStatus','missionLibraryMatch','missionLibrarySort','missionTimeline','missionAge','missionDebriefHtml','missionPhotoUrl','missionReadRows','reportActivitySource'])vm.runInContext(source(name),ctx);
assert.equal(ctx.missionDate({}),null);assert.equal(ctx.missionDate({date:'bad'}),null);assert.equal(ctx.missionStatus({_type:'coaching',phase:'completed',status:'live'}),'En cours');assert.equal(ctx.missionStatus({_type:'coaching',status:'ended'}),'Terminé');
assert.equal(ctx.missionStatus({_type:'prepared'}),'Tracé préparé');assert.equal(ctx.missionStatus({_type:'operational',distance_km:2}),'Terminé');
values.missionDog='dog';assert(!ctx.missionLibraryMatch({dog_id:'other'}));values.missionDog='';values.missionSince='2026-09-01';assert(!ctx.missionLibraryMatch({date:'2025-01-01'}));assert(!ctx.missionLibraryMatch({}));values.missionSince='';values.missionSort='oldest';assert(ctx.missionLibrarySort({date:'2025-01-01'},{date:'2026-01-01'})<0);
const empty={row:{},type:'training',actual:[],trace:[],markers:[],debrief:null};assert.equal(ctx.missionTimeline(empty).length,0);assert.equal(ctx.missionAge(empty),null);assert(ctx.missionDebriefHtml(empty).includes('Aucune note'));
const s={...empty,type:'coaching',row:{created_at:'2026-09-01T10:00:00Z',driver_finished_at:'2026-09-01T11:00:00Z'},markers:[{type:'loss',created_at:'2026-09-01T10:30:00Z'}],debrief:{driver_notes:'<driver>',coach_notes:'coach'}};
assert.equal(ctx.missionTimeline(s).map(e=>e.title).join(','),'Création,Perte,Fin de parcours');const rendered=ctx.missionDebriefHtml(s);assert(rendered.includes('&lt;driver>'));assert(rendered.includes('Retour du Conducteur'));assert(rendered.includes('Analyse du Coach'));assert(!rendered.includes('<driver>'));
assert.equal(ctx.missionPhotoUrl('javascript:alert(1)'),null);assert.equal(ctx.missionPhotoUrl('data:image/svg+xml;base64,abcd'),null);
(async()=>{
 for(const mode of ['simple_blind','full_blind']){
  const calls=[];ctx.supabase={rpc:async(name,args)=>{calls.push(name);assert.equal(args.p_session_id,'s');return {data:[{id:'s',blind_mode:mode,planned_route:[],coaching_members:[{role:'driver',user_id:'d'},{role:'coach',user_id:'c'}]}]}},from:table=>{calls.push(table);const query={select:()=>query,eq:()=>query,order:()=>query,range:()=>query,maybeSingle:()=>query,then:resolve=>resolve({data:table==='coaching_live_points'?[{owner_id:'d',lat:2,lon:2},{owner_id:'c',lat:9,lon:9}]:table==='coaching_debriefs'?{driver_notes:'driver',coach_notes:'coach'}:[]})};return query}};
  const loaded=await ctx.reportActivitySource('coaching','s');assert.equal(calls[0],'get_my_coaching_sessions');assert.equal(loaded.planned.length,0,'No stale planned fallback');assert.equal(loaded.trace.length,0);assert.equal(loaded.actual.length,1,'Coach GPS must not become driver GPS');assert.equal(loaded.actual[0].owner_id,'d');assert.equal(loaded.debrief.driver_notes,'driver');assert.equal(loaded.debrief.coach_notes,'coach');
 }
 ctx.libraryRow=()=>({id:'ops',operational_call_id:'call',track:[{lat:1,lon:1}]});ctx.supabase.from=table=>{assert.equal(table,'operational_calls');const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{imported_tracks:[{name:'GPX',points:[{lat:2,lon:2}]}],markers:[]}})};return q};
 const ops=await ctx.reportActivitySource('operational','ops');assert.equal(ops.actual[0].lat,1);assert.equal(ops.gpx[0].points[0].lat,2);assert.equal(ops.planned.length,0);
 const offsets=[];ctx.supabase.from=()=>{let offset;const q={select:()=>q,eq:()=>q,order:()=>q,range:from=>{offset=from;offsets.push(from);return q},then:resolve=>resolve({data:Array.from({length:offset===0?1000:2},(_,i)=>({id:offset+i}))})};return q};
 const paged=await ctx.missionReadRows('coaching_live_points','s','recorded_at');assert.equal(paged.data.length,1002);assert.deepEqual(offsets,[0,1000]);
 ctx.supabase.rpc=async()=>({error:new Error('denied')});await assert.rejects(()=>ctx.reportActivitySource('coaching','s'),/denied/);
 const modified=execFileSync('git',['diff',baseline,'--name-only'],{encoding:'utf8'}).trim().split('\n');assert(!modified.some(p=>p.endsWith('.sql')||p.startsWith('supabase/functions/')),'SQL and Edge Functions unchanged');
 console.log('V10.43 A–Q OK : baseline, library, dossier, authorized layers, separate contributions, missing data, report, mobile structure and cache.');
})().catch(e=>{console.error(e);process.exitCode=1});
