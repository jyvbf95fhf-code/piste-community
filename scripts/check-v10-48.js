const fs = require('fs');
const assert = require('assert/strict');
const { execFileSync } = require('child_process');

const read = p => fs.readFileSync(p, 'utf8');
const app = read('app.js');
const html = read('index.html');
// Parse le module complet sans exécuter le code applicatif ni aucun appel réseau.
execFileSync(process.execPath, ['--input-type=module', '--check'], { input: app, stdio: ['pipe', 'inherit', 'inherit'] });
require('./check-v10-48-coaching-member-self-leave');
const baseline = 'd57e83c8a8df7fb46b9a310174abd16bd3fa03d9';

assert.equal(
  execFileSync('git', ['rev-parse', `${baseline}^{}`], { encoding: 'utf8' }).trim(),
  baseline,
  'La baseline V10.48 doit rester d57e83c'
);

function source(name, text = app) {
  const start = text.search(new RegExp(`^(?:async )?function ${name}\\(`, 'm'));
  assert(start >= 0, `Fonction absente: ${name}`);
  const rest = text.slice(start);
  const next = rest.slice(1).search(/\n(?:async )?function /);
  return next < 0 ? rest : rest.slice(0, next + 1);
}

assert(!app.includes('plannerOdorModel={...(draft.odor_model||plannerOdorModel});'), 'Syntaxe navigateur invalide dans restoreCoachingWizardDraftForSave');

