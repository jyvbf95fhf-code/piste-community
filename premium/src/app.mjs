import {classifyPisteSessions,createPisteSelection,backupPisteLocal} from './piste-bulk.mjs';
import {createPisteHistoryClient} from './piste-history-client.mjs';
import {createPersistenceJournal} from './persistence-journal.mjs';
import {removeAccountRecord} from './account-record-removal.mjs';
import {isProtectedSessionId,sessionRemovalPolicy,SessionRemovalMenu,SessionRemovalConfirmation} from './session-removal.mjs';
import {activeTrackingDogs,resolveDefaultTrackingDog,resolveDogId,isProtectedDog} from './dog-selection.mjs';
import {selectCommunityNotifications} from './community-notifications.mjs';
import {createLoboAccountController} from './lobo-account-controller.mjs';
import {createPersonalCloudRepository} from './personal-cloud-client.mjs';
import {saveDisplayedProposal,preparedTrackForConsultation} from './track-proposal-save.mjs';
import {createTrainingMemory,trainingMemoryNotes,trainingMemoryView} from './jumolf-training-memory.mjs';
import {mountRexMaps} from './jumolf-rex-map.mjs';
import {SessionDossierScreen,sharedSessionDossier,localSessionDossier,operationalSessionDossier} from './session-dossier.mjs';
import {createCoachingInvitations,CoachingInvitations} from './coaching-invitations.mjs';
import {createCommunityFriendships} from './community-friendships.mjs';
import {DataExportsPanel,createDataExportController} from './data-exports-client.mjs';
import {createRemoteAdminStore} from './admin-remote-store.mjs';
import {buildAccountAnalysisSources,buildAccountScientificDataset} from './account-analysis-sources.mjs';
import {buildJumolfSources} from './jumolf-adapter.mjs';
import {createPersonalCloudController} from './personal-cloud-controller.mjs';
import {createOpsLiveRemote} from './ops-live-remote.mjs';
import {createOpsLiveTransport} from './ops-live-transport.mjs';
import {createOpsLiveBindings} from './ops-live-bindings.mjs';
import {createSharedSessionIndex} from './consolidated-session-index.mjs';
import {coachingJumolfPreparationState,coachingTrackReturnState,coachingGeneratedTrackState} from './coaching-shared-wizard.mjs';
import {buildCanineBrief} from './track-canine.mjs';
import {CanineBrief} from './track-canine-screen.mjs';
import {mountRemoteCoaching} from './coaching-remote-app.mjs';
import {createOperationalWeatherController} from './operational-weather.mjs';
import {createSmartTrackService} from './track-smart-service.mjs';
import {createSmartTrackController} from './track-smart-controller.mjs';
import {smartTrackDraft} from './track-smart-engine.mjs';
import {readTrackGpxFile,createImportedGpxDraft} from './track-gpx-import.mjs';
import {createTrackRoutingService} from './track-routing-service.mjs';
import {createTrackRoutingController} from './track-routing-controller.mjs';
import {trackHasPendingRoutes} from './track-route-segments.mjs';
import {applyTrackRoute ,recoverPendingTrackRoutes} from './track-editor.mjs';
import {removeLastTrackSegment} from './track-editor.mjs';
import {mountTrackEditorMap,paintIllustrativeScentCorridor,recenterTrackEditorMap,centerTrackEditorMap,paintTrackMissionMap,switchTrackEditorBasemap} from './track-editor-real-map.mjs';
import {createMissionController} from './track-mission-controller.mjs';
import {MissionControlPanel} from './track-mission-screen.mjs';
import {mountMissionControl} from './track-mission-view.mjs';
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
import {createClient} from './vendor/supabase-client.mjs';
import {COACHING_REMOTE as accountConfig} from './coaching-remote-config.mjs';
import {createPisteAccount} from './piste-account-auth.mjs';
import {createCoachingRemoteTransport} from './coaching-remote-transport.mjs';
const resolveAccountRoute=(route,session)=>!session.authenticated&&!route.startsWith('/auth')?'/auth':route;
import { debugSnapshot } from './config.mjs';
import { themeForRoute } from './theme.mjs';
import * as coaching from './coaching.mjs';
import {createReferenceAssignmentState,applyReferenceAssignmentAction,getReferenceAssignment} from './coaching-reference-assignment.mjs';
import { CoachingScreen } from './coaching-screen.mjs';
import { createTrackLibrary, gpxFixtures, gpxReferenceChoices } from './track-library.mjs';
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
import {pisteSessionRows,pistePreparedRows,TrackListScreen,TrackDetailScreen} from './tracks-screen.mjs';
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
document.querySelector('#app').textContent='Vérification de votre connexion PISTE…';
const accountClient=createClient(accountConfig.url,accountConfig.publishableKey);
const accountApi=createCoachingRemoteTransport({client:accountClient});
let pisteHidden=new Set(),pisteCanonical=new Map(),pisteCloudRecords=[],pisteHiddenOwner=null,pisteHistoryGeneration=0,pisteHistoryReadAt=0,pisteReadyOwner=null,pisteOwner=null,pisteMode=false,pisteBusy=false,pisteResults=[],pisteFailed=[];
const pisteSelection=createPisteSelection();
const pisteHistory=createPisteHistoryClient({client:accountClient,getOwnerId:()=>auth.getSession().user?.user_id});
let authNotice='';
const auth=createPisteAccount({client:accountClient,storage,loadProfile:()=>accountApi.call({operation:'profile'}),onInvalidated:()=>{if(!location.pathname.startsWith('/auth'))location.replace('/auth/login');}});
try{await auth.initialize();if(auth.getSession().access==='pending')authNotice='Votre compte est connecté. L’accès au Coaching V2 attend une autorisation.';}catch(error){authNotice=error.message;}
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
let trackLibrary=createTrackLibrary({storage,ownerId:trackLibraryOwnerId,includeDemo:auth.assurance!=='supabase-auth'});
let dogsOwnerId=currentUser?.user_id||null;
let dogsStore=createDogsStore({ownerId:dogsOwnerId,storage});
let coachingInvitations=null,coachingInvitationsOwner=null;
function reconcileCoachingInvitations(){const owner=auth.assurance==='supabase-auth'?currentUser?.user_id:null;if(owner===coachingInvitationsOwner)return;coachingInvitations?.destroy();coachingInvitations=null;coachingInvitationsOwner=owner;if(owner)coachingInvitations=createCoachingInvitations({call:body=>accountApi.call(body),onDetected:rows=>Toast(rows.length===1?'Invitation Coaching reçue · retrouvez-la sur l’accueil.':rows.length+' invitations Coaching reçues · ouvrez l’accueil.'),onChange:()=>{if(coachingInvitationsOwner===owner&&auth.getSession().user?.user_id===owner)renderCoachingUpdates();}});}
// Background updates must never replace an in-progress form or terrain screen.
function renderCoachingUpdates(){
 const link=document.querySelector('.header-actions a.notification');
 if(link){const count=selectedCommunityNotifications().filter(n=>!n.read).length+(coachingInvitations?.view().invitations.length||0)+(communityStore.getNotificationStore().getPreferences(communityStore.viewerId).notify_live_in_app?(opsLiveRemote?.view().notifications||[]).filter(n=>!n.read).length:0);link.setAttribute('aria-label',count?'Notifications, '+count+' non lues':'Notifications');link.querySelector('.notification-count,.notification-dot')?.remove();if(count){const badge=document.createElement('span');badge.className='notification-count';badge.textContent=String(count);link.append(badge);}}
 if(location.pathname!=='/jumolf/rex'&&(['/','/sessions','/tracks','/notifications'].includes(location.pathname)||location.pathname.startsWith('/sessions/')||location.pathname.startsWith('/jumolf')||location.pathname.startsWith('/scientific'))&&!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'))render();
}
function coachingInvitationCards(){return coachingInvitations?CoachingInvitations(coachingInvitations.view()):'';}
let sharedIndex=dogsOwnerId?createSharedSessionIndex({ownerId:dogsOwnerId,storage}):null,sharedAttempt=0;
function reconcileSharedIdentity(){const ownerId=currentUser?.user_id||null;if(ownerId===dogsOwnerId)return;sharedIndex?.dispose();dogsOwnerId=ownerId;sharedIndex=ownerId?createSharedSessionIndex({ownerId,storage}):null;sharedAttempt=0;pisteReadyOwner=null;pisteHistoryReadAt=0;pisteHistoryGeneration++;pisteCanonical.clear();pisteHidden.clear();pisteCloudRecords=[];dogsStore=createDogsStore({ownerId,storage});}
function sharedOptions(){const sharedSessions=sharedIndex?.list()||[],dogIds=Object.fromEntries(sharedSessions.map(p=>[p.id,sharedIndex.dogId(p.id)]));return {sharedSessions,dogIds,demoRows:auth.assurance!=='supabase-auth'};}
function refreshSharedCatalog(force=false){
 if(auth.assurance!=='supabase-auth'||!sharedIndex||pisteBusy)return;
 const full=location.pathname==='/tracks',last=full?pisteHistoryReadAt:sharedAttempt;
 if(!force&&Date.now()-last<15000)return;
 sharedAttempt=Date.now();void coachingInvitations?.refresh();
 const index=sharedIndex,generation=pisteHistoryGeneration;
 void index.refresh(async()=>{
  if(!full)return (await accountApi.call({operation:'list'})).sessions;
  pisteHistoryReadAt=Date.now();const result=await pisteHistory.catalogue();
  if(sharedIndex!==index||auth.getSession().user?.user_id!==index.ownerId||pisteHistoryGeneration!==generation)return index.list();
  const journal=createPersistenceJournal({ownerId:index.ownerId}),mappings=new Map(),hidden=new Set(result.hidden);
  try{
   for(const [kind,items] of [['track',trackLibrary.list()],['ops',operationalStore.list()]])for(const item of items){const m=await journal.lookup({kind,localId:item.id});if(m?.revision>0)mappings.set('local-'+kind+':'+item.id,m);}
   for(const key of result.hidden){const [kind,id]=key.split(':');if(['ops','track'].includes(kind)){const localId=await journal.localId({kind,id});if(localId)hidden.add('local-'+kind+':'+localId);}}
  }finally{journal.dispose();}
  if(sharedIndex!==index||auth.getSession().user?.user_id!==index.ownerId||pisteHistoryGeneration!==generation)return index.list();
  pisteReadyOwner=index.ownerId;pisteCanonical=mappings;pisteHidden=hidden;pisteHiddenOwner=index.ownerId;pisteCloudRecords=result.records||[];return result.sessions;
 }).then(()=>{if(sharedIndex===index&&auth.getSession().user?.user_id===index.ownerId){sharedAttempt=Date.now();renderCoachingUpdates();}});
}

function sharedDogAssociation(p){const selected=sharedIndex?.dogId(p.id)||'';return `<details class="card"><summary>Chien associé à votre historique</summary><form data-remote-form="dog-link"><label>Votre chien<select name="dogId" required><option value="">Choisir explicitement un chien</option>${dogsStore.list().map(d=>`<option value="${escapeHTML(d.id)}" ${d.id===selected?'selected':''}>${escapeHTML(d.name)} · ${escapeHTML(d.registrationNumber||d.breed||d.id)}</option>`).join('')}</select></label><button class="button button-dark">Enregistrer l’association</button></form><p>Association personnelle sur cet appareil. Le dossier partagé reste inchangé.</p></details>`;}

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
const adminStore=auth.assurance==='supabase-auth'?createRemoteAdminStore({actor:()=>currentUser,call:body=>accountApi.call(body),onChange:()=>render(),loadRoutingQuotas:async()=>{const {data,error}=await accountClient.auth.getSession();if(error||!data?.session?.access_token)throw Error('Connexion requise');const response=await fetch('/api/routing-quotas',{headers:{Authorization:'Bearer '+data.session.access_token},cache:'no-store'});if(!response.ok)throw Error('Quotas indisponibles');return response.json();}}):createAdminStore();
function accountJumolfStore(){const record=auth.assurance==='supabase-auth'?currentUser?.jumolf_entitlement:null;return createJumolfStore({entitlement:record?.entitlement||'none',entitlementRecord:record,accessCodeCatalog:auth.assurance==='supabase-auth'?null:adminStore.codeCatalog(),currentUserId:currentUser?.user_id||null,storage:auth.assurance==='supabase-auth'?(storage||{getItem(){throw Error('Stockage indisponible');},setItem(){throw Error('Stockage indisponible');}}):null});}
let jumolfStore=accountJumolfStore();
let jumolfVerifiedOwnerId=currentUser?.user_id||null;
window.addEventListener('storage',event=>{if(auth.assurance==='supabase-auth'&&currentUser?.user_id&&(!event.key||event.key===`piste-v2-jumolf-preferences:${encodeURIComponent(currentUser.user_id)}`)){jumolfStore.refreshPreferences();jumolfController=makeJumolfController();render();}});
function syncJumolfVerifiedEntitlement(){
 if(auth.assurance!=='supabase-auth')return;
 const id=currentUser?.user_id||null,record=currentUser?.jumolf_entitlement||{entitlement:'none'};
 if(id!==jumolfVerifiedOwnerId){jumolfVerifiedOwnerId=id;jumolfStore=accountJumolfStore();jumolfController=makeJumolfController();}
 else if(JSON.stringify(jumolfStore.snapshot().entitlement_record)!==JSON.stringify(record))jumolfStore.setEntitlementRecord(record);
}
const dataExportController=createDataExportController({call:body=>accountApi.call(body),getUser:()=>auth.getSession().user,getConsents:()=>jumolfStore.snapshot().consents});
const adminController=createAdminController({store:adminStore,actor:()=>currentUser,navigate:path=>{history.pushState({},'',path);render(true);},render:()=>render(),toast:Toast,confirm:message=>window.confirm(message)});
const jumolfAccess=()=>{const state=jumolfStore.snapshot(),r=auth.assurance==='supabase-auth'?currentUser?.jumolf_entitlement:null;return resolveJumolfAccess(auth.assurance==='supabase-auth'?{...state,jumolf_entitlement:r?.entitlement||'none',entitlement_record:r||{entitlement:'none'}}:state);};
let communityStore=createCommunityStore();
let persistentCommunity=null,communityOwnerId=null,communityEntryKey='';
const communityViewStore=()=>persistentCommunity?.store||communityStore;
const communityLiveBinding=id=>opsLiveBindings?.get(id)||opsLiveBindings?.list().find(b=>b.userId===id);
async function setCommunityLivePermission(userId,enabled){
 if(!opsLiveBindings||!opsLiveRemote||!persistentCommunity?.store.getContacts().some(c=>c.id===userId))throw Error('Contact Live indisponible.');
 const binding=communityLiveBinding(userId)||{alias:userId,userId};
 opsLiveBindings.set(binding.alias,binding.userId,enabled);communityStore.setContactPermission(binding.alias,'live_access_authorized',enabled);
 await opsLiveRemote.setHabitual(binding.userId,enabled);opsHabitualState.set(binding.userId,enabled);await opsLiveRemote.refresh();return true;
}
function afterCommunityContactRemoval(userId){
 if(!opsLiveBindings)return;const binding=communityLiveBinding(userId);if(!binding)return;communityStore.setContactPermission(binding.alias,'live_access_authorized',false);
 opsLiveBindings.set(binding.alias,binding.userId,false);
 return opsLiveRemote.setHabitual(binding.userId,false).then(()=>opsLiveRemote.refresh()).catch(()=>Toast('Retrait Live en attente de reconnexion.'));
}
function reconcileCommunityFriendships(route){
 const owner=auth.assurance==='supabase-auth'?currentUser?.user_id:null;
 if(owner!==communityOwnerId){persistentCommunity?.dispose();persistentCommunity=null;communityOwnerId=owner;communityEntryKey='';
  if(owner)persistentCommunity=createCommunityFriendships({baseStore:communityStore,ownerId:owner,ownerName:currentUser.name,getOwnerId:()=>auth.getSession().user?.user_id,call:body=>accountApi.call(body),onChange:()=>{if(location.pathname.startsWith('/community')||location.pathname==='/notifications')render();},afterRemove:afterCommunityContactRemoval,getLivePermission:id=>communityLiveBinding(id)?.enabled===true,setLivePermission:setCommunityLivePermission});
  communityController=makeCommunityController();
 }
 const key=route.startsWith('/community')||route==='/notifications'?route+location.search:'';
 if(persistentCommunity&&key&&key!==communityEntryKey){communityEntryKey=key;const target=resolveCommunityRoute(route),instance=persistentCommunity;void instance.refresh().then(()=>{if(instance===persistentCommunity&&target?.type==='profile'&&!instance.store.getProfile(target.id))return instance.store.resolveProfile(target.id);}).catch(()=>{});}
 else communityEntryKey=key;
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&location.pathname.startsWith('/community'))void persistentCommunity?.refresh().catch(()=>{});});
window.addEventListener('online',()=>{if(location.pathname.startsWith('/community')||location.pathname==='/notifications')void persistentCommunity?.refresh().catch(()=>{});});
let opsLiveRemote=null,opsLiveBindings=null,opsLiveRemoteOwner=null,opsLiveTickPending=false,opsLiveAttempt=0;
const opsHabitualState=new Map();
function reconcileOpsLive(){
 const owner=auth.assurance==='supabase-auth'?currentUser?.user_id:null;
 if(owner===opsLiveRemoteOwner)return;
 opsLiveRemote?.dispose();opsLiveRemote=null;opsLiveBindings=null;opsLiveRemoteOwner=owner;opsHabitualState.clear();
 if(owner&&storage)try{opsLiveBindings=createOpsLiveBindings({ownerId:owner,storage});for(const binding of opsLiveBindings.list())communityStore.setContactPermission(binding.alias,'live_access_authorized',binding.enabled);opsLiveRemote=createOpsLiveRemote({ownerId:owner,storage,call:createOpsLiveTransport({client:accountClient,ownerId:owner}),onChange:()=>{if(location.pathname.startsWith('/live')||location.pathname.startsWith('/community/profile/')||location.pathname==='/notifications')render();}});for(const m of operationalStore.list())if(m.ownerUserId===owner){const patch=opsLiveRemote.storedPolicy(m.id);if(patch)communityLiveStore.setSessionPolicy({sessionType:'ops',sessionId:m.id,patch});}}catch(error){Toast(error.message);}
}
async function tickOpsLive(force=false){
 if(document.visibilityState==='hidden'||opsLiveTickPending||!force&&Date.now()-opsLiveAttempt<5000)return;
 reconcileOpsLive();if(!opsLiveRemote)return;opsLiveAttempt=Date.now();opsLiveTickPending=true;const remote=opsLiveRemote;
 try{
  for(const binding of opsLiveBindings.reconcile([...communityStore.getContacts().map(c=>c.id),...(persistentCommunity?.status().ready?persistentCommunity.store.getContacts().map(c=>c.id):(opsLiveBindings.list().filter(b=>/^[0-9a-f-]{36}$/i.test(b.alias)).map(b=>b.alias)))]))if(opsHabitualState.get(binding.userId)!==binding.enabled){await remote.setHabitual(binding.userId,binding.enabled);opsHabitualState.set(binding.userId,binding.enabled);}
  for(const contact of communityStore.getContacts())if(/^[0-9a-f-]{36}$/i.test(contact.id)){
   const enabled=communityStore.getContactPermissions(contact.id)?.live_access_authorized===true;
   if(opsHabitualState.get(contact.id)!==enabled){await remote.setHabitual(contact.id,enabled);opsHabitualState.set(contact.id,enabled);}
  }
  for(const mission of operationalStore.list())if(mission.ownerUserId===opsLiveRemoteOwner)await remote.syncMission(mission,communityLiveStore.getSessionPolicy('ops',mission.id));
 }catch{/* Durable GPS and commands stay local; observers see the next verified refresh only. */}
 finally{await remote.refresh();opsLiveTickPending=false;}
}
setInterval(()=>{void tickOpsLive();},5000);
window.addEventListener('online',()=>{void tickOpsLive(true);});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void tickOpsLive(true);});
function renderPisteNotifications(){
 const local=communityStore.getNotificationStore(),prefs=local.getPreferences(communityStore.viewerId);
 const rows=[...selectedCommunityNotifications(),...(prefs.notify_live_in_app?opsLiveRemote?.view().notifications||[]:[])];
 return coachingInvitationCards()+NotificationsScreen(rows,rows.filter(n=>!n.read).length);
}
let profileOwnerId=currentUser?.user_id||null;
let profileStore=createProfileStore({}, {ownerId:profileOwnerId,storage});
const makeProfileController=()=>createProfileController({store:profileStore,communityStore,getDogs:()=>accountDogs(),notificationStore:communityStore.getNotificationStore(),navigate:path=>{history.pushState({},'',path);render(true);},render:()=>render()});
let profileController=makeProfileController();
let personalCloud=null;
function personalCloudForUser(){if(personalCloud?.ownerId===currentUser?.user_id)return personalCloud.controller;personalCloud?.controller.dispose();const ownerId=currentUser?.user_id;if(!ownerId)return null;
 const controller=createPersonalCloudController({ownerId,client:accountClient,render:()=>render(),getSources:()=>({profile:profileStore.snapshot(),dogs:dogsStore.list(),tracks:trackLibrary.list(),missions:operationalStore.list().map(m=>({...m,weatherSnapshot:m.weatherSnapshot||opsWeather.snapshot(m)})),associations:(sharedIndex?.list()||[]).flatMap(p=>{const dogId=sharedIndex.dogId(p.id);return dogId?[{sessionId:p.id,dogId}]:[];})}),restoreRecord:async(record,known,resolveDog)=>{
  if(currentUser?.user_id!==ownerId)throw Error('Compte de restauration changé.');const r=structuredClone(record),field=r.kind==='profile'?'primary_dog_id':['track','ops','session-dog-link'].includes(r.kind)?'dogId':null;if(field&&r.payload[field])r.payload[field]=await resolveDog(r.payload[field]);if(currentUser?.user_id!==ownerId)throw Error('Compte de restauration changé.');
  if(r.kind==='dog')return dogsStore.restoreCloud(r,known||r.id).id;
  if(r.kind==='track')return trackLibrary.restoreCloud(r,known||'track-cloud-'+r.id).id;
  if(r.kind==='ops'){if(r.payload.dog)r.payload.dog.id=r.payload.dogId;return operationalStore.restoreCloud(r).id;}
  if(r.kind==='profile'){profileStore.restoreCloud(r.payload);return 'self';}
  if(r.kind==='session-dog-link'){const p=sharedIndex.get(r.payload.sessionId);if(!p)throw Error('Ouvrez d’abord la session Coaching autorisée, puis restaurez son association.');sharedIndex.linkDog(p.id,dogsStore.get(r.payload.dogId));return p.id;}
 }});personalCloud={ownerId,controller};return controller;}

