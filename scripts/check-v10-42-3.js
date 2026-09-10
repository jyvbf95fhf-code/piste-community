const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
const sql=fs.readFileSync('PISTE_V10.42.3_PATCH/PISTE_V10.42.3_VISIBILITY_APPLY.sql','utf8'),dry=fs.readFileSync('PISTE_V10.42.3_PATCH/PISTE_V10.42.3_VISIBILITY_DRY_RUN.sql','utf8');
function source(name){const re=new RegExp(`^(?:async )?function ${name}\\(`,'m'),start=app.search(re);assert(start>=0,name);const rest=app.slice(start),next=rest.slice(1).search(/\n(?:async )?function /);return next<0?rest:rest.slice(0,next+1)}
const context={session:{user:{id:'seb'}},activeCoachingSession:null,$:()=>null,coachingAcceptedFriends:[],me:null};vm.createContext(context);
for(const name of ['validateCoachingMembers','coachingPhase','coachingBlindMode','myCoachingRole','coachingMemberCapabilities','coachingDataVisibility','coachingCanSeeLiveOwner','coachingDeparture','coachingExpectedActionV10423'])vm.runInContext(source(name),context);
const member=(user_id,role)=>({user_id,role,invitation_status:'accepted'}),A=[member('seb','coach'),member('xavier','traceur'),member('tim','driver'),member('melodie','observer')];
function check(label,run){run();console.log('✓ '+label)}
function view(mode,role,phase='driver_running'){return context.coachingDataVisibility({visibility_version:3,workflow_version:2,blind_mode:mode,phase,status:'live'},role)}
check('A créateur Coach, Traceur, Conducteur et Observateur',()=>assert(context.validateCoachingMembers(A).ok));
check('B créateur Traceur et Conducteur',()=>assert(context.validateCoachingMembers([member('seb','traceur'),member('tim','driver')]).ok));
check('C créateur Conducteur et Traceur',()=>assert(context.validateCoachingMembers([member('seb','driver'),member('xavier','traceur')]).ok));
for(const [label,rows] of [['D aucun Conducteur',A.filter(m=>m.role!=='driver')],['E aucun Traceur',A.filter(m=>m.role!=='traceur')],['F deux Conducteurs',[...A,member('autre','driver')]],['rôles incohérents',[member('seb','observer'),...A.slice(1)]],['deux Coachs',[...A,member('autre','coach')]],['personne dupliquée',[...A,member('tim','observer')]]])check(label+' refusé',()=>assert(!context.validateCoachingMembers(rows).ok));
check('G Observateurs non bloquants',()=>{assert(context.validateCoachingMembers([...A,...Array.from({length:12},(_,i)=>member('o'+i,'observer'))]).ok);for(const phase of ['preparation','laying'])assert.equal(context.coachingExpectedActionV10423({workflow_version:2,phase}),'Action attendue : Traceur');assert.equal(context.coachingExpectedActionV10423({workflow_version:2,phase:'waiting_ready'}),'Action attendue : Conducteur')});
check('H départ avant Piste tracée, indépendant du tracé complet',()=>{context.activeCoachingSession={phase:'preparation',departure_point:{lat:48,lon:7},planned_route:[]};assert.equal(context.coachingDeparture().lat,48);assert(sql.includes("'departure_point',case when me.invitation_status in ('accepted','active') then jsonb_build_object('lat',s.planned_route->0->'lat','lon',s.planned_route->0->'lon')"))});
check('I Conducteur aveugle : propre live sans piste',()=>{for(const mode of ['simple_blind','full_blind'])for(const phase of ['preparation','laying','waiting_ready','driver_running']){const v=view(mode,'driver',phase);assert(!v.planned&&!v.trace&&!v.markers&&v.live)}});
check('J simple aveugle Coach et Observateur consultent planned/trace/live',()=>{for(const role of ['coach','observer']){const v=view('simple_blind',role);assert(v.planned&&v.trace&&v.live)}});
check('K double aveugle Coach et Observateur : conducteur live, aucune vérité Traceur',()=>{for(const role of ['coach','observer']){const v=view('full_blind',role);assert(!v.planned&&!v.trace&&v.live);context.activeCoachingSession={visibility_version:3,workflow_version:2,blind_mode:'full_blind',phase:'driver_running',coaching_members:[member('seb',role),...A.slice(1)]};assert(!context.coachingCanSeeLiveOwner(context.activeCoachingSession,'xavier'));assert(context.coachingCanSeeLiveOwner(context.activeCoachingSession,'tim'))}});
check('L Traceur voit les trois couches, simple et double aveugle',()=>{for(const mode of ['simple_blind','full_blind']){const v=view(mode,'traceur');assert(v.planned&&v.trace&&v.live)}});
check('Normal et révélation après fin',()=>{for(const role of ['driver','coach','traceur','observer']){assert(view('normal',role).planned);for(const mode of ['simple_blind','full_blind'])assert(view(mode,role,'completed').planned)}});
check('M preview GPS sans trace/chrono/transition',()=>{const preview=source('requestCoachingPreviewLocation');assert(!/coaching_(live|trace)_points|coachingGpsReady\s*=|started_at\s*=|coachingTransition/.test(preview));assert(preview.includes('coachingPreviewPosition='));assert(source('shareCoachingCurrentPosition').includes('coaching_current_positions'));assert(sql.includes('primary key(session_id,owner_id)'))});
check('N/O Coach et Observateur ne démarrent pas de trace personnelle',()=>{const calls=[];const c={activeCoachingSession:{},coachingGpsRole:()=> 'coach',requestCoachingPreviewLocation:()=>calls.push('preview'),startCoachingPresence:()=>calls.push('trace'),startTraceurTracking:()=>calls.push('trace'),updateCoachingPrimaryActions:()=>{},requestCoachingOrientation:()=>{}};vm.createContext(c);vm.runInContext(source('startCoachingGpsTracking'),c);c.startCoachingGpsTracking();assert.deepEqual(calls,['preview']);assert(source('startCoachingPresence').includes("!['driver','solo'].includes(coachingGpsRole())"));assert(source('requestCoachingPreviewLocation').includes("myCoachingRole(activeCoachingSession)==='observer'"));assert(sql.includes("not p_trace and m.role='driver' and s.phase='driver_running'"))});
check('Q participants uniques par user_id, aucun duo imposé',()=>{assert(source('updateCoachingParticipants').includes('unique.has(m.user_id)'));assert(source('createCoaching').includes('create_coaching_people_session'));assert(!app.includes('coachingWorkMode'));assert(!html.includes('data-coaching-work-mode'));assert(html.includes('coachingCreatorRole'))});
check('R legacy duo/team toujours consultables, capabilities sans autorité',()=>{for(const work_mode of ['duo','team']){const s={work_mode,workflow_version:2,blind_mode:'full_blind',phase:'driver_running',laying_mode:'traceur'};assert(!context.coachingDataVisibility(s,'driver').planned);assert.deepEqual(Array.from(context.coachingMemberCapabilities({...member('tim','driver'),capabilities:['coach','trace']},s)),['drive'])}assert(sql.includes('r.visibility_version is distinct from 3 then return private.legacy_'));assert(!/update public\.coaching_sessions set work_mode/.test(sql))});
check('S serveur : RLS, memberships, réponses RPC filtrées, DRY/APPLY non exécutés',()=>{assert(sql.includes("me.invitation_status not in ('accepted','active')"));assert(sql.includes("subject_role in ('driver','coach')"));assert(sql.includes('return jsonb_populate_record(null::public.coaching_sessions,public.get_my_coaching_sessions(r.id)->0)'));assert(sql.includes('SELECT global interdit'));assert(sql.includes('RLS obligatoire'));assert(!sql.includes("'coach'=any(caps)"));assert.equal(dry.replace(/rollback;\s*$/,'').trim(),sql.replace(/commit;\s*$/,'').trim());assert(!/\.rpc\(['"](?:execute_sql|apply_migration)/.test(app))});
check('cache et version applicative',()=>{require('./verify-current-assets')()});
check('Workflow principal : Je pars tracer → Piste tracée, Démarrer → Fin de parcours → Terminer la piste',()=>{
 assert(html.includes('>Je pars tracer</button>'));assert(source('applyV1040RoleSurface').includes("'Je pars tracer'"));
 assert(!/Je démarre la piste|Je prépare la piste/.test(app+html));
 assert(!app.includes('vous pouvez terminer la session'));assert(!app.includes('Vous pouvez terminer la session'));
 const secondary=html.slice(html.indexOf('data-coaching-panel="session"'),html.indexOf('id="coachingDebriefStage"'));
 assert(secondary.includes('id="terrainFinishBtn"'));assert(secondary.includes('Clôture de secours — maintenir 2 secondes'));
 assert(!html.slice(html.indexOf('id="coachingTerrainCommandBar"'),html.indexOf('id="coachingPrimaryActions"')).includes('terrainFinishBtn'));
});
check('Commandes par rôle : Terminer la piste réservé au Conducteur après le parcours',()=>{
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',classList:{hidden:false,add(){this.hidden=true},remove(){this.hidden=false},toggle(name,value){this.hidden=value}}});return nodes.get(id)};
 const c={activeCoachingSession:null,$:node,coachingGpsRole:s=>s.role,coachingPhase:s=>s.phase,isCoachingOwner:s=>s.owner,isCurrentUserLayingActor:s=>s.role==='traceur',setUiText:(id,text)=>node(id).textContent=text,updateCoachingDebriefAccess(){},renderCoachingScenario(){},coachingRoleLabel:r=>r,coachingPhaseLabelV1040:s=>s.phase,esc:s=>s,coachingParticipantName:m=>m.display_name,coachingDriverTrackPending:s=>s.role==='driver'&&s.phase==='completed'};
 vm.createContext(c);for(const name of ['coachingPhaseLabel','updateCoachingPhase','updateCoachingWorkflowNotice','applyV1040RoleSurface'])vm.runInContext(source(name),c);
 for(const [role,phase,button] of [['traceur','preparation','startLayingBtn'],['traceur','laying','trackReadyBtn'],['driver','waiting_ready','driverStartBtn'],['driver','driver_running','driverFinishBtn']]){
  c.activeCoachingSession={role,phase,workflow_version:2,status:'live',owner:false};c.applyV1040RoleSurface();assert(!node(button).classList.hidden);assert(node('terrainFinishBtn').classList.hidden);
 }
 c.activeCoachingSession={role:'driver',phase:'laying',workflow_version:2,status:'live',coaching_members:[{role:'traceur',display_name:'Xavier'}]};c.applyV1040RoleSurface();assert.equal(node('coachingRoleInstruction').textContent,'Xavier trace actuellement la piste');assert(node('coachingRoleInstruction').className.includes('coaching-workflow-banner'));
 c.activeCoachingSession.phase='waiting_ready';c.applyV1040RoleSurface();assert.equal(node('coachingRoleInstruction').textContent,'Piste tracée — vous pouvez démarrer au point de départ');assert(node('coachingRoleInstruction').className.includes('coaching-workflow-banner'));
 for(const role of ['driver','traceur','coach','observer']){
  c.activeCoachingSession={role,phase:'completed',workflow_version:2,status:'live',owner:role==='coach'};c.applyV1040RoleSurface();
  for(const id of ['driverStartBtn','driverFinishBtn','startLayingBtn','trackReadyBtn','endCoachingLive'])assert(node(id).classList.hidden);
  assert.equal(node('coachingRoleInstruction').textContent,'');assert(node('coachingRoleInstruction').className.includes('hidden'));assert.equal(node('coachingPhase').innerHTML,`PARCOURS TERMINÉ<small>${role==='driver'?'GPS et chrono arrêtés':'Débrief disponible'}</small>`);assert.equal(node('coachingDriverTrackFinish').classList.hidden,role!=='driver');
  assert.equal(node('terrainFinishBtn').classList.hidden,role!=='coach');
 }
});
check('Chrono terrain figé sur l’heure de fin du passage',()=>{
 const el={innerHTML:''},s={driver_started_at:'2026-09-08T12:00:00Z',driver_finished_at:'2026-09-08T12:05:00Z'},c={activeCoachingSession:s,$:id=>id==='coachingTerrainStatus'?el:null,coachingPreviewPosition:null,coachingOwnPosition:null,myCoachingRole:()=> 'driver',isCoachingGpsTracking:()=>false,formatExactDuration:ms=>String(ms),coachingTerrainPaused:false,TerrainEngine:{ageMs:()=>0}};
 vm.createContext(c);vm.runInContext(source('updateCoachingTerrainStatus'),c);c.updateCoachingTerrainStatus();assert(el.innerHTML.includes('Terminé 300000'));
});
check('Clôture de secours : appui court annulé, appui long de 2 s, créateur uniquement',()=>{
 let now=0,tick,finishes=0;const c={activeCoachingSession:{status:'live',workflow_version:2,phase:'completed'},coachingFinishArmed:false,coachingFinishTimer:null,Date:{now:()=>now},isCoachingOwner:()=>true,coachingPhase:s=>s.phase,$:()=>({classList:{add(){},remove(){}},style:{setProperty(){},removeProperty(){}}}),setInterval:fn=>(tick=fn,1),clearInterval:()=>{tick=null},finishCoachingSessionV1040:()=>finishes++,finishActiveCoaching:()=>{throw Error('legacy')}};
 vm.createContext(c);for(const name of ['finishHoldStart','finishHoldCancel'])vm.runInContext(source(name),c);
 c.finishHoldStart();now=1999;tick();assert.equal(finishes,0);c.finishHoldCancel();assert.equal(tick,null);
 c.finishHoldStart();now+=2000;tick();assert.equal(finishes,1);
 c.isCoachingOwner=()=>false;c.finishHoldStart();assert.equal(tick,null);
 assert(app.includes("bindClick('terrainFinishBtn',e=>e.preventDefault())"));
});
check('Terminer la piste visible hors Plus ; Enregistrer ma piste sans ancien libellé',()=>{
 const start=html.indexOf('id="coachingDriverTrackFinish"');assert(start>0&&start<html.indexOf('id="coachingPrimaryActions"'));assert(!html.slice(html.indexOf('data-coaching-panel="session"'),html.indexOf('id="coachingDebriefStage"')).includes('id="coachingDriverTrackFinish"'));
 assert(html.includes('Terminer la piste<small>Maintenir 2 secondes'));assert(html.includes('Enregistrer ma piste'));assert(!html.includes('Enregistrer mon retour'));assert(!/Remplir à mon retour/i.test(app+html+fs.readFileSync('v2.js','utf8')));
 assert(source('setupCoachingDriverTrackFinish').includes("'pointercancel'"));assert(source('setupCoachingDriverTrackFinish').includes("'visibilitychange'"));
});
check('Clôture SQL ciblée : Conducteur actif V3, phase completed, idempotence et données conservées',()=>{
 const apply=fs.readFileSync('PISTE_V10.42.3_PATCH/PISTE_V10.42.3_DRIVER_CLOSE_APPLY.sql','utf8'),dryClose=fs.readFileSync('PISTE_V10.42.3_PATCH/PISTE_V10.42.3_DRIVER_CLOSE_DRY_RUN.sql','utf8');
 assert.equal(apply.replace(/commit;\s*$/,''),dryClose.replace(/rollback;\s*$/,''));
 for(const part of ["if uid is null","for update","r.owner_id is distinct from uid","r.visibility_version is distinct from 3","role='driver'","invitation_status in ('accepted','active') for share","r.phase is distinct from 'completed'","if r.status='ended' then return true","r.status is distinct from 'live'","ended_at=coalesce(ended_at,now())","select private.finish_coaching_session(p_session_id)"])assert(apply.includes(part),part);
 assert(apply.indexOf("r.owner_id is distinct from uid")<apply.indexOf("if r.status='ended'"));
 assert(!/delete\s+from|update public\.coaching_(debriefs|live_points|trace_points)|(?:create|alter|drop) policy|disable row level security/i.test(apply));
 assert.equal((apply.match(/update public\.coaching_sessions/g)||[]).length,1);
});
check('Accueil unifié et Créateur de tracé séparé',()=>{
 const v2=fs.readFileSync('v2.js','utf8');assert(html.includes('ENTRAÎNEMENT &amp; COACHING'));assert(v2.includes('ENTRAÎNEMENT & COACHING'));assert(html.includes('Travailler seul ou avec une équipe'));assert(v2.includes('Travailler seul ou avec une équipe'));assert(html.includes('<b>CRÉATEUR DE TRACÉ</b>'));assert(v2.includes("textContent='CRÉATEUR DE TRACÉ'"));
 const calls=[],c={showPage:p=>calls.push(p),setCoachingStage:s=>calls.push(s)};vm.createContext(c);vm.runInContext(source('openUnifiedCoachingHome'),c);c.openUnifiedCoachingHome();assert.deepEqual(calls,['coachingPage','prepare']);assert.equal((app.match(/\$\('openTerrainHomeBtn'\)\.onclick=openUnifiedCoachingHome/g)||[]).length,2);assert(app.includes("openTerrainPlanner('library')"));
});
(async()=>{
 for(const owner of [true,false])for(const work_mode of ['duo','team',undefined])for(const fail of [false,true]){
  const calls=[],row={id:'s',owner_id:owner?'seb':'other',work_mode,role:owner?'driver':'coach',capabilities:['coach']},c={session:{user:{id:'seb'}},coachingSessions:[row],confirm:()=>true,alert:()=>calls.push('error'),clearVerifiedActiveCoaching:()=>{},renderCoachingSessions:()=>calls.push('render'),loadCoachingHub:async()=>calls.push('refresh'),supabase:{from:table=>{calls.push(table);const chain={delete(){calls.push('delete');return chain},eq(key,value){calls.push([key,value]);return chain},then(resolve){return Promise.resolve({error:fail?{message:'denied'}:null}).then(resolve)}};return chain}}};
  vm.createContext(c);for(const name of ['isCoachingOwner','removeCoachingSessionFromList'])vm.runInContext(source(name),c);await c.removeCoachingSessionFromList('s',!owner);
  assert.equal(calls[0],owner?'coaching_sessions':'coaching_members');assert.deepEqual(calls[2],[owner?'id':'session_id','s']);assert.deepEqual(calls[3],[owner?'owner_id':'user_id','seb']);
  assert.deepEqual(calls.slice(4),fail?['error']:['render','refresh']);assert.equal(c.coachingSessions.length,fail?1:0);
 }
 assert(source('renderCoachingSessions').includes("owner?'Supprimer':'Retirer'"));console.log('✓ Legacy : owner Supprimer, participant Retirer ; membership personnel, refresh immédiat, erreur conservée');
 for(const success of [true,false]){
  let now=0,tick;const calls=[],storage=new Map(),c={session:{user:{id:'seb'}},activeCoachingSession:{id:'s',role:'driver',phase:'driver_running'},coachingDriverTrackConfirmedKey:'',coachingDriverTrackHoldTimer:null,coachingSessionEndHandledId:null,localStorage:{getItem:key=>storage.get(key),setItem:(key,val)=>storage.set(key,val)},Date:{now:()=>now},setInterval:fn=>(tick=fn,1),clearInterval:()=>{tick=null},coachingPhase:s=>s.phase,myCoachingRole:s=>s.role,$:()=>null,stopCoachingPresence:()=>calls.push('stopGPS'),stopTraceurTracking:()=>{},stopCoachingV1040MetricsTimer:()=>calls.push('stopClock'),clearCoachingRealtime:()=>{},closeFakeLock:async()=>{},updateCoachingPhase:()=>{},updateCoachingPrimaryActions:()=>{},updateCoachingDebriefAccess:()=>{},setCoachingStage:stage=>calls.push(stage),updateCoachingTerrainStatus:()=>{},clearVerifiedActiveCoaching:()=>{},refreshCoachingMapLayout:()=>{},setUiText:()=>{},calculateCoachingDebrief:async()=>calls.push('metrics'),loadSavedCoachingDebrief:async()=>calls.push('load'),coachingTransitionV1040:async rpc=>{calls.push(rpc);if(success)Object.assign(c.activeCoachingSession,{phase:'completed',driver_finished_at:'2026-09-08T12:00:00Z'});return success}};
  vm.createContext(c);for(const name of ['coachingDriverTrackKey','coachingDriverTrackPending','showCoachingDriverTrackFinish','openCoachingDebriefOnce','finishDriverRun','cancelCoachingDriverTrackHold','startCoachingDriverTrackHold'])vm.runInContext(source(name),c);
  assert.equal(await c.finishDriverRun(),success);
  if(!success){assert.deepEqual(calls,['finish_driver_run']);continue}
  assert.deepEqual(calls,['finish_driver_run','stopGPS','stopClock','finish']);assert(c.coachingDriverTrackPending());assert.equal(c.activeCoachingSession.driver_finished_at,'2026-09-08T12:00:00Z');
  c.startCoachingDriverTrackHold();now=1999;tick();assert(!calls.includes('debrief'));c.cancelCoachingDriverTrackHold();assert.equal(tick,null);assert(c.coachingDriverTrackPending());
  c.startCoachingDriverTrackHold({type:'keydown',key:'Enter',repeat:true});assert.equal(tick,null);
  c.startCoachingDriverTrackHold();now+=2000;tick();await new Promise(resolve=>setImmediate(resolve));
  assert(!c.coachingDriverTrackPending());assert.equal(calls.filter(x=>x==='debrief').length,1);assert(calls.includes('load'));
  c.coachingDriverTrackConfirmedKey='';assert(!c.coachingDriverTrackPending()); // Confirmation conservée après rechargement.
  c.session.user.id='other';assert(c.coachingDriverTrackPending()); // Jamais partagée entre utilisateurs.
  c.startCoachingDriverTrackHold();c.activeCoachingSession.id='another';now+=2000;tick();assert.equal(tick,null);assert(c.coachingDriverTrackPending());
 }
 {
  const seen=[],c={activeCoachingSession:{id:'s',status:'live'},coachingDriverTrackPending:()=>true,$:id=>({classList:{toggle:(name,value)=>seen.push([id,name,value]),add(){},remove(){}}}),document:{querySelectorAll:()=>[]},setTimeout(){},startCoachingV1040MetricsTimer:()=>{throw Error('GPS clock resumed')},stopCoachingV1040MetricsTimer:()=>{},calculateCoachingDebrief:()=>{throw Error('debrief before hold')}};
  vm.createContext(c);vm.runInContext(source('setCoachingStage'),c);c.setCoachingStage('debrief');assert(seen.some(([id,name,value])=>id==='coachingDebriefStage'&&name==='stage-hidden'&&value));assert(seen.some(([id,name,value])=>id==='coachingDriverTrackFinish'&&name==='hidden'&&!value));
 }
 for(const failure of ['none','save','close','read','still-live']){
  const calls=[],button={disabled:false},form={notes:'Mon parcours',querySelector:()=>button},server={id:'s',owner_id:'coach',phase:'completed',status:'live',ended_at:null,planned_route:[{lat:48,lon:7}]},debrief={coach_notes:'Analyse conservée'},trace=[{lat:48,lon:7}];let release,mode=failure;
  const gate=new Promise(resolve=>release=resolve),c={coachingSessions:[{...server}],coachingDriverFeedbackSaving:false,activeCoachingSession:{...server},session:{user:{id:'seb'}},$:id=>id==='coachingDriverFeedbackForm'?form:{value:''},hasCoachingCapability:()=>true,coachingPhase:s=>s.phase,coachingDriverTrackPending:()=>false,FormData:class{get(){return form.notes}},supabase:{from:table=>({upsert:async(payload,options)=>{calls.push({table,payload,options});await gate;if(mode==='save')return {error:{message:'offline'}};debrief.driver_notes=payload.driver_notes;return {error:null}}}),rpc:async(name,args)=>{
   calls.push(name);assert.equal(args.p_session_id,'s');
   if(name==='finish_coaching_session'){if(mode==='close')return {error:{message:'clôture refusée'}};if(mode!=='still-live'){server.status='ended';server.ended_at=server.ended_at||'2026-09-08T16:00:00Z'}return {data:true}}
   assert.equal(name,'get_my_coaching_sessions');if(mode==='read')return {error:{message:'lecture indisponible'}};return {data:[{...server}]};
  }},setUiText:(id,text)=>calls.push(text),clearVerifiedActiveCoaching:()=>calls.push('clearActive'),clearCoachingRealtime:()=>{},activityLibraryFilters:{},showPage:page=>calls.push(page),coachingToast:text=>calls.push(text),alert:text=>calls.push(text)};
  vm.createContext(c);for(const name of ['finalizeSavedCoachingSession','saveCoachingDriverFeedback'])vm.runInContext(source(name),c);
  const first=c.saveCoachingDriverFeedback();assert(button.disabled);assert.equal(await c.saveCoachingDriverFeedback(),false);release();assert.equal(await first,failure==='none');assert(!button.disabled);
  assert.equal(calls.filter(x=>x?.table).length,1);assert.equal(calls[0].table,'coaching_debriefs');assert.equal(calls[0].options.onConflict,'session_id');assert.equal(calls.includes('libraryPage'),failure==='none');assert.equal(calls.includes('clearActive'),failure==='none');assert.equal(form.notes,'Mon parcours');assert.equal(debrief.coach_notes,'Analyse conservée');assert.deepEqual(trace,[{lat:48,lon:7}]);
  if(failure==='save')assert(!calls.includes('finish_coaching_session'));
  if(failure!=='none'){assert.equal(c.activeCoachingSession.id,'s');assert.equal(c.coachingSessions[0].status,'live');mode='none';assert.equal(await c.saveCoachingDriverFeedback(),true)}
  assert.equal(c.activeCoachingSession,null);assert.equal(c.coachingSessions[0].status,'ended');assert.equal(c.coachingSessions[0].phase,'completed');assert.equal(debrief.driver_notes,'Mon parcours');
  // Une réouverture alimentée par le serveur ne trouve plus cette session active.
  const h={session:c.session,activeCoachingSession:null,coachingSessions:[],verifiedActiveCoachingSession:{id:'s',status:'live'},coachingShortcutValidated:false,updateHomeCoachingState(){},refreshActiveSessionShortcut(){},loadTrainingRoutes:async()=>{},$:()=>null,renderCoachingFriendInvites(){},readActiveCoachingRef:()=>({id:'s'}),clearActiveCoachingRef:()=>calls.push('clearStoredResume'),saveActiveCoachingRef:()=>{throw Error('Reprise recréée pour une session terminée')},renderCoachingSessions(){},supabase:{rpc:async name=>({data:name==='get_friends'?[]:[{...server}]}),from:()=>({select(){return this},eq:async()=>({data:[]})})}};
  vm.createContext(h);vm.runInContext(source('loadCoachingHub'),h);await h.loadCoachingHub();assert.equal(h.verifiedActiveCoachingSession,null);assert.equal(h.coachingSessions[0].status,'ended');assert(calls.includes('clearStoredResume'));
  const ended=server.ended_at;await c.finalizeSavedCoachingSession('s');assert.equal(server.ended_at,ended);
 }
 console.log('✓ Conducteur : GPS/chrono figés, maintien 2 s puis débrief ; sauvegarde puis clôture serveur vérifiée, reprise idempotente après erreur, aucune session active');
 for(const [rpc,phase,next] of [['start_coaching_laying','preparation','laying'],['mark_coaching_track_ready','laying','waiting_ready'],['start_driver_run','waiting_ready','driver_running'],['finish_driver_run','driver_running','completed']]){
  let count=0,release;const gate=new Promise(resolve=>release=resolve),c={session:{user:{id:'seb'}},activeCoachingSession:{id:'s',phase},coachingV10423TransitionInFlight:false,coachingPhase:s=>s.phase,supabase:{rpc:async()=>{count++;await gate;return {data:true}}},refreshActiveCoachingSession:async()=>{c.activeCoachingSession.phase=next},updateCoachingPhase:()=>{},updateCoachingPreparationDetails:()=>{},updateCoachingPrimaryActions:()=>{},applyV1040RoleSurface:()=>{},renderCoachingMap:async()=>{},coachingToast:()=>{}};
  vm.createContext(c);vm.runInContext(source('coachingTransitionV1040'),c);const first=c.coachingTransitionV1040(rpc);assert.equal(await c.coachingTransitionV1040(rpc),false);release();assert.equal(await first,true);assert.equal(await c.coachingTransitionV1040(rpc),false);assert.equal(count,1);
 }
 console.log('✓ P double tap : une seule RPC pour chacune des quatre transitions');
 console.log('V10.42.3 — A–S OK (tests locaux ; SQL jamais exécuté)');
})().catch(e=>{console.error(e);process.exitCode=1});
