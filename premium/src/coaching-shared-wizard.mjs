// Presentation draft only. Real membership and commands remain server-authorized.
import {normalizeTrainingMemory,createRecommendationMemory} from './jumolf-training-memory.mjs';
import {createDraft,updateDraft,setTrackingScenario,preparation,selectPreparation,roleTypes,selectCreatorRole,assignRole,setObservers} from './coaching.mjs';
import {coachingTeamContacts,normalizeCoachingTeam,coachingDraftAssignments} from './coaching-team.mjs';
import {CoachingScreen,CoachingRoleCards} from './coaching-screen.mjs';
import {PremiumPictogram as P} from './coaching-pictograms.mjs';
import {escapeHTML as e} from './components.mjs';
import {resolveDogId,resolveDefaultTrackingDog} from './dog-selection.mjs';
import {remotePreparedInput,remoteGpxInput} from './coaching-remote-reference.mjs';
export function createSharedCoachingWizard({profile,dogs=[],primaryDogId=null,getTracks=()=>[],initialState=null,onChange=()=>{},resolveJumolfPreparation=p=>p}={}){
 let d={...createDraft({user_id:profile.id,name:profile.name},dogs),step:'mode',...(profile.coaching_team_version===1?{teamSetupVersion:1}:{})},reference=null;
 if(initialState?.ownerId===profile.id&&initialState.draft?.identityContext?.userId===profile.id){d={...structuredClone(initialState.draft),dogs:dogs.map(dog=>({...dog})),session:null};d.dogId=resolveDogId(dogs,d.dogId);}
 d.dogId=resolveDogId(dogs,d.dogId)||resolveDefaultTrackingDog(dogs,primaryDogId)?.id||(dogs.length===1?dogs[0].id:null);
 let teamContacts=null,restoredRoles=initialState?.ownerId===profile.id?structuredClone(d.roles):null;
 const sequence=()=>['mode',...(['prepared','gpx'].includes(d.traceType)?['prepare']:[]),...(!d.dogId||d.step==='dog'?['dog']:[]),'roles','review'];
 const snapshot=()=>({ownerId:profile.id,draft:structuredClone(d)});
 const notify=()=>onChange(snapshot());
 const refreshJumolfPreparation=()=>{if(!d.jumolfPreparation)return;const current=resolveJumolfPreparation(d.jumolfPreparation);if(current&&current.dogId===d.dogId)d={...d,jumolfPreparation:current};else{const {jumolfPreparation,...rest}=d;d=rest;}};
 const roles=()=>{const previous=d.roles;d.participants=[{id:'self',name:profile.name},{id:'pending-traceur',name:'Traceur · à inviter'},{id:'pending-driver',name:'Conducteur · à inviter'},{id:'pending-coach',name:'Coach · à inviter'}];d.roles={traceur:d.trackingScenario==='self_trace'?'self':d.trackingScenario==='connected_traceur'?(d.creatorRole==='traceur'?'self':'pending-traceur'):null,driver:d.creatorRole==='driver'?'self':'pending-driver',coach:d.creatorRole==='coach'?'self':null,observers:[]};if(teamContacts){d.participants=[{id:'self',name:profile.name},...teamContacts];for(const role of ['traceur','driver','coach'])if(d.roles[role]!=='self'&&!(role==='traceur'&&d.trackingScenario!=='connected_traceur')&&previous[role]&&previous[role]!=='self'&&!previous[role].startsWith('pending-'))d.roles[role]=previous[role];d.roles.observers=[...previous.observers];}};roles();
 const canPrepare=()=>preparation(d)!=='delegated';
 function errors(){if(!reference&&canPrepare()&&['prepared','gpx'].includes(d.traceType)&&d.preparationTrack?.geometry)try{reference=remotePreparedInput(d.preparationTrack);}catch{}const errors=[];if(d.teamSetupVersion===1){try{teamAssignments();}catch(error){errors.push({message:error.message});}}if(!d.mode)errors.push({message:'Choisissez un mode.'});if(!d.traceType)errors.push({message:'Choisissez le type de tracé.'});if(['prepared','gpx'].includes(d.traceType)&&canPrepare()&&!reference)errors.push({code:'preparation_required',message:'Choisissez une référence avant de créer la session.'});if(!d.dogId)errors.push({message:'Choisissez un chien.'});if(d.preparationTrack&&d.mode!=='normal'&&(d.creatorRole==='driver'||d.mode==='full_blind'&&d.creatorRole==='coach'))errors.push({message:'Vous connaissez déjà cette référence : choisissez une fonction autorisée ou une nouvelle session.'});return errors;}
 const available=()=>getTracks().filter(t=>t.geometry?.points?.every(p=>p.space==='wgs84')&&(d.traceType!=='gpx'||t.source==='gpx'));
 function prepareMarkup(){if(!canPrepare())return undefined;return `<p class="coaching-local-note">Choisissez une référence géographique. La pose et la recherche seront enregistrées séparément par le GPS.</p>${d.traceType==='gpx'?'<form data-shared-gpx><label>Importer un fichier GPX<input name="gpxFile" type="file" accept=".gpx,application/gpx+xml" required></label><button class="button button-dark">Importer ce GPX</button></form>':''}<div class="coaching-choices">${available().map(t=>`<button class="coaching-choice card" data-coaching-choice="preparation" data-value="${e(t.id)}" aria-pressed="${d.preparationTrack?.id===t.id}"><span class="coaching-choice-symbol">${P(d.traceType==='gpx'?'gpxImport':'trackPrepared')}</span><span><strong>${e(t.name)}</strong><small>Votre bibliothèque</small></span></button>`).join('')}</div>${d.preparationTrack?`<p role="status">Référence sélectionnée : ${e(d.preparationTrack.name)}</p>${d.preparationTrack.notes?`<details class="canine-editor-brief"><summary>Notes de préparation de la piste</summary><p>${e(d.preparationTrack.notes)}</p><small>Notes déclarées et paramètres initiaux à vérifier après édition ; aucune réalisation attestée.</small></details>`:''}`:''}<a class="button button-dark" href="/track-builder?from=coaching">Ouvrir le Créateur de tracé</a>`;}
 function dogChangeMarkup(){const dog=d.dogs.find(dog=>dog.id===d.dogId);if(!dog)return '';return `<aside class="coaching-local-note"><p>Chien de cette session : <strong>${e(dog.name)}</strong></p>${d.dogs.length>1?`<details><summary>Changer de chien pour cette session</summary><div class="coaching-choices">${d.dogs.map(item=>`<button type="button" class="button button-dark" data-coaching-choice="dogId" data-value="${e(item.id)}" aria-pressed="${item.id===d.dogId}">${e(item.name)}</button>`).join('')}</div></details>`:''}</aside>`;}
 function teamAssignments(){if(!teamContacts)throw Error('Le catalogue vérifié des amis doit être actualisé.');return normalizeCoachingTeam({assignments:coachingDraftAssignments(d),contacts:teamContacts,ownerId:profile.id,creatorRole:d.creatorRole,scenario:d.trackingScenario});}
 function roleMarkup(){if(teamContacts)return CoachingRoleCards(d,teamContacts,{singleRolePerAccount:true});return `${d.trackingScenario==='connected_traceur'?`<div class="coaching-principal"><p class="eyebrow">VOTRE FONCTION PRINCIPALE</p><div role="group" aria-label="Votre fonction principale">${roleTypes.filter(r=>r.id!=='observer').map(r=>`<button data-coaching="creator" data-role="${r.id}" aria-pressed="${d.creatorRole===r.id}">${r.title}</button>`).join('')}</div></div>`:''}<div class="coaching-role-list">${roleTypes.map(r=>`<article class="card coaching-role" data-visual-role="${r.id}"><div class="coaching-role-title">${P(r.icon)}<div><h2>${r.title}</h2><p>${r.description}</p></div></div><p>${r.id===d.creatorRole?`${e(profile.name)} · Vous`:r.id==='traceur'&&d.trackingScenario==='self_trace'?'Vous · pose puis recherche':r.id==='traceur'&&d.trackingScenario.startsWith('external_')?'Traceur externe · sans application':'À inviter après la création'}</p></article>`).join('')}</div><p class="coaching-local-note">Les fonctions des autres participants seront attribuées par les invitations privées. Aucun participant fictif n’est ajouté.</p>`;}
 if(d.preparationTrack){try{const stored=available().find(track=>track.id===d.preparationTrack.id)||(d.preparationTrack.id==='uploaded-gpx'?d.preparationTrack:null);if(stored){d={...d,preparationTrack:stored};if(canPrepare())reference=remotePreparedInput(stored);}else d={...d,preparationTrack:null};}catch{d={...d,preparationTrack:null};}}
 if(initialState?.ownerId===profile.id&&initialState.createdTrackId&&canPrepare()){const track=available().find(t=>t.id===initialState.createdTrackId);if(track){d=selectPreparation(d,track);d={...d,preparationTrack:{...d.preparationTrack,notes:track.notes||'',...(track.trainingMemory?{trainingMemory:track.trainingMemory}:{})}};d={...d,step:'prepare',editing:false};reference=remotePreparedInput(track);}}
 if(!sequence().includes(d.step))d={...d,step:'mode'};
 return {
 snapshot,
 invalidateTeamCatalogue(){teamContacts=null;},
 setTeamCatalogue(catalogue){
  if(catalogue?.version!==1||catalogue.ownerId!==profile.id)throw Error('Catalogue de contacts non vérifié.');
  const contacts=coachingTeamContacts(catalogue.contacts,profile.id);teamContacts=contacts;
  d={...d,teamSetupVersion:1,participants:[{id:'self',name:profile.name},...contacts]};
  if(restoredRoles){d={...d,roles:restoredRoles};restoredRoles=null;}
  notify();
 },
 render(notice='',busy=false){refreshJumolfPreparation();const preparation=d.jumolfPreparation?.dogId===d.dogId?d.jumolfPreparation:null;const memory=d.preparationTrack?.trainingMemory?.dogId===d.dogId?d.preparationTrack.trainingMemory:null;const memoryBrief=memory?`<aside class="card jumolf-training-brief" data-prepared-training><h2>Préparation JUMOLF retrouvée</h2><p>${e(memory.objective)}</p><p>Niveau déclaré : ${e(memory.level||'non renseigné')} · distance préparée calculée : ${e(memory.parameters.distanceM)} m.</p><p>Conservée sur cet appareil. La séance reste à créer explicitement ; conducteur et binôme seront ceux de l’équipe Coaching autorisée.</p></aside>`:'';const brief=preparation?`<aside class="card jumolf-training-brief"><h2>Objectif JUMOLF</h2><strong>${e(preparation.title)}</strong><p>${e(preparation.objective)}</p><details><summary>Protocole à observer</summary><ul>${preparation.protocol.preparation.map(x=>`<li>${e(x)}</li>`).join('')}</ul><ol>${preparation.protocol.steps.map(x=>`<li>${e(x)}</li>`).join('')}</ol><p>${e(preparation.protocol.difficulty)}</p><ul>${preparation.protocol.criteria.map(x=>`<li>${e(x)}</li>`).join('')}</ul></details><p>Préparation locale à cette visite, sans réalisation déclarée. Les rôles et modes de visibilité restent à choisir. Le lien n’est pas enregistré durablement.</p><a href="/jumolf/exercises?dog=${encodeURIComponent(d.dogId||'')}">Retour à JUMOLF</a></aside>`:'';const html=memoryBrief+brief+CoachingScreen(d,notice,available(),[],{},null,null,{shared:true,groupConfiguration:true,dogChangeMarkup:dogChangeMarkup(),compactReview:true,stepSequence:sequence(),headings:{mode:'Configurer la session',prepare:'Choisir le tracé',dog:'Choisir le chien',roles:'Votre équipe',review:'Récapitulatif'},descriptions:{mode:'',review:''},rolesMarkup:roleMarkup(),prepareMarkup:prepareMarkup(),errors:errors(),canContinue:d.step==='mode'?!!d.mode&&!!d.traceType:d.step==='prepare'?(!canPrepare()||!!d.preparationTrack):undefined,allowedTraceTypes:d.trackingScenario.startsWith('external_')?['direct','none']:undefined});return busy?`<div aria-busy="true"><fieldset class="coaching-wizard-busy" disabled>${html}</fieldset></div>`:html;},
 dispatch({action,field,value,step}={}){
  refreshJumolfPreparation();
  if(field==='teamRole'||field==='teamObservers'){
   if(!teamContacts)throw Error('Catalogue de contacts indisponible.');
   if(field==='teamObservers'&&value?.includes('self'))throw Error('Votre fonction principale est déjà attribuée.');
   if(field==='teamRole'&&(value?.role===d.creatorRole&&value.person!=='self'||value?.person==='self'&&value.role!==d.creatorRole))throw Error('Votre fonction se choisit avec votre rôle principal.');
   const next=field==='teamRole'?assignRole(d,value?.role,value?.person||null):setObservers(d,value);
   normalizeCoachingTeam({assignments:coachingDraftAssignments(next),contacts:teamContacts,ownerId:profile.id,creatorRole:d.creatorRole,scenario:d.trackingScenario});d=next;
  }
  if(field==='dogId'&&value!==d.preparationTrack?.trainingMemory?.dogId&&d.preparationTrack?.trainingMemory){const {trainingMemory,...track}=d.preparationTrack;d={...d,preparationTrack:track};}
  if(field==='dogId'&&value!==d.jumolfPreparation?.dogId){const {jumolfPreparation,...rest}=d;d=rest;}
  if(field==='mode'||field==='traceType'||field==='dogId'){const changed=field==='traceType'&&value!==d.traceType;d=updateDraft(d,{[field]:value});if(changed){reference=null;}}
  else if(field==='trackingScenario'){d=setTrackingScenario(d,value);if(value.startsWith('external_')){d=updateDraft(d,{traceType:'direct'});reference=null;}roles();}
  else if(field==='preparation'){const track=available().find(t=>t.id===value);if(!track)throw Error('Référence indisponible.');d=selectPreparation(d,track);d={...d,preparationTrack:{...d.preparationTrack,notes:track.notes||'',...(track.trainingMemory?{trainingMemory:track.trainingMemory}:{})}};reference=remotePreparedInput(track);}
  if(action==='creator'){d=selectCreatorRole(d,value);roles();}
  if(action==='edit')d={...d,step:['trace','scenario','intro'].includes(step)?'mode':step,editing:true};
  const route=sequence(),index=route.indexOf(d.step);
  if(action==='next'){if(d.step==='mode'&&(!d.mode||!d.traceType)||d.step==='prepare'&&canPrepare()&&!d.preparationTrack||d.step==='dog'&&!d.dogId)throw Error('Complétez cette étape.');d={...d,step:d.editing?'review':route[Math.min(index+1,route.length-1)],editing:false};}
  if(action==='back')d={...d,step:route[Math.max(0,index-1)],editing:false};
  if(action==='create'){if(errors().length)throw Error(errors()[0].message);const trainingMemory=d.preparationTrack?.trainingMemory?.dogId===d.dogId?normalizeTrainingMemory(d.preparationTrack.trainingMemory,{ownerId:profile.id,dogId:d.dogId}):d.jumolfPreparation?createRecommendationMemory(d.jumolfPreparation,{ownerId:profile.id,dogId:d.dogId,track:d.preparationTrack}):null;return {type:'create',dogId:d.dogId,trainingMemory,payload:{role:d.creatorRole,mode:d.mode,scenario:d.trackingScenario,traceType:d.traceType==='none'?'direct':d.traceType,dogName:d.dogs.find(dog=>dog.id===d.dogId).name,...(d.teamSetupVersion===1?{teamAssignments:teamAssignments()}:{})},reference:reference?structuredClone(reference):null};}
  notify();return {type:'render'};
 },
 setGpx(parsed){if(!canPrepare())throw Error('Préparation réservée au Traceur.');reference=remoteGpxInput(parsed);d={...d,preparationTrack:{id:'uploaded-gpx',source:'gpx',name:parsed.name,fileName:parsed.name,geometry:{points:parsed.points}}};notify();},
 };
}

