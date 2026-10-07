# Preuves et reproductibilité

Toutes les lignes ci-dessous proviennent des blobs Git au SHA `935da63533f577035ad89be8b1c03c8c6e92dd55`. Les extraits ne sont pas des correctifs.

## Méthode

1. `git archive 935da63533f577035ad89be8b1c03c8c6e92dd55` a été extrait sous `/private/tmp/piste-v1055-coaching-audit`, sans checkout V1/main.
2. Lecture des handlers, de leur binding DOM et de leurs contrats SQL présents. Aucune migration exécutée ni connexion à un backend.
3. Fonctions pures extraites par nom et évaluées avec Node `vm`; variables limitées à une identité synthétique. Aucun DOM ni navigateur, GPS ou réseau.
4. 252 combinaisons de contrats, modes, phases et rôles, plus assertions ciblées. Les états synthétiques ne sont pas tous atteignables; `derivedPhase` expose la normalisation réelle.
5. Empreintes de chaque source auditée vérifiées contre `git show SHA:chemin`. Les modifications applicatives déjà présentes dans le worktree V2 sont préservées.

## Résultats ciblés

| Cas | Résultat réel | Implication |
| --- | --- | --- |
| V3 double Coach → Driver | `true` | Écart explicite avec règle fournie |
| V3 double Observateur → Driver | `true` | Même écart |
| V3 simple Driver → Coach | `false` | Restriction supplémentaire au masque Traceur |
| V3 simple Traceur → Driver | `true` | Exception Traceur voit tous conservée |
| Solo self_trace en pose | `myCoachingRole=driver`, `coachingGpsRole=solo`, `layingActor=false` | Garde recording et fin de pose refuse Solo |
| Solo live/preparation surface | action `startSoloRun`, pas bloc `primaryActions` | Cas atypique, contenu action masqué par parent |
| Débrief closed avec membre accepté | `canReadDebrief=true`, `canEditOwnObservation=true`, `canActTerrain=false` | Terrain arrêté mais observation reste éditable |
| Session ended avec phase laying workflow 2 | `coachingPhase=laying` | Phase valide prime sur status terminal |
| V3 full_blind, visibility_mode=all | `Session normale` | Mauvais champ utilisé dans le libellé final |
| Durée 60 s avec pause 15 s | `45000` ms | Exemple calcul actif vérifié |

Les résultats complets sont dans [preuves-helpers.json](preuves-helpers.json). Il s’agit d’une preuve d’exécution des helpers, pas d’une exécution d’une session distante multi-utilisateurs ni des RPC SQL.

## P01 — Rôle Solo normalisé et acteur pose

`app.js:1137` @ SHA de référence.

```text
1137: function isCoachingOwner(s){return !!s&&s.owner_id===session?.user?.id}
1138: function myCoachingRole(s){const member=s?.coaching_members?.find(m=>m.user_id===session?.user?.id),proof=coachingHistoricalProof(s);const role=member?.role||proof?.role||'observer';return role==='solo'?'driver':role}
1139: function isSoloCoaching(s){return s?.coaching_members?.some(m=>m.user_id===session?.user?.id&&m.role==='solo')||false}
1140: function coachingRoleLabel(role){return role==='driver'?'Conducteur':role==='coach'?'Coach':role==='solo'?'Solo':role==='traceur'?'Traceur':'Observateur'}
```

## P02 — Garde acteur de pose

`app.js:1457` @ SHA de référence.

```text
1457: function coachingGpsRole(s=activeCoachingSession){return isSoloCoaching(s)?'solo':myCoachingRole(s)}
1458: function isCurrentUserLayingActor(s=activeCoachingSession){if(!s)return false;const role=myCoachingRole(s),member=myCoachingMember(s),accepted=!member||['accepted','active'].includes(member.invitation_status);if(role==='solo'&&s.solo_mode==='self_trace')return accepted; if(s.visibility_version===3)return(role==='traceur'||(isCoachingOwner(s)&&role==='coach'&&s.laying_mode==='coach'))&&accepted;return(role==='traceur'&&s.laying_mode==='traceur'&&accepted)||(isCoachingOwner(s)&&role==='coach'&&s.laying_mode==='coach')}
1459: function coachingGpsCapable(s=activeCoachingSession){return ['driver','solo','traceur','coach'].includes(coachingGpsRole(s))}
1460: function isCoachingGpsTracking(s=activeCoachingSession){return coachingGpsRole(s)==='traceur'?traceurWatch!==null:coachingPresenceWatch!==null}
```

## P03 — Autorisation positions frontend

`app.js:3901` @ SHA de référence.

