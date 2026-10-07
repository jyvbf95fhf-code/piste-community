// Local-only coaching draft. No route geometry or application permissions are granted.
export const modes=[
 {id:'normal',icon:'modeNormal',title:'Normal',description:'Une piste connue, pour travailler un objectif ensemble.',visibility:'La piste est visible par tous les participants.'},
 {id:'simple_blind',icon:'modeSimple',title:'Simple aveugle',description:'Le chien guide. Le conducteur découvre la piste.',visibility:'Le Conducteur ne voit pas la piste. Coach, Traceur et Observateur la connaissent.'},
 {id:'full_blind',icon:'modeDouble',title:'Double aveugle',description:'Observer sans orienter : le binôme et le Coach découvrent.',visibility:'Seul le Traceur connaît la piste. Un Coach qui pose lui-même la piste conserve la visibilité du poseur.'}
];
export const traceTypes=[
 {id:'direct',title:'Terrain direct',description:'Le Traceur préparera la piste sur le terrain.',icon:'terrainDirect'},
 {id:'prepared',title:'Tracé préparé',description:'Une piste choisie à l’avance pour votre exercice.',icon:'trackPrepared'},
 {id:'gpx',title:'Import GPX',description:'Prévoir une piste issue d’un fichier. Aucun fichier importé dans cet aperçu.',icon:'gpxImport'},
 {id:'none',title:'Sans tracé préparé',description:'Organiser le coaching maintenant, définir la piste plus tard.',icon:'trackNone'}
];
export const roleTypes=[
 {id:'coach',title:'Coach',description:'Fixe l’objectif, observe et accompagne le débrief.',icon:'roleCoach'},
 {id:'traceur',title:'Traceur',description:'Prépare la piste et transmet les informations autorisées.',icon:'roleTracer'},
 {id:'driver',title:'Conducteur',description:'Travaille avec le chien et écoute ses indications.',icon:'roleDriver'},
 {id:'observer',title:'Observateur',description:'Observe l’exercice. Lecture seule, sans action ni modification.',icon:'roleObserver'}
];
export const trackingScenarios=Object.freeze([
 {id:'connected_traceur',title:'Traceur avec application',description:'Le Traceur dispose de l’application et réalise la pose.',normalOnly:false},
 {id:'self_trace',title:'Je trace pour moi-même',description:'La même personne réalisera la pose puis la relève.',normalOnly:true},
 {id:'external_traceur',title:'Traceur externe sans application',description:'Le Conducteur déclare sa mise en place. Aucune position du Traceur n’existe dans l’application.',normalOnly:false},
 {id:'external_driver_recorded',title:'Traceur externe · j’enregistre sa pose',description:'Le téléphone Conducteur enregistre la pose du Traceur externe, puis sa propre relève.',normalOnly:true}
]);
export function createDraft(user,dogs) {
 return {step:'intro',mode:null,traceType:null,trackingScenario:'connected_traceur',dogs:dogs.map(d=>({...d})),dogId:dogs.length===1?dogs[0].id:null,
  participants:[{id:'self',name:user?.name || 'Vous'},{id:'camille',name:'Camille'},{id:'alex',name:'Alex'},{id:'lea',name:'Léa'},{id:'hugo',name:'Hugo'},{id:'ines',name:'Inès'}],
 creatorRole:'driver',roles:{coach:'camille',traceur:'alex',driver:'self',observers:[]},preparationTrack:null,knownPeople:[],session:null,editing:false};
}
export function setTrackingScenario(draft,scenario){
 const definition=trackingScenarios.find(item=>item.id===scenario);if(!definition)throw Error('Parcours de pose inconnu.');
 if(definition.normalOnly&&draft.mode!=='normal')throw Error('Ce parcours est disponible uniquement en mode Normal.');
 const roles={...draft.roles};let creatorRole=draft.creatorRole;
 if(scenario==='self_trace'){creatorRole='driver';roles.driver='self';roles.traceur='self';roles.observers=roles.observers.filter(id=>id!=='self');}
 else if(scenario==='external_traceur'||scenario==='external_driver_recorded'){creatorRole='driver';roles.driver='self';roles.traceur=null;roles.observers=roles.observers.filter(id=>id!=='self');}
 else if(draft.trackingScenario!=='connected_traceur'&&!roles.traceur)roles.traceur='alex';
 return {...draft,trackingScenario:scenario,creatorRole,roles,session:null};
}
export function steps(draft) {return ['intro','mode','scenario','trace',...(['prepared','gpx'].includes(draft.traceType)?['prepare']:[]),...(draft.dogs.length===1?[]:['dog']),'roles','review'];}
export function updateDraft(draft,patch) {
 if(patch.mode!==undefined&&!modes.some(m=>m.id===patch.mode))throw Error('Mode inconnu');
 const scenario=trackingScenarios.find(item=>item.id===draft.trackingScenario);
 if(patch.mode!==undefined&&scenario?.normalOnly&&patch.mode!=='normal')throw Error(`${scenario.title} est disponible uniquement en mode Normal.`);
 if(patch.traceType!==undefined&&!traceTypes.some(t=>t.id===patch.traceType))throw Error('Type de tracé inconnu');
 if(patch.dogId!==undefined&&!draft.dogs.some(d=>d.id===patch.dogId))throw Error('Chien inconnu');
 const {mode=draft.mode,traceType=draft.traceType,dogId=draft.dogId}=patch;
 return {...draft,mode,traceType,dogId,preparationTrack:traceType===draft.traceType?draft.preparationTrack:null,session:null};
}
export function assignRole(draft,role,person) {
 if(!['coach','traceur','driver'].includes(role))throw Error('Choisissez une fonction principale ; utilisez la sélection multiple pour les Observateurs.');
 if(draft.trackingScenario!=='connected_traceur'&&role==='traceur')throw Error('Le rôle olfactif est externe ou déjà assuré par vous-même dans ce parcours.');
 if(['self_trace','external_traceur','external_driver_recorded'].includes(draft.trackingScenario)&&role==='driver'&&person!=='self')throw Error('Le Conducteur connecté réalise ce parcours.');
 if(person!==null&&!draft.participants.some(p=>p.id===person))throw Error('Participant inconnu');
 return {...draft,roles:{...draft.roles,[role]:person},session:null};
}
export function selectCreatorRole(draft,role) {
 if(!['coach','traceur','driver'].includes(role))throw Error('Choisissez un rôle principal Coach, Traceur ou Conducteur.');
 if(draft.trackingScenario!=='connected_traceur'&&role!=='driver')throw Error('Le Conducteur connecté reste l’utilisateur principal dans ce parcours.');
 const roles={...draft.roles};
 // Exchange the defaults when switching main function; later assignments remain editable.
 if(role!==draft.creatorRole&&roles[role]!=='self'&&roles[draft.creatorRole]==='self')roles[draft.creatorRole]=roles[role];
 roles[role]='self';
 return {...draft,creatorRole:role,roles,session:null};
}
export function canSeeReference(mode,role,coachLays=false) {
 if(!roleTypes.some(r=>r.id===role))return false;
 if(mode==='normal')return true;
 if(mode==='simple_blind')return ['coach','traceur','observer'].includes(role);
 return mode==='full_blind'&&(role==='traceur'||(role==='coach'&&coachLays));
}
export function roleCapabilities(mode,role,coachLays=false) {
 const readReference=canSeeReference(mode,role,coachLays);
 if(role==='observer')return {readReference,prepare:false,edit:false,manage:false,create:false};
 const creator=['coach','traceur','driver'].includes(role);
 return {readReference,prepare:creator&&readReference,edit:creator&&readReference,manage:creator,create:creator};
}
export function preparation(draft) {
 if(draft.traceType==='none')return 'later';
 const coachLays=draft.roles.coach===draft.roles.traceur&&!!draft.roles.coach;
 if(!roleCapabilities(draft.mode,draft.creatorRole,coachLays).prepare)return 'delegated';
 return 'mock';
}
export function setObservers(draft,people) {
 if(!Array.isArray(people)||people.some(id=>!draft.participants.some(p=>p.id===id)))throw Error('Participant inconnu');
 return {...draft,roles:{...draft.roles,observers:[...new Set(people)]},session:null};
}
export function selectPreparation(draft,track) {
 if(!['prepared','gpx'].includes(draft.traceType))throw Error('Cette méthode ne demande pas de préparation.');
 if(preparation(draft)==='delegated')throw Error('Votre visibilité ne permet pas de sélectionner la piste.');
 if(!track?.id||!track.name||(draft.traceType==='gpx'&&track.source!=='gpx'))throw Error('Choisissez un tracé compatible.');
 const {id,name,source,ownerId=null,fileName,start}=track;
 return {...draft,preparationTrack:{id,name,source,ownerId,...(fileName?{fileName}:{}),...(start?{start:structuredClone(start)}:{})},knownPeople:[...new Set([...draft.knownPeople,'self',...(ownerId?[ownerId]:[])])],session:null};
}
export function syncPreparation(draft,items) {
 if(draft.session||draft.traceType!=='prepared'||!draft.preparationTrack)return draft;
 const track=items.find(t=>t.id===draft.preparationTrack.id);
 return {...draft,preparationTrack:track?{...track}:null};
}
export function referenceLabel(draft) {
 const coachLays=!!draft.roles.coach&&draft.roles.coach===draft.roles.traceur;
 if(!canSeeReference(draft.mode,draft.creatorRole,coachLays))return draft.preparationTrack?'Tracé réservé au Traceur':'Choix réservé au Traceur';
 return (draft.traceType==='gpx'?draft.preparationTrack?.fileName:draft.preparationTrack?.name) || draft.preparationTrack?.name || 'À sélectionner';
}
export function validateDraft(draft) {
 const errors=[];
 const add=(code,message)=>errors.push({code,message});
 const scenario=trackingScenarios.find(item=>item.id===draft.trackingScenario);
 if(!scenario)add('scenario_required','Choisissez le parcours de pose.');
 if(scenario?.normalOnly&&draft.mode!=='normal')add('scenario_mode','Ce parcours est disponible uniquement en mode Normal.');
 if(!modes.some(m=>m.id===draft.mode))add('mode_required','Choisissez le mode de session.');
 if(!traceTypes.some(t=>t.id===draft.traceType))add('trace_required','Choisissez le type de tracé.');
 if(!draft.dogs.some(d=>d.id===draft.dogId))add('dog_required','Choisissez votre chien.');
 if(!['coach','traceur','driver'].includes(draft.creatorRole)||draft.roles[draft.creatorRole]!=='self')add('creator_required','Votre rôle principal doit vous être attribué.');
 if(scenario?.id!=='connected_traceur'&&(draft.creatorRole!=='driver'||draft.roles.driver!=='self'))add('driver_scenario_required','Le Conducteur connecté doit être l’utilisateur principal de ce parcours.');
 if(scenario?.id==='self_trace'&&draft.roles.traceur!=='self')add('self_trace_actor','Vous réalisez vous-même la pose et la relève.');
 if(['external_traceur','external_driver_recorded'].includes(scenario?.id)&&draft.roles.traceur)add('external_traceur_member','Un Traceur externe sans application ne peut pas être ajouté comme participant connecté.');
 for(const role of ['driver',...(scenario?.id==='connected_traceur'&&draft.traceType!=='none'?['traceur']:[])])if(!draft.roles[role])add(`${role}_required`,role==='driver'?'Un Conducteur est nécessaire pour le binôme.':'Choisissez un Traceur pour préparer la piste.');
 if(['prepared','gpx'].includes(draft.traceType)&&preparation(draft)!=='delegated'&&!draft.preparationTrack)add('preparation_required','Choisissez le tracé ou le fichier de démonstration dans la préparation.');
 for(const [role,id] of Object.entries(draft.roles).filter(([role])=>role!=='observers'))if(id!==null&&!draft.participants.some(p=>p.id===id))add('participant_invalid','Choisissez un participant proposé.');
 if(draft.trackingScenario==='connected_traceur'&&['simple_blind','full_blind'].includes(draft.mode)&&draft.roles.driver&&draft.roles.driver===draft.roles.traceur)add('driver_knows_trace','En aveugle, Traceur et Conducteur doivent être deux personnes distinctes : connaître la piste ne s’efface pas en changeant de fonction.');
 if(draft.mode==='simple_blind'&&draft.roles.driver&&draft.roles.driver===draft.roles.coach)add('driver_coach_conflict','En simple aveugle, Coach et Conducteur doivent être distincts pour préserver la visibilité de chacun.');
 if(draft.mode==='simple_blind'&&draft.roles.driver&&draft.roles.observers.includes(draft.roles.driver))add('driver_observer_conflict','En simple aveugle, l’Observateur connaît la piste et doit être distinct du Conducteur.');
 if(draft.roles.observers.some(id=>!draft.participants.some(p=>p.id===id)))add('observer_invalid','Choisissez des Observateurs proposés.');
 if(['simple_blind','full_blind'].includes(draft.mode)&&draft.knownPeople.includes(draft.roles.driver))add('driver_knows_selected_track','Ce Conducteur connaît un tracé sélectionné : attribuez la conduite à une autre personne pour conserver l’aveugle.');
 if(draft.mode==='full_blind'&&draft.roles.coach!==draft.roles.traceur&&draft.knownPeople.includes(draft.roles.coach))add('coach_knows_selected_track','Ce Coach connaît le tracé : choisissez un Coach qui ne le connaît pas ou le Coach poseur.');
 return errors;
}
export function goToStep(draft,step) {
 if(!steps(draft).includes(step))throw Error('Étape inconnue');
 return {...draft,step,editing:draft.step==='review'&&step!=='review'};
}
let nextSession=1;
export function createSession(draft) {
 if(draft.session)return draft;
 if(validateDraft(draft).length)throw Error('Veuillez compléter la session avant de la créer.');
 const roles={...draft.roles,observers:[...draft.roles.observers]}, ids=new Set([roles.coach,roles.traceur,roles.driver,...roles.observers].filter(Boolean));
 const number=nextSession++,code=`PC-${number.toString(36).toUpperCase().padStart(4,'0')}`;
 const trackingScenario=draft.trackingScenario||'connected_traceur';
 const session={id:`mock-coaching-${number}`,code,prototype:true,mode:draft.mode,traceType:draft.traceType,creatorRole:draft.creatorRole,scenario:trackingScenario,
  scentActor:trackingScenario==='connected_traceur'?'internal':trackingScenario==='self_trace'?'self':'external',
  layingRecorder:trackingScenario==='external_driver_recorded'?'driver':trackingScenario==='self_trace'?'self':trackingScenario==='external_traceur'?'none':'traceur',
  searchActor:trackingScenario==='self_trace'?'self':'driver',
  preparation:draft.preparationTrack?structuredClone(draft.preparationTrack):null,
  dog:{...draft.dogs.find(d=>d.id===draft.dogId)},roles,participants:draft.participants.filter(p=>ids.has(p.id)).map(p=>({...p}))};
 return {...draft,step:'review',editing:false,session};
}

export function mockInvitation(session) {
 if(!session?.prototype||!session.code)throw Error('Créez d’abord une session mock.');
 return {path:`/new-session?mock-invite=${encodeURIComponent(session.code)}`,text:`Invitation mock PISTE Community · code ${session.code}. Aperçu uniquement, aucune invitation réelle.`};
}

export function draftFromTrack(user,dogs,track) {
 const {id,name,source,ownerId=null,fileName,start}=track;
 if(!id||!name)throw Error('Choisissez un tracé.');
 return {...createDraft(user,dogs),traceType:'prepared',preparationTrack:{id,name,source,ownerId,...(fileName?{fileName}:{}),...(start?{start:structuredClone(start)}:{})},knownPeople:[...new Set(['self',...(ownerId?[ownerId]:[])])]};
}
