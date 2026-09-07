#!/usr/bin/env python3
from pathlib import Path
import argparse, sys
ROOT=Path.cwd()
def die(msg): print('V10.42.3:',msg,file=sys.stderr); raise SystemExit(2)
def load(name):
 p=ROOT/name
 if not p.exists(): die(f'{name} absent')
 return p.read_text(encoding='utf-8')
def one(text,old,new,label):
 n=text.count(old)
 if n!=1: die(f'ancre {label}: attendue 1 fois, trouvée {n}')
 return text.replace(old,new,1)
def check():
 app=load('app.js'); html=load('index.html'); sw=load('sw.js')
 anchors=[('version',"const APP_VERSION='10.42.2';" in app),('role','function coachingRoleLabel(role)' in app),('create','async function createCoaching()' in app),('participants','function updateCoachingParticipants(groups,trace)' in app),('debrief','function updateCoachingDebriefAccess()' in app),('home',"$('openTerrainHomeBtn').onclick=e=>{e.preventDefault();selectedTrainingRoute=null;beginNewPiste('training')};" in app),('html','<section id="coachingPage" class="page">' in html),('cache',"const C='piste-community-v2100';" in sw)]
 bad=[k for k,v in anchors if not v]
 if bad: die('base incompatible: '+', '.join(bad))
 print('V10.42.3 CHECK OK — base V10.42.2 reconnue')