```text
3901: function coachingCanSeeLiveOwner(s,ownerId){
3902:  if(s?.visibility_version!==3)return true;
3903:  const role=myCoachingRole(s),other=s.coaching_members?.find(m=>m.user_id===ownerId)?.role,mode=coachingBlindMode(s);
3904:  if(s.status==='ended'||coachingPhase(s)==='completed'||mode==='normal'||role==='traceur')return true;
3905:  if(role==='driver')return ownerId===session.user.id;
3906:  return mode==='simple_blind'||other!=='traceur';
3907: }
```

## P04 — Autorisation positions contrat SQL

`PISTE_V10.42.3_PATCH/PISTE_V10.42.3_VISIBILITY_APPLY.sql:43` @ SHA de référence.

```text
43: create or replace function private.can_read_coaching_live_point_v1042(p_session_id uuid,p_owner_id uuid)
44: returns boolean language plpgsql stable security definer set search_path='' as $$
45: declare r public.coaching_sessions; me public.coaching_members; uid uuid:=(select auth.uid()); subject_role text;
46: begin
47:  if uid is null then return false; end if;
48:  select * into r from public.coaching_sessions where id=p_session_id;
49:  if not found then return false; end if;
50:  if r.visibility_version is distinct from 3 then return private.legacy_can_read_coaching_live_point_v1042_v10423(p_session_id,p_owner_id); end if;
51:  select * into me from public.coaching_members where session_id=p_session_id and user_id=uid;
52:  if me.user_id is null or me.invitation_status not in ('accepted','active') then return false; end if;
53:  select role into subject_role from public.coaching_members where session_id=p_session_id and user_id=p_owner_id;
54:  return coalesce((private.coaching_truth_v10423(p_session_id) or p_owner_id=uid or (r.blind_mode='full_blind' and me.role in ('coach','observer') and subject_role in ('driver','coach'))),false);
55: end $$;
```

## P05 — Garde fermeture Solo SQL

`PISTE_V10.49.1D_FIX_SOLO_SEARCH_CHOICE.sql:48` @ SHA de référence.

```text
48:   end if;
49:   if old.ended_at is null and new.status='ended' and old.status<>'ended' then
50:     new.ended_at:=clock_timestamp();
51:   end if;
52:   if old.phase='laying' and new.phase='waiting_ready' and jsonb_array_length(old.planned_route)=0 then
53:     if (select count(*) from (
54:       select 1
55:       from public.coaching_trace_points as p
56:       join public.coaching_members as m
57:         on m.session_id=p.session_id and m.user_id=p.owner_id and m.role='traceur'
58:       where p.session_id=old.id
59:       limit 2
60:     ) as points)<2 then
61:       raise exception 'Enregistrez au moins deux points réels avant Piste tracée';
62:     end if;
63:   end if;
64:
65:   -- Classic sessions still require the Traceur search choice. An explicit,
66:   -- single-member Solo session is exempt from that inherited validation only.
67:   if old.phase is distinct from new.phase
68:      and new.phase='driver_running'
69:      and d.search_mode is null
```

## P06 — Mauvais discriminateur mode final

`app.js:1799` @ SHA de référence.

```text
1799: function coachingDebriefSessionMeta(s=activeCoachingSession){
1800:  if(!s)return '';
1801:  const date=s.started_at||s.created_at?new Date(s.started_at||s.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}):'';
1802:  const type=s.visibility_mode==='full_blind'?'Double aveugle':s.visibility_mode==='simple_blind'?'Simple aveugle':'Session normale';
1803:  const members=(s.coaching_members||[]).filter(member=>['accepted','active',undefined].includes(member.invitation_status));
1804:  const traceur=members.find(member=>member.role==='traceur'),driver=members.find(member=>member.role==='driver');
1805:  const people=[traceur&&`Traceur : ${coachingParticipantName(traceur)}`,driver&&`Conducteur : ${coachingParticipantName(driver)}`,s.dog_id&&`Chien : ${dogDisplay(s.dog_id)}`].filter(Boolean);
1806:  return [date,type,people.join(' · ')].filter(Boolean).join(' · ');
```

## P07 — Démasquage référence

`app.js:319` @ SHA de référence.

```text
319: function canRoleSeeReferenceRoute(sessionState,role){
320:  const s=sessionState;if(!s)return false;
321:  const mode=coachingBlindMode(s),completed=s.status==='ended'||coachingPhase(s)==='completed';
322:  if(completed||mode==='normal'||Number(s.workflow_version)<2)return true;
323:  if(mode==='simple_blind')return ['coach','traceur','observer'].includes(role);
324:  if(mode==='full_blind')return role==='traceur'||(role==='coach'&&s.laying_mode==='coach');
325:  return false;
326: }
```