// The creator may return only to a draft belonging to this signed-in account.
export function coachingTrackReturnState(state,ownerId,search,track){
 if(!ownerId||new URLSearchParams(search).get('from')!=='coaching'||state?.ownerId!==ownerId||state.draft?.identityContext?.userId!==ownerId||state.draft?.session||state.draft?.step!=='prepare'||!['prepared','gpx'].includes(state.draft.traceType)||preparation(state.draft)==='delegated'||!track?.id||state.draft.traceType==='gpx'&&track.source!=='gpx')return null;
 return {...structuredClone(state),createdTrackId:track.id};
}

// Local presentation handoff only. No server payload or membership is changed.
export function coachingJumolfPreparationState({ownerId,dogs=[],preparation:input,currentState=null}={}){
 if(currentState?.draft)throw Error('Un brouillon Coaching est déjà en cours. Reprenez-le avant de préparer une autre séance.');
 if(!ownerId||!input?.dogId||!dogs.some(d=>d.id===input.dogId))throw Error('Compte ou chien indisponible.');
 const draft=createDraft({user_id:ownerId},dogs);
 return {ownerId,draft:{...draft,step:'mode',dogId:input.dogId,jumolfPreparation:structuredClone(input)}};
}

// Existing library reference, explicit visit-only handoff. No session is created.
export function coachingGeneratedTrackState({ownerId,dogs=[],dogId='',primaryDogId=null,track,currentState=null}={}){
 if(currentState?.draft)throw Error('Un brouillon Coaching est déjà en cours. Reprenez-le avant de préparer une autre séance.');
 if(!ownerId||!track?.id||!track.geometry?.points?.length||!track.geometry.points.every(p=>p.space==='wgs84'))throw Error('Compte ou référence géographique indisponible.');
 const resolvedDogId=resolveDogId(dogs,dogId);
 if(dogId&&!resolvedDogId)throw Error('Chien indisponible.');
 const draft=createDraft({user_id:ownerId},dogs);
 return {ownerId,draft:{...draft,step:'mode',traceType:'prepared',dogId:resolvedDogId||resolveDefaultTrackingDog(dogs,primaryDogId)?.id||draft.dogId,preparationTrack:structuredClone(track)}};
}