HELPERS="""
const COACHING_CAPABILITY_LABELS=Object.freeze({trace:'Traceur',drive:'Conducteur',coach:'Coach',observe:'Observateur'});
function coachingMemberCapabilities(member,s=activeCoachingSession){
 const c=Array.isArray(member?.capabilities)?member.capabilities.filter(Boolean):[];
 if(c.length)return [...new Set(c)];
 if(member?.role==='solo')return ['drive','coach'];
 if(member?.role==='driver')return s?.work_mode==='duo'?['drive','coach']:['drive'];
 if(member?.role==='traceur')return ['trace'];
 if(member?.role==='coach')return s?.work_mode==='duo'&&member?.user_id===s?.owner_id?['trace']:['coach'];
 return ['observe'];
}
function coachingCapabilityLabel(member,s=activeCoachingSession){return coachingMemberCapabilities(member,s).map(x=>COACHING_CAPABILITY_LABELS[x]).filter(Boolean).join(' • ')||coachingRoleLabel(member?.role)}
function hasCoachingCapability(cap,s=activeCoachingSession,userId=session?.user?.id){const m=s?.coaching_members?.find(x=>x.user_id===userId);return coachingMemberCapabilities(m,s).includes(cap)}
function myCoachingMember(s=activeCoachingSession){return s?.coaching_members?.find(x=>x.user_id===session?.user?.id)||null}
function setCoachingWorkMode(mode){
 if(!['solo','duo','team'].includes(mode))mode='team';coachingWorkMode=mode;
 document.querySelectorAll('[data-coaching-work-mode]').forEach(b=>b.classList.toggle('active',b.dataset.coachingWorkMode===mode));
 const h=$('coachingWorkModeHelp');if(h)h.textContent=mode==='solo'?'Entraînement classique : vous travaillez seul avec votre chien.':mode==='duo'?'2 personnes : Traceur + Conducteur • Coach.':'Traceur + Conducteur + Coach, Observateurs facultatifs.';
 const invites=$('coachingFriendInvites')?.closest('.coaching-invites');if(invites)invites.classList.toggle('hidden',mode==='solo');
 const vis=$('coachingVisibility')?.closest('label');if(vis)vis.classList.toggle('hidden',mode==='solo');
 const laying=$('coachingLayingMode')?.closest('label');if(laying)laying.classList.toggle('hidden',mode!=='team');
 if(mode==='solo')coachingFriendInvites=[];
 if(mode==='duo'){coachingFriendInvites=coachingFriendInvites.slice(0,1);if(coachingFriendInvites[0])coachingFriendInvites[0].role='driver';if($('coachingLayingMode'))$('coachingLayingMode').value='coach'}
 renderCoachingFriendInvites();renderCoachingTeamSummaryV10423();
}
function validateCoachingConfigurationV10423(){
 if(coachingWorkMode==='solo')return {ok:true};
 if(coachingWorkMode==='duo')return coachingFriendInvites.length===1?{ok:true}:{ok:false,message:'À deux : ajoutez exactement une personne. Elle sera Conducteur • Coach.'};
 const roles=coachingFriendInvites.map(x=>x.role);
 if(roles.filter(x=>x==='driver').length!==1)return {ok:false,message:'En équipe : il faut exactement un Conducteur.'};
 if(roles.filter(x=>x==='traceur').length!==1)return {ok:false,message:'En équipe : il faut exactement un Traceur.'};
 return {ok:true};
}
function renderCoachingTeamSummaryV10423(){
 const el=$('coachingTeamSummary');if(!el)return;
 if(coachingWorkMode==='solo'){el.innerHTML='<b>Seul</b><span>Vous • Conducteur • Coach</span>';return}
 const rows=[coachingWorkMode==='duo'?'<span>Vous • Traceur</span>':'<span>Vous • Coach</span>'];
 for(const i of coachingFriendInvites){const f=coachingAcceptedFriends.find(x=>x.user_id===i.user_id);rows.push(`<span>${esc(f?.display_name||'Participant')} • ${esc(coachingWorkMode==='duo'?'Conducteur • Coach':coachingRoleLabel(i.role))}</span>`)}
 el.innerHTML=`<b>${coachingWorkMode==='duo'?'À deux':'En équipe'}</b>${rows.join('')}`;
}
function coachingExpectedActionV10423(s=activeCoachingSession){
 if(!s)return 'Action attendue : —';const p=coachingPhase(s),m=s.work_mode||'legacy';
 if(p==='laying')return 'Action attendue : Traceur';
 if(['track_ready','coach_ready','waiting_driver'].includes(p))return `Action attendue : ${m==='duo'?'Conducteur • Coach':'Conducteur'}`;
 if(['driver_active','active'].includes(p))return 'Action attendue : Conducteur';
 if(p==='completed')return `Action attendue : ${m==='duo'?'Conducteur • Coach':'Coach'}`;
 return 'Action attendue : Organisateur';
}
function markCoachingSyncV10423(){coachingLastServerSyncAt=Date.now();renderCoachingReliabilityV10423()}
function renderCoachingReliabilityV10423(){
 const bar=$('coachingReliabilityBar'),sync=$('coachingSyncState'),act=$('coachingExpectedAction');if(!bar)return;
 bar.classList.toggle('hidden',!activeCoachingSession);if(!activeCoachingSession)return;
 if(act)act.textContent=coachingExpectedActionV10423(activeCoachingSession);
 if(sync){if(!navigator.onLine)sync.textContent='Synchronisation : hors ligne';else if(!coachingLastServerSyncAt)sync.textContent='Synchronisation : en attente';else{const a=Math.round((Date.now()-coachingLastServerSyncAt)/1000);sync.textContent=a<=12?'Synchronisé':a<=45?`Dernière synchro il y a ${a} s`:'Connexion à vérifier'}}
}
function coachingParticipantStateV10423(member,last){
 if(member?.invitation_status==='invited')return 'Invité';if(member?.invitation_status==='declined')return 'Refusé';
 if(!last)return ['accepted','active'].includes(member?.invitation_status)?'Accepté • hors ligne':'En attente';
 const age=Date.now()-new Date(last.recorded_at).getTime();return age<20000?'Connecté • GPS actif':age<90000?'Connecté récemment':'Hors ligne';
}
async function resumeCoachingV10423(){
 if(coachingV10423ResumeInFlight||!session?.user?.id)return false;const saved=readActiveCoachingRef?.();if(!saved?.id)return false;
 coachingV10423ResumeInFlight=true;try{const {data,error}=await supabase.rpc('get_my_coaching_sessions',{p_session_id:saved.id});const s=!error&&Array.isArray(data)?data[0]:null;if(!s||['ended','cancelled'].includes(s.status)){clearVerifiedActiveCoaching(saved.id);return false}activeCoachingSession=s;verifiedActiveCoachingSession=s;markCoachingSyncV10423();showPage('coachingPage');return openCoachingSession(s.id)}catch{return false}finally{coachingV10423ResumeInFlight=false}
}
"""
def patch_html(t):
 t=one(t,'<link rel="stylesheet" href="./v2.css?v=2067">','<link rel="stylesheet" href="./v2.css?v=2068">','css')
 t=one(t,'<div class="record-head"><button class="back" data-page="homePage">‹ Accueil</button><h2>🎧 Coaching</h2></div>','<div class="record-head"><button class="back" data-page="homePage">‹ Accueil</button><h2>🐾 Entraînement & Coaching</h2></div>','titre')
 old='<div class="card"><small class="section-kicker">PRÉPARER</small><h3>Créer une session</h3><label>Mode de visibilité<select id="coachingVisibility">'
 new='''<div class="card"><small class="section-kicker">PRÉPARER</small><h3>Créer une session</h3><div class="coaching-work-mode-card"><span class="small muted">Comment souhaitez-vous travailler ?</span><div class="coaching-work-mode" role="group" aria-label="Mode de travail"><button type="button" data-coaching-work-mode="solo">Seul</button><button type="button" data-coaching-work-mode="duo">À deux</button><button type="button" data-coaching-work-mode="team" class="active">En équipe</button></div><p id="coachingWorkModeHelp" class="small muted"></p></div><div id="coachingTeamSummary" class="coaching-team-summary" aria-live="polite"></div><label>Mode de visibilité<select id="coachingVisibility">'''
 t=one(t,old,new,'mode travail')
 t=one(t,'<div id="coachingLivePanel"','<div id="coachingReliabilityBar" class="coaching-reliability-bar hidden" aria-live="polite"><strong id="coachingExpectedAction">Action attendue : —</strong><span id="coachingSyncState">Synchronisation : —</span></div><div id="coachingLivePanel"','fiabilite')
 t=one(t,'<script type="module" src="./app.js?v=1042-12"></script>','<script type="module" src="./app.js?v=1042-13"></script>','app cache')
 return t
