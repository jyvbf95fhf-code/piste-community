import {createTrackRoutingService} from './track-routing-service.mjs';
import {createTrackRoutingController} from './track-routing-controller.mjs';
import {trackHasPendingRoutes} from './track-route-segments.mjs';
import {applyTrackRoute} from './track-editor.mjs';
import {removeLastTrackSegment} from './track-editor.mjs';
import {mountTrackEditorMap,recenterTrackEditorMap,centerTrackEditorMap} from './track-editor-real-map.mjs';
import {createOperationalGpsController,canUseOperationalGps,ownsOperationalGps} from './operational-gps-controller.mjs';
import {formatOperationalGpsClock,operationalGpsStatusText} from './operational-gps-screen.mjs';
import {createDriverGpsController,canUseDriverGps,ownsDriverGps} from './coaching-driver-gps-controller.mjs';
import {visibleGpsPoseForDriver,searchGpsActiveMs} from './coaching-driver-gps-model.mjs';
import {createTracerGpsController,canUseTracerGps,ownsTracerGps} from './coaching-gps-controller.mjs';
import {mountGpsMaps,refreshGpsScreen,centerGpsMap,GpsPoseReport} from './coaching-gps-screen.mjs';
import {openCoachingHelp} from './coaching-help.mjs';
import {sessionControlView,applySessionControl,isExitClosure,isCollectivelyClosed,canParticipate} from './coaching-session-control.mjs';
import {persistSessionExit,resolveSessionExitActor,createExitConfirmation,confirmExitCommand} from './coaching-session-exit-controller.mjs';
import {SessionExitMenu,ExitConfirmationMarkup} from './coaching-session-exit-screen.mjs';
import {coachingClosureView} from './coaching-closure-view.mjs';
import {CoachingClosureScreen} from './coaching-closure-screen.mjs';
import { AppShell, Toast, ConfirmationDialog, SessionCard, EmptyState, escapeHTML } from './components.mjs';
import { HomeScreen, PlaceholderScreen, AuthScreen, routes } from './screens.mjs';
import { mock } from './data.mjs';
import { createMockAuth, resolveMockRoute } from './mock-auth.mjs';
import { debugSnapshot } from './config.mjs';
import { themeForRoute } from './theme.mjs';
import * as coaching from './coaching.mjs';
import {createReferenceAssignmentState,applyReferenceAssignmentAction,getReferenceAssignment} from './coaching-reference-assignment.mjs';
import { CoachingScreen } from './coaching-screen.mjs';
import { createTrackLibrary, gpxFixtures } from './track-library.mjs';
import { TrackBuilderScreen } from './track-builder-screen.mjs';
import * as preparation from './coaching-preparation.mjs';
import { PreparationScreen } from './coaching-preparation-screen.mjs';
import * as tracer from './coaching-tracer.mjs';
import {TracerScreen} from './coaching-tracer-screen.mjs';
import * as search from './coaching-search.mjs';
import {SearchScreen} from './coaching-search-screen.mjs';
import {syncSession,advanceSessionSearch,markExternalTraceurInPlace,returnSelfTraceToStart,trackAgeSeconds,formatTrackAge,debriefView,archivePermissionView,setArchivePermission,saveDriverDebriefNote,saveCoachDebriefNote} from './coaching-session-flow.mjs';
import {CoachScreen,ObserverScreen,SessionNotice} from './coaching-session-screen.mjs';
import {DebriefScreen} from './coaching-debrief-screen.mjs';
import {archiveSession} from './coaching-session-flow.mjs';
import {createCoachingQa,selectQaPerspective,nextQaAction,qaScenarioOptions} from './coaching-qa.mjs';
import {CoachingQaPanel} from './coaching-qa-screen.mjs';
import { createDogsStore, resolveDogsRoute } from './dogs.mjs';
import { DogFormScreen, DogNotFoundScreen, DogPhotoMarkup, DogProfileScreen, DogsListScreen } from './dogs-screen.mjs';
import {createSessionCatalog} from './session-catalog.mjs';
import {createCoachingHistoryStorage} from './coaching-history-storage.mjs';
import {createCoachingSessionStorage,isRecoverableCoachingSession} from './coaching-preparation-storage.mjs';
import {sessionListView,sessionDetailView,sessionReplayView,trackListView,trackDetailView,completedSessionHistoryView,homeActiveSessionView,resolveConsultationRoute} from './session-views.mjs';
import {SessionListScreen,SessionListResults,SessionDetailScreen} from './sessions-screen.mjs';
import {SessionReplayScreen} from './session-replay-screen.mjs';
import {TrackListScreen,TrackDetailScreen} from './tracks-screen.mjs';
import { createOperationalMissionStore } from './operational-missions.mjs';
import { operationalMissionView, operationalReplayView, resolveOperationalRoute } from './operational-views.mjs';
import { OperationalScreen, OperationalSessionDetailScreen, OperationalTerrainScreen } from './operational-screen.mjs';
import { OperationalNavigation } from './operational-intake.mjs';
import { OperationalReplayScreen } from './operational-replay-screen.mjs';
import { createHoldToUnlockController } from './operational-lock.mjs';
import {createTrackDraft,setTrackMode,updateTrackMetadata,addTrackPoint,moveTrackPoint,removeTrackPoint,undoTrackEdit,clearTrackDraft,trackDraftMetrics} from './track-editor.mjs';
import {svgClientPointToMap} from './track-editor-interactions.mjs';
import {createCommunityStore} from './community-store.mjs';
import {createCommunityLiveStore} from './community-live-store.mjs';
import {resolveCommunityLiveProjection} from './community-live-routes.mjs';
import {LiveScreen,LiveDetailScreen} from './live-screen.mjs';
import {NotificationsScreen,NotificationPreferencesScreen} from './notifications-screen.mjs';
import {authorizedCoachingContacts,coachingDraftWithContacts,ensureCoachingContactParticipant} from './community-coaching-contacts.mjs';
import {resolveCommunityRoute} from './community-routes.mjs';
import {CommunityScreen} from './community-screen.mjs';
import {createCommunityController} from './community-controller.mjs';
import {communitySourceOptions as buildCommunitySourceOptions} from './community-sources.mjs';
import {createJumolfStore} from './jumolf-store.mjs';
import {resolveJumolfAccess} from './jumolf-entitlement.mjs';
import {createJumolfController} from './jumolf-controller.mjs';
import {JumolfShell} from './jumolf-shell.mjs';
import {resolveJumolfRoute} from './jumolf-routes.mjs';
import {generateJumolfSyntheticDataset} from './jumolf-synthetic-dataset.mjs';
import {buildJumolfSyntheticAnalytics,detectJumolfSyntheticAnomalies} from './jumolf-synthetic-analytics.mjs';
import {buildJumolfDiscoveries} from './jumolf-learning-engine.mjs';
import {createScientificController} from './scientific-controller.mjs';
import {ScientificShell} from './scientific-shell.mjs';
import {canonicalScientificPath,resolveScientificRoute} from './scientific-routes.mjs';
import {resolveScientificContributionRoute} from './scientific-contribution-routes.mjs';
import {createScientificConsentStore} from './scientific-consent-store.mjs';
import {createScientificContributionFixtures} from './scientific-contribution-fixtures.mjs';
import {createScientificContributionController} from './scientific-contribution-controller.mjs';
import {buildScientificContributionCorpus,createScientificContributionCorpusService} from './scientific-corpus.mjs';
import {createScientificCorpusController} from './scientific-corpus-controller.mjs';
import {createAdminStore} from './admin-store.mjs';
import {createAdminController} from './admin-controller.mjs';
import {resolveAdminRoute} from './admin-routes.mjs';
import {scientificCorpusAccessFor} from './scientific-access.mjs';
import {resolveProfileRoute} from './profile-routes.mjs';
import {createProfileStore} from './profile-store.mjs';
import {ProfileScreen} from './profile-screen.mjs';
import {createProfileController} from './profile-controller.mjs';
import {adminCurrentVersion} from './admin-deployments.mjs';
let segment='Toutes';
let storage;
try { storage=window.localStorage; } catch {}
const auth=createMockAuth(storage);
let currentUser=auth.getSession().user;
const newCoachingDraft=()=>coaching.createDraft(currentUser,[{id:'nox',...mock.dog}]);
let coachingDraft=newCoachingDraft();
// Created at the local UI action boundary. Never a server identity or GPS proof.
function coachingActionContext(type,{draft=coachingDraft,referenceId=null,beneficiaryParticipantId=null,assignedFunction,origin,selectionActionId}={}){
 const identity=draft.identityContext;
 const known=identity?.userId!=null&&identity.userId===currentUser?.user_id;
 return {actionId:crypto.randomUUID(),type,author:{userId:known?identity.userId:null,participantId:known?identity.participantId:null,source:'mock-auth',assurance:'local-simulation'},occurredAt:new Date().toISOString(),origin,sessionId:null,referenceId,beneficiaryParticipantId,...(assignedFunction!==undefined?{assignedFunction}:{}),...(selectionActionId!==undefined?{selectionActionId}:{})};
}
let trackLibraryOwnerId=currentUser?.user_id||null,trackLibraryWarningShown='';
let trackLibrary=createTrackLibrary({storage,ownerId:trackLibraryOwnerId});
let dogsStore=createDogsStore();
const coachingHistoryStorage=createCoachingHistoryStorage(storage);
let sessionCatalog=createSessionCatalog();
let coachingHistoryOwnerId;
let coachingHistoryNotice='',coachingHistoryShownNotice='';
function restoreCoachingHistoryForUser(){
 const ownerId=currentUser?.user_id||null;
 if(ownerId===coachingHistoryOwnerId)return;
 sessionCatalog.clear();coachingHistoryOwnerId=ownerId;coachingHistoryNotice='';coachingHistoryShownNotice='';
 if(!ownerId)return;
 const loaded=coachingHistoryStorage.load(ownerId);
 if(!loaded.ok){coachingHistoryNotice='Historique local indisponible. Les sessions de cette visite restent accessibles en mémoire.';return;}
 loaded.records.forEach(record=>sessionCatalog.capture(record));
 coaching.reserveSessionIds(loaded.records.map(record=>record.session.id));
}
function captureCoachingHistory(){
 if(qaInitialized||!currentUser?.user_id||!preparationState||!coachingDraft.session||coachingDraft.identityContext?.userId!==currentUser.user_id)return;
 sessionCatalog.capture({session:coachingDraft.session,searchState,preparationState,tracerState});
 if(isExitClosure(searchState.phase)||!['DEBRIEF','ARCHIVED'].includes(searchState.phase))return;
 const result=coachingHistoryStorage.save(currentUser.user_id,sessionCatalog.list());
 coachingHistoryNotice=result.ok?'':result.reason==='conflict'?'Historique modifié dans un autre onglet ou illisible. Sauvegarde refusée pour préserver les données ; cette session reste en mémoire.':'Sauvegarde locale impossible. Cette session reste en mémoire et risque d’être perdue au rechargement.';
}
function showCoachingHistoryWarning(){
 if(coachingHistoryNotice&&coachingHistoryNotice!==coachingHistoryShownNotice)Toast(coachingHistoryNotice);
 coachingHistoryShownNotice=coachingHistoryNotice;
}