## P08 — Autorisation débrief fermé

`app.js:1198` @ SHA de référence.

```text
1198: function coachingGlobalPhase(s){const state=s?.debrief_status;if(state==='closed')return 'closed';if(state==='in_progress')return 'debrief';if(state==='track_finished')return 'track_finished';return s?.status==='ended'?'debrief':'active'}
1199: function coachingHistoricalProof(s,userId=session?.user?.id){return (s?._coaching_history||s?.coaching_participation_ledger||[]).find(entry=>entry?.user_id===userId&&entry.participated_at)||null}
1200: function hydrateCoachingHistoricalRole(s,userId=session?.user?.id){const proof=coachingHistoricalProof(s,userId);if(!s||!proof?.role)return s;const members=Array.isArray(s.coaching_members)?s.coaching_members:[];if(members.some(member=>member.user_id===userId))return s;return {...s,coaching_members:[...members,{user_id:userId,role:proof.role,invitation_status:'accepted',participated_at:proof.participated_at}],_historical_role:proof.role}}
1201: function coachingHistoricalAccess(s,userId=session?.user?.id){const member=s?.coaching_members?.find(entry=>entry.user_id===userId&&['accepted','active'].includes(entry.invitation_status)),proved=coachingHistoricalProof(s,userId),final=['in_progress','closed'].includes(s?.debrief_status),canReadDebrief=!!final&&!!(member||proved);return{canReadDebrief,canEditOwnObservation:canReadDebrief,canActTerrain:!!member&&coachingGlobalPhase(s)==='active'}}
```

## P09 — Reprise GPS Solo

`app.js:1555` @ SHA de référence.

```text
1555: async function resumeSoloCoachingPhaseGps(s=activeCoachingSession){if(!isSoloCoaching(s)||s.status!=='live')return false;if(s.solo_mode==='self_trace'&&coachingPhase(s)==='laying'){await startTraceurTracking();return true}if(coachingPhase(s)==='driver_running'){startCoachingPresence();return true}return false}
```

## Garde SQL Solo : portée de la conclusion

Le contrat `finish_solo_laying_v1054` conserve le membre `solo`. Le trigger de fin sans route ci-dessus ne compte que des points associés à un membre `traceur`. Dans une session Solo à un membre, ce comptage ne peut pas atteindre deux, même si le Solo a enregistré des points. Cette contradiction du code SQL est démontrée par lecture des prédicats; son effet sur un serveur dépend de l’application effective des scripts. L’audit n’a pas exécuté SQL ni prétendu observer une erreur en production.

## Pourquoi les contrôles historiques ne suffisent pas

`check-v10-54-solo-frontend.js` recherche la présence des RPC, des tables et un seul appel watch natif. Il n’exécute pas la chaîne `myCoachingRole → isCurrentUserLayingActor → startTraceurTracking/markCoachingTrackReady` avec un membre Solo. Il peut donc passer malgré le blocage déterministe.

`check-v10-53-coaching-cross-device-live.js` vérifie présence des écritures/lectures et de filtres, pas un abonnement current_positions ni la matrice métier double aveugle. Les tests des helpers de référence portent sur la référence; ils ne prouvent pas conformité de toutes positions à la règle fournie dans cette demande.

Sur les 14 scripts choisis, 12 passent et deux échouent sur des attentes textuelles devenues historiques : version SW `v2124` au lieu de `v2125`, signature `loadCoachingScenario(s.id)` au lieu de l’appel avec garde `runtimeGeneration`. Les échecs sont conservés, pas réparés. La suite V1 complète n’a pas été exécutée et aucune suite V2 n’est présentée comme nécessaire à un changement applicatif, puisqu’il n’y en a aucun.

## Reproduire les évaluations pures

Extraire le même SHA dans le dossier temporaire indiqué avant exécution. Le script ci-dessous lit uniquement ce dossier et écrit son JSON sous `/private/tmp`. Il ne modifie aucune application.