def patch_app(t):
 t=one(t,"const APP_VERSION='10.42.2';","const APP_VERSION='10.42.3';",'version')
 t=one(t,"const APP_RELEASE_NOTES=Object.freeze([\n","const APP_RELEASE_NOTES=Object.freeze([\n {version:'10.42.3',date:'07/09/2026',title:'Nouveautés V10.42.3',items:['Entraînement et Coaching réunis autour des modes Seul, À deux et En équipe.','Participants affichés comme des personnes uniques avec leurs fonctions réelles.','Résumé d’équipe, action attendue, synchronisation et reprise renforcées.'],important:['En mode aveugle, une fonction Coach ajoutée au Conducteur ne lui donne jamais accès à une piste interdite.']},\n",'notes')
 t=one(t,"let coachingSessionEndHandledId=null,coachingV1040FinishInFlight=false;","let coachingSessionEndHandledId=null,coachingV1040FinishInFlight=false;\nlet coachingWorkMode='team',coachingLastServerSyncAt=0,coachingSyncTimer=null,coachingV10423ResumeInFlight=false,coachingV10423TransitionInFlight=false;",'state')
 role="function coachingRoleLabel(role){return role==='driver'?'Conducteur':role==='coach'?'Coach':role==='solo'?'Solo':role==='traceur'?'Traceur':'Observateur'}"
 t=one(t,role,role+'\n'+HELPERS,'helpers')
 oldadd="function addCoachingFriendInvite(){const used=new Set(coachingFriendInvites.map(x=>x.user_id)),friend=coachingAcceptedFriends.find(x=>!used.has(x.user_id));if(!friend){setUiText('coachingCreateMsg',coachingAcceptedFriends.length?'Tous vos amis sont déjà ajoutés.':'Ajoutez d’abord des amis depuis l’onglet Chien > Amis.');return}coachingFriendInvites.push({user_id:friend.user_id,role:'observer'});renderCoachingFriendInvites()}"
 newadd="function addCoachingFriendInvite(){if(coachingWorkMode==='solo')return;if(coachingWorkMode==='duo'&&coachingFriendInvites.length>=1){setUiText('coachingCreateMsg','À deux : une seule autre personne est nécessaire.');return}const used=new Set(coachingFriendInvites.map(x=>x.user_id)),friend=coachingAcceptedFriends.find(x=>!used.has(x.user_id));if(!friend){setUiText('coachingCreateMsg',coachingAcceptedFriends.length?'Tous vos amis sont déjà ajoutés.':'Ajoutez d’abord des amis depuis l’onglet Chien > Amis.');return}coachingFriendInvites.push({user_id:friend.user_id,role:coachingWorkMode==='duo'?'driver':'observer'});renderCoachingFriendInvites()}"
 t=one(t,oldadd,newadd,'add friend')
 a=t.find('async function createCoaching(){'); b=t.find('\nasync function joinCoaching(){',a)
 if a<0 or b<0: die('createCoaching boundaries')
 newcreate="""async function createCoaching(){const mode=coachingWorkMode,button=$('createCoachingSession');if(mode==='solo'){selectedTrainingRoute=null;beginNewPiste('training');return}const valid=validateCoachingConfigurationV10423();if(!valid.ok){setUiText('coachingCreateMsg',valid.message);return}const route=trainingRoutes.find(r=>r.id===$('coachingRouteSelect')?.value),blindMode=$('coachingVisibility')?.value||'normal';if(!route){setUiText('coachingCreateMsg','Choisis un tracé existant ou crée-en un sur la carte.');return}if(button)button.disabled=true;try{const now=new Date(),payload={owner_id:session.user.id,route_id:route.id,name:`${mode==='duo'?'Binôme':'Équipe'} · ${now.toLocaleDateString('fr-FR')}`,status:'waiting',workflow_version:2,work_mode:mode,blind_mode:blindMode,laying_mode:mode==='duo'?'coach':($('coachingLayingMode')?.value||'coach'),planned_route:route.route||[],planned_markers:route.waypoints||[],odor_model:route.odor_model||{},visibility_mode:'all',invite_code:coachingCode(),expires_at:new Date(Date.now()+7*864e5).toISOString()},{data,error}=await supabase.from('coaching_sessions').insert(payload).select('id,invite_code,name,status,workflow_version,work_mode,phase,blind_mode,laying_mode,started_at').single();if(error||!data?.id){setUiText('coachingCreateMsg','Création impossible : '+(error?.message||'session absente'));return}pendingCreatedCoachingSession={id:data.id,code:data.invite_code,role:'coach'};const failures=await inviteCoachingFriends(data.id);if(failures.length)setUiText('coachingCreateMsg',`${failures.length} invitation(s) en erreur. Code : ${data.invite_code}`);await recoverCreatedCoachingSession();coachingFriendInvites=[];renderCoachingFriendInvites();markCoachingSyncV10423()}catch(e){setUiText('coachingCreateMsg','Création impossible : '+(e?.message||'erreur'))}finally{if(button)button.disabled=false}}"""
 t=t[:a]+newcreate+t[b:]
 a=t.find('function updateCoachingParticipants(groups,trace){'); b=t.find('\nfunction updateCoachingLiveMetrics(',a)
 if a<0 or b<0: die('participants boundaries')
 newparts="""function updateCoachingParticipants(groups,trace){const el=$('coachingParticipants');if(!el)return;const members=activeCoachingSession?.coaching_members||[],unique=new Map();for(const m of members)if(!unique.has(m.user_id))unique.set(m.user_id,m);const rows=[...unique.values()].map(m=>{const last=(groups.get(m.user_id)||[]).at(-1),owner=m.user_id===activeCoachingSession.owner_id?' • organisateur':'';return `<span class=\"participant-chip ${m.role}\"><i></i>${esc(coachingCapabilityLabel(m,activeCoachingSession))}${owner}<small>${esc(coachingParticipantStateV10423(m,last))}${last?` · ${new Date(last.recorded_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`:''}</small></span>`});el.innerHTML=rows.join('')||'<span class=\"participant-chip waiting\"><i></i>Aucun participant</span>';renderCoachingReliabilityV10423()}"""
 t=t[:a]+newparts+t[b:]
 old="function updateCoachingDebriefAccess(){const s=activeCoachingSession,role=myCoachingRole(s),ready=!!s&&(s.status==='ended'||coachingPhase(s)==='completed'),coach=ready&&(isCoachingOwner(s)||role==='coach'),driver=ready&&role==='driver';$('calculateCoachingDebrief')?.classList.toggle('hidden',!ready);$('coachingDebriefForm')?.classList.toggle('hidden',!coach);$('coachingDriverFeedbackForm')?.classList.toggle('hidden',!driver)}"
 new="function updateCoachingDebriefAccess(){const s=activeCoachingSession,ready=!!s&&(s.status==='ended'||coachingPhase(s)==='completed'),coach=ready&&(isCoachingOwner(s)||hasCoachingCapability('coach',s)),driver=ready&&hasCoachingCapability('drive',s);$('calculateCoachingDebrief')?.classList.toggle('hidden',!ready);$('coachingDebriefForm')?.classList.toggle('hidden',!coach);$('coachingDriverFeedbackForm')?.classList.toggle('hidden',!driver)}"
 t=one(t,old,new,'debrief access')
 t=t.replace("if(!s||!form||!(isCoachingOwner(s)||myCoachingRole(s)==='coach'))return alert('Seul le coach ou l’organisateur peut modifier le débrief.');","if(!s||!form||!(isCoachingOwner(s)||hasCoachingCapability('coach',s)))return alert('Fonction Coach requise.');",1)
 t=t.replace("if(!s||!form||myCoachingRole(s)!=='driver'||!(s.status==='ended'||coachingPhase(s)==='completed'))return alert('Le retour Conducteur est disponible après le parcours.');","if(!s||!form||!hasCoachingCapability('drive',s)||!(s.status==='ended'||coachingPhase(s)==='completed'))return alert('Le retour Conducteur est disponible après le parcours.');",1)
 t=one(t,"$('openTerrainHomeBtn').onclick=e=>{e.preventDefault();selectedTrainingRoute=null;beginNewPiste('training')};","$('openTerrainHomeBtn').onclick=e=>{e.preventDefault();showPage('coachingPage');setCoachingStage('prepare');setCoachingWorkMode('solo')};",'home')
 t=one(t,"if(!fresh||activeCoachingSession?.id!==id)return false;activeCoachingSession={...activeCoachingSession,...fresh};","if(!fresh||activeCoachingSession?.id!==id)return false;activeCoachingSession={...activeCoachingSession,...fresh};markCoachingSyncV10423();",'sync')
 init="document.querySelectorAll('[data-coaching-stage]').forEach(b=>b.onclick=()=>{if(b.dataset.coachingStage!=='prepare'&&!activeCoachingSession){$('coachingJoinMsg').textContent='Ouvre d’abord une session.';return}setCoachingStage(b.dataset.coachingStage)});"
 add="""document.querySelectorAll('[data-coaching-work-mode]').forEach(b=>b.onclick=()=>setCoachingWorkMode(b.dataset.coachingWorkMode));
setCoachingWorkMode('team');
window.addEventListener('online',()=>{renderCoachingReliabilityV10423();if(activeCoachingSession)refreshActiveCoachingSession(activeCoachingSession.id)});
window.addEventListener('offline',renderCoachingReliabilityV10423);
window.addEventListener('pageshow',()=>{if(session?.user?.id&&!activeCoachingSession)resumeCoachingV10423()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&session?.user?.id&&!activeCoachingSession)resumeCoachingV10423()});
coachingSyncTimer=setInterval(renderCoachingReliabilityV10423,5000);
"""
 t=one(t,init,add+init,'init')
 t=t.replace("async function coachingTransitionV1040(rpc){const s=activeCoachingSession;", "async function coachingTransitionV1040(rpc){if(coachingV10423TransitionInFlight)return false;coachingV10423TransitionInFlight=true;try{const s=activeCoachingSession;", 1)
 t=t.replace("return !!data||!error}\nfunction markCoachingTrackReady", "return !!data||!error}finally{coachingV10423TransitionInFlight=false}}\nfunction markCoachingTrackReady", 1)
 return t
