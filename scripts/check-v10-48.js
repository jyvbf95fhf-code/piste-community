const fs = require('fs');
const assert = require('assert/strict');
const { execFileSync } = require('child_process');

const read = p => fs.readFileSync(p, 'utf8');
const app = read('app.js');
const html = read('index.html');
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
    ${source('changeCoachingWizard')}
    ${source('validCoachingWizard')}
    coachingWizard=newCoachingWizard();
    if(coachingWizard.currentStep!==1||coachingWizard.sessionType!==null||coachingWizard.mode!==null||coachingWizard.creatorRole!==null||coachingWizard.participants.length||coachingWizard.trackPreparation.method!==null||coachingWizard.busy||coachingWizard.error!==null)throw new Error('état neuf incorrect');
    const participants=[{user_id:'traceur-1',role:'traceur'},{user_id:'driver-1',role:'driver'}];
    changeCoachingWizard({sessionType:'immediate',mode:'normal',creatorRole:'coach',participants});
    if(coachingWizard.sessionType!=='immediate'||coachingWizard.mode!=='normal'||coachingWizard.creatorRole!=='coach'||coachingWizard.participants!==participants)throw new Error('change ne conserve pas les choix valides');
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
    if(coachingWizard.currentStep!==1||coachingWizard.sessionType!==null||coachingWizard.participants.length||coachingWizard.trackPreparation.draft!==null)throw new Error('reset incomplet');
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
    ${source('changeCoachingWizard')}
    ${source('validCoachingWizard')}
    ${source('validCoachingWizardStep')}
    coachingWizard=newCoachingWizard();
    if(coachingWizard.sessionType!==null||coachingWizard.mode!==null||coachingWizard.creatorRole!==null)throw new Error('les choix du wizard doivent être vides par défaut');
    for(const sessionType of ['immediate','deferred']) for(const mode of ['normal','simple_blind','full_blind']) for(const creatorRole of ['coach','traceur','driver']){
      coachingWizard.reset();
      coachingWizard.change({sessionType,mode,creatorRole,participants:[]});
      if(coachingWizard.sessionType!==sessionType||coachingWizard.mode!==mode||coachingWizard.creatorRole!==creatorRole)throw new Error('choix non conservé: '+sessionType+'/'+mode+'/'+creatorRole);
      if(!validCoachingWizardStep(1).ok||!validCoachingWizardStep(2).ok||!validCoachingWizardStep(3).ok)throw new Error('choix valide refusé');
    }
    coachingWizard.reset();
    coachingWizard.change({creatorRole:'observer'});
    if(coachingWizard.creatorRole==='observer')throw new Error('un observateur ne peut pas être créateur');
    coachingWizard.change({sessionType:'immediate'});
    if(validCoachingWizardStep(2).ok||validCoachingWizardStep(3).ok)throw new Error('champ manquant accepté');
    const wizardText=(${JSON.stringify(source('validCoachingWizard'))});
    if(wizardText.includes('chooseCoachingSearchV1045'))throw new Error('le wizard ne doit pas choisir immediate/deferred métier');
    return true;
  })()`;
  execFileSync(process.execPath,['-e',choiceHarness],{stdio:'inherit'});
  assert(html.includes('id="coachingWizardSessionType"'), 'Choix du type de session absent');
  assert(html.includes('id="coachingWizardMode"'), 'Choix du mode absent');
  assert(html.includes('id="coachingWizardCreatorRole"'), 'Choix du rôle absent');
  assert(html.includes('Intention — à confirmer par le Traceur après la pose'), 'Récapitulatif de l’intention absent');
  assert(!source('newCoachingWizard').includes('chooseCoachingSearchV1045'), 'Le wizard ne doit pas appeler chooseCoachingSearchV1045');
}

if (process.argv.includes('--case=shell') || !process.argv.some(arg => arg.startsWith('--case='))) {
  const stepTitles = [
    'Type de session',
    'Mode',
    'Ton rôle',
    'Participants',
    'Préparation de la piste',
    'Invitations',
    'Récapitulatif'
  ];
  const wizardPanel = html.match(/    <div id="coachingWizardPanel"[\s\S]*?<\/div>\n    <div class="record-head">/);
  assert(wizardPanel, 'Shell du wizard introuvable');
  assert.equal((wizardPanel[0].match(/data-coaching-wizard-step="[1-7]"/g) || []).length, 7, 'Le wizard doit afficher sept étapes');
  for (const title of stepTitles) assert(wizardPanel[0].includes(`>${title}<`), `Titre d'étape absent: ${title}`);
  assert(wizardPanel[0].includes('Étape 1 sur 7'), 'Progression initiale absente');
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
    const steps=Array.from({length:7},(_,index)=>{const node=element();node.dataset.coachingWizardStep=String(index+1);return node});
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
    if(coachingWizard.currentStep!==1||fields.coachingWizardPanel.classList.contains('hidden')||fields.coachingWizardProgressText.textContent!=='Étape 1 sur 7')throw new Error('Créer doit ouvrir l’étape 1 sur 7');
    if(!fields.coachingWizardNext.disabled)throw new Error('Suivant doit être indisponible tant que l’étape est invalide');
    if(!createBlock.classList.contains('coaching-entry-hidden')||!joinBlock.classList.contains('coaching-entry-hidden'))throw new Error('anciens formulaires visibles derrière le wizard');
    const beforeInvalid=coachingWizard.currentStep;
    coachingWizard.next();
    if(coachingWizard.currentStep!==beforeInvalid)throw new Error('Suivant invalide a changé d’étape');
    coachingWizard.sessionType='immediate';stepValid=true;coachingWizard.next();
    if(coachingWizard.currentStep!==2||fields.coachingWizardProgressText.textContent!=='Étape 2 sur 7'||!steps[0].hidden||steps[1].hidden)throw new Error('progression Suivant incorrecte');
    coachingWizard.back();
    if(coachingWizard.currentStep!==1||fields.coachingWizardProgressText.textContent!=='Étape 1 sur 7')throw new Error('Retour interne incorrect');
    coachingWizard.sessionType=null;coachingWizard.back();
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
    const prepare=()=>{coachingWizard.active=true;coachingWizard.sessionType='immediate';coachingWizard.busy=false;Object.values(pages).forEach(node=>node.classList.remove('active'));pages.coachingPage.classList.add('active');confirmations=0};
    prepare();
    const rejected=showPage('homePage');
    if(rejected!==false||!pages.coachingPage.classList.contains('active')||pages.homePage.classList.contains('active'))throw new Error('navigation globale non bloquée après refus');
    if(confirmations!==1||coachingWizard.sessionType!=='immediate'||!coachingWizard.active)throw new Error('refus doit conserver le wizard après une seule confirmation');
    prepare();
    let stopped=false;
    const nav={dataset:{page:'homePage'}};
    const event={target:{closest:selector=>selector==='[data-page]'?nav:null},preventDefault:()=>{},stopImmediatePropagation:()=>{stopped=true}};
    Function('Date','fakeLockBlockUntil','document','showPage','e',${JSON.stringify(capturedNavigation[1])})(Date,0,document,showPage,event);
    if(!stopped)showPage('homePage');
    if(confirmations!==1||!stopped||!pages.coachingPage.classList.contains('active'))throw new Error('un clic persistant refusé doit demander une seule confirmation');
    prepare();confirmResult=true;
    if(showPage('homePage')===false||!pages.homePage.classList.contains('active'))throw new Error('navigation globale acceptée doit aboutir');
    if(confirmations!==1||coachingWizard.active||coachingWizard.sessionType!==null)throw new Error('acceptation doit réinitialiser le wizard une seule fois');
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

