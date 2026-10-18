// Presentation draft only. Real membership and commands remain server-authorized.
import {createDraft,updateDraft,setTrackingScenario,preparation,selectPreparation,roleTypes,selectCreatorRole} from './coaching.mjs';
import {CoachingScreen} from './coaching-screen.mjs';
import {PremiumPictogram as P} from './coaching-pictograms.mjs';
import {escapeHTML as e} from './components.mjs';
import {remotePreparedInput,remoteGpxInput} from './coaching-remote-reference.mjs';
export function createSharedCoachingWizard({profile,dogs=[],getTracks=()=>[],initialState=null,onChange=()=>{}}={}){
 let d={...createDraft({user_id:profile.id,name:profile.name},dogs),step:'mode'},reference=null;
 if(initialState?.ownerId===profile.id&&initialState.draft?.identityContext?.userId===profile.id){d={...structuredClone(initialState.draft),dogs:dogs.map(dog=>({...dog})),session:null};if(!dogs.some(dog=>dog.id===d.dogId))d.dogId=dogs.length===1?dogs[0].id:null;}
 const sequence=()=>['mode',...(['prepared','gpx'].includes(d.traceType)?['prepare']:[]),'dog','roles','review'];
 const snapshot=()=>({ownerId:profile.id,draft:structuredClone(d)});
 const notify=()=>onChange(snapshot());
 const roles=()=>{d.participants=[{id:'self',name:profile.name},{id:'pending-traceur',name:'Traceur · à inviter'},{id:'pending-driver',name:'Conducteur · à inviter'},{id:'pending-coach',name:'Coach · à inviter'}];d.roles={traceur:d.trackingScenario==='self_trace'?'self':d.trackingScenario==='connected_traceur'?(d.creatorRole==='traceur'?'self':'pending-traceur'):null,driver:d.creatorRole==='driver'?'self':'pending-driver',coach:d.creatorRole==='coach'?'self':null,observers:[]};};roles();
 const canPrepare=()=>preparation(d)!=='delegated';
 function errors(){const errors=[];if(!d.mode)errors.push({message:'Choisissez un mode.'});if(!d.traceType)errors.push({message:'Choisissez le type de tracé.'});if(['prepared','gpx'].includes(d.traceType)&&canPrepare()&&!reference)errors.push({code:'preparation_required',message:'Choisissez une référence avant de créer la session.'});if(!d.dogId)errors.push({message:'Choisissez un chien.'});if(d.preparationTrack&&d.mode!=='normal'&&(d.creatorRole==='driver'||d.mode==='full_blind'&&d.creatorRole==='coach'))errors.push({message:'Vous connaissez déjà cette référence : choisissez une fonction autorisée ou une nouvelle session.'});return errors;}
 const available=()=>getTracks().filter(t=>t.geometry?.points?.every(p=>p.space==='wgs84')&&(d.traceType!=='gpx'||t.source==='gpx'));
 function prepareMarkup(){if(!canPrepare())return undefined;return `<p class="coaching-local-note">Choisissez une référence géographique. La pose et la recherche seront enregistrées séparément par le GPS.</p>${d.traceType==='gpx'?'<form data-shared-gpx><label>Importer un fichier GPX<input name="gpxFile" type="file" accept=".gpx,application/gpx+xml" required></label><button class="button button-dark">Importer ce GPX</button></form>':''}<div class="coaching-choices">${available().map(t=>`<button class="coaching-choice card" data-coaching-choice="preparation" data-value="${e(t.id)}" aria-pressed="${d.preparationTrack?.id===t.id}"><span class="coaching-choice-symbol">${P(d.traceType==='gpx'?'gpxImport':'trackPrepared')}</span><span><strong>${e(t.name)}</strong><small>Votre bibliothèque</small></span></button>`).join('')}</div>${d.preparationTrack?`<p role="status">Référence sélectionnée : ${e(d.preparationTrack.name)}</p>`:''}<a class="button button-dark" href="/track-builder?from=coaching">Ouvrir le Créateur de tracé</a>`;}
 function roleMarkup(){return `${d.trackingScenario==='connected_traceur'?`<div class="coaching-principal"><p class="eyebrow">VOTRE FONCTION PRINCIPALE</p><div role="group" aria-label="Votre fonction principale">${roleTypes.filter(r=>r.id!=='observer').map(r=>`<button data-coaching="creator" data-role="${r.id}" aria-pressed="${d.creatorRole===r.id}">${r.title}</button>`).join('')}</div></div>`:''}<div class="coaching-role-list">${roleTypes.map(r=>`<article class="card coaching-role" data-visual-role="${r.id}"><div class="coaching-role-title">${P(r.icon)}<div><h2>${r.title}</h2><p>${r.description}</p></div></div><p>${r.id===d.creatorRole?`${e(profile.name)} · Vous`:r.id==='traceur'&&d.trackingScenario==='self_trace'?'Vous · pose puis recherche':r.id==='traceur'&&d.trackingScenario.startsWith('external_')?'Traceur externe · sans application':'À inviter après la création'}</p></article>`).join('')}</div><p class="coaching-local-note">Les fonctions des autres participants seront attribuées par les invitations privées. Aucun participant fictif n’est ajouté.</p>`;}
 if(d.preparationTrack){try{const stored=available().find(track=>track.id===d.preparationTrack.id)||(d.preparationTrack.id==='uploaded-gpx'?d.preparationTrack:null);if(stored){d={...d,preparationTrack:stored};if(canPrepare())reference=remotePreparedInput(stored);}else d={...d,preparationTrack:null};}catch{d={...d,preparationTrack:null};}}
 if(initialState?.ownerId===profile.id&&initialState.createdTrackId&&canPrepare()){const track=available().find(t=>t.id===initialState.createdTrackId);if(track){d=selectPreparation(d,track);d={...d,step:'prepare',editing:false};reference=remotePreparedInput(track);}}
 if(!sequence().includes(d.step))d={...d,step:'mode'};
 return {
 snapshot,
 render(notice='',busy=false){const html=CoachingScreen(d,notice,available(),[],{},null,null,{shared:true,groupConfiguration:true,compactReview:true,stepSequence:sequence(),headings:{mode:'Configurer la session',prepare:'Choisir le tracé',dog:'Choisir le chien',roles:'Votre équipe',review:'Récapitulatif'},descriptions:{mode:'',review:''},rolesMarkup:roleMarkup(),prepareMarkup:prepareMarkup(),errors:errors(),canContinue:d.step==='mode'?!!d.mode&&!!d.traceType:d.step==='prepare'?(!canPrepare()||!!d.preparationTrack):undefined,allowedTraceTypes:d.trackingScenario.startsWith('external_')?['direct','none']:undefined});return busy?`<div aria-busy="true"><fieldset class="coaching-wizard-busy" disabled>${html}</fieldset></div>`:html;},
 dispatch({action,field,value,step}={}){
  if(field==='mode'||field==='traceType'||field==='dogId'){const changed=field==='traceType'&&value!==d.traceType;d=updateDraft(d,{[field]:value});if(changed){reference=null;}}
  else if(field==='trackingScenario'){d=setTrackingScenario(d,value);if(value.startsWith('external_')){d=updateDraft(d,{traceType:'direct'});reference=null;}roles();}
  else if(field==='preparation'){const track=available().find(t=>t.id===value);if(!track)throw Error('Référence indisponible.');d=selectPreparation(d,track);reference=remotePreparedInput(track);}
  if(action==='creator'){d=selectCreatorRole(d,value);roles();}
  if(action==='edit')d={...d,step:['trace','scenario','intro'].includes(step)?'mode':step,editing:true};
  const route=sequence(),index=route.indexOf(d.step);
  if(action==='next'){if(d.step==='mode'&&(!d.mode||!d.traceType)||d.step==='prepare'&&canPrepare()&&!d.preparationTrack||d.step==='dog'&&!d.dogId)throw Error('Complétez cette étape.');d={...d,step:d.editing?'review':route[Math.min(index+1,route.length-1)],editing:false};}
  if(action==='back')d={...d,step:route[Math.max(0,index-1)],editing:false};
  if(action==='create'){if(errors().length)throw Error(errors()[0].message);return {type:'create',dogId:d.dogId,payload:{role:d.creatorRole,mode:d.mode,scenario:d.trackingScenario,traceType:d.traceType==='none'?'direct':d.traceType,dogName:d.dogs.find(dog=>dog.id===d.dogId).name},reference:reference?structuredClone(reference):null};}
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