let operationalStore=createOperationalMissionStore();
let operationalGpsOwnerId=null;
function restoreOperationalGpsForUser(){const ownerId=currentUser?.user_id||null;if(ownerId===operationalGpsOwnerId)return;opsGps.pause();operationalGpsOwnerId=ownerId;operationalStore=createOperationalMissionStore({storage,ownerId});operationalUI={mode:'',eventType:'Départ',note:''};}
const adminStore=createAdminStore();
let jumolfStore=createJumolfStore({entitlement:'none',accessCodeCatalog:adminStore.codeCatalog(),currentUserId:currentUser?.user_id||null});
const adminController=createAdminController({store:adminStore,actor:()=>currentUser,navigate:path=>{history.pushState({},'',path);render(true);},render:()=>render(),toast:Toast,confirm:message=>window.confirm(message)});
const jumolfAccess=()=>resolveJumolfAccess(jumolfStore.snapshot());
let communityStore=createCommunityStore();
const profileStore=createProfileStore();
const profileController=createProfileController({store:profileStore,communityStore,getDogs:()=>dogsStore.list(),notificationStore:communityStore.getNotificationStore(),navigate:path=>{history.pushState({},'',path);render(true);},render:()=>render()});
let communityLiveStore=createCommunityLiveStore({communityStore});
let notifiedCoachingStarts=new Set();
let operationalUI={mode:'',eventType:'Départ',note:''};
let operationalChronoInterval=null;
let coachingAgeInterval=null;
let gpsChronoInterval=null;
let terrainUnlockController=null,terrainUnlockPointerId=null,terrainUnlockReturnTimer=null;
let searchUnlockController=null,searchUnlockPointerId=null;
let preparationState=null;
// Local assignment metadata only; never part of a spatial projection or pose.
let coachingReferenceAssignment=null;
function confirmCoachingTracerReference(form){
 const request={sessionId:form.dataset.sessionId,authorId:form.dataset.authorId,phase:form.dataset.phase,referenceId:form.elements.reference.value};
 const candidate=()=>{if(!preparationState||(qaInitialized?location.pathname!=='/qa/coaching':location.pathname!=='/coaching/session'||coachingDraft.session?.id!==request.sessionId||JSON.stringify(preparationState.session)!==JSON.stringify(coachingDraft.session))||preparationState.session.id!==request.sessionId||preparationState.viewerId!==request.authorId||preparationState.phase!==request.phase||!preparation.canChooseSessionReference(preparationState)||searchState.phase!=='PREPARATION'||searchState.layingSegments.some(segment=>segment.length)||tracerState.phase!=='before'||tracerState.segments.some(segment=>segment.length))throw Error('Choix refusé : la session ou la préparation a changé.');const items=preparationState.session.traceType==='gpx'?gpxFixtures:trackLibrary.list();const track=items.find(item=>item.id===request.referenceId);if(!track)throw Error('Cette référence n’est plus disponible.');return track;};
 let initial;
 try{initial=candidate();}catch(error){preparationUI.feedback=error.message;render();return;}
 const fingerprint=JSON.stringify(initial);
 ConfirmationDialog({title:'Confirmer cette piste ?',description:'Ce choix concerne cette session uniquement. Il ne démarre pas la pose et ne nécessite pas une seconde acceptation de votre part.',onConfirm:()=>{
  try{const track=candidate();if(JSON.stringify(track)!==fingerprint)throw Error('La référence a changé pendant la confirmation.');
   const next=preparation.selectSessionReference(preparationState,track,{sessionId:request.sessionId,authorParticipantId:request.authorId,expectedPhase:request.phase,actionId:crypto.randomUUID(),occurredAt:new Date().toISOString()},{knownPeople:qaInitialized?[]:coachingDraft.knownPeople||[]});
   if(!qaInitialized)coachingDraft={...coachingDraft,session:structuredClone(next.session),preparationTrack:structuredClone(next.session.preparation),knownPeople:[...new Set([...(coachingDraft.knownPeople||[]),request.authorId,...(track.ownerId?[track.ownerId]:[])])]};
   preparationState=next;preparationUI={...preparationUI,feedback:'Référence choisie. Vous pouvez rejoindre le départ.'};
  }catch(error){preparationUI.feedback=error.message;}
  render();
 }});
}
function saveCoachingDriverDebriefNote(form,role='driver'){
 try{
  if(!['/coaching/session','/qa/coaching'].includes(location.pathname)||!preparationState||form.dataset.sessionId!==preparationState.session.id||form.dataset.authorId!==preparationState.viewerId)throw Error('Note refusée : ce formulaire ne correspond plus à la session active.');
  searchState=(role==='coach'?saveCoachDebriefNote:saveDriverDebriefNote)(searchState,preparationState,{sessionId:form.dataset.sessionId,expectedRevision:Number(form.dataset.revision),text:form.elements.note.value});
  debriefUI={...debriefUI,noteDraft:undefined,notice:'Note enregistrée pour cette visite.'};
 }catch(error){debriefUI={...debriefUI,noteDraft:{sessionId:form.dataset.sessionId,authorId:form.dataset.authorId,role,text:form.elements.note.value},notice:error.message};}
 render();
}
function replyCoachingSearchMessage(text){
 try{
  if(searchUI.locked||!searchUI.messagesOpen||!preparationState)throw Error('Ouvrez les messages sur l’écran déverrouillé pour répondre.');
  tracerState=tracer.replySearchMock(tracerState,preparationState,searchState,text);searchUI.notice='';
 }catch(error){searchUI.notice=error.message;}
 render();
}
function handleCoachingCoachMessages(control,text=''){
 try{
  const request=control.dataset;
  if(!['/coaching/session','/qa/coaching'].includes(location.pathname)||!preparationState||request.sessionId!==preparationState.session.id||request.authorId!==preparationState.viewerId||!tracer.canCoachMessage(preparationState,searchState))throw Error('Messagerie refusée : la session, la fonction ou la phase a changé.');
  if(request.coachMessage==='open'){tracerState=tracer.readMessages(tracerState,preparationState);preparationUI={...preparationUI,messagesOpen:true,messageNotice:''};}
  else if(request.coachMessage==='close')preparationUI={...preparationUI,messagesOpen:false,messageNotice:''};
  else if(request.coachMessage==='reply'){if(!preparationUI.messagesOpen)throw Error('Ouvrez les messages pour répondre.');tracerState=tracer.replyCoachMock(tracerState,preparationState,searchState,text);preparationUI.messageNotice='';}
  else throw Error('Commande de messagerie inconnue.');
 }catch(error){preparationUI.messageNotice=error.message;}
 render();
}
function confirmCoachingArchiveAction(control){
 const request={action:control.dataset.debrief,sessionId:control.dataset.sessionId,revision:Number(control.dataset.revision),beneficiaryParticipantId:control.dataset.beneficiaryId,viewerId:preparationState?.viewerId,viewerRole:preparationState?preparation.preparationView(preparationState).role:null};
 const compatible=()=>{if(!preparationState||preparationState.session.id!==request.sessionId||preparationState.viewerId!==request.viewerId||preparation.preparationView(preparationState).role!==request.viewerRole)return false;const v=archivePermissionView(searchState,preparationState);return v.revision===request.revision&&(request.action==='archive'?v.canArchive:['grant-archive','revoke-archive'].includes(request.action)&&v.canManageArchive&&v.beneficiaryParticipantId===request.beneficiaryParticipantId&&(request.action==='grant-archive'?v.status!=='active':v.status==='active'));};
 if(!compatible()){searchUI.notice='Confirmation refusée : les droits ou la session ont changé.';render();return;}
 ConfirmationDialog({title:request.action==='archive'?'Archiver cette session ?':request.action==='grant-archive'?'Autoriser le Coach à archiver ?':'Retirer cette autorisation ?',description:request.action==='archive'?'Le débrief sera clôturé et la session restera en lecture seule. Simulation locale uniquement.':'Cette autorisation concerne uniquement l’archivage de cette session après son débrief. Simulation locale uniquement.',onConfirm:()=>{try{if(!compatible())throw Error('Confirmation expirée : les droits ou la session ont changé.');searchState=request.action==='archive'?archiveSession(searchState,preparationState):setArchivePermission(searchState,preparationState,{type:request.action==='grant-archive'?'grant':'revoke',sessionId:request.sessionId,beneficiaryParticipantId:request.beneficiaryParticipantId,expectedRevision:request.revision,actionId:crypto.randomUUID(),occurredAt:new Date().toISOString()});searchUI.notice='';}catch(error){searchUI.notice=error.message;}render(true);}});
}
function initializeCoachingReferenceAssignment(){
 const session=coachingDraft.session,creation=coachingDraft.sessionCreation;
 const validId=value=>typeof value==='string'&&value.length>0&&value.trim()===value;
 const referenceId=session?.preparation?.id;
 if(qaInitialized||!validId(session?.id)||creation?.sessionId!==session.id||!validId(creation?.creatorUserId)||!validId(creation?.creatorParticipantId)||!validId(referenceId)){
  coachingReferenceAssignment=null;return;
 }
 const roles=session.roles,members=session.participants;
 if(!roles||!Array.isArray(members)||!Array.isArray(roles.observers)||Object.keys(roles).some(role=>!['driver','traceur','coach','observers'].includes(role))){coachingReferenceAssignment=null;return;}
 const ids=members.map(p=>p?.id);
 const assigned=[roles.driver,roles.traceur,roles.coach,...roles.observers].filter(id=>id!==null);
 if(ids.some(id=>!validId(id))||new Set(ids).size!==ids.length||!ids.includes(creation.creatorParticipantId)||assigned.some(id=>!ids.includes(id))||new Set(roles.observers).size!==roles.observers.length){coachingReferenceAssignment=null;return;}
 const participants=ids.map(id=>({id,functions:[...['driver','traceur','coach'].filter(role=>roles[role]===id),...(roles.observers.includes(id)?['observer']:[])]}));
 if(participants.some(p=>!p.functions.length)){coachingReferenceAssignment=null;return;}
 const context=Object.freeze({sessionId:session.id,creatorParticipantId:creation.creatorParticipantId,assignmentAuthority:'coach-role',
  participants:Object.freeze(participants.map(p=>Object.freeze({...p,functions:Object.freeze(p.functions)}))),
  references:Object.freeze([Object.freeze({id:referenceId,layingStarted:false})]),delegations:Object.freeze([])});
 // Same session: retain the exact instance, or fail closed on changed metadata.
 if(coachingReferenceAssignment?.state.sessionId===session.id){
  if(JSON.stringify(coachingReferenceAssignment.context)!==JSON.stringify(context))coachingReferenceAssignment=null;
  return;
 }
 coachingReferenceAssignment=Object.freeze({context,state:createReferenceAssignmentState(context)});
}
function transmitCoachingReferenceAutomatically(){
 const session=coachingDraft.session,entry=coachingReferenceAssignment,identity=coachingDraft.identityContext,creation=coachingDraft.sessionCreation;
 if(qaInitialized||!session||!entry||entry.state.sessionId!==session.id||!['connected_traceur','self_trace'].includes(session.scenario)||!['prepared','gpx'].includes(session.traceType)||creation?.creatorUserId!==currentUser?.user_id||identity?.userId!==currentUser?.user_id||identity.participantId!==creation.creatorParticipantId||identity.source!=='mock-auth'||identity.assurance!=='local-simulation')return;
 const id=session.preparation?.id,beneficiary=session.roles.traceur;
 if(!id||!entry.context.participants.find(p=>p.id===beneficiary)?.functions.includes('traceur'))return;
 const assignment=getReferenceAssignment(entry.state,id);
 // A render/re-entry never repeats a transmission, including after refusal.
 if(assignment.status!=='none'||assignment.assignments.length||assignment.locked)return;
 const action={actionId:crypto.randomUUID(),type:'assign',sessionId:session.id,referenceId:id,authorParticipantId:creation.creatorParticipantId,beneficiaryParticipantId:beneficiary,assignmentId:crypto.randomUUID(),expectedRevision:assignment.revision,delegationId:null,occurredAt:new Date().toISOString(),origin:'simulation:coaching-reference-automatic',assurance:'local-simulation'};
 const state=applyReferenceAssignmentAction(entry.state,entry.context,action);
 coachingReferenceAssignment=Object.freeze({...entry,state});
}
function invalidateCoachingReferenceAssignment(){
 if(coachingReferenceAssignment&&(qaInitialized||coachingReferenceAssignment.state.sessionId!==coachingDraft.session?.id||coachingDraft.sessionCreation?.creatorUserId!==currentUser?.user_id))coachingReferenceAssignment=null;
}
function coachingReferenceAssignmentView(){
 const localUser=auth.getSession().user,identity=coachingDraft.identityContext,creation=coachingDraft.sessionCreation,session=coachingDraft.session,entry=coachingReferenceAssignment;
 if(qaInitialized||preparationState&&!canParticipate(preparationState,preparationState.viewerId)||!entry||!session||!localUser?.user_id||identity?.userId!==localUser.user_id||identity.source!=='mock-auth'||identity.assurance!=='local-simulation'||creation?.creatorUserId!==localUser.user_id||creation.creatorParticipantId!==identity.participantId||creation.sessionId!==session.id||entry.state.sessionId!==session.id||entry.context.sessionId!==session.id||entry.context.creatorParticipantId!==identity.participantId||entry.state.creatorParticipantId!==identity.participantId)return null;
 const ref=session.preparation,roles=session.roles;
 if(!ref?.id||entry.context.references.length!==1||entry.context.references[0].id!==ref.id||!Object.hasOwn(entry.state.references,ref.id)||preparationState?.session.id!==session.id||preparationState.viewerId!==identity.participantId)return null;
 // Use actual session functions, never a DEV perspective as an identity or a
 // new reference.read grant. Visibility is the existing creation-screen rule.
 const members=session.participants.map(p=>({id:p.id,functions:[...['driver','traceur','coach'].filter(role=>roles[role]===p.id),...(roles.observers.includes(p.id)?['observer']:[])]}));
 if(JSON.stringify(members)!==JSON.stringify(entry.context.participants)||!members.find(p=>p.id===identity.participantId)?.functions.includes(session.creatorRole)||!coaching.canSeeReference(session.mode,session.creatorRole,!!roles.coach&&roles.coach===roles.traceur))return null;
 // Refuse after existing pose/search facts; do not manufacture a lock or pose
 // attestation, and do not change the existing terrain modules.
 if(!['before','approaching','arrived'].includes(tracerState.phase)||tracerState.segments.some(segment=>segment.length)||preparationState.physicalLaid||searchState.phase!=='PREPARATION'||searchState.layingSegments.some(segment=>segment.length))return null;
 const assignment=getReferenceAssignment(entry.state,ref.id);
 if(assignment.locked||!['none','pending','accepted','declined'].includes(assignment.status))return null;
 const beneficiaries=session.participants.filter(p=>p.id===roles.traceur&&members.find(member=>member.id===p.id)?.functions.includes('traceur')).map(p=>({id:p.id,name:p.name}));
 if(!beneficiaries.length)return null;
 return {sessionId:session.id,referenceId:ref.id,referenceName:session.traceType==='gpx'?(ref.fileName||ref.name):ref.name,revision:assignment.revision,status:assignment.status,beneficiaries,beneficiaryName:beneficiaries.find(p=>p.id===assignment.current?.beneficiaryParticipantId)?.name||''};
}
function confirmCoachingReferenceAssignment(form){
 const request={sessionId:form.dataset.sessionId,referenceId:form.dataset.referenceId,revision:Number(form.dataset.revision),beneficiaryParticipantId:form.elements.beneficiary.value};
 const view=coachingReferenceAssignmentView();
 if(!view||view.status!=='none'||request.sessionId!==view.sessionId||request.referenceId!==view.referenceId||!Number.isSafeInteger(request.revision)||request.revision!==view.revision||!view.beneficiaries.some(p=>p.id===request.beneficiaryParticipantId)){Toast('Attribution indisponible : contexte modifié ou non autorisé.');return;}
 ConfirmationDialog({title:'Confirmer l’attribution ?',description:'Cette attribution simulée restera en attente d’acceptation. Aucune invitation ni réponse distante ne sera envoyée.',onConfirm:()=>{
  const current=coachingReferenceAssignmentView();
  if(!current||current.status!=='none'||current.sessionId!==request.sessionId||current.referenceId!==request.referenceId||current.revision!==request.revision||!current.beneficiaries.some(p=>p.id===request.beneficiaryParticipantId)){Toast('Attribution refusée : la confirmation n’est plus valide.');return;}
  const action={actionId:crypto.randomUUID(),sessionId:request.sessionId,referenceId:request.referenceId,authorParticipantId:coachingDraft.identityContext.participantId,beneficiaryParticipantId:request.beneficiaryParticipantId,type:'assign',occurredAt:new Date().toISOString(),origin:'simulation:coaching-reference-assignment',assurance:'local-simulation',delegationId:null,expectedRevision:request.revision,assignmentId:crypto.randomUUID()};
  try{
   const state=applyReferenceAssignmentAction(coachingReferenceAssignment.state,coachingReferenceAssignment.context,action);
   coachingReferenceAssignment=Object.freeze({...coachingReferenceAssignment,state});
   render();
  }catch{Toast('Attribution refusée : état incompatible.');}
 }});
}
// DEV actor selection is a session-bound simulation, never an auth identity.
function coachingReferenceResponseView(){
 const user=auth.getSession().user,d=coachingDraft,session=d.session,entry=coachingReferenceAssignment,p=preparationState;
 if(qaInitialized||preparationState&&!canParticipate(preparationState,preparationState.viewerId)||!entry||!session||!user?.user_id||d.identityContext?.userId!==user.user_id||d.identityContext.source!=='mock-auth'||d.identityContext.assurance!=='local-simulation'||d.sessionCreation?.creatorUserId!==user.user_id||d.sessionCreation.sessionId!==session.id||entry.state.sessionId!==session.id||p?.session.id!==session.id||p.scenario!==(session.roles.traceur===session.roles.driver?'solo':'session')||p.traceurKind!=='internal')return null;
 const view=preparation.preparationView(p),id=session.roles.traceur;
 if(view.role!=='traceur'||view.viewerId!==id||!entry.context.participants.find(m=>m.id===id)?.functions.includes('traceur'))return null;
 const actor=preparationUI.referenceResponseActor,simulated=id!==d.identityContext.participantId;
 if(simulated&&(!actor||actor.sessionId!==session.id||actor.participantId!==id))return null;
 if(!['before','approaching','arrived'].includes(tracerState.phase)||tracerState.segments.some(segment=>segment.length)||p.physicalLaid||searchState.phase!=='PREPARATION'||searchState.layingSegments.some(segment=>segment.length))return null;
 const ref=session.preparation;if(!ref?.id||entry.context.references.length!==1||entry.context.references[0].id!==ref.id)return null;
 const assignment=getReferenceAssignment(entry.state,ref.id);
 const record=assignment.current||assignment.assignments.at(-1);
 if(assignment.locked||record?.beneficiaryParticipantId!==id||!['pending','accepted','declined'].includes(assignment.status))return null;
 return {sessionId:session.id,referenceId:ref.id,referenceName:ref.fileName||ref.name,assignmentId:record.assignmentId,revision:assignment.revision,participantId:id,status:assignment.status,simulated};
}
function confirmCoachingReferenceResponse(form){
 const request={type:form.dataset.command,sessionId:form.dataset.sessionId,referenceId:form.dataset.referenceId,assignmentId:form.dataset.assignmentId,revision:Number(form.dataset.revision)};
 const compatible=v=>!!v&&v.status==='pending'&&['accept','decline'].includes(request.type)&&Number.isSafeInteger(request.revision)&&v.revision===request.revision&&v.sessionId===request.sessionId&&v.referenceId===request.referenceId&&v.assignmentId===request.assignmentId;
 const initial=coachingReferenceResponseView();if(!compatible(initial)){Toast('Réponse indisponible : destinataire ou contexte incompatible.');return;}
 ConfirmationDialog({title:request.type==='accept'?'Accepter ce parcours ?':'Refuser ce parcours ?',description:'Réponse locale uniquement. Elle ne constitue pas une preuve de pose.',onConfirm:()=>{
  const view=coachingReferenceResponseView();if(!compatible(view)||view.participantId!==initial.participantId||view.simulated!==initial.simulated){Toast('Réponse refusée : contexte modifié.');return;}
  const action={actionId:crypto.randomUUID(),type:request.type,sessionId:view.sessionId,referenceId:view.referenceId,assignmentId:view.assignmentId,expectedRevision:view.revision,authorParticipantId:view.participantId,beneficiaryParticipantId:view.participantId,delegationId:null,occurredAt:new Date().toISOString(),origin:view.simulated?'simulation:coaching-reference-response-dev':'simulation:coaching-reference-response',assurance:'local-simulation'};
  try{const state=applyReferenceAssignmentAction(coachingReferenceAssignment.state,coachingReferenceAssignment.context,action);coachingReferenceAssignment=Object.freeze({...coachingReferenceAssignment,state});render();}catch{Toast('Réponse refusée : état incompatible.');}
 }});
}
// Delegation metadata is separate from spatial access and creator attribution.
function coachingReferenceDelegationView(){
 const localUser=auth.getSession().user,identity=coachingDraft.identityContext,creation=coachingDraft.sessionCreation,session=coachingDraft.session,entry=coachingReferenceAssignment;
 if(qaInitialized||preparationState&&!canParticipate(preparationState,preparationState.viewerId)||!entry||!session||!localUser?.user_id||identity?.userId!==localUser.user_id||identity.source!=='mock-auth'||identity.assurance!=='local-simulation'||creation?.creatorUserId!==localUser.user_id||creation.creatorParticipantId!==identity.participantId||creation.sessionId!==session.id||entry.state.sessionId!==session.id||entry.context.sessionId!==session.id||entry.context.creatorParticipantId!==identity.participantId||entry.state.creatorParticipantId!==identity.participantId)return null;
 if(preparationState?.session.id!==session.id||preparationState.viewerId!==identity.participantId||preparation.preparationView(preparationState).role==='observer'||['SEARCH_FINISHED','DEBRIEF','ARCHIVED'].includes(searchState.phase))return null;
 const roles=session.roles,members=session.participants.map(p=>({id:p.id,functions:[...['driver','traceur','coach'].filter(role=>roles[role]===p.id),...(roles.observers.includes(p.id)?['observer']:[])]}));
 if(JSON.stringify(members)!==JSON.stringify(entry.context.participants))return null;
 const ledger=entry.state.delegationLedger;
 const records=(ledger?.records||[]).map(d=>({id:d.id,beneficiaryParticipantId:d.beneficiaryParticipantId,beneficiaryName:session.participants.find(p=>p.id===d.beneficiaryParticipantId)?.name||'Participant indisponible',status:d.status,transitions:d.transitions.map(t=>({status:t.status,occurredAt:t.occurredAt,authorParticipantId:t.authorParticipantId}))}));
 const beneficiaries=session.participants.filter(p=>members.find(m=>m.id===p.id)?.functions.includes('coach')&&!records.some(d=>d.beneficiaryParticipantId===p.id&&d.status==='active')).map(p=>({id:p.id,name:p.name}));
 return {sessionId:session.id,revision:ledger?.revision??0,beneficiaries,records};
}
function confirmCoachingReferenceDelegation(form){
 const request={type:form.dataset.command,sessionId:form.dataset.sessionId,revision:Number(form.dataset.revision),beneficiaryParticipantId:form.elements.beneficiary.value,delegationId:form.dataset.delegationId};
 const compatible=view=>!!view&&view.sessionId===request.sessionId&&Number.isSafeInteger(request.revision)&&view.revision===request.revision&&(request.type==='grant'?view.beneficiaries.some(p=>p.id===request.beneficiaryParticipantId):request.type==='revoke'&&view.records.some(d=>d.id===request.delegationId&&d.beneficiaryParticipantId===request.beneficiaryParticipantId&&d.status==='active'));
 if(!compatible(coachingReferenceDelegationView())){Toast('Délégation indisponible : contexte modifié ou non autorisé.');return;}
 const grant=request.type==='grant';
 ConfirmationDialog({title:grant?'Accorder la délégation ?':'Révoquer la délégation ?',description:grant?'Le Coach pourra attribuer la référence. Cette délégation simulée ne donne aucun droit supplémentaire de lecture, de pause ou de clôture.':'Le Coach perdra ce droit d’attribution. L’historique restera conservé dans cette session simulée.',onConfirm:()=>{
  if(!compatible(coachingReferenceDelegationView())){Toast('Délégation refusée : la confirmation n’est plus valide.');return;}
  const action={actionId:crypto.randomUUID(),type:grant?'delegation-grant':'delegation-revoke',sessionId:request.sessionId,authorParticipantId:coachingDraft.identityContext.participantId,beneficiaryParticipantId:request.beneficiaryParticipantId,delegationId:grant?crypto.randomUUID():request.delegationId,permission:'reference.assign',occurredAt:new Date().toISOString(),origin:'simulation:coaching-reference-delegation',assurance:'local-simulation',expectedRevision:request.revision};
  try{
   const state=applyReferenceAssignmentAction(coachingReferenceAssignment.state,coachingReferenceAssignment.context,action);
   coachingReferenceAssignment=Object.freeze({...coachingReferenceAssignment,state});render();
  }catch{Toast('Délégation refusée : état incompatible.');}
 }});
}
let tracerState=tracer.createTracer();
let tracerUI={};
let terrainOpen=false;
let searchState=search.createSearch();
let searchUI={};
let debriefUI={tab:'summary'};
function gpsContext(){return {draft:coachingDraft,preparation:preparationState,tracer:tracerState,search:searchState,user:currentUser,qa:qaInitialized};}
function gpsFeedback(){
 if(globalThis.location?.pathname?.startsWith('/operational')||!ownsTracerGps(gpsContext()))return;
 const live=document.querySelector('[data-gps-live]'),status=tracerGps.view();
 if(live&&tracerState.gpsPose&&live.dataset.gpsRunning===String(status.running)){captureCoachingPreparation();showCoachingPreparationWarning();refreshGpsScreen(tracerState.gpsPose,status);}
 else render();
}
const tracerGps=createTracerGpsController({getContext:gpsContext,setTracer:t=>{tracerState=t;},render:gpsFeedback});
function driverGpsFeedback(){if(globalThis.location?.pathname?.startsWith('/operational')||!ownsDriverGps(gpsContext()))return;const live=document.querySelector('[data-gps-kind="search"]'),status=driverGps.view();if(live&&searchState.gpsSearch&&live.dataset.gpsRunning===String(status.running)){captureCoachingPreparation();showCoachingPreparationWarning();refreshGpsScreen(searchState.gpsSearch,status);const clock=document.querySelector('[data-gps-clock]');if(clock){const n=Math.floor(searchGpsActiveMs(searchState)/1000);clock.textContent=`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}}else render();}
const driverGps=createDriverGpsController({getContext:gpsContext,setSearch:s=>{searchState=s;},render:driverGpsFeedback});


function operationalGpsContext(){const route=resolveOperationalRoute(location.pathname);return {user:currentUser,route,mission:route?.missionId?operationalStore.get(route.missionId):null};}
function operationalGpsFeedback(){
 const c=operationalGpsContext();if(!ownsOperationalGps(c))return;
 const live=document.querySelector('[data-gps-kind="ops"]'),status=opsGps.view();
 if(status.warning&&operationalUI.storageWarning!==status.warning)Toast(status.warning);operationalUI={...operationalUI,storageWarning:status.warning};
 if(!live&&operationalUI.showDetails)return;
 if(live&&live.dataset.gpsRunning===String(status.running)){
  const distance=live.querySelector('[data-gps-distance]'),clock=live.querySelector('[data-operational-chrono]'),text=live.querySelector('[data-ops-gps-status]');
  if(distance)distance.textContent=(c.mission.gpsTrack.distanceM/1000).toFixed(2).replace('.',',')+' km';
  if(clock)clock.textContent=formatOperationalGpsClock(operationalStore.trackingElapsedMs(c.mission.id));
  if(text)text.textContent=operationalGpsStatusText(status);
  const warning=live.querySelector('[data-ops-storage-warning]');if(warning){warning.textContent=status.warning;warning.hidden=!status.warning;}
  mountGpsMaps({livePose:c.mission.gpsTrack,lastFix:status.lastFix});
 }else render();
}
const opsGps=createOperationalGpsController({getContext:operationalGpsContext,getStore:()=>operationalStore,render:operationalGpsFeedback});

window.addEventListener('pagehide',()=>{opsGps.pause();tracerGps.pause();driverGps.pause();captureCoachingPreparation();});

let qaMode='normal';
let qaScenario='connected_traceur';
let qaUI={error:''};
let qaInitialized=false;
let preparationUI={simulatorOpen:false,feedback:''};
const coachingPreparationStorage=createCoachingSessionStorage(storage);
let coachingPreparationOwnerId;
let coachingPreparationNotice='',coachingPreparationShownNotice='';
function restoreCoachingPreparationForUser(){
 const ownerId=currentUser?.user_id||null;
 if(ownerId===coachingPreparationOwnerId)return;
 coachingPreparationOwnerId=ownerId;coachingPreparationNotice='';coachingPreparationShownNotice='';
 // A profile change never carries a prior profile's in-memory cockpit.
 coachingDraft=newCoachingDraft();preparationState=null;coachingReferenceAssignment=null;
 tracerState=tracer.createTracer();searchState=search.createSearch();terrainOpen=false;
 tracerUI={};searchUI={};preparationUI={simulatorOpen:false,feedback:''};
 if(!ownerId)return;
 const loaded=coachingPreparationStorage.load(ownerId);
 if(!loaded.ok){coachingPreparationNotice='Préparation locale indisponible. La sauvegarde existante est conservée.';return;}
 if(!loaded.snapshot)return;
 const snapshot=loaded.snapshot;
 // Completed history wins over a preparation retained by a stale tab.
 if(isCollectivelyClosed(sessionCatalog.get(snapshot.draft.session.id)?.searchState.phase)){
  const cleared=coachingPreparationStorage.clear(ownerId);
  if(!cleared.ok)coachingPreparationNotice='Une ancienne préparation subsiste dans un autre onglet. La session terminée reste accessible dans Sessions.';
  return;
 }
 coachingDraft=snapshot.draft;preparationState=snapshot.preparationState;
 tracerState=snapshot.tracerState;searchState=snapshot.searchState;
 coachingReferenceAssignment=snapshot.referenceAssignment;terrainOpen=snapshot.terrainOpen;
 searchUI={locked:!!snapshot.searchLocked};
 coaching.reserveSessionIds([coachingDraft.session.id]);
 if(isExitClosure(searchState.phase))exitSavePending=true;
 preparationUI.feedback=searchState.phase==='PREPARATION'?'Préparation retrouvée sur cet appareil.':'Session terrain retrouvée sur cet appareil. Position en acquisition.';
}
function captureCoachingPreparation(){
 const ownerId=currentUser?.user_id;
 if(qaInitialized||!ownerId||ownerId!==coachingPreparationOwnerId)return;
 if(coachingDraft.identityContext?.userId!==ownerId||isExitClosure(searchState.phase))return;
 // GPS return can advance the poser before the screen synchronizes the session.
 if(preparationState)searchState=syncSession(searchState,preparationState,tracerState);
 const snapshot={draft:coachingDraft,preparationState,tracerState,searchState,referenceAssignment:coachingReferenceAssignment,terrainOpen,searchLocked:!!searchUI.locked};
 const result=isRecoverableCoachingSession(snapshot)?coachingPreparationStorage.save(ownerId,snapshot):coachingPreparationStorage.clear(ownerId);
 coachingPreparationNotice=result.ok?'':result.reason==='conflict'?'Session modifiée dans un autre onglet. Sauvegarde refusée pour préserver les données ; cette session reste en mémoire.':'Sauvegarde de la session impossible. Cette session reste en mémoire et risque d’être perdue au rechargement.';
}
function showCoachingPreparationWarning(){
 if(coachingPreparationNotice&&coachingPreparationNotice!==coachingPreparationShownNotice)Toast(coachingPreparationNotice);
 coachingPreparationShownNotice=coachingPreparationNotice;
}

let exitEpoch=0,exitRoute='',exitDialog=null,exitSavePending=false,normalCoachingBeforeQa=null;
function exitSnapshot(){return {session:preparationState.session,draft:coachingDraft,preparationState,tracerState,searchState,referenceAssignment:coachingReferenceAssignment,terrainOpen,searchLocked:!!searchUI.locked};}
function exitActor(){return qaInitialized?{participantId:preparationState?.viewerId}:resolveSessionExitActor(coachingDraft,currentUser);}
function cleanupCoachingExit(){
 exitEpoch++;exitDialog?.close();exitDialog=null;
 searchUnlockController?.cancel();searchUnlockController=null;searchUnlockPointerId=null;
 if(gpsChronoInterval)clearInterval(gpsChronoInterval);
 gpsChronoInterval=null;
 if(coachingAgeInterval)clearInterval(coachingAgeInterval);coachingAgeInterval=null;
 tracerUI={};searchUI={};preparationUI={simulatorOpen:false,feedback:''};
}
function applyExitSnapshot(n){preparationState=n.preparationState;tracerState=n.tracerState;searchState=n.searchState;if(!qaInitialized)coachingDraft=n.draft;}
function submitSessionExit(action){
 if(!preparationState||!['/coaching/session','/qa/coaching'].includes(location.pathname)||searchUI.locked)return;
 if(action==='home'){cleanupCoachingExit();history.pushState({},'','/');render(true);return;}
 if(action==='retry'){
  try{const snapshot=exitSnapshot(),entry=snapshot.session.control.actions.at(-1),{authorParticipantId,...command}=entry;
   const result=persistSessionExit({snapshot,actor:exitActor(),command,ownerId:currentUser.user_id,sessionStore:coachingPreparationStorage,historyStorage:coachingHistoryStorage,records:sessionCatalog.list()});
   exitSavePending=!result.ok;coachingPreparationNotice=result.ok?'':'Sauvegarde incomplète : les données restent conservées en mémoire. Réessayez sans recharger.';coachingHistoryNotice='';render();
  }catch(error){Toast(error.message);}return;
 }
 const actor=exitActor();if(!actor)return;
 const snapshot=exitSnapshot(),view=sessionControlView(snapshot,actor);
 if(!view[{cancel:'canCancel',interrupt:'canInterrupt',leave:'canLeave'}[action]]){Toast('Cette sortie n’est pas autorisée.');return;}
 const request=createExitConfirmation(snapshot,actor,action,exitEpoch),dialog=document.createElement('dialog');exitDialog?.close();exitDialog=dialog;dialog.innerHTML=ExitConfirmationMarkup(action);document.body.append(dialog);
 dialog.querySelector('[data-exit-cancel]').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{dialog.remove();if(exitDialog===dialog)exitDialog=null;});
 dialog.querySelector('[data-exit-confirm]').onclick=()=>{
  try{
   if(!['/coaching/session','/qa/coaching'].includes(location.pathname)||searchUI.locked)throw Error('Déverrouillez le même écran avant de confirmer.');
   const snapshot=exitSnapshot(),actor=exitActor(),command=confirmExitCommand(request,snapshot,actor,exitEpoch,{actionId:crypto.randomUUID(),occurredAt:new Date().toISOString(),reason:dialog.querySelector('[data-exit-reason]').value.trim()});
   const result=qaInitialized?{ok:true,snapshot:applySessionControl(snapshot,actor,command)}:persistSessionExit({snapshot,actor,command,ownerId:currentUser.user_id,sessionStore:coachingPreparationStorage,historyStorage:coachingHistoryStorage,records:sessionCatalog.list()});
   if(result.reason==='conflict'&&!result.applied){Toast('Session modifiée dans un autre onglet. Arrêt refusé ; rechargez pour consulter le dernier état.');dialog.close();return;}
   applyExitSnapshot(result.snapshot);cleanupCoachingExit();exitSavePending=!result.ok;
   coachingPreparationNotice=result.ok?'':'Sauvegarde incomplète : les données restent en mémoire. Réessayez sans recharger.';coachingHistoryNotice='';
   render(true);
  }catch(error){dialog.close();Toast(error.message);}
 };
 dialog.showModal();
}
function renderSessionExitMenu(){return SessionExitMenu(sessionControlView(exitSnapshot(),exitActor()),{locked:!!searchUI.locked});}

const newTrackUI=()=>({view:'list',selectedId:null,fileId:null,name:'',notice:'',error:''});
let trackUI=newTrackUI();
let trackEditor={draft:null,selectedPointId:null,nextPointKind:'via',results:[],notice:'',error:'',routeKey:'',copySource:null};
let trackEditorActive=false,trackEditorHref='/track-builder',trackEditorDrag=null,trackEditorExitDialog=false,trackEditorIgnoreMapClickUntil=0;
const trackRouting=createTrackRoutingController({service:createTrackRoutingService(),getContext:()=>location.pathname==='/track-builder'&&trackEditor.draft?.coordinateSpace==='wgs84'?{id:trackEditor.routeKey,ownerId:currentUser?.user_id,draft:trackEditor.draft}:null,onResult:(id,route)=>{trackEditor={...trackEditor,draft:applyTrackRoute(trackEditor.draft,id,route)};render();},onStatus:notice=>{if(trackEditor.notice===notice)return;trackEditor={...trackEditor,notice};render();}});
const trackPlaces=[{name:'Forêt de Fontainebleau',subtitle:'Lieu fictif · démonstration',center:{x:180,y:150}},{name:'Sentier des crêtes',subtitle:'Lieu fictif · démonstration',center:{x:180,y:150}},{name:'Place du village',subtitle:'Adresse fictive · démonstration',center:{x:180,y:150}}];
function ensureTrackEditor(){
 const key=`${location.pathname}${location.search}`;
 if(trackEditor.routeKey===key&&trackEditor.draft)return;
 const params=new URLSearchParams(location.search),editId=params.get('edit'),copyId=params.get('copy');
 if(editId){const item=trackLibrary.get(editId);trackEditor={draft:createTrackDraft({track:item}),selectedPointId:null,nextPointKind:'via',results:[],notice:'',error:'',routeKey:key,copySource:null};}
 else if(copyId){const row=trackListView(trackLibrary.list(),sessionCatalog.list()).find(item=>item.id===copyId),source=row?.copySource;
  if(!source){trackEditor={...trackEditor,draft:createTrackDraft(),notice:'Géométrie indisponible : aucune copie créée.',routeKey:key,copySource:null};}
  else {const copySource={...source,sourceId:row.id,name:row.name};trackEditor={draft:createTrackDraft({copySource}),selectedPointId:null,nextPointKind:'via',results:[],notice:'Copie locale créée · la source reste en lecture seule.',error:'',routeKey:key,copySource};}
 }else trackEditor={draft:createTrackDraft({geographic:true}),selectedPointId:null,nextPointKind:'via',results:[],notice:'',error:'',routeKey:key,copySource:null};
 trackEditorActive=true;trackEditorHref=key;
}
function renderTrackEditor(){ensureTrackEditor();return TrackBuilderScreen({editorDraft:trackEditor.draft,dogs:dogsStore.list(),results:trackEditor.results,fixtures:gpxFixtures,selectedPointId:trackEditor.selectedPointId,nextPointKind:trackEditor.nextPointKind,notice:trackEditor.notice,error:trackEditor.error},trackLibrary.list());}
function communitySourceOptions(){
 return buildCommunitySourceOptions({sessionRecords:sessionCatalog.list(),tracks:trackLibrary.list(),dogs:dogsStore.list()});
}
function communitySourceFromLocation(){
 const params=new URLSearchParams(location.search),type=params.get('sourceType'),id=params.get('sourceId');
 if(!type&&!id)return null;
 if(type==='operational')return {type:'operational',blocked:true,reason:'Les missions OPS ne peuvent pas être partagées dans Communauté.'};
 return communitySourceOptions().find(item=>item.type===type&&item.id===id)||{type:type||'',id:id||'',blocked:true,reason:'Cette session ou cette piste n’est plus disponible.'};
}
function renderCommunity(route){
 return CommunityScreen({route,store:communityStore,dogs:dogsStore.list(),tracks:trackListView(trackLibrary.list(),sessionCatalog.list()),source:route.type==='new'?communitySourceFromLocation():null,sourceOptions:communitySourceOptions(),query:new URLSearchParams(location.search).get('q')||'',shareMode:new URLSearchParams(location.search).get('share')||'post'});
}
function profileConsentSummary(){
 const consent=scientificContributionStore.snapshot();
 const eligible=scientificContributionFixtures.sessions.filter(item=>item.contributorKey===scientificContributionActor.contributorKey).map(item=>scientificContributionStore.sessionInclusionState(item.sourceKey));
 return {...consent,eligibleSessionCount:eligible.filter(state=>!['excluded_by_user','excluded_sensitive','not_eligible'].includes(state)).length,excludedSessionCount:eligible.filter(state=>['excluded_by_user','excluded_sensitive','not_eligible'].includes(state)).length};
}
function renderProfile(route){
 const notifications=communityStore.getNotificationStore();
 return ProfileScreen({route,user:currentUser,profileStore,dogs:dogsStore.list(),communityProfile:communityStore.getProfile(communityStore.viewerId),jumolfAccess:jumolfAccess(),jumolfState:jumolfStore.snapshot(),consent:profileConsentSummary(),scientificAccess:scientificCorpusAccessFor(currentUser),adminAccess:adminStore.accessFor(currentUser),notificationPreferences:notifications.getPreferences(communityStore.viewerId),appVersion:adminCurrentVersion()});
}
function makeCommunityController(){return createCommunityController({store:communityStore,sourceOptions:communitySourceOptions,origin:location.origin,navigate:path=>{history.pushState({},'',path);render(true);},render:()=>render(),toast:Toast});}
let communityController=makeCommunityController();
function parseJumolfPath(path){
 if(!path)return null;
 const match=String(path).match(/([ML])\s*(-?[\d.]+)\s+(-?[\d.]+)/g)||[];
 const points=match.map(command=>{const [,x,y]=command.match(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/)||[];return {x:Number(x),y:Number(y)};}).filter(point=>Number.isFinite(point.x)&&Number.isFinite(point.y));
 return points.length?points:null;
}
function jumolfRawSources(){
 const sessions=[];
 for(const record of sessionCatalog.list()){
  if(record.tracerState?.gpsPose||record.searchState?.gpsSearch||!['DEBRIEF','ARCHIVED'].includes(record.searchState?.phase))continue;
  const report=debriefView(record.searchState,record.preparationState,record.tracerState);
  if(!report?.map)continue;
  const paths=report.map.paths||[],searchPaths=paths.filter(path=>path.kind==='search').map(path=>parseJumolfPath(path.d)).filter(Boolean),reference=paths.filter(path=>path.kind==='reference').flatMap(path=>parseJumolfPath(path.d)||[]);
  const trace=searchPaths.flat();
  const dog=report.summary?.dog;
  sessions.push({id:record.session.id,kind:'coaching',title:record.session.code||record.session.title||'Session terminée',status:report.summary?.status||record.searchState.phase,dog:dog?{id:dog.id,name:dog.name,breed:dog.breed}:null,dogId:dog?.id||null,terrain:record.session.terrain||null,trace,referenceTrace:reference.length?reference:null,events:(report.events||[]).map(event=>({type:event.text||event.type,timestamp:event.at||null})),metrics:{...(Number.isFinite(report.summary?.searchDistance)?{distanceM:report.summary.searchDistance}:{}),...(Number.isFinite(report.summary?.searchSeconds)?{durationSeconds:report.summary.searchSeconds}:{})},trackAge:Number.isFinite(report.temporal?.trackAgeAtSearchStart)?{seconds:report.temporal.trackAgeAtSearchStart,provenance:'calculated'}:null,provenance:{trace:'calculated',referenceTrace:'calculated',distance:'calculated'}});
 }
 const operational=operationalStore.list().map(mission=>({...mission,trackingElapsedMs:operationalStore.trackingElapsedMs(mission.id)}));
 return {dogs:dogsStore.list(),sessions,tracks:trackLibrary.list(),operational};
}
function makeJumolfController(){return createJumolfController({store:jumolfStore,getRawSources:jumolfRawSources,navigate:path=>{history.pushState({},'',path);render(true);},render:()=>render(),toast:Toast});}
let jumolfController=makeJumolfController();
const scientificDataset=generateJumolfSyntheticDataset();
const scientificAnalytics=buildJumolfSyntheticAnalytics(scientificDataset.sessions);
const scientificAnomalies=detectJumolfSyntheticAnomalies(scientificDataset.sessions);
const scientificDiscoveries=buildJumolfDiscoveries(scientificDataset.sessions);
const scientificContributionFixtures=createScientificContributionFixtures();
const contributionMockUserId='contributor-03';
const contributionMockDogKey=scientificContributionFixtures.dogs.find(dog=>dog.contributorKey===scientificContributionFixtures.contributors.find(user=>user.mockUserId===contributionMockUserId)?.sourceKey)?.sourceKey;
const contributionMockSessionStates=Object.fromEntries(scientificContributionFixtures.inclusionEvents.filter(item=>scientificContributionFixtures.sessions.find(session=>session.sourceKey===item.sessionKey)?.contributorKey===scientificContributionFixtures.contributors.find(user=>user.mockUserId===contributionMockUserId)?.sourceKey).map(item=>[item.sessionKey,item.state]));
const scientificContributionStore=createScientificConsentStore({mockUserId:contributionMockUserId,initialSessionStates:contributionMockSessionStates});
const scientificContributionActor={userId:contributionMockUserId,role:'contributor',contributorKey:scientificContributionFixtures.contributors.find(user=>user.mockUserId===contributionMockUserId)?.sourceKey,displayName:'Contributeur fictif 03',dogKey:contributionMockDogKey};
const scientificContributionController=createScientificContributionController({store:scientificContributionStore,fixtures:scientificContributionFixtures,actor:scientificContributionActor,navigate:path=>{history.pushState({},'',path);render(true);},render:()=>render(),confirm:message=>window.confirm(message)});
let scientificActor=null;
let scientificController=createScientificController({actor:currentUser,dataset:scientificDataset,analytics:scientificAnalytics,anomalies:scientificAnomalies,discoveries:scientificDiscoveries,navigate:path=>{history.pushState({},'',path);render(true);},render:()=>render(),toast:Toast});
let scientificCorpusController=createScientificCorpusController({access:scientificCorpusAccessFor(currentUser),corpusService:createScientificContributionCorpusService(buildScientificContributionCorpus({fixtures:scientificContributionFixtures,consentStores:new Map([[contributionMockUserId,scientificContributionStore]])})),navigate:path=>{history.pushState({},'',path);render(true);},render:()=>render()});
function editorChange(nextDraft,patch={}){trackEditor={...trackEditor,...patch,draft:nextDraft,error:''};render();}
function requestTrackEditorExit(destination,{replace=false}={}){
 if(trackEditorExitDialog)return;
 trackEditorExitDialog=true;
 ConfirmationDialog({title:'Quitter sans enregistrer ?',description:'Les modifications de ce brouillon seront perdues.',onConfirm:()=>{trackEditorExitDialog=false;trackEditorActive=false;trackEditor={...trackEditor,draft:null,routeKey:''};history[replace?'replaceState':'pushState']({},'',destination);render(true);}});
 document.querySelector('dialog [data-cancel]')?.addEventListener('click',()=>{trackEditorExitDialog=false;},{once:true});
}
window.addEventListener('beforeunload',event=>{if(trackEditorActive&&trackEditor.draft?.dirty){event.preventDefault();event.returnValue='';}});
function restoreTrackLibraryForUser(){const ownerId=currentUser?.user_id||null;if(ownerId===trackLibraryOwnerId)return;trackLibraryOwnerId=ownerId;trackLibrary=createTrackLibrary({storage,ownerId});trackLibraryWarningShown='';trackEditor={...trackEditor,draft:null,selectedPointId:null,routeKey:'',copySource:null};trackEditorActive=false;}
function render(focus=false) {
 const creatorPanelWasOpen=document.querySelector('[data-creator-panel]')?.open===true;
 document.querySelector('[data-coaching-help-dialog]')?.close();
 currentUser=auth.getSession().user;
 if(currentUser&&!adminStore.accountIsActive(currentUser.user_id)){auth.signOut();currentUser=null;history.replaceState({},'','/auth');return render(focus);}
 const requested=location.pathname.replace(/\/$/,'') || '/';
 const scientificEntry=canonicalScientificPath(requested);
 if(scientificEntry!==requested)history.replaceState({},'',`${scientificEntry}${location.search}${location.hash}`);
 if(requested==='/olfactory-twin'){history.replaceState({},'','/jumolf');return render(focus);}
 const route=resolveMockRoute(scientificEntry,auth.getSession());
 restoreTrackLibraryForUser();
 restoreOperationalGpsForUser();
 const operationalRoute=resolveOperationalRoute(route);
 const operationalMission=operationalRoute?.missionId?operationalStore.get(operationalRoute.missionId):null;
 const operationalView=operationalMission?operationalMissionView(operationalMission,{dogs:dogsStore.list()}):null;
 const consultation=resolveConsultationRoute(route);
 if(route!==scientificEntry)history.replaceState({},'',`${route}${location.search}${location.hash}`);
 currentUser=auth.getSession().user;
 if(exitRoute!==route){exitEpoch++;exitDialog?.close();exitDialog=null;searchUnlockController?.cancel();searchUnlockController=null;exitRoute=route;}
 if(qaInitialized&&route!=='/qa/coaching'&&normalCoachingBeforeQa){const n=normalCoachingBeforeQa;coachingDraft=n.draft;preparationState=n.preparationState;tracerState=n.tracerState;searchState=n.searchState;terrainOpen=n.terrainOpen;coachingReferenceAssignment=n.referenceAssignment;tracerUI=n.tracerUI;searchUI=n.searchUI;preparationUI=n.preparationUI;exitSavePending=n.exitSavePending;normalCoachingBeforeQa=null;qaInitialized=false;}
 restoreCoachingHistoryForUser();
 restoreCoachingPreparationForUser();
 tracerGps.reconcile();
 driverGps.reconcile();
 opsGps.reconcile();
 if(scientificActor!==currentUser){scientificActor=currentUser;scientificController=createScientificController({actor:currentUser,dataset:scientificDataset,analytics:scientificAnalytics,anomalies:scientificAnomalies,discoveries:scientificDiscoveries,navigate:path=>{history.pushState({},'',path);render(true);},render:()=>render(),toast:Toast});}
 scientificCorpusController.setContext({access:scientificCorpusAccessFor(currentUser),corpusService:createScientificContributionCorpusService(buildScientificContributionCorpus({fixtures:scientificContributionFixtures,consentStores:new Map([[contributionMockUserId,scientificContributionStore]])}))});
 coachingDraft=coaching.syncPreparation(coachingDraft,trackLibrary.list());
 invalidateCoachingReferenceAssignment();
 const dogsRoute=resolveDogsRoute(route);
 const communityRoute=resolveCommunityRoute(route);
 const profileRoute=resolveProfileRoute(route);
 const jumolfRoute=resolveJumolfRoute(route)?route:null;
 const scientificRoute=resolveScientificRoute(route)?route:null;
 const scientificContributionRoute=resolveScientificContributionRoute(route);
 const dogForTitle=dogsRoute?.dogId?dogsStore.get(dogsRoute.dogId):null;
 captureCoachingHistory();
 captureCoachingPreparation();
 const adminRoute=resolveAdminRoute(`${route}${location.search}`);
 const adminTitle=adminRoute?({dashboard:'Console Admin',members:'Membres',member:'Fiche membre',premium:'Premium & JUMOLF',codes:'Codes JUMOLF',scientific:'Gouvernance scientifique',services:'Services · Simulation Admin',deployments:'Déploiements · Simulation Admin',errors:'Erreurs · Simulation Admin',audit:'Audit Admin',unknown:'Console Admin'}[adminRoute.type]||'Console Admin'):null;
 const profileTitle=profileRoute?({home:'Profil',account:'Mon compte',dogs:'Mes chiens',premium:'Premium & JUMOLF',access:'Mes accès',notifications:'Notifications',preferences:'Préférences',about:'Aide & À propos'}[profileRoute.type]||'Profil'):null;
 const title=adminTitle|| (profileTitle|| (scientificRoute?'Espace scientifique privé':scientificContributionRoute?routes[route]?.[0]||'Contribution scientifique':jumolfRoute?'JUMOLF · Jumeau olfactif':route.startsWith('/live')?'Live':route==='/notifications'?'Notifications':route==='/notifications/preferences'?'Préférences notifications':communityRoute?({feed:'Communauté',profile:communityStore.getProfile(communityRoute.id)?.displayName||'Profil Communauté',post:'Publication Communauté',new:'Nouvelle publication',search:'Recherche Communauté',contacts:'Contacts'}[communityRoute.type]||'Communauté'):operationalRoute?.type==='replay'?'Replay opérationnel':operationalRoute?.type==='mission'?operationalView?.title||'Mission opérationnelle':operationalRoute?'Pistage opérationnel':route==='/track-builder'?'Créateur de tracé':dogsRoute?.type==='list'?'Mes chiens':dogsRoute?.type==='create'?'Ajouter un chien':dogsRoute?.type==='edit'?'Modifier le profil':dogsRoute?dogForTitle?.name||'Profil chien':consultation?.type==='session-list'?'Sessions':consultation?.type==='track-list'?'Mes pistes':consultation?.type==='track-detail'?trackDetailView(trackListView(trackLibrary.list(),sessionCatalog.list()),consultation.id)?.name||'Piste':consultation?.type==='session-detail'||consultation?.type==='session-debrief'||consultation?.type==='session-replay'?sessionCatalog.get(consultation.id)?.session?.title||'Session':routes[route]?.[0]||'Page introuvable'));
 document.title=`${title} · PISTE Community`;
 const operationalTerrain=operationalUI.terrainMissionId===operationalMission?.id&&operationalRoute?.type==='mission';
 const jumolfContent=jumolfRoute?JumolfShell(jumolfRoute,jumolfController.screen(`${jumolfRoute}${location.search}`)):null;
 const scientificScreen=scientificRoute?.startsWith('/scientific/corpus')?scientificCorpusController.screen(`${scientificRoute}${location.search}`):scientificRoute?scientificController.screen(`${scientificRoute}${location.search}`):null;
 const scientificContent=scientificRoute?ScientificShell(scientificRoute,scientificScreen,currentUser):null;
 const content=adminRoute?adminController.screen(adminRoute):scientificContent||scientificContributionRoute?scientificContent||scientificContributionController.screen(route):profileRoute?renderProfile(profileRoute):jumolfContent|| (operationalTerrain?OperationalTerrainScreen(operationalView):operationalRoute?operationalRoute.type==='replay'?OperationalReplayScreen(operationalReplayView(operationalMission)):OperationalScreen({route:operationalRoute,missions:operationalStore.list(),dogs:dogsStore.list(),view:operationalView,livePolicy:operationalMission?communityLiveStore.getSessionPolicy('ops',operationalMission.id):{},ui:{...operationalUI,gps:opsGps.view(),allowGps:canUseOperationalGps(operationalGpsContext()),handler:{id:'mock-current-user',name:currentUser.name}}}):route.startsWith('/live')?renderLive(route):route==='/notifications'?NotificationsScreen(communityStore.getNotificationStore().list(communityStore.viewerId),communityStore.getNotificationStore().unreadCount(communityStore.viewerId)):route==='/notifications/preferences'?NotificationPreferencesScreen(communityStore.getNotificationStore(),communityStore.viewerId):dogsRoute?renderDogs(dogsRoute):communityRoute?renderCommunity(communityRoute):consultation?.type==='session-list'?renderSessions():consultation?.type==='session-detail'?renderSessionDetail(consultation.id):consultation?.type==='session-debrief'?renderSessionDebrief(consultation.id):consultation?.type==='session-replay'?renderSessionReplay(consultation.id):consultation?.type==='track-list'?renderTracks():consultation?.type==='track-detail'?renderTrackDetail(consultation.id):route==='/'?HomeScreen(currentUser,homeActiveSessionView(sessionCatalog,mock.activeSessions,{currentSessionId:coachingDraft.session?.id}),jumolfAccess(),adminStore.accessFor(currentUser).allowed):route==='/new-session'?CoachingScreen(coachingDraftWithContacts(coachingDraft,communityStore),'',trackLibrary.list(),authorizedCoachingContacts(communityStore),coachingDraft.session?communityLiveStore.getSessionPolicy('coaching',coachingDraft.session.id):{},coachingReferenceAssignmentView(),coachingReferenceDelegationView()):route==='/coaching/session'?renderPreparation():route==='/qa/coaching'?renderCoachingQa():route==='/track-builder'?renderTrackEditor():PlaceholderScreen(route,currentUser,jumolfAccess()));
 document.querySelector('#app').innerHTML=route.startsWith('/auth') ? AuthScreen(route) : AppShell(content,route,currentUser.name,currentUser.initials || currentUser.name.slice(0,1),themeForRoute(route),communityStore.getNotificationStore().unreadCount(communityStore.viewerId));
 mountGpsMaps({livePose:ownsOperationalGps(operationalGpsContext())?operationalMission.gpsTrack:ownsDriverGps(gpsContext())?searchState.gpsSearch:ownsTracerGps(gpsContext())?tracerState.gpsPose:null,lastFix:ownsOperationalGps(operationalGpsContext())?opsGps.view().lastFix:ownsDriverGps(gpsContext())?driverGps.view().lastFix:ownsTracerGps(gpsContext())?tracerGps.view().lastFix:null});
 mountTrackEditorMap({draft:trackEditor.draft,onAdd:point=>{try{const draft=addTrackPoint(trackEditor.draft,{...point,kind:trackEditor.nextPointKind});editorChange(draft,{selectedPointId:draft.points.at(-1).id,nextPointKind:'via'});}catch(error){Toast(error.message);}},onMove:(id,point)=>{try{editorChange(moveTrackPoint(trackEditor.draft,id,point),{selectedPointId:id});}catch(error){Toast(error.message);}},onSelect:id=>{trackEditor.selectedPointId=id;render();},onView:mapView=>{if(trackEditor.draft&&location.pathname==='/track-builder')trackEditor.draft={...trackEditor.draft,mapView};}});
 trackRouting.reconcile();
 if(creatorPanelWasOpen){const panel=document.querySelector('[data-creator-panel]');if(panel)panel.open=true;}
 const trackWarning=trackLibrary.persistenceWarning?.();if(trackWarning&&trackWarning!==trackLibraryWarningShown){trackLibraryWarningShown=trackWarning;Toast(trackWarning);}
 showCoachingHistoryWarning();
 showCoachingPreparationWarning();
 if(operationalChronoInterval)clearInterval(operationalChronoInterval);
 operationalChronoInterval=null;
 if(gpsChronoInterval)clearInterval(gpsChronoInterval);
 gpsChronoInterval=null;
 const gpsClock=document.querySelector('[data-gps-clock]');
 if(gpsClock&&!gpsClock.closest('[data-gps-kind="ops"]')&&(tracerState.gpsPose?.phase==='active'||searchState.gpsSearch?.phase==='active')){const update=()=>{const n=Math.floor((searchState.gpsSearch?.phase==='active'?searchGpsActiveMs(searchState):Math.max(0,Date.now()-tracerState.gpsPose.startedAt))/1000);gpsClock.textContent=`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;};update();gpsChronoInterval=setInterval(update,1000);}
 if(coachingAgeInterval)clearInterval(coachingAgeInterval);
 coachingAgeInterval=null;
 if(operationalRoute?.type==='mission'&&operationalMission?.trackingState==='active'){
  const chrono=document.querySelector('[data-operational-chrono]');
  if(chrono){const update=()=>{const seconds=Math.floor(operationalStore.trackingElapsedMs(operationalMission.id)/1000);chrono.textContent=operationalMission.gpsTrack?formatOperationalGpsClock(seconds*1000):`${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds%3600/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;};update();operationalChronoInterval=setInterval(update,1000);}
 }
 const coachingAge=document.querySelector('[data-coaching-track-age]');
 if(coachingAge&&searchState.track_finished_at){
  const update=()=>{const age=trackAgeSeconds(searchState,Date.now());coachingAge.querySelector('strong').textContent=formatTrackAge(age);};
  update();coachingAgeInterval=setInterval(update,1000);
 }
 segment='Toutes';
 window.__PISTE_PROTOTYPE__=debugSnapshot(route);
 syncNavigationHeight();
 if(focus) { window.scrollTo(0,0); document.querySelector('main').focus({preventScroll:true}); }
}
function renderDogs(route) {
 if(route.type==='list')return DogsListScreen(dogsStore.list());
 if(route.type==='create')return DogFormScreen();
 const dog=dogsStore.get(route.dogId);
 if(!dog)return DogNotFoundScreen();
 return route.type==='edit'?DogFormScreen(dog):DogProfileScreen(dog);
}
function refreshDogPhotoPreview(form) {
 const existing=form.dataset.dogId?dogsStore.get(form.dataset.dogId):null;
 const photo=form.dataset.personalPhotoDataUrl??existing?.personalPhotoDataUrl??null;
 const dog={...(existing||{}),name:form.elements.name.value||'Nouveau chien',portrait:form.elements.portrait.value,personalPhotoDataUrl:photo};
 form.querySelector('[data-dog-photo-preview]').innerHTML=DogPhotoMarkup(dog,'dog-form-photo-preview-frame');
}
function resetCoachingQa(mode=qaMode,scenario=qaScenario){
 tracerGps.pause();driverGps.pause();
 if(!qaInitialized)normalCoachingBeforeQa=structuredClone({draft:coachingDraft,preparationState,tracerState,searchState,terrainOpen,referenceAssignment:coachingReferenceAssignment,tracerUI,searchUI,preparationUI,exitSavePending});
 cleanupCoachingExit();
 coachingReferenceAssignment=null;
 qaMode=mode;qaScenario=scenario;
 qaInitialized=true;
 const qa=createCoachingQa(qaMode,currentUser,[{id:'nox',...mock.dog}],qaScenario);
 preparationState=preparation.simulate(qa.preparation,{gps:'fresh'});
 preparationState=selectQaPerspective(preparationState,qaScenario==='external_traceur'||qaScenario==='external_driver_recorded'?'driver':'traceur');
 tracerState=qa.tracer;searchState=qa.search;terrainOpen=false;tracerUI={};searchUI={};debriefUI={tab:'summary'};preparationUI={simulatorOpen:false,feedback:''};qaUI={error:''};
}
function renderCoachingQa(){
 if(!qaInitialized)resetCoachingQa();
 const panel=CoachingQaPanel(searchState,preparationState,tracerState,{...searchUI,...qaUI,terrainOpen,tracerPhase:tracerState.phase,tracerProgress:tracerState.cursor});
 return panel+renderPreparation();
}
function renderSessions(){
 const dogId=new URLSearchParams(location.search).get('dog')||'';
 const dog=dogId?dogsStore.get(dogId):null;
 const query=new URLSearchParams(location.search).get('q')||'';
 const rows=sessionListView(sessionCatalog,{filter:segment,query,dogId,currentSessionId:coachingDraft.session?.id,operationalMissions:operationalStore.list()});
 return SessionListScreen(rows,{filter:segment,query,dogId,dogName:dog?.name||''});
}
function renderSessionDetail(id){
 const operational=operationalStore.get(id);
 if(operational)return OperationalSessionDetailScreen(operational);
 const record=sessionCatalog.get(id);
 if(record)return SessionDetailScreen(sessionDetailView(record,{currentSessionId:coachingDraft.session?.id}));
 const row=sessionListView(sessionCatalog,{}).find(item=>item.id===id&&item.kind==='summary-demo');
 if(!row)return SessionDetailScreen(null);
 return SessionDetailScreen({...row,dog:{name:row.dogName},participants:[],creatorRole:'Aucune donnée disponible',readOnly:true,report:null,observations:[]});
}
function renderSessionDebrief(id){
 const record=sessionCatalog.get(id);
 if(isExitClosure(record?.searchState?.phase))return CoachingClosureScreen(coachingClosureView(record));
 if(!record||!['DEBRIEF','ARCHIVED'].includes(record.searchState?.phase))return SessionDetailScreen(null);
 return DebriefScreen(record.searchState,record.preparationState,record.tracerState,debriefUI,{readOnly:true});
}
function renderSessionReplay(id){const record=sessionCatalog.get(id);if(record?.tracerState?.gpsPose||record?.searchState?.gpsSearch){if(isExitClosure(record.searchState.phase))return CoachingClosureScreen(coachingClosureView(record));if(!['DEBRIEF','ARCHIVED'].includes(record.searchState.phase))return SessionDetailScreen(null);return DebriefScreen(record.searchState,record.preparationState,record.tracerState,{tab:'map'},{readOnly:true});}const operational=operationalStore.get(id);if(operational)return OperationalReplayScreen(operationalReplayView(operational));return SessionReplayScreen(sessionReplayView(sessionCatalog.get(id)));}
function renderTracks(){return TrackListScreen(trackListView(trackLibrary.list(),sessionCatalog.list()),completedSessionHistoryView(sessionCatalog,{currentSessionId:coachingDraft.session?.id}));}
function renderTrackDetail(id){return TrackDetailScreen(trackDetailView(trackListView(trackLibrary.list(),sessionCatalog.list()),id));}
function renderLive(route){
 const match=route.match(/^\/live(?:\/(coaching|ops)\/([^/]+))?$/);
 if(!match)return LiveDetailScreen(null);
 const [,type,rawId]=match;
 if(type){const id=decodeURIComponent(rawId);const projection=resolveCommunityLiveProjection({type,id,viewerId:communityStore.viewerId,liveStore:communityLiveStore,coaching:{session:coachingDraft.session,searchState,preparationState,tracerState},mission:operationalStore.get(id)});return LiveDetailScreen(projection);}
 const ownSessions=[];
 if(coachingDraft.session?.id&&['LAYING','SEARCH_RUNNING'].includes(searchState.phase)&&communityLiveStore.getSessionPolicy('coaching',coachingDraft.session.id).share_live)ownSessions.push({sessionId:coachingDraft.session.id,sessionType:'coaching',title:coachingDraft.dogs.find(dog=>dog.id===coachingDraft.dogId)?.name||'Coaching en cours',ownerDisplayName:communityStore.getProfile(communityStore.viewerId)?.displayName||currentUser.name,state:searchState.phase});
 for(const mission of operationalStore.list())if(mission.status==='En cours'&&communityLiveStore.getSessionPolicy('ops',mission.id).share_live)ownSessions.push({sessionId:mission.id,sessionType:'ops',title:mission.dog?.name||'Pistage en cours',ownerDisplayName:communityStore.getProfile(communityStore.viewerId)?.displayName||currentUser.name,state:mission.trackingState==='paused'?'Pause':'En cours'});
 return LiveScreen({ownSessions,contactSessions:[],invitations:[]});
}
function renderPreparation(){
 const content=renderPreparationContent();
 if(!preparationState)return content;
 return content.replace('</header>',renderSessionExitMenu()+'</header>');
}
function renderPreparationContent(){
 if(!preparationState)return `<section class="coaching-flow prep-flow" data-coaching-no-current-session>${EmptyState('Aucune session en cours','La session courante n’est plus en mémoire. Vos sessions terminées et archivées sauvegardées sur cet appareil restent accessibles dans Sessions.','route')}<a class="button button-gold" href="/sessions">Voir mes sessions</a></section>`;
 const v=preparationState?preparation.preparationView(preparationState):null;
 if(preparationState)searchState=syncSession(searchState,preparationState,tracerState);
 if(coachingDraft.session?.id&&['LAYING','SEARCH_RUNNING'].includes(searchState.phase)&&!notifiedCoachingStarts.has(coachingDraft.session.id)){
  notifiedCoachingStarts.add(coachingDraft.session.id);
  communityLiveStore.notifySessionStarted('coaching',coachingDraft.session.id,{dogName:coachingDraft.dogs.find(dog=>dog.id===coachingDraft.dogId)?.name||null});
 }
 if(isExitClosure(searchState.phase))return CoachingClosureScreen(coachingClosureView(exitSnapshot()))+(exitSavePending?'<section class="card"><p role="status">Sauvegarde locale non achevée. Les données restent en mémoire.</p><button class="button button-gold" data-session-exit="retry">Réessayer la sauvegarde</button></section>':'');
 if(!canParticipate(preparationState,preparationState.viewerId))return '<section class="coaching-flow"><header><h1>Participation arrêtée</h1><p>Votre contribution est conservée. Aucun suivi ni commande terrain ne reste actif pour vous.</p></header></section>'+ObserverScreen(searchState,preparationState,tracerState);
 if(['DEBRIEF','ARCHIVED'].includes(searchState.phase))return DebriefScreen(searchState,preparationState,tracerState,debriefUI);
 if(v?.role==='coach')return CoachScreen(searchState,preparationState,tracerState,preparationUI);
 if(v?.role==='observer')return ObserverScreen(searchState,preparationState,tracerState);
 if(v?.role==='driver'&&!searchUI.showPreparation&&!(terrainOpen&&preparationState.productScenario==='external_driver_recorded')&&(preparationState.productScenario!=='external_driver_recorded'||searchState.phase!=='PREPARATION')){const screen=SearchScreen(searchState,preparationState,{...searchUI,gps:driverGps.view(),allowGps:canUseDriverGps(gpsContext()),pose:searchState.gpsSearch?visibleGpsPoseForDriver(preparationState,tracerState):null,messages:tracer.sessionMessages(tracerState,preparationState).messages,unreadCount:tracer.sessionMessages(tracerState,preparationState).unread});return searchState.phase==='SEARCH_RUNNING'||searchUI.locked?screen:screen.replace('</header>','</header>'+SessionNotice(searchState,preparationState,tracerState));}
 if(terrainOpen&&((v?.role==='traceur'&&preparationState.traceurKind==='internal')||(v?.role==='driver'&&preparationState.productScenario==='external_driver_recorded')))return TracerScreen(tracerState,preparationState,{...tracerUI,allowGps:canUseTracerGps(gpsContext()),gps:tracerGps.view()}).replace('<section class="tracer-hud"',SessionNotice(searchState,preparationState,tracerState)+'<section class="tracer-hud"');
 return PreparationScreen(preparationState,{...preparationUI,referenceResponse:coachingReferenceResponseView(),referenceChoices:preparation.sessionReferenceChoices(preparationState,preparationState.session.traceType==='gpx'?gpxFixtures:trackLibrary.list(),{knownPeople:qaInitialized?[]:coachingDraft.knownPeople||[]}),referenceResponseTest:!qaInitialized&&coachingReferenceAssignment?.state.sessionId===preparationState.session.id&&v?.role==='traceur'&&preparationState.viewerId===coachingDraft.session?.roles.traceur&&preparationState.scenario==='session'})+(v?.role==='driver'&&searchUI.showPreparation?'<button class="button button-dark" data-search="return">Ouvrir le cockpit Conducteur (DEV)</button>':'');
}
function filterSessions() {
 const query=(document.querySelector('input[type=search]')?.value || '').toLocaleLowerCase('fr');
 const dogId=new URLSearchParams(location.search).get('dog')||'';
 const rows=sessionListView(sessionCatalog,{filter:segment,query,dogId,currentSessionId:coachingDraft.session?.id,operationalMissions:operationalStore.list()});
 document.querySelector('#session-results').innerHTML=SessionListResults(rows);
}
document.addEventListener('click',event=>{
 const help=event.target.closest('[data-coaching-help]');if(help){openCoachingHelp(document,help.dataset.coachingHelp,help);return;}
 if(profileController.handleClick(event))return;
 if(scientificContributionController.handleClick(event))return;
 if(scientificCorpusController.handleClick(event))return;
 if(scientificController.handleClick(event))return;
 if(jumolfController.handleClick(event))return;
 const notificationOpen=event.target.closest('[data-notification-open]');
 if(notificationOpen)communityStore.markNotificationRead(notificationOpen.dataset.notificationOpen);
 const link=event.target.closest('a');
 if(link && link.origin===location.origin && !link.hash && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button===0) { event.preventDefault();const destination=link.pathname+link.search;if(trackEditorActive&&trackEditor.draft?.dirty&&destination!==trackEditorHref){requestTrackEditorExit(destination);return;}if(destination!==location.pathname+location.search){if(destination!=='/track-builder'&&!destination.startsWith('/track-builder?'))trackEditorActive=false;history.pushState({},'',destination);}render(true); return; }
 if(communityController.handleClick(event))return;
 const operationalMapMode=event.target.closest('[data-operational-map-mode]');
 if(operationalMapMode){const mode=operationalMapMode.dataset.operationalMapMode;const mission=operationalStore.get(resolveOperationalRoute(location.pathname)?.missionId);if(mode==='progress'&&mission?.trackingState!=='active'){Toast('La progression est indisponible pendant la pause.');return;}operationalUI={...operationalUI,mode:operationalUI.mode===mode?'':mode};render();return;}
 const opsControl=event.target.closest('[data-ops]');
 if(opsControl){const action=opsControl.dataset.ops;if(action==='events')operationalUI={...operationalUI,eventsOpen:true,notice:''};else if(action==='close-events')operationalUI={...operationalUI,eventsOpen:false};else if(action==='details')operationalUI={...operationalUI,showDetails:true};else if(action==='cockpit')operationalUI={...operationalUI,showDetails:false};render();return;}
 const operationalAction=event.target.closest('[data-operational-action]');
 if(operationalAction){
  const missionId=operationalAction.closest('[data-operational-status]')?.dataset.operationalMissionId||resolveOperationalRoute(location.pathname)?.missionId;
  try{
   const target=operationalStore.get(missionId),context=operationalGpsContext();
   if((target?.gpsTrack||operationalAction.dataset.operationalAction==='gps-enable')&&(context.route?.missionId!==missionId||context.mission?.ownerUserId!==context.user?.user_id))throw Error('Cette commande GPS ne correspond plus à votre mission.');
   if(operationalAction.dataset.operationalAction==='gps-enable'){tracerGps.pause();driverGps.pause();opsGps.activate();operationalUI={...operationalUI,showDetails:false};}
   else if(operationalAction.dataset.operationalAction==='gps-resume')opsGps.resume();
   else if(operationalAction.dataset.operationalAction==='start'){operationalStore.startTracking(missionId);if(operationalStore.get(missionId)?.gpsTrack){opsGps.seed();operationalUI={...operationalUI,showDetails:false};}const mission=operationalStore.get(missionId);communityLiveStore.notifySessionStarted('ops',missionId,{dogName:mission?.dog?.name||null});}
   else if(operationalAction.dataset.operationalAction==='pause'){operationalStore.pauseTracking(missionId);operationalUI={...operationalUI,mode:''};}
   else if(operationalAction.dataset.operationalAction==='resume')operationalStore.resumeTracking(missionId);
   else if(operationalAction.dataset.operationalAction==='stop'){operationalStore.stopTracking(missionId);opsGps.reconcile();operationalUI={...operationalUI,mode:'',terrainMissionId:null};}
   else if(operationalAction.dataset.operationalAction==='lock-screen'){operationalUI={...operationalUI,terrainMissionId:missionId};}
   else if(operationalAction.dataset.operationalAction==='complete')operationalStore.complete(missionId);
   else if(operationalAction.dataset.operationalAction==='archive')operationalStore.archive(missionId);
   render();
  }catch(error){Toast(error.message);}
  return;
 }
 const corridorToggle=event.target.closest('[data-operational-corridor-toggle]');
 if(corridorToggle){
  const missionId=corridorToggle.closest('[data-operational-mission-id]')?.dataset.operationalMissionId;
  try{operationalStore.setCorridorEnabled(missionId,corridorToggle.dataset.operationalCorridorToggle==='on');render();}catch(error){Toast(error.message);}
  return;
 }
 const operationalWeather=event.target.closest('[data-operational-weather-toggle]');
 if(operationalWeather){
  const missionId=operationalWeather.closest('[data-operational-mission-id]')?.dataset.operationalMissionId;
  try{operationalStore.setWeatherDemo(missionId,operationalWeather.dataset.operationalWeatherToggle==='on');render();}catch(error){Toast(error.message);}
  return;
 }
 const operationalGpx=event.target.closest('[data-operational-gpx-attach]');
 if(operationalGpx){
  const missionId=operationalGpx.closest('[data-operational-mission-id]')?.dataset.operationalMissionId;
  const fixtureId=document.querySelector('[data-operational-gpx-choice]')?.value;
  try{operationalStore.attachGpxDemo(missionId,fixtureId);render();}catch(error){Toast(error.message);}
  return;
 }
 const operationalMap=event.target.closest('.prep-map[data-operational-map] svg[data-operational-interactive="true"]');
 if(operationalMap&&operationalUI.mode){
  const missionId=operationalMap.closest('[data-operational-map]')?.dataset.operationalMap;
  const rawPoint=svgClientPointToMap({clientX:event.clientX,clientY:event.clientY,rect:operationalMap.getBoundingClientRect()});
  if(rawPoint&&missionId){
   const point={x:Number((rawPoint.x/3.6).toFixed(2)),y:Number((rawPoint.y/3).toFixed(2))};
   try{
    if(operationalUI.mode==='progress')operationalStore.addProgressPoint(missionId,point);
    else if(operationalUI.mode==='event')operationalStore.addEvent(missionId,{type:operationalUI.eventType,note:operationalUI.note,point});
    operationalUI={...operationalUI,mode:'',note:''};
    render();
   }catch(error){Toast(error.message);}
  }
  return;
 }
 const editorAction=event.target.closest('[data-editor-action]');
 if(editorAction&&location.pathname==='/track-builder'){
  const action=editorAction.dataset.editorAction;
  try{
   if(action==='toggle-route')editorChange(setTrackMode(trackEditor.draft,trackEditor.draft.activeMode==='follow'?'free':'follow'),{notice:''});
   else if(action==='retry-routing')trackRouting.retry();
   else if(action==='remove-last-segment')editorChange(removeLastTrackSegment(trackEditor.draft),{selectedPointId:null,nextPointKind:'via'});
   else if(action==='undo')editorChange(undoTrackEdit(trackEditor.draft),{selectedPointId:null});
   else if(action==='remove-point')editorChange(removeTrackPoint(trackEditor.draft,trackEditor.selectedPointId),{selectedPointId:null});
   else if(action==='clear')ConfirmationDialog({title:'Effacer tout le tracé ?',description:'Tous les points du brouillon seront retirés. Cette action peut être annulée avec Undo.',onConfirm:()=>{try{editorChange(clearTrackDraft(trackEditor.draft),{selectedPointId:null});}catch(error){trackEditor={...trackEditor,error:error.message};render();}}});
   else if(action==='cancel'){if(trackEditor.draft.dirty)requestTrackEditorExit('/tracks');else{trackEditorActive=false;trackEditor={...trackEditor,draft:null,routeKey:''};history.pushState({},'','/tracks');render(true);}}
   else if(action==='geo-center'){const lat=document.querySelector('[data-editor-lat]').value.trim(),lon=document.querySelector('[data-editor-lon]').value.trim();if(!lat||!lon)throw Error('Renseignez latitude et longitude.');centerTrackEditorMap(Number(lat.replace(',','.')),Number(lon.replace(',','.')));}
   else if(action==='locate'){const key=trackEditor.routeKey,mapElement=document.querySelector('[data-editor-real-map]');if(!navigator.geolocation)throw Error('Localisation indisponible.');navigator.geolocation.getCurrentPosition(position=>{if(location.pathname==='/track-builder'&&trackEditor.routeKey===key&&document.querySelector('[data-editor-real-map]')===mapElement)centerTrackEditorMap(position.coords.latitude,position.coords.longitude);},()=>Toast('Localisation indisponible ou refusée. Déplacez la carte manuellement.'),{enableHighAccuracy:true,timeout:15000,maximumAge:0});}
   else if(action==='recenter'&&trackEditor.draft.coordinateSpace==='wgs84'){recenterTrackEditorMap();}
   else if(action==='recenter'){trackEditor={...trackEditor,draft:{...trackEditor.draft,center:{x:180,y:150}},notice:'Carte fictive recentrée.',error:''};render();}
   else if(action==='search'){const query=trackEditor.draft.searchQuery.trim().toLocaleLowerCase('fr');const results=trackPlaces.filter(place=>!query||`${place.name} ${place.subtitle}`.toLocaleLowerCase('fr').includes(query));trackEditor={...trackEditor,results,notice:results.length?'Résultats fictifs · aucun géocodage effectué.':'Aucun lieu fictif correspondant.',error:''};render();}
  }catch(error){trackEditor={...trackEditor,error:error.message};render();}
  return;
 }
 const place=event.target.closest('[data-editor-place]');
 if(place){const result=trackEditor.results[Number(place.dataset.editorPlace)];if(result){trackEditor={...trackEditor,draft:{...trackEditor.draft,center:result.center,searchQuery:result.name},notice:`${result.name} · position fictive`,results:[]};render();}return;}
 const mode=event.target.closest('[data-editor-mode]');if(mode){editorChange(setTrackMode(trackEditor.draft,mode.dataset.editorMode));return;}
 const basemap=event.target.closest('[data-editor-basemap-choice]');if(basemap){trackEditor={...trackEditor,draft:{...trackEditor.draft,basemap:basemap.dataset.editorBasemapChoice}};render();return;}
 const placement=event.target.closest('[data-editor-placement]');if(placement){trackEditor={...trackEditor,nextPointKind:placement.dataset.editorPlacement};render();return;}
 const pointSelect=event.target.closest('[data-editor-select-point]');if(pointSelect){trackEditor={...trackEditor,selectedPointId:pointSelect.dataset.editorSelectPoint};render();return;}
 const fixture=event.target.closest('[data-editor-gpx-fixture]');if(fixture){const fixtureId=fixture.dataset.editorGpxFixture;const importFixture=()=>{try{const item=trackLibrary.importFixture(fixtureId);trackEditorActive=false;trackEditor={...trackEditor,draft:null,routeKey:''};history.pushState({},'',`/tracks/${encodeURIComponent(`prepared:${item.id}`)}`);render(true);}catch(error){trackEditor={...trackEditor,error:error.message};render();}};if(trackEditor.draft?.dirty)ConfirmationDialog({title:'Quitter sans enregistrer ?',description:'Les modifications de ce brouillon seront perdues.',onConfirm:importFixture});else importFixture();return;}
 const mapSvg=event.target.closest('[data-editor-map]');
 if(mapSvg){if(event.target.closest('[data-editor-point-id]')||Date.now()<trackEditorIgnoreMapClickUntil){trackEditorIgnoreMapClickUntil=0;return;}const point=svgClientPointToMap({clientX:event.clientX,clientY:event.clientY,rect:mapSvg.getBoundingClientRect()});if(point){try{const draft=addTrackPoint(trackEditor.draft,{...point,kind:trackEditor.nextPointKind});const selectedPointId=draft.points.at(-1)?.id;trackEditor={...trackEditor,draft,selectedPointId,nextPointKind:'via',error:''};render();}catch(error){trackEditor={...trackEditor,error:error.message};render();}}return;}
 const trackDetailAction=event.target.closest('[data-track-action]');
 if(trackDetailAction){const action=trackDetailAction.dataset.trackAction,id=trackDetailAction.dataset.libraryId;
  if(action==='copy-session'){history.pushState({},'',`/track-builder?copy=${encodeURIComponent(trackDetailAction.dataset.trackSource)}`);render(true);return;}
  if(action==='duplicate'){try{const item=trackLibrary.duplicatePrepared(id);history.pushState({},'',`/tracks/${encodeURIComponent(`prepared:${item.id}`)}`);render(true);}catch(error){Toast(error.message);}return;}
  if(action==='delete')ConfirmationDialog({title:'Supprimer ce tracé mock ?',description:'Le tracé préparé sera retiré de la bibliothèque de cette visite.',onConfirm:()=>{trackLibrary.remove(id);history.pushState({},'','/tracks');render(true);}});
  return;
 }
 const exitControl=event.target.closest('[data-session-exit]');if(exitControl){submitSessionExit(exitControl.dataset.sessionExit);return;}
 const qaReset=event.target.closest('[data-qa-reset]');
 if(qaReset){resetCoachingQa(qaMode,qaScenario);render(true);return;}
 const qaScenarioButton=event.target.closest('[data-qa-scenario]');
 if(qaScenarioButton){const option=qaScenarioOptions.find(item=>item.id===qaScenarioButton.dataset.qaScenario);if(option)resetCoachingQa(option.mode,option.scenario);render(true);return;}
 const qaCollapse=event.target.closest('[data-qa-collapse]');
 if(qaCollapse){qaUI={...qaUI,collapsed:!qaUI.collapsed,error:''};render();return;}
 const qaRun=event.target.closest('[data-qa-run]');
 if(qaRun){const step=nextQaAction(searchState,preparationState,{...searchUI,terrainOpen,tracerPhase:tracerState.phase,tracerProgress:tracerState.cursor}),target=step&&document.querySelector(step.selector);if(target){qaUI={error:''};target.click();}else{qaUI={error:'Le contrôle métier correspondant n’est pas disponible dans cette vue.'};render();}return;}
 const debriefTab=event.target.closest('[data-debrief-tab]');
 if(debriefTab&&preparationState){debriefUI={...debriefUI,tab:debriefTab.dataset.debriefTab};render();document.querySelector(`[data-debrief-tab="${debriefUI.tab}"]`)?.focus();return;}
 const debriefAction=event.target.closest('[data-debrief]');
 if(debriefAction&&preparationState){confirmCoachingArchiveAction(debriefAction);return;}
 const coachMessage=event.target.closest('[data-coach-message]');
 if(coachMessage){handleCoachingCoachMessages(coachMessage,coachMessage.dataset.text||'');if(preparationUI.messagesOpen)document.querySelector('#coach-reply')?.focus();return;}
 const coachControl=event.target.closest('[data-coach-search]');
 if(coachControl&&preparationState){try{const action=coachControl.dataset.coachSearch;if(!['pause','resume'].includes(action))throw Error('Commande Coach inconnue.');searchState=advanceSessionSearch(searchState,preparationState,action);}catch(error){searchUI.notice=error.message;}render(true);return;}
 const searchControl=event.target.closest('[data-search]');
 if(searchControl&&preparationState){
  const action=searchControl.dataset.search;
  try{
   if(action==='gps-enable'){driverGps.activate();}
   else if(action==='gps-resume'){driverGps.resume();}
   else if(action==='gps-center'){centerGpsMap();return;}
   else if(action==='dev'){searchUI.devOpen=true;searchUI.confirmFinish=false;}
   else if(action==='close-dev')searchUI.devOpen=false;
   else if(action==='return')searchUI.showPreparation=false;
   else if(action==='preparation'){searchUI.showPreparation=true;searchUI.devOpen=false;}
   else if(action==='release'){if(searchState.phase!=='LAYING_WAIT')throw Error('Attente de pose requise.');searchState=search.simulateSearch(searchState,{phase:'SEARCH_READY'});searchUI.devOpen=false;}
   else if(action==='finish'){if(!search.isSearchActor(preparationState)||searchState.phase!=='SEARCH_RUNNING')throw Error('Fin non autorisée.');searchUI.confirmFinish=true;}
   else if(action==='record-pause'){if(!searchUI.devOpen||searchUI.locked)throw Error('Déplacement en pause réservé au simulateur DEV ouvert.');searchState=advanceSessionSearch(searchState,preparationState,'record-pause');}
   else if(action==='pause'||action==='resume'){searchState=advanceSessionSearch(searchState,preparationState,action);}
   else if(action==='lock-screen'){searchUI={...searchUI,locked:true,messagesOpen:false};}
   else if(action==='unlock'&&event.detail===0){searchUI={...searchUI,locked:false};}
   else if(action==='messages'){tracerState=tracer.readMessages(tracerState,preparationState);searchUI={...searchUI,messagesOpen:true};}
   else if(action==='reply'){replyCoachingSearchMessage(searchControl.dataset.text);return;}
   else if(action==='close-messages')searchUI={...searchUI,messagesOpen:false};
   else if(action==='cancel-finish')searchUI.confirmFinish=false;
   else if(action==='confirm-finish'){if(!searchUI.confirmFinish)throw Error('Confirmation requise.');searchState=advanceSessionSearch(searchState,preparationState,'finish');searchUI.confirmFinish=false;}
   else if(action==='external-ready'){preparationState=markExternalTraceurInPlace(preparationState);searchState=syncSession(searchState,preparationState,tracerState);}
   else if(['start','progress','debrief'].includes(action)){searchState=advanceSessionSearch(searchState,preparationState,action);if(action==='start'&&searchState.gpsSearch)driverGps.seed();}
   else if(action==='layers')searchUI.layersOpen=!searchUI.layersOpen;
   else if(action==='center'){const point=search.searchView(searchState,preparationState).markers.find(m=>m.id===preparationState.viewerId);if(point)searchUI.center={x:point.x,y:point.y};searchUI.notice=point?'Carte recentrée sur votre position mock.':'Aucune position disponible pour recentrer.';}
  }catch(error){searchUI.notice=error.message;}
  render();
  if(searchUI.devOpen)document.querySelector('[data-search="close-dev"]')?.focus();
  else if(searchUI.confirmFinish)document.querySelector('[data-search="cancel-finish"]')?.focus();
  else if(action==='close-dev')document.querySelector('[data-search="dev"]')?.focus();
  else if(action==='cancel-finish')document.querySelector('[data-search="finish"]')?.focus();
  else if(['start','confirm-finish','debrief'].includes(action)){window.scrollTo(0,0);document.querySelector('main')?.focus({preventScroll:true});}
  else if(action==='close-messages')document.querySelector('[data-search="messages"]')?.focus();
  return;
 }
 const terrain=event.target.closest('[data-tracer]');
 if(terrain){
  const action=terrain.dataset.tracer;
  try{
   if(action==='gps-enable'){tracerGps.activate();}
   else if(action==='gps-resume'){tracerGps.resume();}
   else if(action==='gps-center'){centerGpsMap();return;}
   else if(action==='enter'){terrainOpen=true;tracerUI={};}
   else if(action==='back')terrainOpen=false;
   else if(action==='arrive'){const t=tracer.advanceTracer(tracerState,preparationState,'arrive');const p=preparation.simulate(preparationState,{phase:'arrived'});tracerState=t;preparationState=p;}
   else if(action==='ready'){const next=preparation.transition(preparationState,'ready');const t=tracer.advanceTracer(tracerState,next,'ready');preparationState=next;tracerState=t;}
   else if(action==='return-start'){tracerState=returnSelfTraceToStart(tracerState,preparationState);preparationState=preparation.simulate(preparationState,{viewerFunction:'driver'});terrainOpen=false;searchState=syncSession({...searchState,simulatedPhase:false},preparationState,tracerState);}
   else if(action==='external-ready'){preparationState=markExternalTraceurInPlace(preparationState,tracerState);terrainOpen=false;searchState=syncSession({...searchState,simulatedPhase:false},preparationState,tracerState);}
   else if(['start','progress','finish','in-place'].includes(action)){tracerState=tracer.advanceTracer(tracerState,preparationState,action);if(action==='start'&&tracerState.gpsPose)tracerGps.seed();searchState=syncSession({...searchState,simulatedPhase:false},preparationState,tracerState);}
   else if(action==='resume'){preparationState=preparation.simulate(preparationState,{gps:'fresh'});if(tracerState.phase==='active')tracerState=tracer.advanceTracer(tracerState,preparationState,'progress');}
   else if(action==='messages'){tracerState=tracer.readMessages(tracerState,preparationState);tracerUI={...tracerUI,messagesOpen:true,devOpen:false};}
   else if(action==='close-messages')tracerUI.messagesOpen=false;
   else if(action==='dev')tracerUI.devOpen=true;
   else if(action==='close-dev')tracerUI.devOpen=false;
   else if(action==='layers')tracerUI.layersOpen=!tracerUI.layersOpen;
   else if(action==='clean')tracerUI.clean=!tracerUI.clean;
   else if(action==='center'){const point=tracer.tracerView(tracerState,preparationState).markers.find(m=>m.id===preparationState.viewerId);if(point)tracerUI.center={x:point.x,y:point.y};tracerUI.notice=point?'Vue recentrée sur votre position mock.':'Recentrage indisponible : aucune position.';}
   else if(action==='reply')tracerState=tracer.replyMock(tracerState,terrain.dataset.text,preparationState);
  }catch(error){tracerUI.notice=error.message;}
  render();
  if(tracerUI.messagesOpen)document.querySelector('[data-tracer="close-messages"]')?.focus();
  else if(action==='close-messages')document.querySelector('[data-tracer="messages"]')?.focus();
  else if(tracerUI.devOpen)document.querySelector('[data-tracer="close-dev"]')?.focus();
  else if(action==='close-dev')document.querySelector('[data-tracer="dev"]')?.focus();
  return;
 }
 const preparationAction=event.target.closest('[data-prep-action]');
 if(preparationAction){
  try {const action=preparationAction.dataset.prepAction;if(action==='start-pose'){terrainOpen=true;tracerState=tracer.createTracer();tracerUI={};}else{const next=preparation.transition(preparationState,action);if(action==='approach'){tracerState=tracer.advanceTracer(tracerState,next,'approach');terrainOpen=true;tracerUI={};}if(action==='ready'){terrainOpen=true;tracerUI={};}preparationState=next;}preparationUI.feedback='Préparation mise à jour dans cette démonstration.';}
  catch(error){preparationUI.feedback=error.message;}
  render();return;
 }
 const choice=event.target.closest('[data-coaching-choice]');
 if(choice) {
  if(choice.dataset.coachingChoice==='preparation') {
   const items=coachingDraft.traceType==='gpx'?gpxFixtures:trackLibrary.list();
   coachingDraft=coaching.selectPreparation(coachingDraft,items.find(t=>t.id===choice.dataset.value),coachingActionContext('reference-selection',{referenceId:choice.dataset.value,origin:coachingDraft.traceType==='gpx'?'simulation:gpx-fixture-selection':'simulation:track-library-selection'}));
  } else if(choice.dataset.coachingChoice==='trackingScenario')coachingDraft=coaching.setTrackingScenario(coachingDraft,choice.dataset.value);
  else coachingDraft=coaching.updateDraft(coachingDraft,{[choice.dataset.coachingChoice]:choice.dataset.value});
  render(); document.querySelector(`[data-coaching-choice="${choice.dataset.coachingChoice}"][data-value="${choice.dataset.value}"]`).focus({preventScroll:true}); return;
 }
 const trackControl=event.target.closest('[data-track]');
 if(trackControl) {
  const action=trackControl.dataset.track,id=trackControl.dataset.id,item=trackLibrary.list().find(t=>t.id===id);
  if(action==='new'||action==='import')trackUI={...newTrackUI(),view:action};
  if(action==='list')trackUI=newTrackUI();
  if(action==='select')trackUI={...newTrackUI(),view:'detail',selectedId:id};
  if(action==='file'){const file=gpxFixtures.find(f=>f.id===id);trackUI={...trackUI,fileId:id,name:file.name,error:''};}
  if(action==='edit')trackUI={...newTrackUI(),view:'edit',selectedId:id,name:item.name};
  if(action==='delete') {
   ConfirmationDialog({title:'Supprimer ce tracé mock ?',description:'Il ne sera plus proposé dans cette visite. Aucune donnée réelle n’est supprimée.',onConfirm:()=>{trackLibrary.remove(id);trackUI={...newTrackUI(),notice:'Tracé mock supprimé.'};render(true);}});return;
  }
  if(action==='use') {
   const selectionDraft=newCoachingDraft();
   coachingDraft=coaching.draftFromTrack(currentUser,[{id:'nox',...mock.dog}],item,coachingActionContext('reference-selection',{draft:selectionDraft,referenceId:item.id,origin:item.provenance==='gpx-mock'?'simulation:gpx-fixture-reuse':'simulation:track-library-reuse'}));
   history.pushState({},'','/new-session');render(true);return;
  }
  render(action!=='file');return;
 }
 const controlCoaching=event.target.closest('[data-coaching]');
 if(controlCoaching) {
  const action=controlCoaching.dataset.coaching;
  if(action==='copy-code'){copyMockValue(coachingDraft.session.code,document.querySelector('#session-code'),document.querySelector('[data-copy-status]'));return;}
  if(action==='share'){showMockInvitation();return;}
  const sequence=coaching.steps(coachingDraft),index=sequence.indexOf(coachingDraft.step);
  if(action==='creator')coachingDraft=coaching.selectCreatorRole(coachingDraft,controlCoaching.dataset.role);
  if(action==='edit'){const prior=coachingDraft.step;coachingDraft=coaching.goToStep(coachingDraft,controlCoaching.dataset.step);if(prior==='roles'&&controlCoaching.dataset.step==='prepare')coachingDraft.returnStep='roles';}
  if(action==='back')coachingDraft={...coachingDraft,step:sequence[Math.max(0,index-1)],editing:false,returnStep:null};
  if(action==='next') {
   if((coachingDraft.step==='mode'&&!coachingDraft.mode)||(coachingDraft.step==='scenario'&&!coachingDraft.trackingScenario)||(coachingDraft.step==='trace'&&!coachingDraft.traceType)||(coachingDraft.step==='prepare'&&coaching.preparation(coachingDraft)!=='delegated'&&!coachingDraft.preparationTrack)||(coachingDraft.step==='dog'&&!coachingDraft.dogId)||(coachingDraft.step==='roles'&&coaching.validateDraft(coachingDraft).length))return;
   const needsPreparation=['mode','trace'].includes(coachingDraft.step)&&['prepared','gpx'].includes(coachingDraft.traceType)&&(coachingDraft.step==='trace'||(!coachingDraft.preparationTrack&&coaching.preparation(coachingDraft)!=='delegated'));
   const next=coachingDraft.returnStep || (coachingDraft.editing?(needsPreparation?'prepare':'review'):sequence[Math.min(sequence.length-1,index+1)]);
   coachingDraft={...coachingDraft,step:next,returnStep:null,editing:coachingDraft.editing&&next==='prepare'};
  }
  if(action==='create') {if(coaching.validateDraft(coachingDraft).length)return;cleanupCoachingExit();exitSavePending=false;normalCoachingBeforeQa=null;qaInitialized=false;searchState=search.createSearch();searchUI={};debriefUI={tab:'summary'};const selection=coachingDraft.preparationActions?.filter(entry=>entry.type==='reference-selection').at(-1);coachingDraft=coaching.createSession(coachingDraft,coachingActionContext('session-creation',{referenceId:coachingDraft.preparationTrack?.id??null,origin:'simulation:coaching-session-creation',...(selection&&selection.referenceId===coachingDraft.preparationTrack?.id?{selectionActionId:selection.actionId}:{})}));initializeCoachingReferenceAssignment();tracerState=tracer.createTracer();tracerUI={};terrainOpen=false;preparationState=preparation.createPreparation(coachingDraft.session);preparationUI={simulatorOpen:false,feedback:''};transmitCoachingReferenceAutomatically();}
  if(action==='restart'){cleanupCoachingExit();exitSavePending=false;normalCoachingBeforeQa=null;qaInitialized=false;searchState=search.createSearch();searchUI={};debriefUI={tab:'summary'};terrainOpen=false;tracerState=tracer.createTracer();tracerUI={};coachingDraft=newCoachingDraft();preparationState=null;}
  render(action!=='creator');
  if(action==='creator')document.querySelector(`[data-coaching="creator"][data-role="${controlCoaching.dataset.role}"]`).focus({preventScroll:true});
  return;
 }
 const action=event.target.closest('[data-action]')?.dataset.action;
 if(action==='logout') {opsGps.pause();cleanupCoachingExit();exitSavePending=false;normalCoachingBeforeQa=null;qaInitialized=false;searchState=search.createSearch();searchUI={};debriefUI={tab:'summary'};terrainOpen=false;tracerState=tracer.createTracer();tracerUI={}; auth.signOut(); preparationState=null;preparationUI={simulatorOpen:false,feedback:''};coachingDraft=newCoachingDraft();notifiedCoachingStarts=new Set();trackLibraryOwnerId=null;trackLibrary=createTrackLibrary();sessionCatalog.clear();operationalStore.clear();operationalStore=createOperationalMissionStore();operationalUI={mode:'',eventType:'Départ',note:''};trackUI=newTrackUI();dogsStore=createDogsStore();communityStore=createCommunityStore();communityLiveStore=createCommunityLiveStore({communityStore});communityController=makeCommunityController();jumolfStore=createJumolfStore({entitlement:'none',accessCodeCatalog:adminStore.codeCatalog(),currentUserId:null});jumolfController=makeJumolfController(); history.replaceState({},'','/auth'); render(true); return; }
 const photoReset=event.target.closest('[data-dog-photo-reset]');
 if(photoReset){const form=photoReset.closest('form[data-dog-form]');form.dataset.dogPhotoChanged='true';form.dataset.personalPhotoDataUrl='';form.querySelector('[data-dog-photo]').value='';photoReset.hidden=true;form.querySelector('.dog-photo-pick span').textContent='Ajouter une photo';form.querySelector('.dog-photo-feedback').textContent='';refreshDogPhotoPreview(form);return;}
 if(action==='notification') Toast(mock.notification);
 if(action==='preview') ConfirmationDialog({title:'Aperçu de la préparation',description:'Ce bouton présente le futur parcours. Aucune session réelle ne sera créée.',onConfirm:()=>Toast('Démonstration uniquement · aucune session créée.')});
 const control=event.target.closest('[data-session-filter]');
 if(control) { segment=control.dataset.sessionFilter; document.querySelectorAll('[data-session-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===control))); filterSessions(); }
 const role=event.target.closest('[data-role-choice]');
 if(role) Toast('Conducteur sélectionné · rôle fictif, sans permission réelle.');
});
document.addEventListener('pointerdown',event=>{
 const searchControl=event.target.closest?.('[data-search-unlock]');
 if(searchControl&&event.button===0){
  event.preventDefault();searchUnlockController?.cancel();searchUnlockPointerId=event.pointerId;searchControl.dataset.holdActive='true';
  searchUnlockController=createHoldToUnlockController({durationMs:2000,onProgress:value=>{if(!value)searchControl.removeAttribute('data-hold-active');},onUnlock:()=>{searchUI={...searchUI,locked:false};searchUnlockController=null;searchUnlockPointerId=null;render();}});
  searchUnlockController.press();return;
 }
 const control=event.target.closest?.('[data-operational-unlock]');
 if(!control||event.button!==0)return;
 event.preventDefault();
 terrainUnlockController?.cancel();
 clearTimeout(terrainUnlockReturnTimer);
 terrainUnlockPointerId=event.pointerId;
 control.dataset.holdActive='true';
 control.classList.remove('is-unlocking');
 const missionId=control.closest('[data-operational-mission-id]')?.dataset.operationalMissionId;
 terrainUnlockController=createHoldToUnlockController({
  durationMs:2000,
  onProgress:value=>{if(!value){control.removeAttribute('data-hold-active');control.classList.remove('is-unlocking');}},
  onUnlock:()=>{
   control.disabled=true;
   control.classList.add('is-unlocking');
   control.querySelector('[data-operational-unlock-copy]').textContent='Déverrouillage…';
   terrainUnlockReturnTimer=setTimeout(()=>{
    if(operationalUI.terrainMissionId===missionId)operationalUI={...operationalUI,terrainMissionId:null};
    terrainUnlockController=null;terrainUnlockPointerId=null;terrainUnlockReturnTimer=null;
    render();
   },300);
  }
 });
 terrainUnlockController.press();
});
document.addEventListener('pointerup',event=>{
 if(searchUnlockController&&event.pointerId===searchUnlockPointerId){if(searchUnlockController.pressed)searchUnlockController.release();if(searchUI.locked){const feedback=document.querySelector('.search-unlock-feedback');if(feedback)feedback.textContent='Maintenez le bouton pendant 2 secondes pour déverrouiller.';}searchUnlockPointerId=null;return;}
 if(!terrainUnlockController||event.pointerId!==terrainUnlockPointerId)return;
 if(terrainUnlockController.pressed)terrainUnlockController.release();
 terrainUnlockPointerId=null;
});
document.addEventListener('pointercancel',event=>{
 if(searchUnlockController&&event.pointerId===searchUnlockPointerId){searchUnlockController.cancel();searchUnlockPointerId=null;return;}
 if(!terrainUnlockController||event.pointerId!==terrainUnlockPointerId)return;
 terrainUnlockController.cancel();terrainUnlockPointerId=null;
});
document.addEventListener('toggle',event=>{if(event.target.matches?.('[data-prep-simulator]'))preparationUI.simulatorOpen=event.target.open;},true);
document.addEventListener('pointerdown',event=>{
 const point=event.target.closest?.('[data-editor-point-id]');if(!point||location.pathname!=='/track-builder')return;
 trackEditorIgnoreMapClickUntil=Date.now()+500;
 const svg=point.closest('[data-editor-map]');trackEditorDrag={id:point.dataset.editorPointId,start:{x:event.clientX,y:event.clientY},current:null,svg,element:point};
 try{svg?.setPointerCapture(event.pointerId);}catch{}
 event.preventDefault();
});
document.addEventListener('pointermove',event=>{
 if(!trackEditorDrag)return;
 const pos=svgClientPointToMap({clientX:event.clientX,clientY:event.clientY,rect:trackEditorDrag.svg?.getBoundingClientRect()});
 if(!pos)return;trackEditorDrag.current=pos;trackEditorDrag.element.setAttribute('transform',`translate(${pos.x} ${pos.y})`);
});
document.addEventListener('pointerup',event=>{
 if(!trackEditorDrag)return;const drag=trackEditorDrag;trackEditorDrag=null;
 const moved=drag.current&&Math.hypot(event.clientX-drag.start.x,event.clientY-drag.start.y)>3;
 if(moved){try{editorChange(moveTrackPoint(trackEditor.draft,drag.id,drag.current),{selectedPointId:drag.id});}catch(error){trackEditor={...trackEditor,error:error.message};render();}}
 else {trackEditor={...trackEditor,selectedPointId:drag.id};render();}
});
document.addEventListener('change',event=>{
 const field=event.target;
 if(profileController.handleChange(event))return;
 if(scientificContributionController.handleChange(event))return;
 if(scientificCorpusController.handleChange(event))return;
 if(jumolfController.handleChange(event))return;
 if(communityController.handleChange(event))return;
 if(field.matches('[data-notification-preference]')){communityStore.getNotificationStore().setPreferences(communityStore.viewerId,{[field.dataset.notificationPreference]:field.checked});render();return;}
 if(field.matches('[data-live-policy]')){const type=field.dataset.sessionType,id=field.dataset.sessionId,key=field.dataset.livePolicy;try{communityLiveStore.setSessionPolicy({sessionType:type,sessionId:id,patch:{[key]:field.checked}});}catch(error){Toast(error.message);}render();return;}
 if(field.matches('[data-live-option]')){const id=field.dataset.sessionId,key=field.dataset.liveOption;try{const current=communityLiveStore.getSessionPolicy('ops',id);communityLiveStore.setSessionPolicy({sessionType:'ops',sessionId:id,patch:{projectionOptions:{...current.projectionOptions,[key]:field.checked}}});}catch(error){Toast(error.message);}render();return;}
 if(field.matches('[data-operational-event-type]')){operationalUI={...operationalUI,eventType:field.value};return;}
 if(field.closest?.('[data-track-editor-form]')&&field.name){try{trackEditor.draft=updateTrackMetadata(trackEditor.draft,{[field.name]:field.value},{record:false});const root=document.querySelector('[data-track-editor]');if(root)root.dataset.dirty=String(trackEditor.draft.dirty);const save=document.querySelector('[data-track-editor-form] button[type="submit"]');if(save)save.disabled=trackEditor.draft.points.length<2||!trackEditor.draft.name.trim()||trackHasPendingRoutes(trackEditor.draft.points);}catch(error){trackEditor={...trackEditor,error:error.message};render();}return;}
 if(field.matches('[data-dog-photo]')){
  const file=field.files?.[0];if(!file)return;
  const form=field.closest('form[data-dog-form]'),feedback=form.querySelector('.dog-photo-feedback');
  if(!/^image\/(?:png|jpeg|webp|gif)$/i.test(file.type)||file.size>3*1024*1024){feedback.textContent='Choisissez une image PNG, JPEG, WebP ou GIF de 3 Mo maximum.';field.value='';return;}
  const reader=new FileReader();
  reader.onload=()=>{if(typeof reader.result!=='string')return;form.dataset.dogPhotoChanged='true';form.dataset.personalPhotoDataUrl=reader.result;form.querySelector('[data-dog-photo-reset]').hidden=false;form.querySelector('.dog-photo-pick span').textContent='Remplacer la photo';feedback.textContent='Aperçu temporaire · cette photo restera sur cet appareil pendant la visite.';refreshDogPhotoPreview(form);};
  reader.onerror=()=>{feedback.textContent='Cette photo n’a pas pu être lue.';};
  reader.readAsDataURL(file);return;
 }
 if(field.matches('[data-dog-status]')){const retired=['retired','archived'].includes(field.value),container=field.closest('form').querySelector('[data-dog-retirement-field]'),date=container.querySelector('input');container.hidden=!retired;date.disabled=!retired;return;}
 if(field.matches('select[name="portrait"]')){const form=field.closest('form[data-dog-form]');if(!form.dataset.personalPhotoDataUrl)refreshDogPhotoPreview(form);return;}
 if(field.matches('[data-qa-mode]')){resetCoachingQa(field.value);render(true);return;}
 if(field.matches('[data-qa-role]')){try{preparationState=selectQaPerspective(preparationState,field.value);qaUI={error:''};}catch(error){qaUI={error:error.message};}render();document.querySelector('[data-qa-role]')?.focus();return;}
 if(field.matches('[data-search-layer]')){searchUI[field.dataset.searchLayer]=field.checked;render();return;}
 if(field.matches('[data-search-sim]')){
  try{
   const key=field.dataset.searchSim,value=field.value;
   if(key==='phase'){
    let next=search.simulateSearch({...search.createSearch(),layingSegments:structuredClone(searchState.layingSegments)},{phase:['SEARCH_RUNNING','SEARCH_FINISHED','DEBRIEF'].includes(value)?'SEARCH_READY':value,fixturePose:!!searchUI.fixturePose});
    if(['SEARCH_RUNNING','SEARCH_FINISHED','DEBRIEF'].includes(value)){next=search.advanceSearch(next,preparationState,'start');for(let i=0;i<4;i++)next=search.advanceSearch(next,preparationState,'progress');}
    if(['SEARCH_FINISHED','DEBRIEF'].includes(value))next=search.advanceSearch(next,preparationState,'finish');
    if(value==='DEBRIEF')next=search.advanceSearch(next,preparationState,'debrief');
    searchState=next;
   }else if(key==='pose'){searchUI.fixturePose=field.checked;searchState=search.simulateSearch(searchState,{fixturePose:field.checked});}
   else if(key==='positions')preparationState=preparation.simulate(preparationState,{positionsPresent:field.checked});
   else {preparationState=preparation.simulate(preparationState,{[key]:value});if(key==='gps'&&searchState.phase==='SEARCH_RUNNING'){if(value!=='fresh')searchState={...searchState,gap:true,resumed:false};else if(searchState.gap)searchState=advanceSessionSearch(searchState,preparationState,'progress');}}
  }catch(error){searchUI.notice=error.message;}
  render();document.querySelector(`[data-search-sim="${field.dataset.searchSim}"]`)?.focus();return;
 }

 if(field.matches('[data-tracer-layer]')){tracerUI[field.dataset.tracerLayer]=field.checked;render();return;}
 if(field.matches('[data-tracer-sim]')){
  try{
   const key=field.dataset.tracerSim,value=field.value;
   if(key==='phase'){
    let t=tracer.createTracer(),p=preparationState;
    if(['approaching','arrived'].includes(value)){
     p=preparation.transition({...p,phase:'created'},'approach');t=tracer.advanceTracer(t,p,'approach');
     if(value==='arrived'){t=tracer.advanceTracer(t,p,'arrive');p=preparation.simulate(p,{phase:'arrived'});}
    }else{
     p=preparation.simulate(p,{phase:'ready'});
     if(value!=='before'){t=tracer.advanceTracer(t,p,'start');for(let i=0;i<4;i++)t=tracer.advanceTracer(t,p,'progress');}
     if(['finished','in_place'].includes(value))t=tracer.advanceTracer(t,p,'finish');
     if(value==='in_place')t=tracer.advanceTracer(t,p,'in-place');
    }
    preparationState=p;tracerState=t;
   }else if(key==='messages')tracerState=tracer.receiveMessages(tracerState,Number(value));
   else {preparationState=preparation.simulate(preparationState,{[key]:value});if(key==='gps'&&tracerState.phase==='active'){if(value!=='fresh')tracerState={...tracerState,gap:true,resumed:false};else if(tracerState.gap)tracerState=tracer.advanceTracer(tracerState,preparationState,'progress');}}
  }catch(error){tracerUI.notice=error.message;}
  render();document.querySelector(`[data-tracer-sim="${field.dataset.tracerSim}"]`)?.focus();return;
 }

 if(event.target.matches('[data-reference-response-test]')&&preparationState){
  const v=preparation.preparationView(preparationState);
  preparationUI.referenceResponseActor=event.target.checked&&!qaInitialized&&coachingReferenceAssignment?.state.sessionId===preparationState.session.id&&preparationState.scenario==='session'&&v.role==='traceur'&&v.viewerId===coachingDraft.session?.roles.traceur?{sessionId:preparationState.session.id,participantId:v.viewerId}:null;render();return;
 }
 const sim=event.target.closest('[data-prep-sim], [data-prep-position]');
 if(sim&&preparationState){
  const scroll=window.scrollY;
  preparationUI.referenceResponseActor=null;
  const patch=sim.dataset.prepPosition?{missingActors:[...document.querySelectorAll('[data-prep-position]')].filter(i=>!i.checked).map(i=>i.dataset.prepPosition)}:{[sim.dataset.prepSim]:sim.type==='checkbox'?sim.checked:sim.value};
  try{preparationState=preparation.simulate(preparationState,patch);preparationUI.feedback='';}catch(error){preparationUI.feedback=error.message;}
  preparationUI.simulatorOpen=true;render();window.scrollTo(0,scroll);
  document.querySelector(sim.dataset.prepPosition?`[data-prep-position="${sim.dataset.prepPosition}"]`:`[data-prep-sim="${sim.dataset.prepSim}"]`)?.focus({preventScroll:true});return;
 }
 const observer=event.target.closest('[data-coaching-observer]');
 if(observer){
  const selected=[...document.querySelectorAll('[data-coaching-observer]:checked')].map(input=>input.dataset.coachingObserver);
  for(const id of selected)coachingDraft=ensureCoachingContactParticipant(coachingDraft,id,communityStore);
  coachingDraft=coaching.setObservers(coachingDraft,selected);const position=window.scrollY;render();window.scrollTo(0,position);document.querySelector(`[data-coaching-observer="${observer.dataset.coachingObserver}"]`).focus({preventScroll:true});return;
 }
 const control=event.target.closest('[data-coaching-role]');
 if(!control)return;
 coachingDraft=ensureCoachingContactParticipant(coachingDraft,control.value,communityStore);
 coachingDraft=coaching.assignRole(coachingDraft,control.dataset.coachingRole,control.value || null,coachingActionContext('function-assignment',{beneficiaryParticipantId:control.value||null,assignedFunction:control.dataset.coachingRole,origin:'simulation:coaching-role-selection'}));
 const position=window.scrollY;render();window.scrollTo(0,position);document.getElementById(control.id).focus({preventScroll:true});
});
document.addEventListener('input',event=>{
 if(jumolfController.handleInput(event))return;
 if(event.target.closest?.('[data-community-form="post-create"]'))communityController.updatePreview(event.target.closest('form'));
 if(event.target.matches('[data-operational-event-note]'))operationalUI={...operationalUI,note:event.target.value};
 if(event.target.matches('input[name="interventionAddress"]')){const form=event.target.closest('[data-operational-intake-form]');const target=form?.querySelector('[data-operational-intake-navigation]');if(target)target.innerHTML=OperationalNavigation(event.target.value);}
 if(event.target.id==='track-name')trackUI.name=event.target.value;
 if(event.target.matches('[data-editor-search]'))trackEditor.draft={...trackEditor.draft,searchQuery:event.target.value};
 if(event.target.closest?.('[data-track-editor-form]')&&event.target.name){try{trackEditor.draft=updateTrackMetadata(trackEditor.draft,{[event.target.name]:event.target.value},{record:false});const root=document.querySelector('[data-track-editor]');if(root)root.dataset.dirty=String(trackEditor.draft.dirty);const save=document.querySelector('[data-track-editor-form] button[type="submit"]');if(save)save.disabled=trackEditor.draft.points.length<2||!trackEditor.draft.name.trim()||trackHasPendingRoutes(trackEditor.draft.points);}catch(error){trackEditor.error=error.message;}}
 if(event.target.matches('[data-session-query]'))filterSessions();
});
window.addEventListener('popstate',event=>{
 if(trackEditorActive&&trackEditor.draft?.dirty&&location.pathname!=='/track-builder'){
  const destination=location.pathname+location.search;history.pushState({},'',trackEditorHref);requestTrackEditorExit(destination,{replace:true});return;
 }
 if(location.pathname!=='/track-builder')trackEditorActive=false;
 jumolfController.handlePopState();
 render(true);
});
function syncNavigationHeight() {
 const nav=document.querySelector('.bottom-nav');
 if(nav) document.documentElement.style.setProperty('--nav-height',`${Math.ceil(window.innerHeight-nav.getBoundingClientRect().top)}px`);
}
window.addEventListener('resize',syncNavigationHeight);
render();

document.addEventListener('submit',event=>{
 if(event.target.matches('[data-ops-event-form]')){event.preventDefault();const c=operationalGpsContext();try{if(!ownsOperationalGps(c))throw Error('Repère réservé à votre mission GPS.');const fix=opsGps.view().lastFix;operationalStore.addGpsEvent(c.mission.id,{type:event.target.elements.type.value,note:event.target.elements.note.value,position:fix?{timestamp:fix.timestamp,coords:fix}:null});operationalUI={...operationalUI,notice:'Repère enregistré.'};}catch(error){operationalUI={...operationalUI,notice:error.message};}render();return;}
 if(event.target.matches('[data-ops-time-form]')){event.preventDefault();const c=operationalGpsContext();try{if(!ownsOperationalGps(c))throw Error('Mission GPS non autorisée.');const raw=event.target.elements.disappearanceAt.value,value=raw?new Date(raw).toISOString():null;operationalStore.updateDetails(c.mission.id,{disappearanceAt:value});render();}catch(error){Toast(error.message);}return;}

 if(event.target.matches('[data-reference-response]')){event.preventDefault();confirmCoachingReferenceResponse(event.target);return;}
 if(event.target.matches('[data-reference-assignment]')){event.preventDefault();confirmCoachingReferenceAssignment(event.target);return;}
 if(event.target.matches('[data-reference-delegation]')){event.preventDefault();confirmCoachingReferenceDelegation(event.target);return;}
 if(profileController.handleSubmit(event))return;
 if(adminController.handleSubmit(event))return;
 if(scientificCorpusController.handleSubmit(event))return;
 if(scientificController.handleSubmit(event))return;
 if(jumolfController.handleSubmit(event))return;
 if(communityController.handleSubmit(event))return;
 if(event.target.matches('[data-tracer-reference]')){event.preventDefault();confirmCoachingTracerReference(event.target);return;}
 if(event.target.matches('[data-coach-debrief-note]')){event.preventDefault();saveCoachingDriverDebriefNote(event.target,'coach');return;}
 if(event.target.matches('[data-driver-debrief-note]')){event.preventDefault();saveCoachingDriverDebriefNote(event.target);return;}
 if(event.target.matches('[data-coach-reply]')){event.preventDefault();handleCoachingCoachMessages({dataset:{...event.target.dataset,coachMessage:'reply'}},event.target.elements.reply.value);document.querySelector('#coach-reply')?.focus();return;}
 if(event.target.matches('[data-search-reply]')){event.preventDefault();replyCoachingSearchMessage(event.target.elements.reply.value);document.querySelector('#search-reply')?.focus();return;}
 if(event.target.matches('[data-tracer-reply]')){event.preventDefault();try{tracerState=tracer.replyMock(tracerState,event.target.elements.reply.value,preparationState);}catch(error){tracerUI.notice=error.message;}render();document.querySelector('#tracer-reply')?.focus();return;}

 const operationalIntakeForm=event.target.closest('form[data-operational-intake-form]');
 if(operationalIntakeForm){
  event.preventDefault();
  try{
   const dog=dogsStore.get(operationalIntakeForm.elements.dogId.value);
   if(!dog)throw new Error('Choisissez un chien disponible.');
   const raw=Object.fromEntries(new FormData(operationalIntakeForm).entries());
   const text=value=>String(value??'').trim()||null;
   const dateValue=value=>{const valueText=text(value);if(!valueText)return null;const date=new Date(valueText);return Number.isFinite(date.getTime())?date.toISOString():null;};
   const handler={id:'mock-current-user',name:currentUser.name};
   const prepared=operationalIntakeForm.dataset.operationalIntakeForm==='prepared';
   const details={searchedPerson:text(raw.searchedPerson),searchedPersonDescription:text(raw.searchedPersonDescription),lastKnownDescription:text(raw.lastKnownDescription),lastContactAt:text(raw.lastContactAt),context:text(raw.circumstances),environment:text(raw.environmentType),observations:text(raw.observations),notes:text(raw.additionalInfo)};
   const person={identity:text(raw.searchedPerson),age:text(raw.age),ageRange:text(raw.ageRange),sex:text(raw.sex),description:text(raw.searchedPersonDescription),clothing:text(raw.clothing),footwear:text(raw.footwear),mobility:text(raw.mobility),vulnerability:text(raw.vulnerability),expectedBehavior:text(raw.expectedBehavior),movementMethod:text(raw.movementMethod)};
   const time={disappearanceAt:dateValue(raw.disappearanceAt),lastContactAt:dateValue(raw.lastContactAt),timePrecision:text(raw.timePrecision)};
   const places={interventionAddress:text(raw.interventionAddress),interventionCommune:text(raw.interventionCommune),interventionSector:text(raw.interventionSector),lastKnownDescription:text(raw.lastKnownDescription),probableTrackStart:text(raw.probableTrackStart)};
   const context={circumstances:text(raw.circumstances),environmentType:text(raw.environmentType),risks:text(raw.risks),observations:text(raw.observations),additionalInfo:text(raw.additionalInfo)};
   const draft=operationalStore.createDraft({dog,handler,entryMode:prepared?'prepared':'quick',details,person,time,places,context});
   operationalUI={mode:'',eventType:'Départ',note:''};
   history.pushState({},'',`/operational/missions/${encodeURIComponent(draft.id)}`);
   render(true);
  }catch(error){Toast(error.message);}
  return;
 }

 const operationalStartForm=event.target.closest('form[data-operational-start-form]');
 if(operationalStartForm){
  event.preventDefault();
  try{
   const dog=dogsStore.get(operationalStartForm.elements.dogId.value);
   if(!dog)throw new Error('Choisissez un chien disponible.');
   const draft=operationalStore.createDraft({dog,handler:{id:'mock-current-user',name:currentUser.name}});
   const lastKnownDescription=operationalStartForm.elements.lastKnownDescription.value;
   if(lastKnownDescription.trim())operationalStore.updateDetails(draft.id,{lastKnownDescription});
   operationalUI={mode:'',eventType:'Départ',note:''};
   history.pushState({},'',`/operational/missions/${encodeURIComponent(draft.id)}`);
   render(true);
  }catch(error){Toast(error.message);}
  return;
 }

 const operationalDetailsForm=event.target.closest('form[data-operational-details-form]');
 if(operationalDetailsForm){
  event.preventDefault();
  const missionId=operationalDetailsForm.dataset.operationalMissionId;
  const values=Object.fromEntries(new FormData(operationalDetailsForm).entries());
  const sourceDevice={manufacturer:values.sourceManufacturer,deviceModel:values.sourceDeviceModel,sourceType:values.sourceDeviceType,importType:values.sourceImportType};
  for(const key of ['sourceManufacturer','sourceDeviceModel','sourceDeviceType','sourceImportType'])delete values[key];
  for(const key of ['disappearanceAt','lastContactAt'])if(values[key]){const parsed=new Date(values[key]);if(Number.isFinite(parsed.getTime()))values[key]=parsed.toISOString();}
  try{operationalStore.updateDetails(missionId,values);if(Object.values(sourceDevice).some(value=>String(value||'').trim()))operationalStore.setSourceDevice(missionId,sourceDevice);render();Toast('Fiche mission enregistrée en mémoire.');}catch(error){Toast(error.message);}
  return;
 }

 const operationalEvaluationForm=event.target.closest('form[data-operational-evaluation-form]');
 if(operationalEvaluationForm){
  event.preventDefault();
  const values=Object.fromEntries(new FormData(operationalEvaluationForm).entries());
  const readGroup=scope=>Object.fromEntries(Object.entries(values).filter(([key])=>key.startsWith(`${scope}.`)).map(([key,value])=>[key.slice(scope.length+1),value]));
  const missionId=operationalEvaluationForm.dataset.operationalMissionId;
  try{operationalStore.saveEvaluation(missionId,{dog:readGroup('dog'),field:readGroup('field')});render();Toast('Évaluations enregistrées en mémoire.');}catch(error){Toast(error.message);}
  return;
 }

 const editorForm=event.target.closest('form[data-track-editor-form]');
 if(editorForm){
  event.preventDefault();
  try{
   if(trackHasPendingRoutes(trackEditor.draft.points))throw Error('Attendez le calcul des routes ou corrigez le segment en attente.');
   const values=Object.fromEntries(new FormData(editorForm).entries());
   let saved;
   if(trackEditor.draft.id)saved=trackLibrary.updatePrepared(trackEditor.draft.id,{...values,geometry:{points:trackEditor.draft.points}});
   else if(trackEditor.copySource)saved=trackLibrary.createCopy({name:values.name,description:values.description,category:values.category,difficulty:values.difficulty,dogId:values.dogId,notes:values.notes,sourceId:trackEditor.copySource.sourceId,sourceKind:trackEditor.copySource.kind,points:trackEditor.draft.points});
   else saved=trackLibrary.createPrepared({...values,geometry:{points:trackEditor.draft.points},source:'draw',provenance:'manual'});
   trackEditorActive=false;trackEditor={...trackEditor,draft:null,routeKey:''};history.pushState({},'',`/tracks/${encodeURIComponent(`prepared:${saved.id}`)}`);render(true);
  }catch(error){trackEditor={...trackEditor,error:error.message};render();document.querySelector('#track-editor-name')?.focus();}
  return;
 }
 const trackRename=event.target.closest('form[data-track-rename]');
 if(trackRename){event.preventDefault();try{trackLibrary.rename(trackRename.dataset.trackRename,new FormData(trackRename).get('name'));render(true);}catch(error){Toast(error.message);}return;}

 const trackForm=event.target.closest('form[data-track-form]');
 if(trackForm){
  event.preventDefault();
  try {
   const name=trackForm.elements.trackName.value;
   const item=trackForm.dataset.trackForm==='edit'?trackLibrary.rename(trackUI.selectedId,name):trackForm.dataset.trackForm==='import'?trackLibrary.importFixture(trackUI.fileId,name):trackLibrary.create(name);
   trackUI={...newTrackUI(),view:'detail',selectedId:item.id,notice:'Tracé mock enregistré en mémoire. Prêt pour une nouvelle session.'};render(true);
  } catch(error){trackUI={...trackUI,error:error.message};render();document.querySelector('#track-name').focus();}
  return;
 }
 const dogForm=event.target.closest('form[data-dog-form]');
 if(dogForm){
  event.preventDefault();
  const data=new FormData(dogForm);
  const values={
   name:data.get('name'),officialName:data.get('officialName'),breed:data.get('breed'),sex:data.get('sex')||null,
   dateOfBirth:data.get('dateOfBirth')||null,retirementDate:data.get('retirementDate')||null,notes:data.get('notes'),registrationNumber:data.get('registrationNumber'),
   specialty:data.get('specialty'),status:data.get('status'),portrait:data.get('portrait'),
   disciplines:data.getAll('disciplines')
  };
  if(dogForm.dataset.dogPhotoChanged==='true')values.personalPhotoDataUrl=dogForm.dataset.personalPhotoDataUrl||null;
  try{
   const dog=dogForm.dataset.dogForm==='update'?dogsStore.update(dogForm.dataset.dogId,{...values,...(data.get('dateOfBirth')?{age:null}:{})}):dogsStore.create(values);
   if(!dog)throw Error('Ce profil n’est plus disponible.');
   history.pushState({},'',`/dogs/${encodeURIComponent(dog.id)}`);render(true);
  }catch(error){
   const feedback=dogForm.querySelector('.dog-form-feedback');
   feedback.textContent=error.message;
   dogForm.elements.name.setAttribute('aria-invalid','true');
   dogForm.elements.name.focus();
  }
  return;
 }
 const form=event.target.closest('form[data-auth]');
 if(!form)return;
 event.preventDefault();
 let invalid;
 for(const input of form.querySelectorAll('input')) {
  let message=input.validity.valueMissing?'Ce champ est requis.':input.validity.typeMismatch?'Saisissez un email valide.':input.type==='password'&&input.value.length<8?'Utilisez au moins 8 caractères.':'';
  if(input.name==='confirmPassword'&&input.value!==form.elements.password.value)message='Les mots de passe ne correspondent pas.';
  input.setAttribute('aria-invalid',String(!!message));
  document.getElementById(`${input.name}-error`).textContent=message;
  if(message&&!invalid)invalid=input;
 }
 if(invalid){invalid.focus();return;}
 if(form.dataset.auth==='forgot') {
  form.querySelector('.auth-result').textContent='Simulation terminée. Aucun email envoyé.';
  return;
 }
 const signup=form.dataset.auth==='signup';
 if(signup) auth.signUp({firstName:form.elements.firstName.value});
 else auth.signIn();
 form.reset();
 currentUser=auth.getSession().user;jumolfStore=createJumolfStore({entitlement:'none',accessCodeCatalog:adminStore.codeCatalog(),currentUserId:currentUser?.user_id||null});jumolfController=makeJumolfController();coachingDraft=newCoachingDraft();trackLibraryOwnerId=null;trackLibrary=createTrackLibrary();trackUI=newTrackUI();
 history.pushState({},'','/');render(true);
 Toast(signup?'Compte simulé · aucune inscription réelle.':'Connexion simulée · profil Sébastien.');
});

async function copyMockValue(value,input,status) {
 try {
  if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
  await navigator.clipboard.writeText(value);status.textContent='Copié. Démonstration locale, aucune invitation envoyée.';
 } catch {
  input.focus();input.select();status.textContent='Sélection prête : utilisez Copier sur votre appareil. Aucun partage envoyé.';
 }
}
function showMockInvitation() {
 const invitation=coaching.mockInvitation(coachingDraft.session),link=location.origin+invitation.path;
 const trigger=document.querySelector('[data-coaching="share"]');
 const dialog=document.createElement('dialog');dialog.className='invitation-panel';
 dialog.innerHTML=`<h2>Réunir votre équipe</h2><p>${escapeHTML(invitation.text)}</p><label for="mock-invitation-link">Lien d’invitation mock</label><input id="mock-invitation-link" readonly value="${escapeHTML(link)}"><p class="coaching-local-note" data-invitation-status role="status">À terme, ce lien permettra d’inviter une personne, même hors communauté. Dans cet aperçu, il ne donne aucun accès.</p><div class="coaching-actions"><button class="button button-dark" data-close-invitation>Fermer</button><button class="button button-gold" data-copy-invitation>Copier le lien</button></div>`;
 dialog.addEventListener('close',()=>{dialog.remove();trigger?.focus({preventScroll:true});},{once:true});
 dialog.querySelector('[data-close-invitation]').addEventListener('click',()=>dialog.close());
 dialog.querySelector('[data-copy-invitation]').addEventListener('click',()=>copyMockValue(link,dialog.querySelector('input'),dialog.querySelector('[data-invitation-status]')));
 document.body.append(dialog);dialog.showModal();
}

document.addEventListener('keydown',event=>{if(!document.querySelector('.tracer-terrain'))return;if(event.key==='Escape'&&(tracerUI.messagesOpen||tracerUI.devOpen)){const wasDev=tracerUI.devOpen;tracerUI.messagesOpen=false;tracerUI.devOpen=false;render();document.querySelector(wasDev?'[data-tracer="dev"]':'[data-tracer="messages"]')?.focus();}if(event.key==='Tab'&&(tracerUI.messagesOpen||tracerUI.devOpen)){const panel=document.querySelector(tracerUI.messagesOpen?'.tracer-sheet':'.tracer-dev'),nodes=[...panel.querySelectorAll('button,input,select')],first=nodes[0],last=nodes.at(-1);if(!panel.contains(document.activeElement)){event.preventDefault();(event.shiftKey?last:first).focus();return;}if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});

// Conducteur modal focus stays within its own cockpit, independently of Traceur UI.
document.addEventListener('keydown',event=>{
 const panel=document.querySelector(searchUI.confirmFinish?'.search-confirm':searchUI.devOpen?'.search-dev':'.search-no-dialog');if(!panel)return;
 if(event.key==='Escape'){const finish=searchUI.confirmFinish;searchUI.confirmFinish=false;searchUI.devOpen=false;render();document.querySelector(finish?'[data-search="finish"]':'[data-search="dev"]')?.focus();}
 if(event.key==='Tab'){const ns=[...panel.querySelectorAll('button:not([disabled]),input,select')],first=ns[0],last=ns.at(-1);if(!panel.contains(document.activeElement)){event.preventDefault();(event.shiftKey?last:first)?.focus();}else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
});