function functionOnly(name, text = app) {
  const start = text.search(new RegExp(`^(?:async )?function ${name}\\(`, 'm'));
  assert(start >= 0, `Fonction absente: ${name}`);
  const open = text.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    if (text[i] === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  assert.fail(`Fonction incomplète: ${name}`);
}

const old = execFileSync('git', ['show', `${baseline}:app.js`], { encoding: 'utf8' });
const protectedFunctions = [
  'coachingMemberCapabilities',
  'validateCoachingMembers',
  'coachingExpectedActionV10423',
  'coachingPhase',
  'coachingTransitionV1040',
  'startCoachingLaying',
  'markCoachingTrackReady',
  'chooseCoachingSearchV1045',
  'markTraceurInPlaceV1045',
  'finishDriverRun',
  'finishCoachingSessionV1040',
  'coachingDataVisibility',
  'coachingCanSeeLiveOwner',
  'coachingDriverTrail',
  'coachingCanPrepareRouteV1045',
  'coachingWithoutPreparedRouteV1045',
  'chooseCoachingSearchV1045',
  'coachingTimingV1045',
  'openCoachingSession',
  'clearCoachingRealtime',
  'sendCoachingMessage',
  'loadCoachingMessages'
];

for (const name of protectedFunctions) {
  assert.equal(source(name), source(name, old), `${name}: moteur Coaching modifié`);
}

const createHarness = `(async()=>{
  let coachingCreateInFlight=false, valid=false, rpcCalls=0;
  const events=[], messages=[], members=[{user_id:'friend-1',role:'observer'}];
  let rpcName=null,rpcPayload=null;
  const button={disabled:false};
  const fields={coachingRouteSelect:{value:'route-1'},createCoachingSession:button,coachingVisibility:{value:'full_blind'}};
  const route={id:'route-1',route:[[1,2],[3,4]]};
  const $=id=>fields[id]||null;
  const trainingRoutes=[route];
  const coachingCreationMembers=()=>members;
  const coachingWithoutPreparedRouteV1045=()=>false;
  const validateCoachingConfigurationV10423=()=>valid?{ok:true}:{ok:false,message:'configuration invalide'};
  const setUiText=(id,text)=>messages.push([id,text]);
  const supabase={rpc:async(name,payload)=>{events.push('rpc');rpcCalls++;rpcName=name;rpcPayload=payload;return {data:{id:'session-1'},error:null}}};
  const loadCoachingHub=async()=>events.push('load');
  const openCoachingSession=async id=>events.push(['open',id]);
  const renderCoachingFriendInvites=()=>events.push('render');
  const markCoachingSyncV10423=()=>events.push('sync');
  ${source('createCoaching')}
  await createCoaching();
  if(rpcCalls!==0||messages[0][1]!=='configuration invalide')throw new Error('validation doit bloquer le RPC');
  valid=true;events.length=0;messages.length=0;
  await createCoaching();
  if(rpcCalls!==1)throw new Error('un seul RPC de création attendu');
  if(rpcName!=='create_coaching_people_session_v1045')throw new Error('nom RPC de création incorrect: '+rpcName);
  if(JSON.stringify(rpcPayload)!==JSON.stringify({p_route_id:'route-1',p_members:members,p_blind_mode:'full_blind'}))throw new Error('payload RPC de création incorrect: '+JSON.stringify(rpcPayload));
  if(events.join('|')!=='rpc|load|open,session-1|render|sync')throw new Error('ordre historique createCoaching modifié: '+events.join('|'));
  if(button.disabled)throw new Error('bouton création laissé désactivé');
  if(!events.includes('rpc'))throw new Error('RPC absent');
  return true;
})().catch(error=>{console.error(error.message);process.exit(1)})`;
execFileSync(process.execPath,['-e',createHarness],{stdio:'inherit'});
assert(!source('createCoaching').includes('p_search_mode'), 'createCoaching ne doit pas envoyer p_search_mode');

if (process.argv.includes('--case=release')) {
  const sw = read('sw.js');
  assert.equal(app.match(/const APP_VERSION='([^']+)'/)?.[1], '10.48', 'APP_VERSION doit être 10.48');
  assert(app.includes("{version:'10.48',date:'13/09/2026'"), 'Release note V10.48 absente');
  assert(app.includes('Préparation Coaching guidée en 6 étapes, avec choix de recherche après la pose.'), 'Texte de release note incorrect');
  assert(html.includes('./app.js?v=1048-1'), 'Référence app.js V10.48 absente');
  assert(html.includes('./v2.css?v=2084'), 'Référence v2.css V10.48 absente');
  assert.match(sw, /const C='piste-community-v2123';/, 'Cache V10.48 absent');
  assert(sw.includes("'./app.js?v=1048-1'"), 'app.js V10.48 absent du précache');
  assert(sw.includes("'./v2.css?v=2084'"), 'v2.css V10.48 absent du précache');
  require('./verify-current-assets')();
  console.log('V10.48 release checks: OK');
  process.exit(0);
}

if (process.argv.includes('--case=state') || !process.argv.some(arg => arg.startsWith('--case='))) {
  for (const name of ['newCoachingWizard', 'resetCoachingWizard', 'changeCoachingWizard', 'validCoachingWizard']) {
    assert(source(name), `Fonction d'état absente: ${name}`);
  }
  const stateHarness = `(function(){
    let coachingWizard;
    const activeCoachingSession={id:'active-session'};
    const coachingFriendInvites=[{user_id:'legacy-friend',role:'observer'}];
    const fields={coachingCreatorRole:{value:''},coachingVisibility:{value:''}};
    const $=id=>fields[id]||null;
    const coachingCanPrepareRouteV1045=()=>!($('coachingVisibility').value==='full_blind'&&['coach','driver'].includes($('coachingCreatorRole').value));
    const validateCoachingMembers=members=>members.some(member=>!member.user_id)||new Set(members.map(member=>member.user_id)).size!==members.length||!['coach','driver','traceur'].includes(members[0]?.role)||members.filter(member=>member.role==='driver').length!==1||members.filter(member=>member.role==='traceur').length!==1||members.filter(member=>member.role==='coach').length>1?{ok:false}:{ok:true};
    ${source('newCoachingWizard').replace(/\nlet coachingWizard=newCoachingWizard\(\);/, '')}
    ${source('resetCoachingWizard')}
    ${source('coachingWizardMembers')}
    ${source('validCoachingWizardParticipants')}
    ${source('changeCoachingWizard')}
    ${source('validCoachingWizard')}
    coachingWizard=newCoachingWizard();
    if(coachingWizard.currentStep!==1||coachingWizard.mode!==null||coachingWizard.creatorRole!==null||coachingWizard.participants.length||coachingWizard.trackPreparation.method!==null||coachingWizard.busy||coachingWizard.error!==null)throw new Error('état neuf incorrect');
    const participants=[{user_id:'traceur-1',role:'traceur'},{user_id:'driver-1',role:'driver'}];
    changeCoachingWizard({mode:'normal',creatorRole:'coach',participants});
    if(coachingWizard.mode!=='normal'||coachingWizard.creatorRole!=='coach'||coachingWizard.participants!==participants)throw new Error('change ne conserve pas les choix valides');
    const traceurParticipants=[{user_id:'driver-1',role:'driver'},{user_id:'coach-1',role:'coach'}];
    changeCoachingWizard({creatorRole:'traceur',participants:traceurParticipants});
    if(coachingWizard.creatorRole!=='traceur'||coachingWizard.participants!==traceurParticipants)throw new Error('créateur Traceur refusé');
    changeCoachingWizard({trackPreparation:{method:'existing',routeId:'route-1',origin:'existing'}});
    if(!validCoachingWizard().ok)throw new Error('état valide du créateur Traceur refusé');
    const driverParticipants=[{user_id:'traceur-1',role:'traceur'},{user_id:'coach-1',role:'coach'}];
    changeCoachingWizard({creatorRole:'driver',participants:driverParticipants});
    if(coachingWizard.creatorRole!=='driver'||coachingWizard.participants!==driverParticipants)throw new Error('créateur Conducteur refusé');
    if(!validCoachingWizard().ok)throw new Error('état valide du créateur Conducteur refusé');
    changeCoachingWizard({creatorRole:'coach',participants});
    changeCoachingWizard({mode:'full_blind',trackPreparation:{method:'existing',routeId:'route-1',origin:'existing'}});
    if(coachingWizard.trackPreparation.routeId!==null||coachingWizard.trackPreparation.origin!==null)throw new Error('route interdite non invalidée');
    if(coachingFriendInvites.length!==1||activeCoachingSession.id!=='active-session')throw new Error('globals runtime modifiés');
    changeCoachingWizard({trackPreparation:{draft:{name:'edited'}}});
    if(coachingWizard.trackPreparation.routeId!==null)throw new Error('route sauvegardée non invalidée après édition');
    resetCoachingWizard();
    if(coachingWizard.currentStep!==1||coachingWizard.participants.length||coachingWizard.trackPreparation.draft!==null)throw new Error('reset incomplet');
    if(coachingFriendInvites.length!==1||activeCoachingSession.id!=='active-session')throw new Error('reset a modifié des globals runtime');
    return true;
  })()`;
  execFileSync(process.execPath,['-e',stateHarness],{stdio:'inherit'});
}

if (process.argv.includes('--case=choices') || !process.argv.some(arg => arg.startsWith('--case='))) {
  const choiceHarness = `(function(){
    let coachingWizard;
    const fields={coachingCreatorRole:{value:''},coachingVisibility:{value:''}};
    const $=id=>fields[id]||null;
    const session={user:{id:'creator-1'}};
    const validateCoachingMembers=members=>members.some(member=>!member.user_id||member.role==='observer')?{ok:false,message:'créateur invalide'}:{ok:true};
    const coachingCanPrepareRouteV1045=()=>true;
    ${source('newCoachingWizard').replace(/\nlet coachingWizard=newCoachingWizard\(\);/, '')}
    ${source('resetCoachingWizard')}
    ${source('coachingWizardMembers')}
    ${source('validCoachingWizardParticipants')}
    ${source('changeCoachingWizard')}
    ${source('validCoachingWizard')}
    ${source('validCoachingWizardStep')}
    coachingWizard=newCoachingWizard();
    if(coachingWizard.mode!==null||coachingWizard.creatorRole!==null)throw new Error('les choix du wizard doivent être vides par défaut');
    for(const mode of ['normal','simple_blind','full_blind']) for(const creatorRole of ['coach','traceur','driver']){
      coachingWizard.reset();
      coachingWizard.change({mode,creatorRole,participants:[]});
      if(coachingWizard.mode!==mode||coachingWizard.creatorRole!==creatorRole)throw new Error('choix non conservé: '+mode+'/'+creatorRole);
      if(!validCoachingWizardStep(1).ok||!validCoachingWizardStep(2).ok||!validCoachingWizardStep(3).ok)throw new Error('choix valide refusé');
    }
    coachingWizard.reset();
    coachingWizard.change({creatorRole:'observer'});
    if(coachingWizard.creatorRole==='observer')throw new Error('un observateur ne peut pas être créateur');
    coachingWizard.change({});
    if(validCoachingWizardStep(1).ok||validCoachingWizardStep(2).ok)throw new Error('champ manquant accepté');
    const wizardFunctions=['newCoachingWizard','changeCoachingWizard','validCoachingWizard','validCoachingWizardStep','renderCoachingWizard','nextCoachingWizard','backCoachingWizard','leaveCoachingWizard'];
    for(const name of wizardFunctions){
      const wizardText=(${JSON.stringify(['newCoachingWizard','changeCoachingWizard','validCoachingWizard','validCoachingWizardStep','renderCoachingWizard','nextCoachingWizard','backCoachingWizard','leaveCoachingWizard'].map(name=>source(name)).join('\n'))});
      if(wizardText.includes('chooseCoachingSearchV1045')||wizardText.includes('p_search_mode'))throw new Error(name+' ne doit pas appeler la décision Traceur ni envoyer p_search_mode');
    }
    return true;
  })()`;
  execFileSync(process.execPath,['-e',choiceHarness],{stdio:'inherit'});
  assert(!html.includes('id="coachingWizardSessionType"'), 'Ancien choix du type de session encore présent');
  assert(html.includes('id="coachingWizardMode"'), 'Choix du mode absent');
  assert(html.includes('id="coachingWizardCreatorRole"'), 'Choix du rôle absent');
  assert(!html.includes('Intention — à confirmer par le Traceur après la pose'), 'Ancienne intention encore affichée dans le récapitulatif');
  for (const name of ['newCoachingWizard','changeCoachingWizard','validCoachingWizard','validCoachingWizardStep','renderCoachingWizard','nextCoachingWizard','backCoachingWizard','leaveCoachingWizard']) {
    assert(!source(name).includes('chooseCoachingSearchV1045'), `${name} ne doit pas appeler chooseCoachingSearchV1045`);
    assert(!source(name).includes('p_search_mode'), `${name} ne doit pas envoyer p_search_mode`);
  }
  const wizardWiring = app.match(/\$\('coachingWizardMode'\)[\s\S]*?\$\('coachingWizardCreatorRole'\)[^\n]*/)?.[0] || '';
  assert(wizardWiring && !wizardWiring.includes('chooseCoachingSearchV1045') && !wizardWiring.includes('p_search_mode'), 'Le câblage du wizard ne doit pas appeler la décision Traceur ni envoyer p_search_mode');
}

if (process.argv.includes('--case=participants') || !process.argv.some(arg => arg.startsWith('--case='))) {
  const participantFunctions = [
    'coachingWizardMembers',
    'validCoachingWizardParticipants',
    'coachingWizardAvailableFriends',
    'coachingWizardAvailableRoles',
    'addCoachingWizardParticipant',
    'removeCoachingWizardParticipant',
    'updateCoachingWizardParticipantHint'
  ];
  participantFunctions.forEach(name => source(name));
  const participantHarness = `(function(){
    const fields={coachingCreatorRole:{value:''},coachingVisibility:{value:''},coachingWizardParticipantFriend:{value:''},coachingWizardParticipantRole:{value:''},coachingWizardParticipantHint:{textContent:''}};
    const $=id=>fields[id]||null;
    const session={user:{id:'creator-1'}};
    const coachingAcceptedFriends=[
      {user_id:'traceur-1',display_name:'Traceur'},
      {user_id:'driver-1',display_name:'Conducteur'},
      {user_id:'coach-1',display_name:'Coach'},
      {user_id:'observer-1',display_name:'Observateur'},
      {user_id:'observer-2',display_name:'Observateur 2'}
    ];
    const coachingFriendInvites=[{user_id:'legacy-friend',role:'observer'}];
    const coachingCanPrepareRouteV1045=()=>true;
    const renderCoachingWizard=()=>{};
    ${functionOnly('validateCoachingMembers')}
    ${source('newCoachingWizard').replace(/\nlet coachingWizard=newCoachingWizard\(\);/, '')}
    let coachingWizard=newCoachingWizard();
    ${source('resetCoachingWizard')}
    ${source('coachingWizardMembers')}
    ${source('validCoachingWizardParticipants')}
    ${source('coachingWizardAvailableFriends')}
    ${source('coachingWizardAvailableRoles')}
    ${source('addCoachingWizardParticipant')}
    ${source('removeCoachingWizardParticipant')}
    ${source('updateCoachingWizardParticipantHint')}
    ${source('changeCoachingWizard')}
    ${source('validCoachingWizardStep')}

    coachingWizard.change({mode:'normal',creatorRole:'coach'});
    fields.coachingWizardParticipantFriend.value='driver-1';
    fields.coachingWizardParticipantRole.value='driver';
    updateCoachingWizardParticipantHint();
    if(!fields.coachingWizardParticipantHint.textContent.includes('Ajoutez ce participant avec +'))throw new Error('la sélection non ajoutée doit expliquer l’usage de +');
    if(coachingWizard.participants.length!==0)throw new Error('une sélection seule ne doit pas modifier les participants');
    fields.coachingWizardParticipantFriend.value='';
    fields.coachingWizardParticipantRole.value='';
    updateCoachingWizardParticipantHint();
    if(fields.coachingWizardParticipantHint.textContent!=='')throw new Error('le message de sélection doit disparaître après reset');
    if(!addCoachingWizardParticipant('traceur-1','traceur'))throw new Error('le premier membre intermédiaire valide doit être accepté');
    if(coachingWizard.participants.length!==1||validCoachingWizardStep(3).ok)throw new Error('le premier membre ne doit pas être confondu avec une équipe complète');
    if(coachingWizardAvailableFriends().some(friend=>friend.user_id==='traceur-1'))throw new Error('une personne déjà utilisée reste proposée');
    const rolesAfterTraceur=coachingWizardAvailableRoles();
    if(rolesAfterTraceur.includes('coach')||rolesAfterTraceur.includes('traceur')||!rolesAfterTraceur.includes('driver')||!rolesAfterTraceur.includes('observer'))throw new Error('les rôles occupés ne sont pas filtrés');
    if(!addCoachingWizardParticipant('driver-1','driver')||!validCoachingWizardStep(3).ok)throw new Error('équipe Coach complète refusée');
    if(!addCoachingWizardParticipant('observer-1','observer')||!validCoachingWizardStep(3).ok)throw new Error('observateur facultatif refusé');
    if(addCoachingWizardParticipant('driver-1','observer')||addCoachingWizardParticipant('observer-2','driver'))throw new Error('doublon de personne ou de rôle accepté');
    if(coachingFriendInvites.length!==1||coachingFriendInvites[0].user_id!=='legacy-friend')throw new Error('participants synchronisés avant submit vers p_members');

    const validTeams={
      coach:[{user_id:'traceur-1',role:'traceur'},{user_id:'driver-1',role:'driver'}],
      traceur:[{user_id:'driver-1',role:'driver'}],
      driver:[{user_id:'traceur-1',role:'traceur'}]
    };
    for(const mode of ['normal','simple_blind','full_blind'])for(const creatorRole of ['coach','traceur','driver']){
      coachingWizard.change({mode,creatorRole});
      coachingWizard.participants=validTeams[creatorRole].map(member=>({...member}));
      if(!validCoachingWizardStep(3).ok)throw new Error('équipe valide refusée pour '+mode+'/'+creatorRole);
      coachingWizard.participants=[...validTeams[creatorRole],{user_id:'observer-1',role:'observer'}];
      if(!validCoachingWizardStep(3).ok)throw new Error('observateur refusé pour '+mode+'/'+creatorRole);
      if(creatorRole!=='coach'){
        coachingWizard.participants=[...validTeams[creatorRole],{user_id:'coach-1',role:'coach'}];
        if(!validCoachingWizardStep(3).ok)throw new Error('Coach optionnel refusé pour '+creatorRole);
      }
    }
    coachingWizard.change({mode:'full_blind',creatorRole:'coach'});
    coachingWizard.participants=[{user_id:'traceur-1',role:'traceur'},{user_id:'driver-1',role:'driver'}];
    if(!validCoachingWizardStep(3).ok)throw new Error('Coach double aveugle doit pouvoir inviter Traceur et Conducteur');

    const invalidTeams=[
      [{user_id:'same',role:'traceur'},{user_id:'same',role:'driver'}],
      [{user_id:'traceur-1',role:'traceur'},{user_id:'driver-1',role:'driver'},{user_id:'coach-1',role:'coach'}],
      [{user_id:'traceur-1',role:'traceur'}],
      [{user_id:'driver-1',role:'driver'}]
    ];
    coachingWizard.creatorRole='coach';
    for(const participants of invalidTeams){coachingWizard.participants=participants;if(validCoachingWizardStep(3).ok)throw new Error('équipe invalide acceptée: '+JSON.stringify(participants))}

    coachingWizard.creatorRole='coach';
    coachingWizard.participants=[{user_id:'traceur-1',role:'traceur'},{user_id:'driver-1',role:'driver'},{user_id:'observer-1',role:'observer'}];
    coachingWizard.change({creatorRole:'traceur'});
    if(JSON.stringify(coachingWizard.participants)!==JSON.stringify([{user_id:'driver-1',role:'driver'},{user_id:'observer-1',role:'observer'}]))throw new Error('changement de créateur retire autre chose que les conflits');
    return true;
  })()`;
  execFileSync(process.execPath,['-e',participantHarness],{stdio:'inherit'});
  const asyncFriendsHarness = `(async()=>{
    const session={user:{id:'creator-1'}};
    let coachingShortcutValidated=false,verifiedActiveCoachingSession=null,coachingDebriefs=[],trainingRoutes=[],coachingAcceptedFriends=[],coachingSessions=[],activeCoachingSession=null;
    const coachingWizard={active:true};
    let wizardRenders=0,renderedFriend=null;
    const $=()=>null,esc=value=>String(value),fmt=value=>String(value);
    const updateHomeCoachingState=()=>{},refreshActiveSessionShortcut=()=>{},loadTrainingRoutes=async()=>{},renderCoachingFriendInvites=()=>{};
    const renderCoachingWizardParticipants=()=>{wizardRenders++;renderedFriend=coachingAcceptedFriends[0]?.user_id||null};
    const readActiveCoachingRef=()=>null,clearActiveCoachingRef=()=>{},saveActiveCoachingRef=()=>{},renderCoachingSessions=()=>{};
    const supabase={
      rpc:async name=>name==='get_friends'?{data:[{user_id:'friend-1',display_name:'Ami',status:'accepted'},{user_id:'pending-1',status:'pending'}]}:{data:[],error:null},
      from:()=>({select:()=>({eq:async()=>({data:[],error:null})})})
    };
    ${functionOnly('loadCoachingHub')}
    await loadCoachingHub();
    if(wizardRenders!==1||renderedFriend!=='friend-1')throw new Error('le wizard actif ne reçoit pas les amis chargés');
    coachingWizard.active=false;
    await loadCoachingHub();
    if(wizardRenders!==1)throw new Error('le wizard inactif ne doit pas être rendu par le chargement');
    return true;
  })().catch(error=>{console.error(error.message);process.exit(1)})`;
  execFileSync(process.execPath,['-e',asyncFriendsHarness],{stdio:'inherit'});
  for(const id of ['coachingWizardParticipantFriend','coachingWizardParticipantRole','addCoachingWizardParticipant','coachingWizardParticipants'])assert(html.includes(`id="${id}"`), `Contrôle participant absent: ${id}`);
  assert(html.includes('id="coachingWizardParticipantHint"'), 'Message d’aide participant absent');
}

if (process.argv.includes('--case=track') || !process.argv.some(arg => arg.startsWith('--case='))) {
  const trackFunctions = [
    'withCoachingWizardControls',
    'coachingWizardCanPrepareTrack',
    'selectCoachingWizardRoute',
    'openCoachingWizardRoute',
    'plannerSourceForInit',
    'useCoachingWizardPreparation',
    'restoreCoachingWizardPlanner',
    'runPlannerSave',
    'renderCoachingWizardTrackPreparation'
  ];
  trackFunctions.forEach(name => source(name));

  const trackHarness = `(async()=>{
    const calls=[],messages=[];
    function element(value=''){const classes=new Set();return {value,textContent:'',innerHTML:'',disabled:false,hidden:false,classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),toggle:(name,on)=>on?classes.add(name):classes.delete(name),contains:name=>classes.has(name)}}}
    const fields={
      coachingCreatorRole:element('legacy-role'),coachingVisibility:element('legacy-mode'),coachingRouteSelect:element('legacy-route'),
      coachingWizardExistingRoute:element(''),coachingWizardTrackInfo:element(''),coachingWizardTrackOptions:element(''),
      routeName:element('Ancienne préparation'),plannerMsg:element(''),gpxImportStatus:element(''),gpxFileInput:element(''),
      clearImportedGpxBtn:element(''),saveTrainingRoute:element(''),updateTrainingRoute:element(''),saveAndStartRoute:element(''),
      chooseGpxBtn:{...element(''),click:()=>calls.push('choose-gpx')}
    };
    const $=id=>fields[id]||null;
    const setUiText=(id,value)=>{const node=$(id);if(node)node.textContent=value;return node};
    const session={user:{id:'creator-1'}};
    const trainingRoutes=[{id:'route-1',name:'Piste existante',route:[{lat:48.1,lon:7.1},{lat:48.2,lon:7.2}],waypoints:[]}];
    const validateCoachingMembers=()=>({ok:true});
    const coachingCanPrepareRouteV1045=()=>['coach','driver','traceur'].includes(fields.coachingCreatorRole.value)&&['normal','simple_blind','full_blind'].includes(fields.coachingVisibility.value)&&!(fields.coachingVisibility.value==='full_blind'&&['coach','driver'].includes(fields.coachingCreatorRole.value));
    const renderCoachingWizard=()=>{};
    const showPage=id=>calls.push(['page',id]);
    const setCoachingEntryView=target=>calls.push(['entry-view',target]);
    const openCoachingRouteV1045=mode=>{calls.push(['open-route',mode,fields.coachingCreatorRole.value,fields.coachingVisibility.value]);openTerrainPlanner('coaching');if(mode==='import')fields.chooseGpxBtn.click();return true};
    const openTerrainPlanner=target=>calls.push(['planner',target]);
    const setPlannerRoutingMode=mode=>{plannerRoutingMode=mode;calls.push(['routing',mode])};
    const redrawPlanner=()=>calls.push('redraw');
    const readOdorForm=()=>({enabled:true,source:'manual'});
    const setOdorForm=()=>{};
    const plannerDistance=()=>1;
    const confirm=()=>true;
    const window={editingTrainingRouteId:'old-id'};
    let saveCalls=0;
    const savePlanner=()=>{saveCalls++;return true};
    let plannerPoints=[{lat:1,lon:1}],plannerWaypoints=[{id:'old'}],plannerRedoStack=[{lat:9,lon:9}],plannerTool='note',plannerRoutingMode='street',plannerImportedGpx=false;
    let plannerOdorModel={enabled:false,source:'old'},plannerWizardContext=null;
    const readPlannerDraft=()=>{throw new Error('le brouillon général ne doit pas écraser le wizard')};
    ${source('newCoachingWizard').replace(/\nlet coachingWizard=newCoachingWizard\(\);/, '')}
    let coachingWizard=newCoachingWizard();
    ${source('coachingWizardMembers')}
    ${source('validCoachingWizardParticipants')}
    ${source('changeCoachingWizard')}
    ${source('validCoachingWizard')}
    ${source('validCoachingWizardStep')}
    ${source('withCoachingWizardControls')}
    ${source('coachingWizardCanPrepareTrack')}
    ${source('selectCoachingWizardRoute')}
    ${source('snapshotCoachingWizardPlanner')}
    ${source('restoreCoachingWizardPlanner')}
    ${source('openCoachingWizardRoute')}
    ${source('plannerSourceForInit')}
    ${source('useCoachingWizardPreparation')}
    ${source('runPlannerSave')}

    coachingWizard.change({mode:'normal',creatorRole:'coach',participants:[{user_id:'traceur-1',role:'traceur'},{user_id:'driver-1',role:'driver'}]});
    if(!selectCoachingWizardRoute('route-1'))throw new Error('piste enregistrée valide refusée');
    if(coachingWizard.trackPreparation.method!=='existing'||coachingWizard.trackPreparation.routeId!=='route-1'||coachingWizard.trackPreparation.origin!=='existing'||fields.coachingRouteSelect.value!=='route-1')throw new Error('sélection enregistrée non mémorisée');
    if(selectCoachingWizardRoute('missing'))throw new Error('identifiant de piste inconnu accepté');
    if(saveCalls!==0)throw new Error('la sélection enregistrée a déclenché une sauvegarde');

    coachingWizard.change({trackPreparation:{method:'existing',routeId:'route-1',origin:'existing'}});
    coachingWizard.change({mode:'full_blind'});
    if(coachingWizard.trackPreparation.method!=='none'||coachingWizard.trackPreparation.routeId!==null||coachingWizard.trackPreparation.draft!==null||coachingWizard.trackPreparation.origin!==null)throw new Error('Coach double aveugle conserve une ancienne piste');
    if(!validCoachingWizardStep(5).ok)throw new Error('absence de piste double aveugle refusée');
    coachingWizard.change({creatorRole:'driver',trackPreparation:{method:'existing',routeId:'route-1',origin:'existing'}});
    coachingWizard.change({mode:'simple_blind'});coachingWizard.change({mode:'full_blind'});
    if(coachingWizard.trackPreparation.method!=='none'||coachingWizard.trackPreparation.routeId!==null)throw new Error('Conducteur double aveugle conserve une ancienne piste');

    coachingWizard.change({mode:'normal',creatorRole:'coach'});
    fields.coachingCreatorRole.value='legacy-role';fields.coachingVisibility.value='legacy-mode';
    if(!openCoachingWizardRoute('draw'))throw new Error('ouverture dessin refusée');
    const openCall=calls.find(call=>Array.isArray(call)&&call[0]==='open-route');
    if(!openCall||openCall[2]!=='coach'||openCall[3]!=='normal')throw new Error('rôle/mode non synchronisés pendant openCoachingRouteV1045');
    if(fields.coachingCreatorRole.value!=='legacy-role'||fields.coachingVisibility.value!=='legacy-mode')throw new Error('contrôles historiques non restaurés');
    if(!plannerWizardContext||plannerWizardContext.method!=='draw')throw new Error('contexte planner wizard absent');
    plannerPoints=[{lat:48.1,lon:7.1},{lat:48.2,lon:7.2}];plannerWaypoints=[{id:'new'}];plannerRoutingMode='free';fields.routeName.value='Piste dessinée';
    if(!useCoachingWizardPreparation())throw new Error('dessin local valide refusé');
    const drawn=coachingWizard.trackPreparation.draft;
    if(!drawn||drawn.name!=='Piste dessinée'||drawn.route.length!==2||drawn.waypoints.length!==1||drawn.routing_mode!=='free'||coachingWizard.trackPreparation.method!=='draw')throw new Error('dessin non copié dans le brouillon wizard');
    if(saveCalls!==0)throw new Error('le dessin local a appelé savePlanner');
    if(plannerPoints.length!==1||plannerPoints[0].lat!==1||plannerWaypoints[0].id!=='old'||plannerRoutingMode!=='street'||fields.routeName.value!=='Ancienne préparation')throw new Error('état planner antérieur non restauré');

    if(!openCoachingWizardRoute('draw'))throw new Error('réouverture dessin refusée');
    const reopened=plannerSourceForInit(null);
    if(!reopened||reopened.name!=='Piste dessinée'||reopened.route.length!==2)throw new Error('init différé écrase le brouillon wizard');
    const reopenedFromAdvancedDraft=plannerSourceForInit({name:'Brouillon général',route:[{lat:0,lon:0}]});
    if(!reopenedFromAdvancedDraft||reopenedFromAdvancedDraft.name!=='Piste dessinée'||reopenedFromAdvancedDraft.route.length!==2)throw new Error('le raccourci brouillon général écrase le brouillon wizard');
    plannerPoints=[];plannerWaypoints=[];fields.routeName.value='';restoreCoachingWizardPlanner();

    if(!openCoachingWizardRoute('import'))throw new Error('ouverture import refusée');
    let parsedKind='valid';
    const parseGpx=text=>{if(text==='bad-xml')throw new Error('Le fichier GPX est illisible ou endommagé.');if(text==='one-point')throw new Error('Aucune trace exploitable : au moins deux points sont nécessaires.');return {points:[{lat:47.1,lon:6.1},{lat:47.2,lon:6.2}],waypoints:[],name:'Import GPX',originalCount:2,reduced:false}};
    ${source('importPlannerGpx')}
    await importPlannerGpx({size:1024,text:async()=>parsedKind});
    if(!useCoachingWizardPreparation()||coachingWizard.trackPreparation.method!=='import'||coachingWizard.trackPreparation.draft.route.length!==2)throw new Error('GPX valide non conservé localement');
    if(saveCalls!==0)throw new Error('import GPX a appelé savePlanner');
    const previousDraft=JSON.stringify(coachingWizard.trackPreparation.draft);
    await importPlannerGpx({size:10*1024*1024+1,text:async()=>{throw new Error('lecture interdite')}});
    if(!fields.gpxImportStatus.textContent.includes('10 Mo')||JSON.stringify(coachingWizard.trackPreparation.draft)!==previousDraft)throw new Error('fichier GPX trop volumineux non bloqué');
    parsedKind='bad-xml';await importPlannerGpx({size:100,text:async()=>parsedKind});
    if(!fields.gpxImportStatus.textContent.includes('illisible')||JSON.stringify(coachingWizard.trackPreparation.draft)!==previousDraft)throw new Error('XML incorrect non bloqué');
    parsedKind='one-point';await importPlannerGpx({size:100,text:async()=>parsedKind});
    if(!fields.gpxImportStatus.textContent.includes('deux points')||JSON.stringify(coachingWizard.trackPreparation.draft)!==previousDraft)throw new Error('GPX à une position non bloqué');

    plannerWizardContext={method:'draw',snapshot:{}};
    if(runPlannerSave('copy')!==false||runPlannerSave('update')!==false||runPlannerSave('copy','start')!==false||saveCalls!==0)throw new Error('un bouton planner peut sauvegarder dans le contexte wizard');
    plannerWizardContext=null;await runPlannerSave('copy');
    if(saveCalls!==1)throw new Error('sauvegarde planner historique bloquée hors wizard');
    return true;
  })().catch(error=>{console.error(error.message);process.exit(1)})`;
  execFileSync(process.execPath,['-e',trackHarness],{stdio:'inherit'});

  for (const id of ['coachingWizardTrackOptions','coachingWizardDrawRoute','coachingWizardImportRoute','coachingWizardExistingRoute','coachingWizardTrackInfo','useCoachingWizardPreparation']) {
    assert(html.includes(`id="${id}"`), `Contrôle de préparation absent: ${id}`);
  }
  assert(html.includes('Utiliser cette préparation'), 'Action locale du planner absente');
  assert(source('initPlanner').includes('plannerSourceForInit(route)'), 'initPlanner doit préférer le brouillon du wizard');
  assert(source('savePlannerDraft').includes('plannerWizardContext'), 'Le planner wizard ne doit pas écrire le brouillon général');
  assert(source('persistPlannerDraft').includes('plannerWizardContext'), 'La persistance locale générale doit être bloquée dans le wizard');
  assert(source('clearPlannerDraft').includes('plannerWizardContext'), 'Le planner wizard ne doit pas supprimer le brouillon général');
  const saveWiring=app.match(/\$\('saveTrainingRoute'\)\.onclick[^\n]+/)?.[0]||'';
  assert(saveWiring.includes('runPlannerSave')&&!saveWiring.includes('=>savePlanner('), 'Les boutons du planner doivent respecter la frontière wizard');
}

if (process.argv.includes('--case=shell') || !process.argv.some(arg => arg.startsWith('--case='))) {
  const stepTitles = [
    'Mode',
    'Ton rôle',
    'Participants',
    'Préparation de la piste',
    'Invitations',
    'Récapitulatif'
  ];
  const wizardPanel = html.match(/    <div id="coachingWizardPanel"[\s\S]*?<\/div>\n    <div class="record-head">/);
  assert(wizardPanel, 'Shell du wizard introuvable');
  assert.equal((wizardPanel[0].match(/data-coaching-wizard-step="[1-6]"/g) || []).length, 6, 'Le wizard doit afficher six étapes');
  for (const title of stepTitles) assert(wizardPanel[0].includes(`>${title}<`), `Titre d'étape absent: ${title}`);
  assert(wizardPanel[0].includes('Étape 1 sur 6'), 'Progression initiale absente');
  assert(wizardPanel[0].includes('id="coachingWizardBack"'), 'Retour du wizard absent');
  assert(wizardPanel[0].includes('id="coachingWizardNext"'), 'Suivant du wizard absent');

  for (const name of ['renderCoachingWizard', 'validCoachingWizardStep', 'nextCoachingWizard', 'backCoachingWizard', 'leaveCoachingWizard']) {
    source(name);
  }

  const shellHarness = `(function(){
    let stepValid=false,confirmResult=true;
    const calls=[];
    function element(hidden=false){const classes=new Set(hidden?['hidden']:[]);return {hidden,textContent:'',disabled:false,dataset:{},style:{},tabIndex:0,classList:{toggle:(name,on)=>on?classes.add(name):classes.delete(name),add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name)},setAttribute:(name,value)=>{if(name==='aria-valuenow')this.ariaValueNow=value},focus:()=>calls.push('focus'),scrollIntoView:()=>{}}}
    const fields={
      coachingWizardPanel:element(true),coachingWizardProgressText:element(),coachingWizardProgressBar:element(),
      coachingWizardBack:element(),coachingWizardNext:element(),coachingWizardSubmit:element(true),coachingWizardError:element(),
      coachingPage:element(),coachingEntryBack:element(),coachingPrepareStage:element(),coachingSessionsCard:element(),
      coachingCreatorRole:element(),coachingInviteInput:element()
    };
    const createBlock=element(),joinBlock=element();
    fields.coachingCreatorRole.closest=()=>createBlock;fields.coachingInviteInput.closest=()=>joinBlock;
    fields.coachingPage.classList.add('active');
    const steps=Array.from({length:6},(_,index)=>{const node=element();node.dataset.coachingWizardStep=String(index+1);return node});
    const $=id=>fields[id]||null;
    const setUiText=(id,value)=>{const node=$(id);if(node)node.textContent=value;return node};
    const document={querySelectorAll:selector=>selector==='[data-coaching-wizard-step]'?steps:[]};
    const requestAnimationFrame=callback=>callback();
    const setTimeout=callback=>callback();
    const confirm=()=>confirmResult;
    const showPage=id=>{calls.push(['page',id]);fields.coachingPage.classList.toggle('active',id==='coachingPage')};
    const setCoachingStage=stage=>calls.push(['stage',stage]);
    const validateCoachingMembers=()=>({ok:stepValid});
    const session={user:{id:'creator-1'}};
    const coachingCanPrepareRouteV1045=()=>true;
    const renderCoachingWizardParticipants=()=>{};
    const renderCoachingWizardInvitations=()=>{};
    ${source('newCoachingWizard').replace(/\nlet coachingWizard=newCoachingWizard\(\);/, '')}
    let coachingWizard=newCoachingWizard();
    ${source('resetCoachingWizard')}
    ${source('validCoachingWizardStep')}
    ${source('renderCoachingWizard')}
    ${functionOnly('coachingWizardHasChoices')}
    ${functionOnly('guardCoachingWizardNavigation')}
    ${source('leaveCoachingWizard')}
    ${source('nextCoachingWizard')}
    ${source('backCoachingWizard')}
    ${source('setCoachingEntryView')}
    ${source('openCoachingEntryTarget')}
    if(!['next','back','leave'].every(name=>typeof coachingWizard[name]==='function'))throw new Error('méthodes de navigation absentes de l’état');
    openCoachingEntryTarget('coachingCreatorRole');
    if(coachingWizard.currentStep!==1||fields.coachingWizardPanel.classList.contains('hidden')||fields.coachingWizardProgressText.textContent!=='Étape 1 sur 6')throw new Error('Créer doit ouvrir l’étape 1 sur 6');
    if(!fields.coachingWizardNext.disabled)throw new Error('Suivant doit être indisponible tant que l’étape est invalide');
    if(!createBlock.classList.contains('coaching-entry-hidden')||!joinBlock.classList.contains('coaching-entry-hidden'))throw new Error('anciens formulaires visibles derrière le wizard');
    const beforeInvalid=coachingWizard.currentStep;
    coachingWizard.next();
    if(coachingWizard.currentStep!==beforeInvalid)throw new Error('Suivant invalide a changé d’étape');
    stepValid=true;coachingWizard.mode='normal';coachingWizard.next();
    if(coachingWizard.currentStep!==2||fields.coachingWizardProgressText.textContent!=='Étape 2 sur 6'||!steps[0].hidden||steps[1].hidden)throw new Error('progression Suivant incorrecte');
    coachingWizard.back();
    if(coachingWizard.currentStep!==1||fields.coachingWizardProgressText.textContent!=='Étape 1 sur 6')throw new Error('Retour interne incorrect');
    coachingWizard.back();
    if(!calls.some(call=>Array.isArray(call)&&call[0]==='page'&&call[1]==='coachingEntryPage'))throw new Error('Retour initial ne rejoint pas les quatre cartes');
    for(const target of ['coachingInviteInput','coachingSessionsCard']){
      calls.length=0;openCoachingEntryTarget(target);
      if(!calls.some(call=>Array.isArray(call)&&call[0]==='page'&&call[1]==='coachingPage'))throw new Error('destination V10.47 perdue: '+target);
      if(fields.coachingPage.dataset.entryView!==target)throw new Error('vue V10.47 incorrecte: '+target);
    }
    return true;
  })()`;
  execFileSync(process.execPath,['-e',shellHarness],{stdio:'inherit'});

  const hasNavigationGuard = /^function guardCoachingWizardNavigation\(/m.test(app);
  const navigationGuardSource = hasNavigationGuard
    ? `${functionOnly('coachingWizardHasChoices')}\n${functionOnly('guardCoachingWizardNavigation')}`
    : `function coachingWizardHasChoices(){return false}\nfunction guardCoachingWizardNavigation(){return true}`;
  const capturedNavigation = app.match(/document\.addEventListener\('click',e=>\{([\s\S]*?)\n\},true\);/);
  assert(capturedNavigation, 'Gestionnaire de navigation persistante introuvable');
  const navigationHarness = `(function(){
    let confirmResult=false,confirmations=0,plannerReturnTarget='library';
    function page(active=false){const classes=new Set(active?['active']:[]);return {classList:{add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name)}}}
    const pages={coachingPage:page(true),homePage:page(),profilePage:page(),plannerPage:page()};
    const $=id=>pages[id]||null;
    const document={querySelectorAll:selector=>selector==='.page'?Object.values(pages):[],getElementById:id=>pages[id]||null};
    const adminCentre={open:()=>{},leave:()=>{}};
    const closeMissionDossier=()=>{};
    const setCoachingEntryView=()=>{};
    const stopPlannerFollow=()=>{};
    const initPlanner=()=>{};
    const loadCoachingHub=()=>{};
    const refreshActiveSessionShortcut=()=>{};
    const setTimeout=callback=>callback();
    const confirm=()=>{confirmations++;return confirmResult};
    ${functionOnly('newCoachingWizard')}
    let coachingWizard=newCoachingWizard();
    ${functionOnly('resetCoachingWizard')}
    ${navigationGuardSource}
    ${functionOnly('showPage')}
    const prepare=()=>{coachingWizard.active=true;coachingWizard.mode='normal';coachingWizard.busy=false;Object.values(pages).forEach(node=>node.classList.remove('active'));pages.coachingPage.classList.add('active');confirmations=0};
    prepare();
    const rejected=showPage('homePage');
    if(rejected!==false||!pages.coachingPage.classList.contains('active')||pages.homePage.classList.contains('active'))throw new Error('navigation globale non bloquée après refus');
    if(confirmations!==1||!coachingWizard.active)throw new Error('refus doit conserver le wizard après une seule confirmation');
    prepare();
    let stopped=false;
    const nav={dataset:{page:'homePage'}};
    const event={target:{closest:selector=>selector==='[data-page]'?nav:null},preventDefault:()=>{},stopImmediatePropagation:()=>{stopped=true}};
    Function('Date','fakeLockBlockUntil','document','showPage','e',${JSON.stringify(capturedNavigation[1])})(Date,0,document,showPage,event);
    if(!stopped)showPage('homePage');
    if(confirmations!==1||!stopped||!pages.coachingPage.classList.contains('active'))throw new Error('un clic persistant refusé doit demander une seule confirmation');
    prepare();confirmResult=true;
    if(showPage('homePage')===false||!pages.homePage.classList.contains('active'))throw new Error('navigation globale acceptée doit aboutir');
    if(confirmations!==1||coachingWizard.active)throw new Error('acceptation doit réinitialiser le wizard une seule fois');
    prepare();coachingWizard.busy=true;confirmResult=true;
    if(showPage('profilePage')!==false||!pages.coachingPage.classList.contains('active')||confirmations!==0)throw new Error('navigation volontaire doit rester bloquée pendant busy');
    prepare();confirmResult=false;plannerReturnTarget='coaching';
    if(showPage('plannerPage')===false||!pages.plannerPage.classList.contains('active')||confirmations!==0||!coachingWizard.active)throw new Error('transition interne vers le planner bloquée');
    plannerReturnTarget='library';
    if(showPage('coachingPage')===false||!pages.coachingPage.classList.contains('active')||confirmations!==0||!coachingWizard.active)throw new Error('transition interne vers la session Coaching bloquée');
    return true;
  })()`;
  execFileSync(process.execPath,['-e',navigationHarness],{stdio:'inherit'});
}

if (process.argv.includes('--case=invitations') || !process.argv.some(arg => arg.startsWith('--case='))) {
  assert(html.includes('id="coachingWizardInvitations"'), 'Confirmation des invitations absente');
  for (const name of ['coachingWizardInvitationMembers', 'renderCoachingWizardInvitations']) source(name);
  const invitationHarness = `(function(){
    let coachingWizard;
    let mutationCount=0;
    const coachingFriendInvites=[{user_id:'legacy-friend',role:'observer'}];
    const session={user:{id:'creator-1'}};
    const fields={coachingWizardInvitations:{innerHTML:''}};
    const $=id=>fields[id]||null;
    const esc=value=>String(value);
    const coachingParticipantName=member=>member.user_id;
    const coachingRoleLabel=role=>role;
    const sourceParticipants=[{user_id:'traceur-1',role:'traceur'},{user_id:'driver-1',role:'driver'}];
    ${source('newCoachingWizard').replace(/\nlet coachingWizard=newCoachingWizard\(\);/, '')}
    ${functionOnly('coachingWizardInvitationMembers')}
    ${functionOnly('renderCoachingWizardInvitations')}
    coachingWizard=newCoachingWizard();
    coachingWizard.participants=sourceParticipants.map(member=>({...member}));
    renderCoachingWizardInvitations();
    if(!fields.coachingWizardInvitations.innerHTML.includes('traceur-1')||!fields.coachingWizardInvitations.innerHTML.includes('traceur'))throw new Error('étape 6 n’affiche pas le Traceur');
    if(!fields.coachingWizardInvitations.innerHTML.includes('driver-1')||!fields.coachingWizardInvitations.innerHTML.includes('driver'))throw new Error('étape 6 n’affiche pas le Conducteur');
    const first=fields.coachingWizardInvitations.innerHTML;
    renderCoachingWizardInvitations();
    if(fields.coachingWizardInvitations.innerHTML!==first)throw new Error('aller-retour du wizard duplique les invitations');
    coachingWizard.participants=[{user_id:'traceur-1',role:'traceur'},{user_id:'observer-1',role:'observer'}];
    renderCoachingWizardInvitations();
    if(!fields.coachingWizardInvitations.innerHTML.includes('observer-1')||fields.coachingWizardInvitations.innerHTML.includes('driver-1'))throw new Error('la mutation de l’étape 4 ne se reflète pas à l’étape 6');
    if(coachingFriendInvites.length!==1||coachingFriendInvites[0].user_id!=='legacy-friend'||mutationCount!==0)throw new Error('les invitations serveur/globales ont été mutées avant le clic final');
    return true;
  })()`;
  execFileSync(process.execPath,['-e',invitationHarness],{stdio:'inherit'});
}

if (process.argv.includes('--case=integration')) {
  const submit = functionOnly('submitCoachingWizard');
  const wizardStepSources = ['newCoachingWizard', 'changeCoachingWizard', 'validCoachingWizardStep', 'renderCoachingWizard', 'nextCoachingWizard', 'backCoachingWizard', 'leaveCoachingWizard']
    .map(name => source(name)).join('\n');
  assert(!wizardStepSources.includes('savePlanner'), 'les étapes 1 à 6 ne doivent pas sauvegarder une piste');
  assert(!wizardStepSources.includes('createCoaching'), 'les étapes 1 à 6 ne doivent pas créer une session');
  assert(!wizardStepSources.includes('supabase.'), 'les étapes 1 à 6 ne doivent pas écrire côté serveur');
  assert(submit.includes('saveCoachingWizardDraft') && submit.includes('createCoaching'), 'le parcours final doit utiliser les mécanismes existants');
  assert(submit.includes('preparation.routeId') && submit.includes('createdSessionId'), 'le parcours final doit conserver route_id et session créée');
  assert(!submit.includes('chooseCoachingSearchV1045') && !submit.includes('p_search_mode'), 'le wizard ne doit pas remplacer la décision Traceur');

  const integrationHarness = `(async()=>{
    let coachingWizard={busy:false,error:null,createdSessionId:null,mode:'normal',creatorRole:'traceur',participants:[{user_id:'driver-1',role:'driver'}],trackPreparation:{method:'draw',draft:{name:'Préparation',route:[{lat:48.3,lon:7.4},{lat:48.301,lon:7.401}]},routeId:null,origin:null}};
    const savedRoute={id:'route-fixture-1',name:'Préparation',route:[{lat:48.3,lon:7.4},{lat:48.301,lon:7.401}]};
    let saveCalls=0,attempt=0,openCalls=0;const requests=[];let trainingRoutes=[];
    const validCoachingWizard=()=>({ok:true});
    const renderCoachingWizard=()=>{};
    const coachingWizardMembers=()=>coachingWizard.participants;
    const saveCoachingWizardDraft=async()=>{saveCalls++;return savedRoute};
    const openCoachingSession=async id=>{openCalls++;return id};
    const createCoaching=async options=>{requests.push({...options});attempt++;if(attempt===1)return false;options.onCreated?.({id:'session-fixture-1'});return {id:'session-fixture-1'}};
    ${submit}
    const first=await submitCoachingWizard();
    if(first!==false||saveCalls!==1||requests.length!==1||requests[0].routeId!=='route-fixture-1'||coachingWizard.createdSessionId!==null)throw new Error('échec initial ou route_id non capturé');
    const retry=await submitCoachingWizard();
    if(!retry||saveCalls!==1||requests.length!==2||requests[1].routeId!=='route-fixture-1'||coachingWizard.createdSessionId!=='session-fixture-1')throw new Error('retry doit réutiliser la même piste sans doublon');
    if(requests.some(request=>Object.hasOwn(request,'p_search_mode')))throw new Error('p_search_mode ne doit pas être envoyé par le wizard');
    trainingRoutes.push({id:'existing-route',name:'Existante',route:[{lat:48.4,lon:7.5},{lat:48.401,lon:7.501}]});
    coachingWizard={busy:false,error:null,createdSessionId:null,mode:'normal',creatorRole:'traceur',participants:[{user_id:'driver-1',role:'driver'}],trackPreparation:{method:'existing',draft:null,routeId:'existing-route',origin:'existing'}};
    const saveBeforeExisting=saveCalls;await submitCoachingWizard();
    if(saveCalls!==saveBeforeExisting||requests.at(-1).routeId!=='existing-route')throw new Error('une piste existante ne doit pas être resauvegardée');
    coachingWizard={busy:false,error:null,createdSessionId:null,mode:'full_blind',creatorRole:'coach',participants:[{user_id:'driver-1',role:'driver'}],trackPreparation:{method:null,draft:null,routeId:null,origin:null}};
    await submitCoachingWizard();
    if(requests.at(-1).routeId!==null||saveCalls!==saveBeforeExisting)throw new Error('full_blind Coach doit conserver l’absence de piste');
    if(openCalls!==0||trainingRoutes.length!==2)throw new Error('le harnais a observé une mutation parasite');
    return true;
  })().catch(error=>{console.error(error.message);process.exit(1)})`;
  execFileSync(process.execPath,['-e',integrationHarness],{stdio:'inherit'});
  console.log('V10.48 integration checks: OK');
  process.exit(0);
}

if (process.argv.includes('--case=lifecycle') || !process.argv.some(arg => arg.startsWith('--case='))) {
  const completionHarness = `(async()=>{
    const assert=require('assert/strict');
    const panel={classList:{hidden:false,add(name){if(name==='hidden')this.hidden=true},remove(name){if(name==='hidden')this.hidden=false}}};
    const $=id=>id==='coachingWizardPanel'?panel:null;
    let coachingWizard={active:true,currentStep:6,busy:false,error:null,createdSessionId:null,mode:'full_blind',creatorRole:'coach',participants:[],invitations:[],trackPreparation:{}};
    let trainingRoutes=[],fail=false,creates=0;
    const validCoachingWizard=()=>({ok:true});
    const coachingWizardMembers=()=>[];
    const coachingWizardHasChoices=()=>true;
    const confirm=()=>{throw Error('Une préparation terminée ne doit plus demander un abandon')};
    const renderCoachingWizardParticipants=()=>{},renderCoachingWizardInvitations=()=>{},setUiText=()=>{};
    const document={querySelectorAll:()=>[]};
    const openCoachingSession=async()=>{if(fail)throw Error('lecture impossible');panel.classList.add('hidden');return true};
    const createCoaching=async options=>{creates++;options.onCreated({id:'created'});await openCoachingSession();return {id:'created'}};
    ${functionOnly('renderCoachingWizard')}
    ${functionOnly('guardCoachingWizardNavigation')}
    ${functionOnly('submitCoachingWizard')}
    await submitCoachingWizard();
    assert.equal(panel.classList.hidden,true,'Le récapitulatif doit rester masqué après création');
    assert.equal(coachingWizard.active,false,'La préparation terminée doit être inactive');
    assert.equal(guardCoachingWizardNavigation('homePage'),true);
    coachingWizard={...coachingWizard,active:true,createdSessionId:null};fail=true;
    await submitCoachingWizard();
    assert.equal(coachingWizard.active,true,'Une ouverture échouée doit conserver le réessai');
    assert.equal(coachingWizard.createdSessionId,'created');
    assert.equal(panel.classList.hidden,false);
    fail=false;const before=creates;await submitCoachingWizard();
    assert.equal(creates,before,'Réouvrir ne doit pas recréer');
    assert.equal(panel.classList.hidden,true);
    assert.equal(coachingWizard.active,false);
  })().catch(error=>{console.error(error);process.exit(1)})`;
  execFileSync(process.execPath,['-e',completionHarness],{stdio:'inherit'});
}

if (process.argv.includes('--case=lifecycle')) {
  const navigationSource = source('showPage');
  assert(navigationSource.includes("if(id==='recordPage'&&coachingWizard.active)resetCoachingWizard()"), 'Terrain doit restaurer l’état normal du wizard');
  const guardSource = source('guardCoachingWizardNavigation');
  assert(guardSource.includes('coachingWizard.busy'), 'Une soumission en cours doit bloquer la sortie');
  assert(guardSource.includes("id==='plannerPage'&&plannerReturnTarget==='coaching'"), 'Le planner interne doit rester accessible');
  assert(guardSource.includes('resetCoachingWizard()'), 'Une sortie confirmée doit réinitialiser le wizard');
  const submitSource = source('submitCoachingWizard');
  assert(submitSource.includes('preparation.routeId'), 'Le retry doit pouvoir réutiliser routeId');
  assert(submitSource.includes('if(coachingWizard.createdSessionId)'), 'Une session créée ne doit pas être recréée au retry');
  assert(submitSource.includes('coachingWizard.busy=true'), 'Le submit doit verrouiller les doubles clics');
  console.log('V10.48 lifecycle checks: OK');
  process.exit(0);
}

assert(html.includes('class="bottom-nav"'), 'Navigation générale absente');
assert(html.includes('id="coachingPage"'), 'Page Coaching absente');
assert(html.includes('id="coachingSessionsCard"'), 'Sessions internes absentes');
assert(html.includes('id="coachingWizardPanel"'), 'Wizard absent');

function withoutWizard(text) {
  return text.replace(/    <div id="coachingWizardPanel"[\s\S]*?(?=    <div class="record-head">)/, '');
}

function withoutV1049ActiveMetrics(text) {
  return text
    .replace(/<div class="coaching-odor-preference">[\s\S]*?<\/div>/, '')
    .replace(/<label id="coachingOdorMapToggle"[\s\S]*?<\/label>/, '')
    .replace(/<label><input type="checkbox" data-coaching-layer="odor" checked> Olfactif estimé<\/label>/, '')
    .replace(/      <div id="coachingLiveWeather"[\s\S]*?(?=      <div id="coachingHistoricalWeather")/, '')
    .replace(/^      <div id="coachingTerrainStatus"[^\n]*\n/m, '')
    .replace(/<div class="coaching-live-metrics">[\s\S]*?<\/div><button id="recenterCoachingMap"/, '<button id="recenterCoachingMap"');
}

const currentCoachingPage = html.match(/  <section id="coachingPage"[\s\S]*?(?=  <section id="mapPage")/);
const oldHtml = execFileSync('git', ['show', `${baseline}:index.html`], { encoding: 'utf8' });
const oldCoachingPage = oldHtml.match(/  <section id="coachingPage"[\s\S]*?(?=  <section id="mapPage")/);
assert(currentCoachingPage && oldCoachingPage, 'Section Coaching introuvable');
assert.equal(
  withoutV1049ActiveMetrics(withoutWizard(currentCoachingPage[0])),
  withoutV1049ActiveMetrics(withoutWizard(oldCoachingPage[0])),
  'Le terrain et les sessions internes doivent rester inchangés'
);

const selfLeaveFiles = ['PISTE_V10.48_COACHING_MEMBER_SELF_LEAVE.sql', 'PISTE_V10.48_COACHING_MEMBER_SELF_LEAVE_DRY_RUN.sql', 'scripts/check-v10-48-coaching-member-self-leave.js', 'PISTE_V10.49_COACHING_ACTIVE_DEBRIEF.sql', 'PISTE_V10.49_COACHING_ACTIVE_DEBRIEF_VERIFY.sql', 'scripts/check-v10-49-backend.js', 'scripts/check-v10-49.js', 'docs/superpowers/specs/2026-09-14-v10-49-coaching-active-session-debrief-design.md', 'docs/superpowers/plans/2026-09-14-v10-49-coaching-active-session-debrief.md'];
const changed = execFileSync('git', ['diff', baseline, '--name-only'], { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean).filter(path => !path.startsWith('.superpowers/sdd/') && !selfLeaveFiles.includes(path));
assert.deepEqual(
  changed.sort(),
  [
    'app.js',
    'index.html',
    'scripts/check-v10-47.js',
    'scripts/check-v10-46.js',
    'scripts/check-v10-45.js',
    'scripts/check-v10-44.js',
    'scripts/check-v10-43.js',
    'scripts/check-v10-48.js',
    'scripts/check-v10-42-2.js',
    'scripts/verify-current-assets.js',
    'sw.js',
    'v2.css'
  ].sort(),
  'Task 1 ne doit modifier que le shell et son guard'
);
assert(!changed.some(p => p.endsWith('.sql') || p.startsWith('supabase/')), 'Aucun SQL/Supabase hors patch self-leave explicitement contrôlé');

if (process.argv.includes('--case=submit')) {
  const submitSource = source('submitCoachingWizard');
  assert(source('saveCoachingWizardDraft').includes('savePlanner'), 'Le récapitulatif doit sauvegarder une piste locale au dernier clic');
  assert(submitSource.includes('createCoaching'), 'Le récapitulatif doit réutiliser createCoaching');
  assert(submitSource.includes('saveCoachingWizardDraft'), 'Le submit doit passer par le sauvegardeur local du wizard');
  assert(submitSource.includes('routeId'), 'Le route_id doit être conservé par le wizard');
  assert(submitSource.includes('coachingWizard.busy=true'), 'Le double clic doit être verrouillé');
  assert(submitSource.includes('createdSessionId')&&submitSource.includes('openCoachingSession'), 'Un échec après création doit proposer la réouverture sans recréer');
  assert(source('createCoaching').includes('onCreated'), 'createCoaching doit exposer le résultat créé au wizard');
  assert(source('savePlanner').includes('onSaved'), 'savePlanner doit notifier le wizard après insertion');
  console.log('V10.48 submit checks: OK');
  process.exit(0);
}

if (process.argv.includes('--case=guardrails')) {
  console.log('V10.48 guardrails: OK');
} else {
  console.log('V10.48 checks: OK');
}