assert(html.includes('class="bottom-nav"'), 'Navigation générale absente');
assert(html.includes('id="coachingPage"'), 'Page Coaching absente');
assert(html.includes('id="coachingSessionsCard"'), 'Sessions internes absentes');
assert(html.includes('id="coachingWizardPanel"'), 'Wizard absent');

function withoutWizard(text) {
  return text.replace(/    <div id="coachingWizardPanel"[\s\S]*?(?=    <div class="record-head">)/, '');
}

const currentCoachingPage = html.match(/  <section id="coachingPage"[\s\S]*?(?=  <section id="mapPage")/);
const oldHtml = execFileSync('git', ['show', `${baseline}:index.html`], { encoding: 'utf8' });
const oldCoachingPage = oldHtml.match(/  <section id="coachingPage"[\s\S]*?(?=  <section id="mapPage")/);
assert(currentCoachingPage && oldCoachingPage, 'Section Coaching introuvable');
assert.equal(
  withoutWizard(currentCoachingPage[0]),
  withoutWizard(oldCoachingPage[0]),
  'Le terrain et les sessions internes doivent rester inchangés'
);

const changed = execFileSync('git', ['diff', baseline, '--name-only'], { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean).filter(path => !path.startsWith('.superpowers/sdd/'));
assert.deepEqual(
  changed.sort(),
  [
    'app.js',
    'index.html',
    'scripts/check-v10-47.js',
    'scripts/check-v10-48.js',
    'v2.css'
  ],
  'Task 1 ne doit modifier que le shell et son guard'
);
assert(!changed.some(p => p.endsWith('.sql') || p.startsWith('supabase/')), 'Aucun SQL/Supabase');

if (process.argv.includes('--case=guardrails')) {
  console.log('V10.48 guardrails: OK');
} else {
  console.log('V10.48 checks: OK');
}