def patch_css(t):
 if 'V10.42.3 unified coaching' in t:return t
 return t+"""
/* V10.42.3 unified coaching */
.coaching-work-mode-card{display:grid;gap:10px;margin:12px 0 16px}.coaching-work-mode{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.coaching-work-mode button{min-height:46px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.045);color:inherit;font-weight:800}.coaching-work-mode button.active{border-color:rgba(76,220,170,.65);background:rgba(76,220,170,.11)}.coaching-team-summary{display:grid;gap:6px;margin:10px 0 16px;padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08)}.coaching-team-summary:empty{display:none}.coaching-reliability-bar{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 14px;margin:0 0 12px;padding:10px 12px;border-radius:14px;background:rgba(8,24,30,.88);border:1px solid rgba(80,214,175,.18)}@media(max-width:520px){.coaching-work-mode{grid-template-columns:1fr}.coaching-reliability-bar{display:grid}}
"""
def patch_sw(t):
 t=one(t,"const C='piste-community-v2100';","const C='piste-community-v2101';",'sw')
 t=one(t,"'./v2.css?v=2067',","'./v2.css?v=2068',",'sw css')
 t=one(t,"'./app.js?v=1042-12',","'./app.js?v=1042-13',",'sw app')
 return t
CHECK_JS="const fs=require('fs');const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');const c=[app.includes(\"APP_VERSION='10.42.3'\"),app.includes('coachingMemberCapabilities'),app.includes('resumeCoachingV10423'),app.includes('validateCoachingConfigurationV10423'),html.includes('data-coaching-work-mode=\"duo\"'),html.includes('coachingExpectedAction'),sw.includes('piste-community-v2101')];if(c.some(x=>!x)){console.error('V10.42.3 CHECK FAIL');process.exit(1)}console.log('V10.42.3 CHECK OK');"
def apply():
 (ROOT/'app.js').write_text(patch_app(load('app.js')),encoding='utf-8');(ROOT/'index.html').write_text(patch_html(load('index.html')),encoding='utf-8');(ROOT/'v2.css').write_text(patch_css(load('v2.css')),encoding='utf-8');(ROOT/'sw.js').write_text(patch_sw(load('sw.js')),encoding='utf-8');(ROOT/'scripts').mkdir(exist_ok=True);(ROOT/'scripts/check-v10-42-3.js').write_text(CHECK_JS,encoding='utf-8');print('V10.42.3 appliquée localement — aucun SQL exécuté')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');p.add_argument('--apply',action='store_true');a=p.parse_args();check();
 if a.apply: apply()