function accountDogs(){
 const rows=dogsStore.list().filter(d=>auth.assurance!=='supabase-auth'||!d.isDemonstration),demo=loboAccount.snapshot();
 if(demo?.status==='ready'&&!rows.some(d=>d.id===demo.dog.id||d.cloudId===demo.dog.id))rows.unshift({...demo.dog,isDemonstration:false,cloudId:demo.dog.id});
 return rows;
}
function trackingDogs(){return activeTrackingDogs(accountDogs());}
function defaultTrackingDog(){return resolveDefaultTrackingDog(accountDogs(),profileStore.snapshot().primary_dog_id);}
function sessionDog(id){const dogs=trackingDogs(),key=id?resolveDogId(dogs,id):defaultTrackingDog()?.id;return dogs.find(d=>d.id===key)||null;}
function localDog(id){const dogs=accountDogs(),key=resolveDogId(dogs,id);return dogs.find(d=>d.id===key)||null;}
async function removeCloudPersonal(kind,localId,cloudId,ownerId,expectedRevision=null){
 const journal=createPersistenceJournal({ownerId}),repository=createPersonalCloudRepository({client:accountClient,ownerId});
 try{const known=await journal.lookup({kind,localId});if(currentUser?.user_id!==ownerId)throw Error('Le compte a changé.');const id=cloudId||known?.id;if(!id)return false;await removeAccountRecord({kind,id,ownerId,getOwnerId:()=>currentUser?.user_id,repository,journal,expectedRevision});return true;}finally{journal.dispose();repository.dispose();}
}
async function removeAccountDog(id,ownerId){
 if(currentUser?.user_id!==ownerId)throw Error('Le compte a changé.');const dog=localDog(id);if(!dog||isProtectedDog(dog))throw Error('Chien protégé ou indisponible.');
 const cloud=auth.assurance==='supabase-auth'?await removeCloudPersonal('dog',id,dog.cloudId,ownerId):false;if(currentUser?.user_id!==ownerId)throw Error('Le compte a changé.');
 try{dogsStore.remove(id,{confirmed:true});}catch(error){throw Error((cloud?'Sauvegarde cloud supprimée ; copie locale non retirée : ':'')+error.message);}
 const preferred=profileStore.snapshot().primary_dog_id;if(resolveDogId([dog],preferred))profileStore.setPrimaryDog(resolveDefaultTrackingDog(accountDogs())?.id||null);
 jumolfController=makeJumolfController();history.pushState({},'','/dogs');render(true);Toast('Chien supprimé ; historiques conservés.');
}
let sessionCloudOwner=null,sessionCloudMap=new Map(),sessionCloudLoading=false,sessionCloudReadAt=0;
function loadSessionCloudMappings(){
 const ownerId=currentUser?.user_id;if(ownerId!==sessionCloudOwner){sessionCloudOwner=ownerId;sessionCloudMap.clear();sessionCloudReadAt=0;}
 if(auth.assurance!=='supabase-auth'||!ownerId||sessionCloudLoading||Date.now()-sessionCloudReadAt<15000)return;
 const rows=operationalStore.list().filter(m=>!m.cloudReadOnly&&m.ownerUserId===ownerId);if(!rows.length)return;
 sessionCloudLoading=true;const journal=createPersistenceJournal({ownerId});
 void (async()=>{try{const map=new Map();for(const m of rows){const r=await journal.lookup({kind:'ops',localId:m.id});if(r?.revision>0)map.set(m.id,{cloudBacked:true,cloudId:r.id,cloudRevision:r.revision});}if(currentUser?.user_id===ownerId){sessionCloudMap=map;sessionCloudReadAt=Date.now();}}catch{sessionCloudReadAt=Date.now();}finally{journal.dispose();sessionCloudLoading=false;if(currentUser?.user_id===ownerId&&location.pathname==='/sessions')render();}})();
}
function sessionRecord(id){return operationalStore.get(id)||pisteCloudMission(id)||sessionCatalog.get(id)||sharedIndex?.get(id)||null;}
function sessionPolicy(id){const record=sessionRecord(id),mapping=sessionCloudOwner===currentUser?.user_id?sessionCloudMap.get(id):null;return sessionRemovalPolicy(mapping?{...record,...mapping}:record,{ownerId:currentUser?.user_id,localOwnerId:coachingHistoryOwnerId,currentSessionId:coachingDraft.session?.id});}
function removalError(reason){return ({storage:'Le stockage local est indisponible. Réessayez sans fermer cette page.',conflict:'Cet historique a changé dans un autre onglet. Actualisez avant de supprimer.',invalid:'Le contenu local est illisible ; son original est conservé.',owner:'Cette suppression est réservée au propriétaire.', 'not-found':'Cette séance n’est plus présente dans cet historique.'})[reason]||reason||'Suppression indisponible.';}
async function removeSession(id,scope,ownerId){
 if(currentUser?.user_id!==ownerId)throw Error('Le compte a changé.');const record=sessionRecord(id),policy=sessionPolicy(id);if(!SessionRemovalConfirmation(policy,{scope}))throw Error(policy.localReason||policy.cloudReason||'Suppression indisponible.');
 if(policy.kind==='operational'){
  if(scope==='cloud')await removeCloudPersonal('ops',id,policy.cloudId,ownerId,policy.cloudRevision);
  if(currentUser?.user_id!==ownerId)throw Error('Le compte a changé.');const result=operationalStore.remove(id,{ownerId,currentSessionId:coachingDraft.session?.id});if(!result.ok)throw Error((scope==='cloud'?'Sauvegarde cloud supprimée ; copie locale non retirée. ':'')+removalError(result.reason));
 }else{const result=coachingHistoryStorage.remove(ownerId,id,{currentSessionId:coachingDraft.session?.id});if(!result.ok)throw Error(removalError(result.reason));const removed=sessionCatalog.remove(id,{ownerId,localOwnerId:coachingHistoryOwnerId,currentSessionId:coachingDraft.session?.id});if(!removed.ok)throw Error(removed.reason);if(coachingDraft.session?.id===id){cleanupCoachingExit();coachingDraft=newCoachingDraft();preparationState=null;searchState=search.createSearch();tracerState=tracer.createTracer();terrainOpen=false;}}
 jumolfController=makeJumolfController();history.pushState({},'','/sessions');render(true);Toast(scope==='cloud'?'Sauvegarde et copie locale supprimées.':'Séance retirée de cet appareil.');
}
function selectedCommunityNotifications(){
 const real=auth.assurance==='supabase-auth',view=communityViewStore(),viewerId=real?currentUser?.user_id:communityStore.viewerId;
 const items=[...communityStore.getNotificationStore().listAll(),...(real?view.getNotificationStore().listAll():[])];
 const state=real?(persistentCommunity?.status().ready?view.getState():null):communityStore.getState();
 return selectCommunityNotifications({items:[...new Map(items.map(n=>[n.id,n])).values()],viewerId,friendshipState:state});
}
function restoreProfileForUser(){const ownerId=currentUser?.user_id||null;if(ownerId===profileOwnerId)return;personalCloud?.controller.dispose();personalCloud=null;profileOwnerId=ownerId;profileStore=createProfileStore({}, {ownerId,storage});profileController=makeProfileController();}
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
 const candidate=()=>{if(!preparationState||(qaInitialized?location.pathname!=='/qa/coaching':location.pathname!=='/coaching/session'||coachingDraft.session?.id!==request.sessionId||JSON.stringify(preparationState.session)!==JSON.stringify(coachingDraft.session))||preparationState.session.id!==request.sessionId||preparationState.viewerId!==request.authorId||preparationState.phase!==request.phase||!preparation.canChooseSessionReference(preparationState)||searchState.phase!=='PREPARATION'||searchState.layingSegments.some(segment=>segment.length)||tracerState.phase!=='before'||tracerState.segments.some(segment=>segment.length))throw Error('Choix refusé : la session ou la préparation a changé.');const items=preparationState.session.traceType==='gpx'?gpxReferenceChoices(trackLibrary.list()):trackLibrary.list();const track=items.find(item=>item.id===request.referenceId);if(!track)throw Error('Cette référence n’est plus disponible.');return track;};
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
 if(live&&!live.dataset.gpsApproach&&tracerState.gpsPose&&live.dataset.gpsRunning===String(status.running)){captureCoachingPreparation();showCoachingPreparationWarning();refreshGpsScreen(tracerState.gpsPose,status);}
 else render();
}
const tracerGps=createTracerGpsController({getContext:gpsContext,setTracer:t=>{tracerState=t;},render:gpsFeedback});
function driverGpsFeedback(){if(globalThis.location?.pathname?.startsWith('/operational')||!ownsDriverGps(gpsContext()))return;const live=document.querySelector('[data-gps-kind="search"]'),status=driverGps.view();if(live&&searchState.gpsSearch&&live.dataset.gpsRunning===String(status.running)){captureCoachingPreparation();showCoachingPreparationWarning();refreshGpsScreen(searchState.gpsSearch,status);const clock=document.querySelector('[data-gps-clock]');if(clock){const n=Math.floor(searchGpsActiveMs(searchState)/1000);clock.textContent=`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}}else render();}
const driverGps=createDriverGpsController({getContext:gpsContext,setSearch:s=>{searchState=s;},render:driverGpsFeedback});


function operationalGpsContext(){const route=resolveOperationalRoute(location.pathname);return {user:currentUser,route,mission:route?.missionId&&!operationalStore.get(route.missionId)?.cloudReadOnly?operationalStore.get(route.missionId):null};}
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
  trackSmart.reconcile();
 mountGpsMaps({livePose:c.mission.gpsTrack,lastFix:status.lastFix});
 }else render();
}
const opsGps=createOperationalGpsController({getContext:operationalGpsContext,getStore:()=>operationalStore,render:operationalGpsFeedback});
const opsWeather=createOperationalWeatherController({getContext:operationalGpsContext,storage,onError:message=>Toast(message)});

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
let scentCorridorVisible=false,scentWindDegrees=0,scentWind=null,scentWindKey='',scentWindPending=null;
async function refreshScentWind(){
 const p=trackEditor.draft?.points?.[0];if(!scentCorridorVisible||!p||trackEditor.draft?.coordinateSpace!=='wgs84')return;
 const key=[p.y.toFixed(3),p.x.toFixed(3)].join(',');if(scentWindKey===key&&(scentWind||scentWindPending))return;
 scentWindKey=key;scentWind=null;
 const task=(async()=>{try{
  const url='https://api.open-meteo.com/v1/forecast?'+new URLSearchParams({latitude:String(p.y),longitude:String(p.x),current:'wind_speed_10m,wind_direction_10m',wind_speed_unit:'kmh',timezone:'auto'});
  const response=await fetch(url,{credentials:'omit'});if(!response.ok)throw Error('Météo indisponible');
  const data=await response.json(),speed=Number(data?.current?.wind_speed_10m),from=Number(data?.current?.wind_direction_10m);
  if(!Number.isFinite(speed)||!Number.isFinite(from))throw Error('Vent indisponible');
  if(scentWindKey!==key||!scentCorridorVisible)return;
  scentWind={speed,from,observedAt:data.current.time,source:'Open-Meteo'};scentWindDegrees=(from+180)%360;
 }catch{if(scentWindKey===key)scentWind={error:true};}
 finally{if(scentWindKey===key&&scentCorridorVisible&&location.pathname==='/track-builder')render();}})();
 scentWindPending=task;await task;if(scentWindPending===task)scentWindPending=null;
}
let smartDogHydrationKey='';
let smartEntryOpenedKey=null;
let trackEditorActive=false,trackEditorHref='/track-builder',trackEditorDrag=null,trackEditorExitDialog=false,trackEditorIgnoreMapClickUntil=0;
const smartTrackFingerprint=()=>JSON.stringify([trackEditor.draft?.id,trackEditor.draft?.points,trackEditor.draft?.name,trackEditor.draft?.description,trackEditor.draft?.category,trackEditor.draft?.difficulty,trackEditor.draft?.dogId,trackEditor.draft?.notes,trackEditor.draft?.activeMode]);
const trackSmart=createSmartTrackController({service:createSmartTrackService({getAuthorization:async()=>{const {data}=await accountClient.auth.getSession();return data?.session?{Authorization:`Bearer ${data.session.access_token}`}:{}}}),getContext:()=>location.pathname==='/track-builder'&&trackEditor.draft?{ownerId:currentUser?.user_id,key:trackEditor.routeKey,fingerprint:smartTrackFingerprint(),access:jumolfAccess()}:null,onChange:()=>{if(location.pathname==='/track-builder')render();}});
let missionMount=null,missionSourceBrief='',missionDog=null;
function canineTrackContext(dogId){
 const selected=sessionDog(dogId),demo=loboAccount.snapshot();dogId=selected?.cloudId&&selected.cloudId===demo?.dog?.id?demo.dog.id:selected?.id||dogId;
 const token=new URLSearchParams(location.search).get('jumolfNext'),request=token?jumolfController.generatorPreparation(token):null,raw=jumolfController.canineContext(dogId,request&&request.dogId===dogId?request.selection:{});
 const present=dog=>{const id=resolveDogId(trackingDogs(),dog.id);return id?{...dog,id}:dog;},context={...raw,dog:raw.dog?present(raw.dog):null,dogs:raw.dogs.map(present)};
 if(token&&(!request||request.dogId!==dogId))return {...context,recommendations:[],declarations:context.declarations.filter(d=>d.startsWith('Chien ·'))};return {...context,...(request&&request.dogId===dogId?{recommendationId:request.recommendationId}:{} )};
}
function missionContext(){
 const state=jumolfStore.accessSnapshot(),r=auth.assurance==='supabase-auth'?currentUser?.jumolf_entitlement:null,a=resolveJumolfAccess(auth.assurance==='supabase-auth'?{...state,jumolf_entitlement:r?.entitlement||'none',entitlement_record:r||{entitlement:'none'}}:state),training=trackEditor.preview||trackEditor.canine;
 if(location.pathname!=='/track-builder'||!currentUser?.user_id||!a.entitlement_valid||a.entitlement!=='premium'||training?.ownerId!==currentUser.user_id||!training.options)return null;
 const consents=state.consents,draft=trackEditor.preview?.draft||trackEditor.draft;
 return {ownerId:currentUser.user_id,key:trackEditor.routeKey,draft,proposal:training.proposal,options:training.options,weatherAllowed:!!consents.weather,preview:!!trackEditor.preview,previewId:trackEditor.preview?.proposal.id,proposalPosition:trackSmart.view().proposals.findIndex(p=>p.id===trackEditor.preview?.proposal.id)+1,proposalCount:trackSmart.view().proposals.length,title:training.proposal.title,dog:consents.dog_history&&missionDog?.id===(trackEditor.preview?.dogId||draft?.dogId)?missionDog:null,viewer:{name:currentUser.name},sourceBrief:missionSourceBrief,canPrepare:auth.assurance==='supabase-auth'};
}
const missionController=createMissionController({getContext:missionContext});
function previewSmartProposal(id){try{const preview=trackSmart.proposal(id);trackEditor.preview={...preview,ownerId:currentUser?.user_id,draft:{...smartTrackDraft(preview.proposal,preview.commune),basemap:'satellite',dogId:canineTrackContext(preview.dogId).dog?.id||''}};render();document.querySelector('[data-smart-panel]')?.close();}catch(error){Toast(error.message);}}
function submitCurrentTrack(prepare=false){const panel=document.querySelector('[data-creator-panel]');if(panel)panel.open=true;const form=document.querySelector('[data-track-editor-form]'),button=prepare?form?.querySelector('[name="prepareCanine"]'):form?.querySelector('button[type="submit"]:not([name])');if(!button||button.disabled)throw Error('Vérifiez le nom, le chien et la géométrie dans Menu.');form.requestSubmit(button);}
function prepareSavedTrack(saved){
 const access=jumolfAccess();if(auth.assurance!=='supabase-auth'||!access.entitlement_valid||access.entitlement!=='premium')throw Error('Préparation Premium indisponible pour ce compte.');
 const next=coachingGeneratedTrackState({ownerId:currentUser.user_id,dogs:trackingDogs(),primaryDogId:profileStore.snapshot().primary_dog_id,dogId:saved.dogId||'',track:saved,currentState:coachingWizardState});
 const ownerId=currentUser.user_id,proceed=()=>{const a=jumolfAccess();if(currentUser?.user_id!==ownerId||!a.entitlement_valid||a.entitlement!=='premium')return;try{if(coachingWizardState?.draft)throw Error('Un brouillon Coaching est déjà en cours.');sharedIndex?.saveTrainingDraft(next);coachingWizardState=next;trackEditorActive=false;trackEditor={...trackEditor,draft:null,routeKey:'',preview:null};history.pushState({},'','/new-session');render(true);}catch(error){Toast(error.message);}};
 if(trackEditorActive&&trackEditor.draft?.dirty)ConfirmationDialog({title:'Continuer vers Coaching ?',description:'La piste choisie est enregistrée et restera réutilisable. Le brouillon précédent comporte des modifications non enregistrées ; quitter maintenant les abandonnera.',onConfirm:proceed});else proceed();
}
function openProposalSave(prepare=false){
 const preview=trackEditor.preview,ownerId=currentUser?.user_id,access=jumolfAccess();if(!preview||preview.ownerId!==ownerId||!access.entitlement_valid||access.entitlement!=='premium')throw Error('Proposition indisponible pour ce compte.');
 document.querySelector('[data-proposal-save-dialog]')?.remove();const dialog=document.createElement('dialog');dialog.dataset.proposalSaveDialog='';dialog.className='proposal-save-dialog';
 dialog.innerHTML=`<form><h2>Enregistrer le tracé</h2><p>La proposition affichée sera conservée dans Pistes préparées. Votre brouillon précédent reste inchangé.</p><label>Nom du tracé<input name="name" maxlength="80" required value="${escapeHTML(preview.draft.name)}"></label><p role="alert" data-save-error></p><div class="coaching-actions"><button type="button" data-save-cancel>Annuler</button><button type="submit" class="button button-gold">${prepare?'Enregistrer puis préparer Coaching':'Enregistrer le tracé'}</button></div></form>`;
 dialog.querySelector('[data-save-cancel]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());
 dialog.querySelector('form').onsubmit=event=>{event.preventDefault();const feedback=dialog.querySelector('[data-save-error]');try{
  const current=jumolfAccess();if(currentUser?.user_id!==ownerId||trackEditor.preview!==preview||!current.entitlement_valid||current.entitlement!=='premium')throw Error('Le compte, les droits ou la proposition ont changé.');
  if(prepare&&coachingWizardState?.draft)throw Error('Un brouillon Coaching existe déjà. Reprenez-le ; il reste conservé.');
  const context=canineTrackContext(preview.draft.dogId);let memory=null;
  if(preview.options&&preview.draft.dogId&&context.dog)memory=createTrainingMemory({ownerId,dogId:preview.draft.dogId,options:preview.options,proposal:preview.proposal,draft:preview.draft,mission:missionController.snapshot(),context});
  const saved=saveDisplayedProposal({library:trackLibrary,preview,ownerId,name:dialog.querySelector('[name="name"]').value,trainingMemory:memory});
  dialog.close();trackEditor.notice='Tracé enregistré dans Pistes préparées. Le brouillon précédent est conservé.';render();
  if(prepare){try{prepareSavedTrack(saved);}catch(error){Toast('Tracé enregistré. '+error.message);}return;}
  const confirmation=document.createElement('dialog');confirmation.className='proposal-save-dialog';confirmation.innerHTML=`<h2>Tracé enregistré</h2><p>${escapeHTML(saved.name)}</p><p>Votre brouillon précédent reste disponible sur la carte. Les informations pédagogiques détaillées restent sur cet appareil.</p><a class="button button-gold" href="/tracks/${encodeURIComponent('prepared:'+saved.id)}">Ouvrir la piste sauvegardée</a><a class="button button-dark" href="/profile/sync">Sauvegardes cloud existantes</a><button type="button">Continuer sur la carte</button>`;confirmation.querySelector('button').onclick=()=>confirmation.close();confirmation.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>confirmation.close()));confirmation.addEventListener('close',()=>confirmation.remove());document.body.append(confirmation);confirmation.showModal();
 }catch(error){feedback.textContent=error.message;}};
 document.body.append(dialog);dialog.showModal();dialog.querySelector('input').focus();
}
function missionAction(action,target){
 if(!missionContext())return;
 if(action==='edit'){document.querySelector('[data-mission-panel]')?.removeAttribute('open');openSmartTrackPanel();}
 else if(action==='dismiss'){trackEditor.preview=null;render();}
 else if(action==='apply'||action==='adjust'){if(trackEditor.preview)selectSmartProposal(trackEditor.preview.proposal.id);else {document.querySelector('[data-mission-panel]')?.removeAttribute('open');Toast('Ajustez les points directement sur la carte.');}}
 else if(action==='save'){if(trackEditor.preview)openProposalSave();else submitCurrentTrack(false);}
 else if(action==='coaching'){Toast('La préparation Coaching nécessite un compte autorisé.');}
 else if(['previous','next'].includes(action)){const proposals=trackSmart.view().proposals,index=proposals.findIndex(p=>p.id===trackEditor.preview?.proposal.id);if(proposals.length)previewSmartProposal(proposals[(index+(action==='next'?1:-1)+proposals.length)%proposals.length].id);}
 else if(action==='prepare'){if(trackEditor.preview)openProposalSave(true);else submitCurrentTrack(true);}
}
const trackRouting=createTrackRoutingController({service:createTrackRoutingService({getAccessToken:async()=>{const {data,error}=await accountClient.auth.getSession();return error?null:data?.session?.access_token||null;}}),getContext:()=>location.pathname==='/track-builder'&&trackEditor.draft?.coordinateSpace==='wgs84'?{id:trackEditor.routeKey,ownerId:currentUser?.user_id,draft:trackEditor.draft}:null,onResult:(id,route)=>{trackEditor={...trackEditor,draft:applyTrackRoute(trackEditor.draft,id,route)};render();},onStatus:notice=>{if(trackEditor.notice===notice)return;trackEditor={...trackEditor,notice};render();}});
const trackPlaces=[{name:'Forêt de Fontainebleau',subtitle:'Lieu fictif · démonstration',center:{x:180,y:150}},{name:'Sentier des crêtes',subtitle:'Lieu fictif · démonstration',center:{x:180,y:150}},{name:'Place du village',subtitle:'Adresse fictive · démonstration',center:{x:180,y:150}}];
function ensureTrackEditor(){
 const key=`${location.pathname}${location.search}`;
 if(trackEditor.routeKey===key&&trackEditor.draft)return;
 const params=new URLSearchParams(location.search),editId=params.get('edit'),copyId=params.get('copy');
 if(editId){const item=trackLibrary.get(editId);trackEditor={draft:createTrackDraft({track:item}),selectedPointId:null,nextPointKind:'via',results:[],notice:'',error:'',routeKey:key,copySource:null};}
 else if(copyId){const row=trackListView(trackLibrary.list(),sessionCatalog.list(),sharedIndex?.list()||[]).find(item=>item.id===copyId),source=row?.copySource;
  if(!source){trackEditor={...trackEditor,draft:createTrackDraft(),notice:'Géométrie indisponible : aucune copie créée.',routeKey:key,copySource:null};}
  else {const copySource={...source,sourceId:row.id,name:row.name};trackEditor={draft:createTrackDraft({copySource}),selectedPointId:null,nextPointKind:'via',results:[],notice:'Copie locale créée · la source reste en lecture seule.',error:'',routeKey:key,copySource};}
 }else trackEditor={draft:createTrackDraft({geographic:true}),selectedPointId:null,nextPointKind:'via',results:[],notice:'',error:'',routeKey:key,copySource:null};
 if(jumolfAccess().entitlement_valid&&jumolfAccess().entitlement==='premium'&&trackEditor.draft?.coordinateSpace==='wgs84'&&!trackEditor.draft.points?.length)trackEditor.draft=setTrackMode(trackEditor.draft,'follow');
 
 trackEditorActive=true;trackEditorHref=key;
}
function renderTrackEditor(){
 ensureTrackEditor();if(smartDogHydrationKey===trackEditor.routeKey&&defaultTrackingDog()){trackSmart.setOptions({dogId:defaultTrackingDog().id});smartDogHydrationKey='';}trackSmart.reconcile();const smart=trackSmart.view(),context=canineTrackContext(smart.dogId);
 const training=trackEditor.canine,allowed=jumolfAccess().entitlement_valid&&jumolfAccess().entitlement==='premium';
 const brief=training?.ownerId===currentUser?.user_id&&allowed?CanineBrief(buildCanineBrief(training.proposal,training.options,canineTrackContext(trackEditor.draft.dogId)),{initial:true}):'';
 const preview=trackEditor.preview,selectedContext=canineTrackContext(preview?.dogId||trackEditor.draft.dogId);missionDog=selectedContext.dog;missionSourceBrief=preview?.ownerId===currentUser?.user_id&&preview?.options&&allowed?CanineBrief(buildCanineBrief(preview.proposal,preview.options,selectedContext),{initial:true}):brief;const mission=missionContext();
 return TrackBuilderScreen({editorDraft:trackEditor.preview?.draft||trackEditor.draft,missionMarkup:mission?MissionControlPanel(missionController.snapshot(),{...mission,editorNotice:trackEditor.notice}):'',smartState:{...smart,scentCorridorVisible,scentWindDegrees,scentWind,previewing:!!trackEditor.preview,previewBasemap:trackEditor.preview?.draft.basemap,canineContext:context},canineBrief:brief,canPrepareCanine:!!brief&&auth.assurance==='supabase-auth',premiumAccess:jumolfAccess(),dogs:trackingDogs(),results:trackEditor.results,fixtures:auth.assurance==='supabase-auth'?[]:gpxFixtures,selectedPointId:trackEditor.selectedPointId,nextPointKind:trackEditor.nextPointKind,notice:trackEditor.notice,error:trackEditor.error},trackLibrary.list());
}
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
 const content=CommunityScreen({route,store:communityViewStore(),dogs:dogsStore.list(),tracks:trackListView(trackLibrary.list(),sessionCatalog.list(),sharedIndex?.list()||[]),source:route.type==='new'?communitySourceFromLocation():null,sourceOptions:communitySourceOptions(),query:new URLSearchParams(location.search).get('q')||'',shareMode:new URLSearchParams(location.search).get('share')||'post'});
 if(route.type!=='profile'||!opsLiveRemote||persistentCommunity||!communityStore.getContacts().some(c=>c.id===route.id))return content;
 void opsLiveRemote.loadDirectory().catch(()=>{});const binding=opsLiveBindings.get(route.id);
 return content+`<section class="card"><h2>Compte Live OPS</h2><p>Associez explicitement ce contact à son compte PISTE. Son nom seul ne donne aucun accès distant.</p><form data-ops-account-link="${escapeHTML(route.id)}"><label>Compte réel<select name="userId" required><option value="">Choisir le compte du contact</option>${opsLiveRemote.view().directory.map(p=>`<option value="${escapeHTML(p.id)}" ${binding?.userId===p.id?'selected':''}>${escapeHTML(p.display_name)} · ${escapeHTML(p.id)}</option>`).join('')}</select></label><button class="button button-dark">Associer ce compte et appliquer l’autorisation Live</button></form></section>`;
}
function profileConsentSummary(){
 if(auth.assurance==='supabase-auth')return {participationEnabled:false,eligibleSessionCount:0,excludedSessionCount:0,categories:{},opsCategories:{}};
 const consent=scientificContributionStore.snapshot();
 const eligible=scientificContributionFixtures.sessions.filter(item=>item.contributorKey===scientificContributionActor.contributorKey).map(item=>scientificContributionStore.sessionInclusionState(item.sourceKey));
 return {...consent,eligibleSessionCount:eligible.filter(state=>!['excluded_by_user','excluded_sensitive','not_eligible'].includes(state)).length,excludedSessionCount:eligible.filter(state=>['excluded_by_user','excluded_sensitive','not_eligible'].includes(state)).length};
}
function renderProfile(route){
 if(route.type==='sync')return auth.assurance==='supabase-auth'?personalCloudForUser().screen():'<p>Connectez-vous à votre compte PISTE pour accéder aux sauvegardes privées.</p>';
 const notifications=communityStore.getNotificationStore();
 return (profileStore.persistenceWarning()?`<p role="status">${escapeHTML(profileStore.persistenceWarning())}</p>`:'')+ProfileScreen({route,user:currentUser,profileStore,dogs:accountDogs(),communityProfile:communityStore.getProfile(communityStore.viewerId),jumolfAccess:jumolfAccess(),jumolfState:jumolfStore.snapshot(),consent:profileConsentSummary(),scientificAccess:scientificCorpusAccessFor(currentUser),adminAccess:adminStore.accessFor(currentUser),notificationPreferences:notifications.getPreferences(communityStore.viewerId),appVersion:adminCurrentVersion()});
}
function makeCommunityController(){return createCommunityController({store:communityViewStore(),sourceOptions:communitySourceOptions,origin:location.origin,navigate:path=>{history.pushState({},'',path);render(true);},render:()=>render(),toast:Toast});}
let communityController=makeCommunityController();
function parseJumolfPath(path){
 if(!path)return null;
 const match=String(path).match(/([ML])\s*(-?[\d.]+)\s+(-?[\d.]+)/g)||[];
 const points=match.map(command=>{const [,x,y]=command.match(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/)||[];return {x:Number(x),y:Number(y)};}).filter(point=>Number.isFinite(point.x)&&Number.isFinite(point.y));
 return points.length?points:null;
}
function jumolfDemoRawSources(){
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
function jumolfRawSources(){
 if(auth.assurance!=='supabase-auth')return jumolfDemoRawSources();
 return buildAccountAnalysisSources({ownerId:currentUser?.user_id,localOwnerId:coachingHistoryOwnerId,sharedOwnerId:sharedIndex?.ownerId,tracksOwnerId:trackLibraryOwnerId,dogs:dogsStore.list(),coachingRecords:sessionCatalog.list(),sharedSessions:sharedIndex?.list()||[],dogIds:sharedOptions().dogIds,operationalMissions:operationalStore.list().map(m=>({...m,trackingElapsedMs:m.cloudReadOnly?m.trackingElapsedMs:operationalStore.trackingElapsedMs(m.id)})),tracks:trackLibrary.list(),weatherForMission:m=>opsWeather.snapshot(m)});
}
function accountScientificDataset(){return buildAccountScientificDataset(buildJumolfSources(jumolfRawSources()),currentUser?.user_id);}
function scienceDataset(){return auth.assurance==='supabase-auth'?accountScientificDataset():scientificDataset;}
function prepareJumolfTraining(preparation){
 if(auth.assurance!=='supabase-auth'||!currentUser?.user_id)throw Error('Un compte connecté est nécessaire.');
 coachingWizardState=coachingJumolfPreparationState({ownerId:currentUser.user_id,dogs:trackingDogs(),preparation,currentState:coachingWizardState});
 try{sharedIndex?.saveTrainingDraft(coachingWizardState);}catch(error){Toast(error.message);}
 history.pushState({},'','/new-session');render(true);
}
function trainingMemoryFor(p){const memory=sharedIndex?.training(p?.id),dogId=sharedIndex?.dogId(p?.id);if(!memory||!localDog(dogId)||!jumolfAccess().entitlement_valid||jumolfAccess().entitlement!=='premium')return null;return trainingMemoryView(memory,p,{ownerId:currentUser?.user_id,dogId,consents:jumolfStore.snapshot().consents});}
const loboAccount=createLoboAccountController({getViewer:()=>auth.assurance==='supabase-auth'?currentUser:null,verifyUser:async()=>{const r=await accountClient.auth.getUser();if(r.error)throw r.error;return r.data?.user;},repository:ownerId=>createPersonalCloudRepository({client:accountClient,ownerId}),call:body=>accountApi.call(body),storage,indexedDB:window.indexedDB,onChange:()=>{if(document.querySelector('form[data-dog-form],form[data-profile-form],form[data-community-form="post-create"]'))return;render();},beforeReset:()=>{personalCloud?.controller.dispose();personalCloud=null;},afterReset:async bundle=>{
 const ownerId=currentUser.user_id;dogsStore=createDogsStore({dogs:[],ownerId,storage});trackLibrary=createTrackLibrary({ownerId,storage,includeDemo:auth.assurance!=='supabase-auth'});operationalStore=createOperationalMissionStore({ownerId,storage});sessionCatalog.clear();coachingDraft=newCoachingDraft();sharedIndex?.dispose();sharedIndex=createSharedSessionIndex({ownerId,storage});await sharedIndex.refresh(async()=>bundle.coachingProjections);if(currentUser?.user_id!==ownerId)throw Error('Compte modifié.');const controller=personalCloudForUser();await controller.load();if(currentUser?.user_id!==ownerId)throw Error('Compte modifié.');await controller.restore(bundle.personalRecords.map(r=>r.kind+':'+r.id));
}});
function makeJumolfController(){return createJumolfController({getAccountDemo:()=>loboAccount.snapshot(),deviceResetScreen:()=>loboAccount.screen(),store:jumolfStore,getPrimaryDogId:()=>defaultTrackingDog()?.id||'',getTrainingMemories:()=>sharedIndex?.list().map(trainingMemoryFor).filter(Boolean)||[],getViewer:()=>({id:currentUser?.user_id,name:currentUser?.name,role:currentUser?.role}),prepareRealTraining:auth.assurance==='supabase-auth'?prepareJumolfTraining:null,getRawSources:jumolfRawSources,demoMode:()=>auth.assurance!=='supabase-auth',getVerifiedEntitlement:auth.assurance==='supabase-auth'?()=>auth.getSession().user?.jumolf_entitlement||{entitlement:'none'}:null,redeemRealCode:auth.assurance==='supabase-auth'?async code=>{const id=auth.getSession().user?.user_id;const result=await accountApi.call({operation:'premium-code-redeem',code});if(auth.getSession().user?.user_id!==id)throw Error('Compte modifié.');await auth.initialize();if(auth.getSession().user?.user_id!==id)throw Error('Compte modifié.');currentUser=auth.getSession().user;syncJumolfVerifiedEntitlement();return result;}:null,navigate:path=>{history.pushState({},'',path);render(true);},render:()=>render(),toast:Toast});}
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
let scientificController=createScientificController({actor:currentUser,dataset:scienceDataset(),getDataset:scienceDataset,analytics:scientificAnalytics,anomalies:scientificAnomalies,discoveries:scientificDiscoveries,navigate:path=>{history.pushState({},'',path);render(true);},render:()=>render(),toast:Toast});
let scientificCorpusController=createScientificCorpusController({access:scientificCorpusAccessFor(currentUser),corpusService:createScientificContributionCorpusService(buildScientificContributionCorpus({fixtures:scientificContributionFixtures,consentStores:new Map([[contributionMockUserId,scientificContributionStore]])})),navigate:path=>{history.pushState({},'',path);render(true);},render:()=>render()});
function restoreSmartTrackEntry(){
 if(location.pathname!=='/track-builder'){smartEntryOpenedKey=null;return;}
 const params=new URLSearchParams(location.search);
 if(params.get('tool')==='smart'&&smartEntryOpenedKey!==trackEditor.routeKey){smartEntryOpenedKey=trackEditor.routeKey;if(params.get('canine')==='1'){const context=canineTrackContext(params.get('dog'));if(!context.dog&&loboAccount.snapshot()?.status==='loading')smartDogHydrationKey=trackEditor.routeKey;const request=jumolfController.generatorPreparation(params.get('jumolfNext'));trackSmart.setOptions({...(request&&request.dogId===context.dog?.id?request.options:{level:'initiation'}),dogId:context.dog?.id||''});if(params.has('jumolfNext')&&!request)trackEditor.notice='Proposition plus accessible : paramètres génériques à vérifier. Aucune personnalisation conservée.';render();}openSmartTrackPanel();}
}
function openSmartTrackPanel({focus=true}={}){
 const panel=document.querySelector('[data-smart-panel]'),menu=document.querySelector('[data-creator-panel]');
 if(!panel)return;
 if(menu)menu.open=false;if(!panel.open)panel.showModal();
 const start=trackEditor.draft?.points?.find(p=>p.kind==='start')||trackEditor.draft?.points?.[0];if(trackEditor.draft?.coordinateSpace==='wgs84'&&start&&Number.isFinite(Number(start.x))&&Number.isFinite(Number(start.y))){const point=[Number(start.x),Number(start.y)];const previous=trackSmart.view();if(!previous.startPoint||previous.startPoint.some((v,i)=>v!==point[i]))void trackSmart.detectCommune(point);}

 if(focus)panel.querySelector('[data-smart-query], [data-smart-discover]')?.focus({preventScroll:true});
}

function selectSmartProposal(id){
 try{const {proposal,commune,options,dogId}=trackSmart.proposal(id),ownerId=currentUser?.user_id,key=trackEditor.routeKey,fingerprint=smartTrackFingerprint();
  const apply=()=>{if(location.pathname!=='/track-builder'||currentUser?.user_id!==ownerId||trackEditor.routeKey!==key||smartTrackFingerprint()!==fingerprint)return;try{trackSmart.proposal(id);trackRouting.dispose();let draft=smartTrackDraft(proposal,commune);if(options){const context=canineTrackContext(dogId);const brief=buildCanineBrief(proposal,options);draft={...draft,basemap:'satellite',dogId:context.dog?.id||'',notes:(draft.notes+' Objectif pédagogique : '+brief.objective+' Niveau choisi : '+brief.level+'. Fiche initiale à réévaluer après édition.').slice(0,1000)};}trackSmart.dispose({keepCriteria:!!options});editorChange(draft,{canine:options?{ownerId,proposal,options}:null,selectedPointId:null,copySource:null,nextPointKind:'via',notice:options?'Piste pédagogique ouverte · ajustez-la sur la carte. Retrouvez la fiche initiale et « Enregistrer et préparer dans Coaching » dans Menu.':'Parcours proposé · adaptez-le sur la carte puis enregistrez-le. Accès et surfaces à vérifier.'});document.querySelector('[data-smart-panel]')?.close();}catch(error){Toast(error.message);}};
  if(trackEditor.draft?.dirty)ConfirmationDialog({title:'Ouvrir cette proposition ?',description:'Elle remplacera les modifications non enregistrées du brouillon actuel. Le parcours proposé restera modifiable avant enregistrement.',onConfirm:apply});else apply();
 }catch(error){Toast(error.message);}
}
async function importEditorGpx(file){const initial=trackEditor.draft,fingerprint=d=>JSON.stringify([d?.id,d?.points,d?.name,d?.description,d?.category,d?.difficulty,d?.dogId,d?.notes,d?.activeMode]),initialKey=fingerprint(initial),ownerId=currentUser?.user_id,key=trackEditor.routeKey;try{const parsed=await readTrackGpxFile(file);const valid=()=>location.pathname==='/track-builder'&&currentUser?.user_id===ownerId&&trackEditor.routeKey===key&&fingerprint(trackEditor.draft)===initialKey;if(!valid())return;const apply=()=>{if(!valid())return;trackRouting.dispose();editorChange(createImportedGpxDraft(parsed),{canine:null,selectedPointId:null,copySource:null,nextPointKind:'via',notice:`${parsed.fileName} · ${parsed.points.length} points importés. Enregistrez pour conserver ce parcours.`});const panel=document.querySelector('[data-creator-panel]');if(panel)panel.open=false;};if(initial?.dirty)ConfirmationDialog({title:'Remplacer le brouillon ?',description:'Le GPX sera chargé sur la carte. Les modifications non enregistrées du brouillon actuel seront remplacées.',onConfirm:apply});else apply();}catch(error){if(location.pathname==='/track-builder'&&currentUser?.user_id===ownerId&&trackEditor.routeKey===key&&fingerprint(trackEditor.draft)===initialKey){trackEditor={...trackEditor,error:error.message};render();}}}
function editorChange(nextDraft,patch={}){trackEditor={...trackEditor,preview:null,...patch,draft:nextDraft,error:''};render();}
function requestTrackEditorExit(destination,{replace=false}={}){
 if(trackEditorExitDialog)return;
 trackEditorExitDialog=true;
 ConfirmationDialog({title:'Quitter sans enregistrer ?',description:'Les modifications de ce brouillon seront perdues.',onConfirm:()=>{trackEditorExitDialog=false;trackEditorActive=false;trackEditor={...trackEditor,draft:null,routeKey:''};history[replace?'replaceState':'pushState']({},'',destination);render(true);}});
 document.querySelector('dialog [data-cancel]')?.addEventListener('click',()=>{trackEditorExitDialog=false;},{once:true});
}
window.addEventListener('beforeunload',event=>{if(trackEditorActive&&trackEditor.draft?.dirty){event.preventDefault();event.returnValue='';}});
function restoreTrackLibraryForUser(){const ownerId=currentUser?.user_id||null;if(ownerId===trackLibraryOwnerId)return;if(coachingWizardState?.ownerId!==ownerId)coachingWizardState=sharedIndex?.trainingDraft()||null;trackLibraryOwnerId=ownerId;trackLibrary=createTrackLibrary({storage,ownerId,includeDemo:auth.assurance!=='supabase-auth'});trackLibraryWarningShown='';trackEditor={...trackEditor,draft:null,selectedPointId:null,routeKey:'',copySource:null};trackEditorActive=false;}
let remoteCoachingMount=null,remoteCoachingRoot=null,remoteCoachingKey='',coachingWizardState=sharedIndex?.trainingDraft()||null;
function exportPanelForRoute(route){
 if(auth.assurance!=='supabase-auth')return '';
 const domain=route.startsWith('/scientific')?'science':route.startsWith('/jumolf')?'jumolf':route==='/tracks'?'track':route==='/sessions'?'coaching':route==='/ops'?'ops':null;
 return domain||['/profile','/profile/sync'].includes(route)?DataExportsPanel({user:currentUser,domain}):'';
}
function render(focus=false) {
 const missionPanelWasOpen=document.querySelector('[data-mission-panel]')?.open===true,missionSections=[...document.querySelectorAll('[data-mission-section]')].map(el=>[el.dataset.missionSection,el.open]),missionScroll=document.querySelector('.mission-panel-content')?.scrollTop||0;
 missionMount?.dispose();missionMount=null;missionController.reconcile();
 const exportPanel=document.querySelector('[data-data-exports]'),exportUi=exportPanel?{open:exportPanel.open,domain:exportPanel.querySelector('[name=domain]')?.value,format:exportPanel.querySelector('[name=format]')?.value}:null;
 const smartPanelWasOpen=document.querySelector('[data-smart-panel]')?.open===true;
 const smartPanelScroll=document.querySelector('[data-smart-panel] .creator-menu-sheet')?.scrollTop||0;
 const smartWasBusy=!!document.querySelector('[data-smart-panel] [data-smart-cancel]');
 const creatorPanelWasOpen=document.querySelector('[data-creator-panel]')?.open===true;
 const creatorSections=[...(document.querySelectorAll?.('[data-creator-section]')||[])].map(section=>[section.dataset.creatorSection,section.open]);
 document.querySelector('[data-coaching-help-dialog]')?.close();
 currentUser=auth.getSession().user;
 if(currentUser&&auth.assurance!=='supabase-auth'&&!adminStore.accountIsActive(currentUser.user_id)){auth.signOut();currentUser=null;history.replaceState({},'','/auth');return render(focus);}
 const requested=location.pathname.replace(/\/$/,'') || '/';
 const scientificEntry=canonicalScientificPath(requested);
 if(scientificEntry!==requested)history.replaceState({},'',`${scientificEntry}${location.search}${location.hash}`);
 if(requested==='/olfactory-twin'){history.replaceState({},'','/jumolf');return render(focus);}
 const route=resolveAccountRoute(scientificEntry,auth.getSession());
 currentUser=auth.getSession().user;reconcileCommunityFriendships(route);syncJumolfVerifiedEntitlement();reconcileSharedIdentity();reconcileCoachingInvitations();restoreProfileForUser();refreshSharedCatalog();
 restoreTrackLibraryForUser();
 restoreOperationalGpsForUser();
 reconcileOpsLive();void tickOpsLive();
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
 const scientificIdentity=JSON.stringify([currentUser?.user_id,currentUser?.name,currentUser?.permissions?.research,auth.assurance]);
 if(scientificActor!==scientificIdentity){scientificActor=scientificIdentity;scientificController=createScientificController({actor:currentUser,dataset:scienceDataset(),getDataset:scienceDataset,analytics:scientificAnalytics,anomalies:scientificAnomalies,discoveries:scientificDiscoveries,navigate:path=>{history.pushState({},'',path);render(true);},render:()=>render(),toast:Toast});}
 scientificCorpusController.setContext({access:scientificCorpusAccessFor(currentUser),corpusService:createScientificContributionCorpusService(buildScientificContributionCorpus({fixtures:scientificContributionFixtures,consentStores:new Map([[contributionMockUserId,scientificContributionStore]])}))});
 coachingDraft=coaching.syncPreparation(coachingDraft,trackLibrary.list());
 invalidateCoachingReferenceAssignment();
 const dogsRoute=resolveDogsRoute(route);
 const communityRoute=resolveCommunityRoute(route);
 const profileRoute=resolveProfileRoute(route);
 const jumolfRoute=resolveJumolfRoute(route)?route:null;
 if(loboAccount.snapshot()===null&&currentUser?.admin_role==='owner_admin')void loboAccount.refresh();
 const scientificRoute=resolveScientificRoute(route)?route:null;
 const scientificContributionRoute=resolveScientificContributionRoute(route);
 const dogForTitle=dogsRoute?.dogId?localDog(dogsRoute.dogId):null;
 captureCoachingHistory();
 captureCoachingPreparation();
 const adminRoute=resolveAdminRoute(`${route}${location.search}`);
 const adminTitle=adminRoute?({dashboard:'Console Admin',members:'Membres',member:'Fiche membre',premium:'Premium & JUMOLF',codes:'Codes JUMOLF',scientific:'Gouvernance scientifique',services:'Services · Simulation Admin',deployments:'Déploiements · Simulation Admin',errors:'Erreurs · Simulation Admin',audit:'Audit Admin',unknown:'Console Admin'}[adminRoute.type]||'Console Admin'):null;
 const profileTitle=profileRoute?({home:'Profil',account:'Mon compte',dogs:'Mes chiens',premium:'Premium & JUMOLF',access:'Mes accès',notifications:'Notifications',preferences:'Préférences',about:'Aide & À propos'}[profileRoute.type]||'Profil'):null;
 const title=adminTitle|| (profileTitle|| (scientificRoute?'Espace scientifique privé':scientificContributionRoute?routes[route]?.[0]||'Contribution scientifique':jumolfRoute?'JUMOLF · Jumeau olfactif':route.startsWith('/live')?'Live':route==='/notifications'?'Notifications':route==='/notifications/preferences'?'Préférences notifications':communityRoute?({feed:'Communauté',profile:communityStore.getProfile(communityRoute.id)?.displayName||'Profil Communauté',post:'Publication Communauté',new:'Nouvelle publication',search:'Recherche Communauté',contacts:'Contacts'}[communityRoute.type]||'Communauté'):operationalRoute?.type==='replay'?'Replay opérationnel':operationalRoute?.type==='mission'?operationalView?.title||'Mission opérationnelle':operationalRoute?'Pistage opérationnel':route==='/track-builder'?'Créateur de tracé':dogsRoute?.type==='list'?'Mes chiens':dogsRoute?.type==='create'?'Ajouter un chien':dogsRoute?.type==='edit'?'Modifier le profil':dogsRoute?dogForTitle?.name||'Profil chien':consultation?.type==='session-list'?'Sessions':consultation?.type==='track-list'?'Mes pistes':consultation?.type==='track-detail'?trackDetailView(trackListView(trackLibrary.list(),sessionCatalog.list(),sharedIndex?.list()||[]),consultation.id)?.name||'Piste':consultation?.type==='session-detail'||consultation?.type==='session-debrief'||consultation?.type==='session-replay'?sessionCatalog.get(consultation.id)?.session?.title||'Session':routes[route]?.[0]||'Page introuvable'));
 document.title=`${title} · PISTE Community`;
 const operationalTerrain=operationalUI.terrainMissionId===operationalMission?.id&&operationalRoute?.type==='mission';
 const jumolfContent=jumolfRoute?JumolfShell(jumolfRoute+location.search,(jumolfStore.snapshot().preferences_warning?`<p class="jumolf-unavailable" role="alert">${escapeHTML(jumolfStore.snapshot().preferences_warning)}</p>`:'')+jumolfController.screen(`${jumolfRoute}${location.search}`),{realMode:auth.assurance==='supabase-auth',...jumolfController.navigationContext()}):null;
 const scientificScreen=auth.assurance==='supabase-auth'&&scientificRoute?.startsWith('/scientific/corpus')?scientificController.screen('/scientific/sessions'+location.search):scientificRoute?.startsWith('/scientific/corpus')?scientificCorpusController.screen(`${scientificRoute}${location.search}`):scientificRoute?scientificController.screen(`${scientificRoute}${location.search}`):null;
 const scientificContent=scientificRoute?ScientificShell(scientificRoute,scientificScreen,currentUser,{realMode:auth.assurance==='supabase-auth',...jumolfController.navigationContext()}):null;
 if(coachingWizardState?.draft?.jumolfPreparation){const current=jumolfController.currentTrainingPreparation(coachingWizardState.draft.jumolfPreparation);if(current)coachingWizardState={...coachingWizardState,draft:{...coachingWizardState.draft,jumolfPreparation:current}};else{const {jumolfPreparation,...draft}=coachingWizardState.draft;coachingWizardState={...coachingWizardState,draft};remoteCoachingRoot?.querySelector('.jumolf-training-brief')?.remove();}}
 const remoteCoaching=auth.assurance==='supabase-auth'&&['/new-session','/coaching/session'].includes(route);
 const remoteKey=remoteCoaching?currentUser.user_id+':'+route+':'+location.search:'';
 if(remoteCoachingKey!==remoteKey){remoteCoachingMount?.destroy();remoteCoachingMount=null;remoteCoachingRoot=null;remoteCoachingKey=remoteKey;}
 if(remoteCoachingRoot)remoteCoachingRoot.remove();
 const remoteMarkup='<div data-remote-premium-slot class="remote-shell remote-embedded"></div>';
 const content=remoteCoaching?remoteMarkup+(route==='/sessions'?renderSessions():''):adminRoute?adminController.screen(adminRoute):scientificContent||scientificContributionRoute?scientificContent||(auth.assurance==='supabase-auth'?'<section class="card"><h1>Contribution scientifique</h1><p>Aucun dossier réel n’est transmis à un corpus partagé. Vos analyses personnelles restent disponibles dans Science et JUMOLF, selon vos droits et autorisations.</p><a href="/scientific">Science</a></section>':scientificContributionController.screen(route)):profileRoute?renderProfile(profileRoute):jumolfContent|| (operationalTerrain?OperationalTerrainScreen(operationalView):operationalRoute?(operationalRoute.type==='replay'||operationalMission?.cloudReadOnly)?OperationalReplayScreen(operationalReplayView(operationalMission),{weather:(operationalMission?.cloudReadOnly&&operationalMission.weatherSnapshot)||opsWeather.snapshot(operationalMission)}):OperationalScreen({route:operationalRoute,missions:operationalStore.list(),dogs:trackingDogs().sort((a,b)=>Number(b.id===defaultTrackingDog()?.id)-Number(a.id===defaultTrackingDog()?.id)),view:operationalView,livePolicy:operationalMission?communityLiveStore.getSessionPolicy('ops',operationalMission.id):{},ui:{...operationalUI,realMode:auth.assurance==='supabase-auth',gps:opsGps.view(),weather:opsWeather.view(),allowGps:canUseOperationalGps(operationalGpsContext()),handler:{id:currentUser.user_id||'mock-current-user',name:currentUser.name}}}):route.startsWith('/live')?renderLive(route):route==='/notifications'?renderPisteNotifications():route==='/notifications/preferences'?NotificationPreferencesScreen(communityStore.getNotificationStore(),communityStore.viewerId):dogsRoute?renderDogs(dogsRoute):communityRoute?renderCommunity(communityRoute):consultation?.type==='session-list'?renderSessions():consultation?.type==='session-detail'?renderSessionDetail(consultation.id):consultation?.type==='session-debrief'?renderSessionDebrief(consultation.id):consultation?.type==='session-replay'?renderSessionReplay(consultation.id):consultation?.type==='track-list'?renderTracks():consultation?.type==='track-detail'?renderTrackDetail(consultation.id):route==='/'?HomeScreen(currentUser,homeActiveSessionView(sessionCatalog,mock.activeSessions,{currentSessionId:coachingDraft.session?.id,...sharedOptions(),operationalMissions:operationalStore.list(),includeDemoRows:auth.assurance!=='supabase-auth'}),jumolfAccess(),adminStore.accessFor(currentUser).allowed,coachingInvitationCards()):route==='/new-session'?CoachingScreen(coachingDraftWithContacts(coachingDraft,communityStore),'',trackLibrary.list(),authorizedCoachingContacts(communityStore),coachingDraft.session?communityLiveStore.getSessionPolicy('coaching',coachingDraft.session.id):{},coachingReferenceAssignmentView(),coachingReferenceDelegationView()):route==='/coaching/session'?renderPreparation():route==='/qa/coaching'?renderCoachingQa():route==='/track-builder'?renderTrackEditor():PlaceholderScreen(route,currentUser,jumolfAccess()));
 document.querySelector('#app').innerHTML=route.startsWith('/auth') ? AuthScreen(route,{notice:authNotice}) : AppShell(content+exportPanelForRoute(route),route,currentUser.name,currentUser.initials || currentUser.name.slice(0,1),themeForRoute(route),selectedCommunityNotifications().filter(n=>!n.read).length+(coachingInvitations?.view().invitations.length||0)+(communityStore.getNotificationStore().getPreferences(communityStore.viewerId).notify_live_in_app?(opsLiveRemote?.view().notifications||[]).filter(n=>!n.read).length:0),{realMode:auth.assurance==='supabase-auth'});
 const restoredExport=document.querySelector('[data-data-exports]');if(restoredExport&&exportUi){restoredExport.open=exportUi.open;for(const name of ['domain','format']){const field=restoredExport.querySelector(`[name=${name}]`);if([...field.options].some(o=>o.value===exportUi[name]))field.value=exportUi[name];}}
 if(remoteCoaching){const slot=document.querySelector('[data-remote-premium-slot]');if(loboAccount.snapshot()?.status==='loading'&&!trackingDogs().length){slot.innerHTML='<p role="status">Chargement de votre chien autorisé…</p>';}else if(remoteCoachingRoot){slot.replaceWith(remoteCoachingRoot);remoteCoachingMount?.refreshReferences();}else {const index=sharedIndex,ownedDogs={get:id=>localDog(id)},wizardOwnerId=currentUser.user_id;remoteCoachingRoot=slot;remoteCoachingMount=mountRemoteCoaching({root:slot,client:accountClient,embedded:true,resumeStoredSession:route!=='/new-session',initialWizardState:coachingWizardState,resolveJumolfPreparation:p=>jumolfController.currentTrainingPreparation(p),getTracks:ownerId=>currentUser?.user_id===ownerId&&trackLibraryOwnerId===ownerId?trackLibrary.list():[],onWizardChange:value=>{if(currentUser?.user_id===wizardOwnerId){coachingWizardState=value;try{index?.saveTrainingDraft(value);}catch(error){Toast(error.message);}}},dogs:trackingDogs(),primaryDogId:profileStore.snapshot().primary_dog_id,entry:new URLSearchParams(location.search).has('join')?'list':'create',preferList:route!=='/coaching/session'||new URLSearchParams(location.search).has('join'),sessionId:new URLSearchParams(location.search).get('session'),initialTab:new URLSearchParams(location.search).get('tab')||'summary',onProjection:(p,id)=>p?index?.accept(p):id&&index?.forget(id),onSessions:list=>list.forEach(p=>index?.accept(p)),onCreated:(p,dogId,memory)=>{if(currentUser?.user_id!==wizardOwnerId)return;index?.accept(p);const dog=ownedDogs.get(dogId);if(dog){index.linkDog(p.id,dog);if(memory)try{index.linkTraining(p.id,memory);}catch(error){Toast('Session créée, mémoire pédagogique non enregistrée : '+error.message);}}const request=coachingWizardState?.draft?.jumolfPreparation;if(currentUser?.user_id===wizardOwnerId&&(!request||resolveDogId(trackingDogs(),request.dogId)===dogId))jumolfController.confirmTrainingCreated({token:request?.token,dogId:request?.dogId||dogId,sessionId:'coaching:'+p.id});},onDogLink:(id,dogId)=>{const dog=ownedDogs.get(dogId);if(!dog)throw Error('Chien indisponible.');index.linkDog(id,dog);},associationMarkup:sharedDogAssociation});}}
 const selectedDossierTab=document.querySelector('.dossier-tabs [aria-current=page]');if(selectedDossierTab){const nav=selectedDossierTab.parentElement;nav.scrollLeft=selectedDossierTab.offsetLeft-nav.offsetLeft-(nav.clientWidth-selectedDossierTab.offsetWidth)/2;}
 trackSmart.reconcile();
 mountRexMaps();
 mountGpsMaps({livePose:ownsOperationalGps(operationalGpsContext())?operationalMission.gpsTrack:ownsDriverGps(gpsContext())?searchState.gpsSearch:ownsTracerGps(gpsContext())?tracerState.gpsPose:null,lastFix:ownsOperationalGps(operationalGpsContext())?opsGps.view().lastFix:ownsDriverGps(gpsContext())?driverGps.view().lastFix:ownsTracerGps(gpsContext())?tracerGps.view().lastFix:null});
 opsWeather.mount();
 mountTrackEditorMap({draft:trackEditor.preview?.draft||trackEditor.draft,previewReadOnly:!!trackEditor.preview,mission:!!missionContext(),selectedPointId:trackEditor.selectedPointId,onAdd:point=>{if(trackEditor.preview)return;try{const draft=addTrackPoint(trackEditor.draft,{...point,kind:trackEditor.nextPointKind});editorChange(draft,{selectedPointId:draft.points.at(-1).id,nextPointKind:'via'});}catch(error){Toast(error.message);}},onMove:(id,point)=>{if(trackEditor.preview)return;try{editorChange(moveTrackPoint(trackEditor.draft,id,point),{selectedPointId:id});}catch(error){Toast(error.message);}},onSelect:id=>{if(trackEditor.preview)return;trackEditor.selectedPointId=id;render();},onView:mapView=>{if(!trackEditor.preview&&trackEditor.draft&&location.pathname==='/track-builder')trackEditor.draft={...trackEditor.draft,mapView};}});
 paintIllustrativeScentCorridor({enabled:scentCorridorVisible&&!!scentWind&&!scentWind.error,windDegrees:scentWindDegrees,windSpeed:scentWind?.speed||0});
 if(scentCorridorVisible&&!scentWindPending)void refreshScentWind();
 const mission=missionContext();if(mission)missionMount=mountMissionControl({root:document.querySelector('[data-mission-control]'),controller:missionController,context:mission,draw:paintTrackMissionMap,onAction:missionAction});
 if(consultation?.type==='track-detail'){const detail=trackDetailView(trackListView(trackLibrary.list(),sessionCatalog.list(),sharedIndex?.list()||[]),consultation.id);if(detail?.points?.length&&detail.points.every(p=>p.space==='wgs84')){mountTrackEditorMap({draft:{coordinateSpace:'wgs84',points:detail.points,basemap:document.querySelector('[data-detail-basemap]')?.dataset.detailBasemap||'standard'},previewReadOnly:true});void resolveTrackStartCommune(detail);}}
 if(missionPanelWasOpen){const panel=document.querySelector('[data-mission-panel]');if(panel)panel.open=true;for(const [id,open] of missionSections){const section=document.querySelector(`[data-mission-section="${id}"]`);if(section)section.open=open;}const sheet=document.querySelector('.mission-panel-content');if(sheet)sheet.scrollTop=missionScroll;}
 trackRouting.reconcile();
 if(creatorPanelWasOpen){const panel=document.querySelector('[data-creator-panel]');if(panel)panel.open=true;for(const [id,open] of creatorSections){const section=document.querySelector(`[data-creator-section="${id}"]`);if(section)section.open=open;}}
 if(smartPanelWasOpen){openSmartTrackPanel({focus:false});const sheet=document.querySelector('[data-smart-panel] .creator-menu-sheet');if(sheet)sheet.scrollTop=smartPanelScroll;if(smartWasBusy&&!trackSmart.view().busy)document.querySelector('[data-smart-panel] .smart-feedback')?.scrollIntoView({block:'start'});}
 restoreSmartTrackEntry();
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
 if(route.type==='list')return DogsListScreen(accountDogs(),{primaryDogId:defaultTrackingDog()?.id});
 if(route.type==='create')return DogFormScreen(null,{realMode:auth.assurance==='supabase-auth'});
 const dog=localDog(route.dogId);
 if(!dog)return DogNotFoundScreen();
 const rows=sessionListView(sessionCatalog,{demoRows:false,sharedSessions:sharedIndex?.list()||[],dogIds:sharedOptions().dogIds,operationalMissions:operationalStore.list(),dogId:dog.id});
 return route.type==='edit'?DogFormScreen(dog,{realMode:auth.assurance==='supabase-auth'}):DogProfileScreen({...dog,sessions:[...rows,...(dog.sessions||[])]},{primaryDogId:defaultTrackingDog()?.id,associations:{sessions:rows.length,tracks:trackLibrary.list().filter(t=>resolveDogId([dog],t.dogId)).length,operational:operationalStore.list().filter(m=>resolveDogId([dog],m.dogId)).length}});
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
 loadSessionCloudMappings();
 const dogId=new URLSearchParams(location.search).get('dog')||'';
 const dog=dogId?dogsStore.get(dogId):null;
 const query=new URLSearchParams(location.search).get('q')||'';
 const rows=sessionListView(sessionCatalog,{filter:segment,query,dogId,currentSessionId:coachingDraft.session?.id,operationalMissions:operationalStore.list(),...sharedOptions()}).map(row=>({...row,removal:sessionPolicy(row.id)}));
 return coachingInvitationCards()+`<p role="status">${escapeHTML(sharedIndex?.error()||'')}</p><button type="button" class="button button-dark" data-refresh-shared-sessions>Actualiser les sessions</button><a class="button button-gold" href="/coaching/session?join=1">Rejoindre ou retrouver une session Coaching</a>`+SessionListScreen(rows,{filter:segment,query,dogId,dogName:dog?.name||'',consolidated:auth.assurance==='supabase-auth'});
}
function renderSessionDetail(id){
 const params=new URLSearchParams(location.search),tab=params.get('tab')||'summary',from=params.get('from'),back=from&&/^\/(?:tracks|jumolf\/progress)(?:\?|$)/.test(from)?from:'/tracks';
 const p=sharedIndex?.get(id);
 if(p)return SessionRemovalMenu(sessionPolicy(id))+SessionDossierScreen(sharedSessionDossier(p,{training:trainingMemoryFor(p)}),{tab,back,error:'Cette session reste active : utilisez son cockpit depuis Mes pistes.'});
 const operational=operationalStore.get(id)||pisteCloudMission(id);
 if(operational){const menu=SessionRemovalMenu(sessionPolicy(id));const v=operationalSessionDossier(operational,{weather:(operational.cloudReadOnly&&operational.weatherSnapshot)||opsWeather.snapshot(operational)});return menu+(v?SessionDossierScreen(v,{tab,back}):OperationalSessionDetailScreen(operational,{weather:(operational.cloudReadOnly&&operational.weatherSnapshot)||opsWeather.snapshot(operational)}));}
 const record=sessionCatalog.get(id);
 if(record){const v=localSessionDossier(record);return SessionRemovalMenu(sessionPolicy(id))+(v?SessionDossierScreen(v,{tab,back}):SessionDetailScreen(sessionDetailView(record,{currentSessionId:coachingDraft.session?.id})));}
 const row=auth.assurance!=='supabase-auth'?sessionListView(sessionCatalog,{}).find(item=>item.id===id&&item.kind==='summary-demo'):null;
 if(row)return SessionDetailScreen({...row,dog:{name:row.dogName},participants:[],creatorRole:'Aucune donnée disponible',readOnly:true,report:null,observations:[]});
 return SessionDossierScreen(null,{back,error:sharedIndex?.error()||'Session inaccessible ou catalogue en cours de chargement. Actualisez pour vérifier vos accès.'});
}
function renderSessionDebrief(id){
 const record=sessionCatalog.get(id);
 if(isExitClosure(record?.searchState?.phase))return CoachingClosureScreen(coachingClosureView(record));
 if(!record||!['DEBRIEF','ARCHIVED'].includes(record.searchState?.phase))return SessionDetailScreen(null);
 return DebriefScreen(record.searchState,record.preparationState,record.tracerState,debriefUI,{readOnly:true});
}
function renderSessionReplay(id){const record=sessionCatalog.get(id);if(record?.tracerState?.gpsPose||record?.searchState?.gpsSearch){if(isExitClosure(record.searchState.phase))return CoachingClosureScreen(coachingClosureView(record));if(!['DEBRIEF','ARCHIVED'].includes(record.searchState.phase))return SessionDetailScreen(null);return DebriefScreen(record.searchState,record.preparationState,record.tracerState,{tab:'map'},{readOnly:true});}const operational=operationalStore.get(id)||pisteCloudMission(id);if(operational)return OperationalReplayScreen(operationalReplayView(operational),{weather:(operational.cloudReadOnly&&operational.weatherSnapshot)||opsWeather.snapshot(operational)});return SessionReplayScreen(sessionReplayView(sessionCatalog.get(id)));}
function pisteCloudMission(id){const r=pisteCloudRecords.find(r=>r.kind==='ops'&&'cloud-'+r.id===id);return r?{...r.payload,id,kind:'operational',cloudOnly:true,cloudReadOnly:true,cloudId:r.id,cloudRevision:r.revision,ownerUserId:currentUser?.user_id}:null;}
function pisteTrackItem(id){const local=trackLibrary.list().find(t=>t.id===id);if(local){const cloud=pisteCloudRecords.find(r=>r.kind==='track'&&'track-cloud-'+r.id===id);return cloud?{...local,cloudId:cloud.id,cloudRevision:cloud.revision}:local;}const r=pisteCloudRecords.find(r=>r.kind==='track'&&'track-cloud-'+r.id===id);return r?{...r.payload,id,ownerId:'self',cloudOnly:true,cloudId:r.id,cloudRevision:r.revision,createdAt:r.payload.createdAt||null}:null;}
function pisteCatalogue(){
 const owner=currentUser?.user_id;if(pisteOwner!==owner){pisteOwner=owner;pisteMode=false;pisteResults=[];pisteFailed=[];if(pisteHiddenOwner!==owner){pisteHidden=new Set();pisteCanonical.clear();pisteCloudRecords=[];pisteHiddenOwner=owner;}pisteSelection.reconcile(owner,[]);}
 const p=new URLSearchParams(location.search),category=p.get('category')||'operational';
 const options={category,status:p.get('status')||'Toutes',source:p.get('source')||'all',query:p.get('q')||'',dogId:p.get('dogId')||'',sort:p.get('sort')||'newest',returnHref:location.pathname+location.search};
 const dogs=accountDogs(),items=trackLibrary.list().filter(t=>auth.assurance!=='supabase-auth'||t.ownerId==='self').map(t=>({...preparedTrackForConsultation(t,{ownerId:owner,consents:jumolfStore.snapshot().consents}),dogName:dogs.find(d=>d.id===t.dogId)?.name||''}));
 const extraTracks=pisteCloudRecords.filter(r=>r.kind==='track'&&!items.some(t=>t.id==='track-cloud-'+r.id||t.cloudId===r.id||pisteCanonical.get('local-track:'+t.id)?.id===r.id)).map(r=>pisteTrackItem('track-cloud-'+r.id));items.push(...extraTracks);
 const decorate=r=>{const localKey=r.libraryId?'local-track:'+r.libraryId:r.kind==='operational'?'local-ops:'+r.id:'local-coaching:'+r.id,m=pisteCanonical.get(localKey);return {...r,selectionKey:m?m.kind+':'+m.id:r.libraryId?(pisteTrackItem(r.libraryId)?.cloudId?'track:'+pisteTrackItem(r.libraryId).cloudId:'local-track:'+r.libraryId):r.source==='shared'?'coaching:'+r.id:r.kind==='operational'?((operationalStore.get(r.id)||pisteCloudMission(r.id))?.cloudId?'ops:'+(operationalStore.get(r.id)||pisteCloudMission(r.id)).cloudId:'local-ops:'+r.id):'local-coaching:'+r.id};};
 const visible=r=>!pisteHidden.has(r.selectionKey);
 const unique=rows=>[...new Map(rows.map(r=>[r.selectionKey,r])).values()];
 const tracks=unique(trackListView(items,sessionCatalog.list(),sharedIndex?.list()||[]).map(decorate).filter(visible));
 const sessions=classifyPisteSessions(unique(sessionListView(sessionCatalog,{currentSessionId:coachingDraft.session?.id,...sharedOptions(),operationalMissions:[...operationalStore.list(),...pisteCloudRecords.filter(r=>r.kind==='ops'&&!operationalStore.list().some(m=>m.cloudId===r.id||m.id===r.payload.id||pisteCanonical.get('local-ops:'+m.id)?.id===r.id)).map(r=>pisteCloudMission('cloud-'+r.id))]}).map(decorate).filter(visible)),new Set((sharedIndex?.list()||[]).filter(p=>sharedIndex.training(p.id)).map(p=>p.id)));
 const rows=category==='prepared'?pistePreparedRows(tracks,options):pisteSessionRows(sessions,options);
 pisteSelection.reconcile(owner+':'+category,rows);
 return {tracks,sessions,rows,options};
}
function renderTracks(){refreshSharedCatalog();const c=pisteCatalogue();return `<p role="status">${escapeHTML(sharedIndex?.error()||(auth.assurance==='supabase-auth'&&pisteReadyOwner!==currentUser?.user_id?'Chargement du catalogue complet…':''))}</p><button type="button" class="button button-dark" data-refresh-shared-sessions ${pisteBusy?'disabled':''}>Actualiser les sessions</button>`+TrackListScreen(c.tracks,c.sessions,{...c.options,selectionMode:pisteMode,selectedIds:pisteSelection.ids(),busy:pisteBusy||auth.assurance==='supabase-auth'&&pisteReadyOwner!==currentUser?.user_id,results:pisteResultsMarkup()});}
function pisteResultsMarkup(){
 if(!pisteResults.length)return '';
 const success=pisteResults.filter(r=>['hidden','deleted','already-deleted'].includes(r.status)).length,refused=pisteResults.filter(r=>r.status==='refused').length,failed=pisteResults.filter(r=>r.status==='failed').length;
 return `<section class="card piste-results" role="status"><h3>Résultat du nettoyage</h3><p>${success} réussi(s) · ${refused} refusé(s) · ${failed} échoué(s)</p><ul>${pisteResults.map(r=>`<li><strong>${escapeHTML(r.title||r.key)}</strong> : ${escapeHTML(({hidden:'retiré de votre historique',deleted:'supprimé définitivement','already-deleted':'déjà supprimé'})[r.status]||r.reason||r.status)}</li>`).join('')}</ul>${pisteFailed.length?'<button type="button" class="button button-dark" data-piste-bulk="force">Réessayer en suppression forcée</button><p>Une nouvelle vérification serveur des droits et de l’état reste obligatoire.</p>':''}</section>`;
}
function pisteIsActive(row){
 if(row.source==='shared')return !['DEBRIEF','ARCHIVED','CANCELLED','INTERRUPTED','LEFT'].includes(sharedIndex?.get(row.id)?.phase);
 if(row.kind==='operational'){const m=operationalStore.get(row.id)||pisteCloudMission(row.id);return !m||['active','paused'].includes(m.trackingState)||['En cours','Brouillon'].includes(m.status);}
 if(row.libraryId)return false;
 return !['DEBRIEF','ARCHIVED','CANCELLED','INTERRUPTED'].includes(sessionCatalog.get(row.id)?.searchState?.phase);
}
function recordForPisteCloudOnly(row){return row.libraryId?pisteTrackItem(row.libraryId)?.cloudOnly:pisteCloudMission(row.id)?.cloudOnly&&!operationalStore.get(row.id);}
function pisteOwn(row){return row.libraryId?pisteTrackItem(row.libraryId)?.ownerId==='self':row.source==='shared'?sharedIndex?.get(row.id)?.ownerId===currentUser?.user_id:row.kind==='operational'?(operationalStore.get(row.id)||pisteCloudMission(row.id))?.ownerUserId===currentUser?.user_id:coachingHistoryOwnerId===currentUser?.user_id;}
function confirmPisteBatch(rows,force=false){
 if(pisteBusy||!rows.length)return;const owner=currentUser?.user_id,owned=rows.filter(pisteOwn).length,shared=rows.length-owned;
 const d=document.createElement('dialog');d.className='piste-confirmation';
 d.innerHTML=`<h2>${force?'Suppression forcée':'Nettoyer la sélection'}</h2><p>${rows.length} élément(s) : ${owned} personnel(s), ${shared} partagé(s) appartenant à un autre utilisateur.</p><label><input type="radio" name="scope" value="hide" ${force?'':'checked'}> Retirer uniquement de mon historique personnel. Les données partagées restent intactes.</label><label><input type="radio" name="scope" value="delete" ${force?'checked':''}> Supprimer définitivement mes ${owned} élément(s) et retirer les ${shared} partagé(s) de mon historique.</label><p>Les sessions actives et les 40 séances LOBO sont protégées. Une suppression définitive efface aussi GPS, commandes, invitations et dossier associé. Une sauvegarde de récupération à accès restreint est conservée avant suppression.</p><div class="dialog-actions"><button class="button button-dark" data-cancel>Annuler</button><button class="button button-gold" data-confirm>Confirmer pour ${rows.length} élément(s)</button></div>`;
 document.body.append(d);d.querySelector('[data-cancel]').onclick=()=>d.close();d.querySelector('[data-confirm]').onclick=()=>{const action=d.querySelector('[name="scope"]:checked').value;d.close();void executePisteBatch(rows,action,owner,force);};d.addEventListener('close',()=>d.remove());d.showModal();
}
async function executePisteBatch(rows,action,owner,force){
 if(pisteBusy)return;pisteHistoryGeneration++;pisteBusy=true;pisteResults=[];pisteFailed=[];render();
 const activeOwner=()=>{if(currentUser?.user_id!==owner||auth.getSession().user?.user_id!==owner)throw Error('Le compte a changé.');};
 try{
  const plans=[],journal=auth.assurance==='supabase-auth'?createPersistenceJournal({ownerId:owner}):null;
  try{for(const row of rows){activeOwner();
   try{
    if(pisteIsActive(row))throw Object.assign(Error('Session active : arrêtez-la avant de nettoyer son historique.'),{refused:true});
    if(isProtectedSessionId(row.id)||isProtectedSessionId(operationalStore.get(row.id)?.cloudId))throw Object.assign(Error('Les 40 séances LOBO sont protégées.'),{refused:true});
    const own=pisteOwn(row),itemAction=action==='delete'&&own?'delete':'hide',localKind=row.libraryId?'track':row.kind==='operational'?'ops':null;
    const record=row.libraryId?pisteTrackItem(row.libraryId):sessionRecord(row.id);
    let key=row.selectionKey,expectedVersion=row.source==='shared'?sharedIndex.get(row.id).version:null;
    const mapping=localKind&&journal?await journal.lookup({kind:localKind,localId:row.libraryId||row.id}):null;activeOwner();
    if(mapping?.revision>0){key=localKind+':'+mapping.id;expectedVersion=mapping.revision;}
    else if(localKind&&record?.cloudId){key=localKind+':'+record.cloudId;expectedVersion=record.cloudRevision;}
    if(journal&&itemAction==='delete'&&mapping){const pending=[...await journal.pending(),...await journal.conflicts()];activeOwner();if(pending.some(c=>c.kind===localKind&&c.id===mapping.id))throw Object.assign(Error('Synchronisation en attente : terminez-la avant de supprimer.'),{refused:true});}
    backupPisteLocal(storage,owner,row.selectionKey,record);
    plans.push({row,key,action:itemAction,expectedVersion,force});
   }catch(e){pisteResults.push({key:row.selectionKey,title:row.title||row.name,status:e.refused?'refused':'failed',reason:e.message});}
  }}finally{journal?.dispose();}
  for(let start=0;start<plans.length;start+=100){
   activeOwner();const group=plans.slice(start,start+100);
   // Local-only hide markers are also account-scoped on the server. A local delete uses the store below.
   const requests=group.filter(p=>p.action==='hide'||!p.key.startsWith('local-'));
   let results=[];
   if(requests.length&&auth.assurance==='supabase-auth'){try{results=(await pisteHistory.call({operation:'batch',items:requests.map(p=>({key:p.key,action:p.action,...(Number.isSafeInteger(p.expectedVersion)?{expectedVersion:p.expectedVersion}:{}),force}))},owner)).results;activeOwner();}catch(e){activeOwner();results=requests.map(p=>({key:p.key,status:'failed',reason:'Résultat serveur non confirmé : '+e.message}));}}
   for(const plan of group){activeOwner();const {row,key}=plan;let result=results.find(r=>r.key===key)||{key,status:requests.includes(plan)&&auth.assurance==='supabase-auth'?'failed':plan.action==='hide'?'hidden':'deleted',reason:'Aucun accusé serveur : original conservé.'};
    if(['hidden','deleted','already-deleted'].includes(result.status)){
     try{
      if(plan.action==='delete'){
       if(row.libraryId){if(!recordForPisteCloudOnly(row))trackLibrary.remove(row.libraryId);}
       else if(row.source==='shared')sharedIndex.forget(row.id);
       else if(row.kind==='operational'&&!recordForPisteCloudOnly(row)){const r=operationalStore.remove(row.id,{ownerId:owner,currentSessionId:coachingDraft.session?.id});if(!r.ok)throw Error(removalError(r.reason));}
       else if(row.kind!=='operational'){const r=coachingHistoryStorage.remove(owner,row.id,{currentSessionId:coachingDraft.session?.id});if(!r.ok)throw Error(removalError(r.reason));const removed=sessionCatalog.remove(row.id,{ownerId:owner,localOwnerId:coachingHistoryOwnerId,currentSessionId:coachingDraft.session?.id});if(!removed.ok)throw Error(removed.reason);}
      }
      pisteHidden.add(row.selectionKey);pisteHidden.add(key);if(plan.action==='delete')pisteCloudRecords=pisteCloudRecords.filter(r=>r.kind+':'+r.id!==key);
     }catch(e){result={key,status:'failed',reason:(!key.startsWith('local-')?'Serveur traité ; nettoyage local à réessayer : ':'')+e.message};}
    }
    pisteResults.push({...result,title:row.title||row.name});if(result.status==='failed'&&plan.action==='delete')pisteFailed.push(row);
   }
  }
 }catch(e){pisteResults.push({key:'batch',status:'failed',reason:e.message});}
 finally{if(currentUser?.user_id===owner){pisteBusy=false;pisteSelection.clear();jumolfController=makeJumolfController();render();}else pisteBusy=false;}
}

const trackStartCommuneCache=new Map();
async function resolveTrackStartCommune(detail){
 const points=detail?.points;
 const first=points?.find(point=>point.kind==='start')||points?.[0];
 if(!first||first.space!=='wgs84'||!Number.isFinite(Number(first.x))||!Number.isFinite(Number(first.y)))return;
 const el=document.querySelector('[data-track-detail] [data-track-start-commune]');
 if(!el||!el.textContent.includes('Recherche de la commune'))return;
 const key=Number(first.y).toFixed(5)+','+Number(first.x).toFixed(5);
 if(trackStartCommuneCache.has(key)){el.textContent=trackStartCommuneCache.get(key);return;}
 try{
  const url='https://data.geopf.fr/geocodage/reverse?lon='+encodeURIComponent(first.x)+'&lat='+encodeURIComponent(first.y)+'&type=street';
  const response=await fetch(url,{headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('Geocoding unavailable');
  const data=await response.json();
  const name=data?.features?.[0]?.properties?.city||data?.features?.[0]?.properties?.municipality||null;
  if(!name)throw new Error('Unknown commune');
  trackStartCommuneCache.set(key,name);
  if(el.isConnected&&el.textContent.includes('Recherche de la commune'))el.textContent=name;
 }catch{
  if(el.isConnected&&el.textContent.includes('Recherche de la commune'))el.textContent='Non disponible';
 }
}
function renderTrackDetail(id){const cloud=pisteCloudRecords.filter(r=>r.kind==='track').map(r=>pisteTrackItem('track-cloud-'+r.id)).filter(Boolean);return TrackDetailScreen(preparedTrackForConsultation(trackDetailView(trackListView([...trackLibrary.list(),...cloud.filter(t=>!trackLibrary.list().some(l=>l.id===t.id))],sessionCatalog.list(),sharedIndex?.list()||[]),id),{ownerId:currentUser?.user_id,consents:jumolfStore.snapshot().consents}));}
function renderLive(route){
 const remote=opsLiveRemote?.view();
 const match=route.match(/^\/live(?:\/(coaching|ops)\/([^/]+))?$/);
 if(!match)return LiveDetailScreen(null);
 const [,type,rawId]=match;
 if(type){const id=decodeURIComponent(rawId);if(type==='ops'&&auth.assurance==='supabase-auth'){const projection=opsLiveRemote?.projection(id),pending=remote?.invitations.find(i=>i.id===id);return LiveDetailScreen(projection)+(pending?`<section class="card"><p>Invitation nominative Live OPS · accès en lecture seule.</p><button class="button button-gold" data-ops-accept-invite="${escapeHTML(id)}">Accepter l’invitation Live</button></section>`:'')+opsOwnerControls(id,projection)+`<p role="status">${escapeHTML(remote?.connection==='connected'?opsLiveRemote.freshness(id).position==='stale'?'Position ancienne · dernière mesure conservée.':'Suivi connecté · lecture seule.':'Suivi indisponible ou déconnecté · aucune position récente garantie.')}</p>`;}const projection=resolveCommunityLiveProjection({type,id,viewerId:communityStore.viewerId,liveStore:communityLiveStore,coaching:{session:coachingDraft.session,searchState,preparationState,tracerState},mission:operationalStore.get(id)});return LiveDetailScreen(projection);}
 const ownSessions=[];
 if(coachingDraft.session?.id&&['LAYING','SEARCH_RUNNING'].includes(searchState.phase)&&communityLiveStore.getSessionPolicy('coaching',coachingDraft.session.id).share_live)ownSessions.push({sessionId:coachingDraft.session.id,sessionType:'coaching',title:coachingDraft.dogs.find(dog=>dog.id===coachingDraft.dogId)?.name||'Coaching en cours',ownerDisplayName:communityStore.getProfile(communityStore.viewerId)?.displayName||currentUser.name,state:searchState.phase});
 for(const mission of operationalStore.list())if(mission.status==='En cours'&&communityLiveStore.getSessionPolicy('ops',mission.id).share_live)ownSessions.push({sessionId:mission.id,sessionType:'ops',title:mission.dog?.name||'Pistage en cours',ownerDisplayName:communityStore.getProfile(communityStore.viewerId)?.displayName||currentUser.name,state:mission.trackingState==='paused'?'Pause':'En cours'});
 const row=item=>({sessionId:item.id,sessionType:'ops',title:opsLiveRemote.projection(item.id)?.dogName||'Pistage partagé',state:opsLiveRemote.projection(item.id)?.state});
 for(const item of remote?.sessions||[])if(item.ownerId===opsLiveRemoteOwner&&!ownSessions.some(s=>opsLiveRemote.publicationId(s.sessionId)===item.id))ownSessions.push(row(item));
 const contacts=(remote?.sessions||[]).filter(item=>item.ownerId!==opsLiveRemoteOwner).map(row);
 return LiveScreen({ownSessions,contactSessions:contacts,invitations:(remote?.invitations||[]).map(i=>({sessionId:i.id,sessionType:'ops',title:'Invitation Live OPS',state:'À accepter'}))});
}
function opsOwnerControls(id,projection){
 if(!projection||projection.ownerId!==opsLiveRemoteOwner||projection.state==='Fin de piste')return '';
 const bound=opsLiveBindings.list().filter(b=>communityStore.getContacts().some(c=>c.id===b.alias));
 return `<details class="card"><summary>Observateurs Live OPS</summary>${bound.length?`<form data-ops-invite="${escapeHTML(projection.sessionId)}"><label>Inviter un contact à cette mission<select name="userId">${bound.map(b=>`<option value="${escapeHTML(b.userId)}">${escapeHTML(communityStore.getProfile(b.alias)?.displayName||b.alias)}</option>`).join('')}</select></label><button class="button button-dark">Inviter</button></form>${bound.map(b=>`<p>${escapeHTML(communityStore.getProfile(b.alias)?.displayName||b.alias)} <button class="button button-dark" data-ops-revoke="${escapeHTML(projection.sessionId)}" data-user-id="${escapeHTML(b.userId)}">Retirer l’accès à cette mission</button></p>`).join('')}`:'<p>Associez vos contacts à leur compte réel depuis leurs profils Communauté.</p>'}</details>`;
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
 return PreparationScreen(preparationState,{...preparationUI,referenceResponse:coachingReferenceResponseView(),referenceChoices:preparation.sessionReferenceChoices(preparationState,preparationState.session.traceType==='gpx'?gpxReferenceChoices(trackLibrary.list()):trackLibrary.list(),{knownPeople:qaInitialized?[]:coachingDraft.knownPeople||[]}),referenceResponseTest:!qaInitialized&&coachingReferenceAssignment?.state.sessionId===preparationState.session.id&&v?.role==='traceur'&&preparationState.viewerId===coachingDraft.session?.roles.traceur&&preparationState.scenario==='session'})+(v?.role==='driver'&&searchUI.showPreparation?'<button class="button button-dark" data-search="return">Ouvrir le cockpit Conducteur (DEV)</button>':'');
}
function filterSessions() {
 const query=(document.querySelector('input[type=search]')?.value || '').toLocaleLowerCase('fr');
 const dogId=new URLSearchParams(location.search).get('dog')||'';
 const rows=sessionListView(sessionCatalog,{filter:segment,query,dogId,currentSessionId:coachingDraft.session?.id,operationalMissions:operationalStore.list(),...sharedOptions()}).map(row=>({...row,removal:sessionPolicy(row.id)}));
 document.querySelector('#session-results').innerHTML=SessionListResults(rows);
}
document.addEventListener('click',async event=>{
 if(event.target.closest('[data-dossier-print]')){window.print();return;}
 const loboAction=event.target.closest('[data-lobo-action]');if(loboAction){event.preventDefault();await loboAccount.action(loboAction.dataset.loboAction,{backupVerified:document.querySelector('[data-lobo-backup-verified]')?.checked===true,discardConfirmed:document.querySelector('[data-lobo-discard-confirmed]')?.checked===true,download:raw=>{const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='piste-lobo-safari-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}});return;}
 if(personalCloud?.controller.handleClick(event))return;
 if(event.target.closest('[data-refresh-coaching-invitations]')){void coachingInvitations?.refresh();return;}
 const invitationAction=event.target.closest('[data-coaching-invitation]');if(invitationAction){event.preventDefault();const inbox=coachingInvitations,owner=coachingInvitationsOwner,id=invitationAction.dataset.sessionId,role=invitationAction.dataset.role,accept=invitationAction.dataset.coachingInvitation==='accept';try{const p=await inbox.respond(id,role,accept);if(coachingInvitations!==inbox||auth.getSession().user?.user_id!==owner)return;if(p){sharedIndex?.accept(p);history.pushState({},'','/coaching/session?session='+encodeURIComponent(p.id));render(true);}else Toast('Invitation Coaching refusée.');}catch(error){Toast(error.message);void inbox?.refresh();}return;}
 const bulk=event.target.closest('[data-piste-bulk]');if(bulk){event.preventDefault();if(pisteBusy)return;const c=pisteCatalogue(),action=bulk.dataset.pisteBulk;if(action==='mode'){pisteMode=!pisteMode;pisteSelection.clear();}else if(action==='all')pisteSelection.selectAll();else if(action==='none')pisteSelection.clear();else if(action==='confirm'){confirmPisteBatch(c.rows.filter(r=>pisteSelection.ids().includes(r.selectionKey)));return;}else if(action==='force'){confirmPisteBatch(pisteFailed,true);return;}render();return;}
 const checkbox=event.target.closest('[data-piste-select]');if(checkbox){pisteSelection.toggle(checkbox.dataset.pisteSelect,checkbox.checked);render();return;}
 if(event.target.closest('[data-refresh-shared-sessions]')){sessionCloudReadAt=0;loadSessionCloudMappings();refreshSharedCatalog(true);return;}
 const help=event.target.closest('[data-coaching-help]');if(help){openCoachingHelp(document,help.dataset.coachingHelp,help);return;}
 if(profileController.handleClick(event))return;
 if(scientificContributionController.handleClick(event))return;
 if(scientificCorpusController.handleClick(event))return;
 if(event.target.closest('[data-scientific-action],[data-jumolf-action]')&&auth.assurance==='supabase-auth'){event.preventDefault();try{await accountApi.call({operation:'authorize-feature',feature:event.target.closest('[data-scientific-action]')?'science':'jumolf'});}catch(error){Toast(error.message);return;}}
 if(scientificController.handleClick(event))return;
 if(jumolfController.handleClick(event))return;
 const notificationOpen=event.target.closest('[data-notification-open]');
 const acceptOps=event.target.closest('[data-ops-accept-invite]');if(acceptOps){void opsLiveRemote.acceptInvite(acceptOps.dataset.opsAcceptInvite).then(()=>opsLiveRemote.refresh()).catch(e=>Toast(e.message));return;}
 const revokeOps=event.target.closest('[data-ops-revoke]');if(revokeOps){void opsLiveRemote.revoke(revokeOps.dataset.opsRevoke,revokeOps.dataset.userId).then(()=>opsLiveRemote.refresh()).catch(e=>Toast(e.message));return;}
 const removedContact=event.target.closest('[data-community-action="remove-contact"]');if(removedContact&&!persistentCommunity)void afterCommunityContactRemoval(removedContact.dataset.userId);
 if(notificationOpen){communityViewStore().markNotificationRead(notificationOpen.dataset.notificationOpen);communityStore.markNotificationRead(notificationOpen.dataset.notificationOpen);const notice=opsLiveRemote?.view().notifications.find(n=>n.id===notificationOpen.dataset.notificationOpen);if(notice)void opsLiveRemote.markRead(notice.session_id).then(()=>opsLiveRemote?.refresh()).catch(()=>{});}
 const link=event.target.closest('a');
 if(link && !link.hasAttribute('download') && ['http:','https:'].includes(link.protocol) && link.origin===location.origin && !link.pathname.endsWith('.html') && !link.hash && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button===0) { event.preventDefault();const destination=link.pathname+link.search;if(trackEditorActive&&trackEditor.draft?.dirty&&destination!==trackEditorHref){requestTrackEditorExit(destination);return;}if(destination!==location.pathname+location.search){if(destination!=='/track-builder'&&!destination.startsWith('/track-builder?'))trackEditorActive=false;history.pushState({},'',destination);}render(true); return; }
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
 const cycle=event.target.closest('[data-editor-preview-cycle]');if(cycle&&trackEditor.preview){const proposals=trackSmart.view().proposals,index=proposals.findIndex(p=>p.id===trackEditor.preview.proposal.id);if(proposals.length)previewSmartProposal(proposals[(index+(cycle.dataset.editorPreviewCycle==='next'?1:-1)+proposals.length)%proposals.length].id);return;}
 const smartCommune=event.target.closest('[data-smart-commune]');if(smartCommune&&location.pathname==='/track-builder'){try{trackSmart.chooseCommune(smartCommune.dataset.smartCommune);}catch(error){Toast(error.message);}return;}
 const smartProposal=event.target.closest('[data-smart-proposal]');if(smartProposal&&location.pathname==='/track-builder'){selectSmartProposal(smartProposal.dataset.smartProposal);return;}
 const smartPreview=event.target.closest('[data-smart-preview]');if(smartPreview&&location.pathname==='/track-builder'){previewSmartProposal(smartPreview.dataset.smartPreview);return;}
 if(event.target.closest('[data-smart-cancel]')&&location.pathname==='/track-builder'){trackSmart.cancel();return;}
 const detailBasemap=event.target.closest('[data-detail-basemap-choice]');if(detailBasemap){const selector=document.querySelector('[data-detail-basemap]');if(selector&&switchTrackEditorBasemap(detailBasemap.dataset.detailBasemapChoice)){selector.dataset.detailBasemap=detailBasemap.dataset.detailBasemapChoice;selector.querySelectorAll('[data-detail-basemap-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button===detailBasemap)));}return;}
 const editorAction=event.target.closest('[data-editor-action]');
 if(editorAction&&location.pathname==='/track-builder'){
  const action=editorAction.dataset.editorAction;
  if(trackEditor.preview&&!['open-smart','close-smart','close-menu','cancel','geo-center','locate','recenter','save-preview','adjust-preview','dismiss-preview'].includes(action)){Toast('Aperçu en lecture seule : choisissez Ajuster pour modifier cette proposition.');return;}
  try{
   if(action==='save-preview')openProposalSave();
   else if(action==='adjust-preview')selectSmartProposal(trackEditor.preview.proposal.id);
   else if(action==='dismiss-preview'){trackEditor.preview=null;render();}
   else if(action==='confirm-save-track')ConfirmationDialog({title:'Avez-vous terminé votre tracé ?',description:'Souhaitez-vous enregistrer ce parcours dans Mes pistes ? Vous pourrez encore le modifier ensuite.',onConfirm:()=>{try{submitCurrentTrack();}catch(error){const panel=document.querySelector('[data-creator-panel]');if(panel)panel.open=true;Toast('Pour enregistrer, indiquez un nom et vérifiez que tous les segments sont calculés dans Menu.');document.querySelector('#track-editor-name')?.focus();}}});
   else if(action==='toggle-scent'){scentCorridorVisible=!scentCorridorVisible;if(scentCorridorVisible){scentWindKey='';scentWind=null;}render();}
   else if(action==='open-smart')openSmartTrackPanel();
   else if(action==='close-smart'){document.querySelector('[data-smart-panel]')?.close();trackSmart.cancel();document.querySelector('[data-editor-action="open-smart"]')?.focus();}
   else if(action==='import-gpx')document.querySelector('[data-editor-gpx-file]')?.click();
   else if(action==='close-menu'){const panel=document.querySelector('[data-creator-panel]');if(panel){panel.open=false;panel.querySelector('summary')?.focus();}}
   else if(action==='toggle-route'){if(trackEditor.draft.activeMode!=='follow'&&!(jumolfAccess().entitlement_valid&&jumolfAccess().entitlement==='premium')){trackEditor={...trackEditor,notice:'Le suivi de route est réservé aux membres Premium. Le tracé libre reste disponible.',error:''};render();}else editorChange(setTrackMode(trackEditor.draft,trackEditor.draft.activeMode==='follow'?'free':'follow'),{notice:''});}
   else if(action==='retry-routing')trackRouting.retry();
   else if(action==='recover-routing'){if(!confirm('Les segments sans itinéraire IGN seront reliés en ligne droite. Conserver les points et continuer ?'))return;editorChange(recoverPendingTrackRoutes(trackEditor.draft),{notice:'Segments IGN non calculés convertis en lignes droites. Vérifiez le parcours avant enregistrement.'});}
   else if(action==='remove-last-segment')editorChange(removeLastTrackSegment(trackEditor.draft),{selectedPointId:null,nextPointKind:'via'});
   else if(action==='undo')editorChange(undoTrackEdit(trackEditor.draft),{selectedPointId:null});
   else if(action==='remove-point')editorChange(removeTrackPoint(trackEditor.draft,trackEditor.selectedPointId),{selectedPointId:null});
   else if(action==='clear')ConfirmationDialog({title:'Supprimer l’ensemble du parcours ?',description:'Tous les points et segments de cette piste seront supprimés. Cette action peut être annulée.',onConfirm:()=>{try{editorChange(clearTrackDraft(trackEditor.draft),{selectedPointId:null,nextPointKind:'via'});}catch(error){trackEditor={...trackEditor,error:error.message};render();}}});
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
 const mode=event.target.closest('[data-editor-mode]');if(mode){if(mode.dataset.editorMode==='follow'&&!(jumolfAccess().entitlement_valid&&jumolfAccess().entitlement==='premium')){trackEditor={...trackEditor,notice:'Le suivi de route n’est pas activé : abonnement Premium requis.',error:''};render();}else editorChange(setTrackMode(trackEditor.draft,mode.dataset.editorMode));return;}
 const basemap=event.target.closest('[data-editor-basemap-choice]');if(basemap){if(trackEditor.preview)trackEditor.preview={...trackEditor.preview,draft:{...trackEditor.preview.draft,basemap:basemap.dataset.editorBasemapChoice}};else trackEditor={...trackEditor,draft:{...trackEditor.draft,basemap:basemap.dataset.editorBasemapChoice}};render();return;}
 const placement=event.target.closest('[data-editor-placement]');if(placement){trackEditor={...trackEditor,nextPointKind:placement.dataset.editorPlacement};render();return;}
 const pointSelect=event.target.closest('[data-editor-select-point]');if(pointSelect){trackEditor={...trackEditor,selectedPointId:pointSelect.dataset.editorSelectPoint};render();return;}
 const fixture=event.target.closest('[data-editor-gpx-fixture]');if(fixture){const fixtureId=fixture.dataset.editorGpxFixture;const importFixture=()=>{try{const item=trackLibrary.importFixture(fixtureId);trackEditorActive=false;trackEditor={...trackEditor,draft:null,routeKey:''};history.pushState({},'',`/tracks/${encodeURIComponent(`prepared:${item.id}`)}`);render(true);}catch(error){trackEditor={...trackEditor,error:error.message};render();}};if(trackEditor.draft?.dirty)ConfirmationDialog({title:'Quitter sans enregistrer ?',description:'Les modifications de ce brouillon seront perdues.',onConfirm:importFixture});else importFixture();return;}
 const mapSvg=event.target.closest('[data-editor-map]');
 if(mapSvg){if(event.target.closest('[data-editor-point-id]')||Date.now()<trackEditorIgnoreMapClickUntil){trackEditorIgnoreMapClickUntil=0;return;}const point=svgClientPointToMap({clientX:event.clientX,clientY:event.clientY,rect:mapSvg.getBoundingClientRect()});if(point){try{const draft=addTrackPoint(trackEditor.draft,{...point,kind:trackEditor.nextPointKind});const selectedPointId=draft.points.at(-1)?.id;trackEditor={...trackEditor,draft,selectedPointId,nextPointKind:'via',error:''};render();}catch(error){trackEditor={...trackEditor,error:error.message};render();}}return;}
 const preparedAction=event.target.closest('[data-prepared-action]');
 if(preparedAction&&preparedAction.dataset.preparedAction!=='edit'){
  try{const id=preparedAction.dataset.trackId,item=trackLibrary.get(id);if(item.ownerId!=='self'||!currentUser?.user_id)throw Error('Piste indisponible pour ce compte.');
   if(preparedAction.dataset.preparedAction==='duplicate'){const copy=trackLibrary.duplicatePreparedPlan(id);history.pushState({},'',`/tracks/${encodeURIComponent('prepared:'+copy.id)}`);render(true);Toast('Copie enregistrée, original conservé.');}
   else if(preparedAction.dataset.preparedAction==='coaching')prepareSavedTrack(item);
  }catch(error){Toast(error.message);}return;
 }
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
   else if(action==='start'&&canUseDriverGps(gpsContext())){driverGps.start(()=>{searchState=advanceSessionSearch(searchState,preparationState,'start');render();});}
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
   else if(action==='arrive'){const arrived=tracer.advanceTracer(tracerState,preparationState,'arrive');const atStart=preparation.simulate(preparationState,{phase:'arrived'});const ready=preparation.transition(atStart,'ready');tracerState=tracer.advanceTracer(arrived,ready,'ready');preparationState=ready;}
   else if(action==='ready'){const next=preparation.transition(preparationState,'ready');const t=tracer.advanceTracer(tracerState,next,'ready');preparationState=next;tracerState=t;}
   else if(action==='return-start'){tracerState=returnSelfTraceToStart(tracerState,preparationState);preparationState=preparation.simulate(preparationState,{viewerFunction:'driver'});terrainOpen=false;searchState=syncSession({...searchState,simulatedPhase:false},preparationState,tracerState);}
   else if(action==='external-ready'){preparationState=markExternalTraceurInPlace(preparationState,tracerState);terrainOpen=false;searchState=syncSession({...searchState,simulatedPhase:false},preparationState,tracerState);}
   else if(action==='start'&&canUseTracerGps(gpsContext())){tracerGps.start(()=>{tracerState=tracer.advanceTracer(tracerState,preparationState,'start');searchState=syncSession({...searchState,simulatedPhase:false},preparationState,tracerState);render();});}
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
   const items=coachingDraft.traceType==='gpx'?gpxReferenceChoices(trackLibrary.list()):trackLibrary.list();
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
 if(action==='logout') {persistentCommunity?.dispose();persistentCommunity=null;communityOwnerId=null;communityEntryKey='';coachingWizardState=null;opsGps.pause();cleanupCoachingExit();exitSavePending=false;normalCoachingBeforeQa=null;qaInitialized=false;searchState=search.createSearch();searchUI={};debriefUI={tab:'summary'};terrainOpen=false;tracerState=tracer.createTracer();tracerUI={}; await auth.signOut(); preparationState=null;preparationUI={simulatorOpen:false,feedback:''};coachingDraft=newCoachingDraft();notifiedCoachingStarts=new Set();trackLibraryOwnerId=null;trackLibrary=createTrackLibrary();sessionCatalog.clear();operationalStore.clear();operationalStore=createOperationalMissionStore();operationalUI={mode:'',eventType:'Départ',note:''};trackUI=newTrackUI();dogsStore=createDogsStore();communityStore=createCommunityStore();communityLiveStore=createCommunityLiveStore({communityStore});communityController=makeCommunityController();jumolfStore=createJumolfStore({entitlement:'none',accessCodeCatalog:adminStore.codeCatalog(),currentUserId:null});jumolfController=makeJumolfController(); history.replaceState({},'','/auth'); render(true); return; }
 const sessionRemove=event.target.closest('[data-session-remove]');if(sessionRemove){const id=sessionRemove.dataset.sessionId,scope=sessionRemove.dataset.sessionRemove,ownerId=currentUser?.user_id,confirmation=SessionRemovalConfirmation(sessionPolicy(id),{scope});if(!confirmation){Toast('Suppression indisponible pour cette session.');return;}ConfirmationDialog({...confirmation,onConfirm:()=>{void removeSession(id,scope,ownerId).catch(error=>Toast(error.message));}});return;}
 const dogDefault=event.target.closest('[data-dog-set-default]');if(dogDefault){try{const dog=sessionDog(dogDefault.dataset.dogSetDefault);if(!dog)throw Error('Chien pisteur indisponible.');profileStore.setPrimaryDog(dog.id);jumolfController=makeJumolfController();render();Toast('Chien pisteur par défaut enregistré sur cet appareil.');}catch(error){Toast(error.message);}return;}
 const dogRemove=event.target.closest('[data-dog-remove]');if(dogRemove){const id=dogRemove.dataset.dogRemove,ownerId=currentUser?.user_id,dog=localDog(id);if(!dog||isProtectedDog(dog)){Toast('LOBO et sa démonstration sont protégés.');return;}ConfirmationDialog({title:'Supprimer ce chien ?',description:'Seule cette fiche sera retirée. Les pistes, séances et historiques, y compris partagés, restent conservés. Le prochain chien pisteur disponible deviendra le choix par défaut. Une sauvegarde cloud associée sera également supprimée si elle est identifiée.',onConfirm:()=>{void removeAccountDog(id,ownerId).catch(error=>Toast(error.message));}});return;}
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
 if(field.matches('[data-smart-option]')){const busy=trackSmart.view().busy,key=field.dataset.smartOption;trackSmart.setOptions({[key]:field.value});if(busy||['level','dogId','skill'].includes(key)){render();document.querySelector(`[data-smart-option="${key}"]`)?.focus();}else{document.querySelector('.smart-proposals')?.replaceChildren();document.querySelector('.smart-feedback')?.remove();}return;}
 if(field.matches('[data-editor-gpx-file]')){const file=field.files?.[0];field.value='';if(file)void importEditorGpx(file);return;}
 if(profileController.handleChange(event))return;
 if(scientificContributionController.handleChange(event))return;
 if(scientificCorpusController.handleChange(event))return;
 if(jumolfController.handleChange(event))return;
 if(field.matches('[data-community-permission="live_access_authorized"]')&&opsLiveBindings&&!persistentCommunity){const binding=opsLiveBindings.get(field.dataset.userId);if(binding){opsLiveBindings.set(binding.alias,binding.userId,field.checked);void opsLiveRemote.setHabitual(binding.userId,field.checked).then(()=>{opsHabitualState.set(binding.userId,field.checked);return opsLiveRemote.refresh();}).catch(()=>Toast('Autorisation en attente de synchronisation.'));}else if(field.checked)Toast('Associez ce contact à son compte réel pour le Live distant.');}
 if(communityController.handleChange(event))return;
 if(field.matches('[data-notification-preference]')){communityStore.getNotificationStore().setPreferences(communityStore.viewerId,{[field.dataset.notificationPreference]:field.checked});render();return;}
 if(field.matches('[data-live-policy]')){const type=field.dataset.sessionType,id=field.dataset.sessionId,key=field.dataset.livePolicy;try{communityLiveStore.setSessionPolicy({sessionType:type,sessionId:id,patch:{[key]:field.checked}});}catch(error){Toast(error.message);render();return;}if(type!=='ops')render();return;}
 if(field.matches('[data-live-option]')){const id=field.dataset.sessionId,key=field.dataset.liveOption;try{const current=communityLiveStore.getSessionPolicy('ops',id);communityLiveStore.setSessionPolicy({sessionType:'ops',sessionId:id,patch:{projectionOptions:{...current.projectionOptions,[key]:field.checked}}});}catch(error){Toast(error.message);render();}return;}
 if(field.matches('[data-operational-event-type]')){operationalUI={...operationalUI,eventType:field.value};return;}
 if(field.closest?.('[data-track-editor-form]')&&field.name){if(trackEditor.preview)return;try{trackEditor.draft=updateTrackMetadata(trackEditor.draft,{[field.name]:field.value},{record:false});if(field.name==='dogId'){render();document.querySelector('[data-track-editor-form] select[name=dogId]')?.focus();return;}const root=document.querySelector('[data-track-editor]');if(root)root.dataset.dirty=String(trackEditor.draft.dirty);const save=document.querySelector('[data-track-editor-form] button[type="submit"]');if(save)save.disabled=trackEditor.draft.points.length<2||!trackEditor.draft.name.trim()||trackHasPendingRoutes(trackEditor.draft.points);}catch(error){trackEditor={...trackEditor,error:error.message};render();}return;}
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
 if(event.target.matches('[data-smart-query]')){const busy=trackSmart.view().busy;trackSmart.setQuery(event.target.value);if(busy){render();document.querySelector('[data-smart-query]')?.focus();}document.querySelector('.smart-communes')?.replaceChildren();document.querySelector('.smart-proposals')?.replaceChildren();document.querySelector('.smart-selected')?.remove();const generate=document.querySelector('[data-smart-generate-form] button[type="submit"]');if(generate)generate.disabled=true;return;}
 if(event.target.matches('[data-editor-search]'))trackEditor.draft={...trackEditor.draft,searchQuery:event.target.value};
 if(event.target.closest?.('[data-track-editor-form]')&&event.target.name){if(trackEditor.preview)return;try{trackEditor.draft=updateTrackMetadata(trackEditor.draft,{[event.target.name]:event.target.value},{record:false});const root=document.querySelector('[data-track-editor]');if(root)root.dataset.dirty=String(trackEditor.draft.dirty);const save=document.querySelector('[data-track-editor-form] button[type="submit"]');if(save)save.disabled=trackEditor.draft.points.length<2||!trackEditor.draft.name.trim()||trackHasPendingRoutes(trackEditor.draft.points);}catch(error){trackEditor.error=error.message;}}
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
 const pisteNav=document.querySelector('.bottom-nav');
 const nav=pisteNav?.getClientRects().length?pisteNav:document.querySelector('.v3-nav');
 if(nav) document.documentElement.style.setProperty('--nav-height',`${Math.ceil(window.innerHeight-nav.getBoundingClientRect().top)}px`);
}
window.addEventListener('resize',syncNavigationHeight);
render();

document.addEventListener('submit',async event=>{
 if(event.target.matches('[data-piste-filter]')){event.preventDefault();if(pisteBusy)return;const params=new URLSearchParams(new FormData(event.target));history.pushState({},'','/tracks?'+params);render(true);return;}
 if(event.target.matches('[data-ops-account-link]')){event.preventDefault();const alias=event.target.dataset.opsAccountLink,userId=event.target.elements.userId.value,enabled=communityStore.getContactPermissions(alias)?.live_access_authorized===true;try{if(!opsLiveRemote.view().directory.some(p=>p.id===userId))throw Error('Compte réel indisponible.');opsLiveBindings.set(alias,userId,enabled);await opsLiveRemote.setHabitual(userId,enabled);opsHabitualState.set(userId,enabled);Toast('Compte Live OPS associé.');render();}catch(error){Toast(error.message);}return;}
 if(event.target.matches('[data-ops-invite]')){event.preventDefault();try{await opsLiveRemote.invite(event.target.dataset.opsInvite,event.target.elements.userId.value);Toast('Invitation Live envoyée au compte choisi.');await opsLiveRemote.refresh();}catch(error){Toast(error.message);}return;}
 if(personalCloud?.controller.handleSubmit(event))return;
 if(event.target.matches('[data-ops-event-form]')){event.preventDefault();const c=operationalGpsContext();try{if(!ownsOperationalGps(c))throw Error('Repère réservé à votre mission GPS.');const fix=opsGps.view().lastFix;operationalStore.addGpsEvent(c.mission.id,{type:event.target.elements.type.value,note:event.target.elements.note.value,position:fix?{timestamp:fix.timestamp,coords:fix}:null});operationalUI={...operationalUI,notice:'Repère enregistré.'};}catch(error){operationalUI={...operationalUI,notice:error.message};}render();return;}
 if(event.target.matches('[data-ops-time-form]')){event.preventDefault();const c=operationalGpsContext();try{if(!ownsOperationalGps(c))throw Error('Mission GPS non autorisée.');const raw=event.target.elements.disappearanceAt.value,value=raw?new Date(raw).toISOString():null;operationalStore.updateDetails(c.mission.id,{disappearanceAt:value});render();}catch(error){Toast(error.message);}return;}

 if(event.target.matches('[data-reference-response]')){event.preventDefault();confirmCoachingReferenceResponse(event.target);return;}
 if(event.target.matches('[data-reference-assignment]')){event.preventDefault();confirmCoachingReferenceAssignment(event.target);return;}
 if(event.target.matches('[data-reference-delegation]')){event.preventDefault();confirmCoachingReferenceDelegation(event.target);return;}
 if(profileController.handleSubmit(event))return;
 if(dataExportController.handleSubmit(event))return;
 if(adminController.handleSubmit(event))return;
 if(scientificCorpusController.handleSubmit(event))return;
 if(event.target.closest('[data-scientific-form],[data-jumolf-form]')&&!event.target.matches('[data-jumolf-form="code"]')&&auth.assurance==='supabase-auth'){event.preventDefault();try{await accountApi.call({operation:'authorize-feature',feature:event.target.closest('[data-scientific-form]')?'science':'jumolf'});}catch(error){Toast(error.message);return;}}
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
   const dog=sessionDog(operationalIntakeForm.elements.dogId.value);
   if(!dog)throw new Error('Choisissez un chien disponible.');
   const raw=Object.fromEntries(new FormData(operationalIntakeForm).entries());
   const text=value=>String(value??'').trim()||null;
   const dateValue=value=>{const valueText=text(value);if(!valueText)return null;const date=new Date(valueText);return Number.isFinite(date.getTime())?date.toISOString():null;};
   const handler={id:currentUser.user_id||'mock-current-user',name:currentUser.name};
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
   const draft=operationalStore.createDraft({dog,handler:{id:currentUser.user_id||'mock-current-user',name:currentUser.name}});
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

 if(event.target.matches('[data-smart-commune-form]')){event.preventDefault();trackSmart.setQuery(event.target.elements.communeQuery.value);void trackSmart.search();return;}
 if(event.target.matches('[data-smart-generate-form]')){event.preventDefault();trackSmart.setOptions(Object.fromEntries(new FormData(event.target).entries()));const start=trackEditor.draft?.points?.find(p=>p.kind==='start')||trackEditor.draft?.points?.[0];if(trackEditor.draft?.coordinateSpace==='wgs84'&&start&&!trackSmart.view().startPoint)trackSmart.setStartPoint([Number(start.x),Number(start.y)]);void trackSmart.generate();return;}
 const editorForm=event.target.closest('form[data-track-editor-form]');
 if(editorForm){
  event.preventDefault();
  try{
   if(trackEditor.preview){openProposalSave(event.submitter?.name==='prepareCanine');return;}
   if(trackHasPendingRoutes(trackEditor.draft.points))throw Error('Attendez le calcul des routes ou corrigez le segment en attente.');
   const values=Object.fromEntries(new FormData(editorForm).entries());
   const prepareCanine=event.submitter?.name==='prepareCanine';
   let generatedState=null;
   if(prepareCanine){
    const a=jumolfAccess();if(auth.assurance!=='supabase-auth'||!a.entitlement_valid||a.entitlement!=='premium'||trackEditor.canine?.ownerId!==currentUser?.user_id)throw Error('Préparation pédagogique indisponible ou non autorisée.');
    generatedState=coachingGeneratedTrackState({ownerId:currentUser.user_id,dogs:trackingDogs(),primaryDogId:profileStore.snapshot().primary_dog_id,dogId:values.dogId||'',track:{id:'pending',name:values.name,geometry:{points:trackEditor.draft.points}},currentState:coachingWizardState});
   }
   let saved;
   const trainingContext=missionContext(),dogId=values.dogId||'';
   if(trainingContext&&!trainingContext.preview&&dogId&&canineTrackContext(dogId).dog){values.trainingMemory=createTrainingMemory({ownerId:currentUser.user_id,dogId,options:trainingContext.options,proposal:trainingContext.proposal,draft:trackEditor.draft,mission:missionController.snapshot(),context:canineTrackContext(dogId)});values.notes=trainingMemoryNotes(values.trainingMemory,values.notes);}
   if(prepareCanine&&!values.trainingMemory)throw Error('Choisissez explicitement un chien autorisé pour conserver la préparation JUMOLF.');
   if(trackEditor.draft.id)saved=trackLibrary.updatePrepared(trackEditor.draft.id,{...values,geometry:{points:trackEditor.draft.points}});
   else if(trackEditor.copySource)saved=trackLibrary.createCopy({name:values.name,description:values.description,category:values.category,difficulty:values.difficulty,dogId:values.dogId,notes:values.notes,sourceId:trackEditor.copySource.sourceId,sourceKind:trackEditor.copySource.kind,points:trackEditor.draft.points});
   else saved=trackLibrary.createPrepared({...values,geometry:{points:trackEditor.draft.points},source:trackEditor.draft.source||'draw',provenance:trackEditor.draft.provenance||'manual',fileName:trackEditor.draft.fileName});
   const returnState=generatedState?{...generatedState,draft:{...generatedState.draft,preparationTrack:saved}}:coachingTrackReturnState(coachingWizardState,currentUser?.user_id,location.search,saved);
   if(returnState){coachingWizardState=returnState;try{sharedIndex?.saveTrainingDraft(returnState);}catch(error){Toast(error.message);}}
   trackEditorActive=false;trackEditor={...trackEditor,draft:null,routeKey:''};history.pushState({},'',returnState?'/new-session':`/tracks/${encodeURIComponent(`prepared:${saved.id}`)}`);render(true);
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
  let message=input.validity.valueMissing?'Ce champ est requis.':input.validity.typeMismatch?'Saisissez un email valide.':form.dataset.auth==='signup'&&input.type==='password'&&input.value.length<12?'Utilisez au moins 12 caractères.':'';
  if(input.name==='confirmPassword'&&input.value!==form.elements.password.value)message='Les mots de passe ne correspondent pas.';
  input.setAttribute('aria-invalid',String(!!message));
  document.getElementById(`${input.name}-error`).textContent=message;
  if(message&&!invalid)invalid=input;
 }
 if(invalid){invalid.focus();return;}
 const button=form.querySelector('button[type="submit"]'),feedback=form.querySelector('.auth-result');
 if(button.disabled)return;button.disabled=true;feedback.textContent='Vérification…';authNotice='';
 try{
  if(form.dataset.auth==='forgot'){const result=await auth.forgot(form.elements.email.value);feedback.textContent=result.message;return;}
  const signup=form.dataset.auth==='signup';
  if(signup){const result=await auth.signUp(Object.fromEntries(new FormData(form)));form.reset();feedback.textContent=result.message;return;}
  await auth.signIn({email:form.elements.email.value,password:form.elements.password.value});
  if(!auth.getSession().authenticated){authNotice='Votre compte est connecté. L’accès au Coaching V2 attend une autorisation.';feedback.textContent=authNotice;form.elements.password.value='';return;}
  form.reset();currentUser=auth.getSession().user;
  jumolfStore=accountJumolfStore();jumolfController=makeJumolfController();coachingDraft=newCoachingDraft();trackLibraryOwnerId=null;trackLibrary=createTrackLibrary();trackUI=newTrackUI();
  history.pushState({},'','/');render(true);Toast('Connecté à votre compte PISTE V2.');
 }catch(error){feedback.textContent=error.message;for(const input of form.querySelectorAll('input[type="password"]'))input.value='';}
 finally{button.disabled=false;}

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

document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const panel=document.querySelector('[data-creator-panel][open]');if(panel){event.preventDefault();panel.open=false;panel.querySelector('summary')?.focus();}});

// Cancel only the intelligent search when its native dialog is dismissed (Escape).
document.addEventListener('cancel',event=>{if(event.target.matches?.('[data-smart-panel]')){event.preventDefault();event.target.close();trackSmart.cancel();document.querySelector('[data-editor-action="open-smart"]')?.focus();}},true);

// Refresh invitations on opening/returning to the app. Poll only while visible.
function refreshCoachingOnReturn(){if(document.visibilityState!=='hidden')refreshSharedCatalog(true);}
window.addEventListener('focus',refreshCoachingOnReturn);window.addEventListener('pageshow',refreshCoachingOnReturn);window.addEventListener('online',refreshCoachingOnReturn);document.addEventListener('visibilitychange',refreshCoachingOnReturn);
setInterval(()=>{if(document.visibilityState!=='hidden')refreshSharedCatalog();},30000);