```js
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const root='/private/tmp/piste-v1055-coaching-audit',app=fs.readFileSync(root+'/app.js','utf8');
function source(name){const re=new RegExp('^function '+name+'\\(', 'm');const m=re.exec(app);assert(m,name);let start=app.indexOf('{',m.index),depth=1,i=start+1;while(depth&&i<app.length){if(app[i]==='{')depth++;if(app[i]==='}')depth--;i++}return app.slice(m.index,i)}
const names=['isCoachingOwner','myCoachingRole','isSoloCoaching','coachingHistoricalProof','coachingGlobalPhase','coachingHistoricalAccess','myCoachingMember','coachingMemberCapabilities','coachingPhase','coachingBlindMode','canRoleSeeReferenceRoute','coachingDataVisibility','coachingCanSeeLiveOwner','isCurrentUserLayingActor','coachingActiveSurfaceModel','coachingCanFinishTrack','coachingGpsRole','coachingActiveDurationMs','coachingActiveDistance','coachingDebriefSessionMeta'];
const c={session:{user:{id:'viewer'}},activeCoachingSession:null};vm.createContext(c);vm.runInContext(names.map(source).join('\n'),c);
const roles=['coach','traceur','driver','observer'];const modes=['normal','simple_blind','full_blind'];const phases=['preparation','laying','laid','waiting_ready','coach_ready','driver_running','completed'];const rows=[];
for(const version of [1,2,3])for(const mode of modes)for(const phase of phases)for(const role of roles){c.session.user.id=role;const s={id:'audit',owner_id:'coach',workflow_version:version===1?1:2,visibility_version:version===3?3:2,status:phase==='completed'?'ended':phase==='waiting_ready'||phase==='preparation'?'waiting':'live',phase,blind_mode:mode,visibility_mode:mode,laying_mode:'traceur',coaching_members:roles.map(r=>({user_id:r,role:r,invitation_status:'accepted'}))};rows.push({version,mode,phase,derivedPhase:c.coachingPhase(s),viewer:role,visibility:c.coachingDataVisibility(s),positions:Object.fromEntries(roles.map(subject=>[subject,c.coachingCanSeeLiveOwner(s,subject)])),layingActor:c.isCurrentUserLayingActor(s),canFinish:c.coachingCanFinishTrack(s),surface:JSON.parse(JSON.stringify(c.coachingActiveSurfaceModel(s,phase,role)))});}
const at=(mode,viewer)=>rows.find(r=>r.version===3&&r.mode===mode&&r.phase==='driver_running'&&r.viewer===viewer);
assert.equal(at('full_blind','coach').positions.driver,true);assert.equal(at('full_blind','observer').positions.driver,true);assert.equal(at('simple_blind','driver').positions.coach,false);assert.equal(at('simple_blind','traceur').positions.driver,true);
c.session.user.id='solo';const solo={id:'solo-audit',owner_id:'solo',workflow_version:2,visibility_version:3,status:'live',phase:'laying',solo_mode:'self_trace',laying_mode:'traceur',blind_mode:'normal',coaching_members:[{user_id:'solo',role:'solo',invitation_status:'accepted'}]};const soloProof={role:c.myCoachingRole(solo),gpsRole:c.coachingGpsRole(solo),layingActor:c.isCurrentUserLayingActor(solo)};assert.deepEqual(soloProof,{role:'driver',gpsRole:'solo',layingActor:false});
const soloPrep=c.coachingActiveSurfaceModel({...solo,phase:'preparation'},'preparation','solo');assert(soloPrep.actions.includes('startSoloRun'));assert(!soloPrep.visibleBlocks.includes('primaryActions'));
const ended={...solo,status:'ended',phase:'completed',debrief_status:'closed'};const access=JSON.parse(JSON.stringify(c.coachingHistoricalAccess(ended)));assert.equal(access.canEditOwnObservation,true);
const inconsistent=c.coachingPhase({...solo,status:'ended',phase:'laying'});assert.equal(inconsistent,'laying');
const timestamp='2026-10-04T10:00:00.000Z';const duration=c.coachingActiveDurationMs(timestamp,'2026-10-04T10:01:00.000Z',{intervals:[{startedAt:'2026-10-04T10:00:20.000Z',endedAt:'2026-10-04T10:00:35.000Z'}]});assert.equal(duration,45000);
const blindDebriefLabel=c.coachingDebriefSessionMeta({visibility_mode:'all',blind_mode:'full_blind',coaching_members:[]});assert.equal(blindDebriefLabel,'Session normale');
const result={referenceSha:'935da63533f577035ad89be8b1c03c8c6e92dd55',method:'Exécution Node VM des fonctions extraites sans modification. Aucun DOM, GPS, réseau ou SQL exécuté.',caseCount:rows.length,visibilityCases:rows,proofs:{soloProof,soloPreparation:JSON.parse(JSON.stringify(soloPrep)),closedDebriefAccess:access,endedWithLayingPhase:inconsistent,activeDurationExampleMs:duration,blindDebriefLabel}};fs.writeFileSync('/private/tmp/piste-coaching-audit-probes.json',JSON.stringify(result,null,2));console.log(JSON.stringify({caseCount:rows.length,proofs:result.proofs},null,2));
```
