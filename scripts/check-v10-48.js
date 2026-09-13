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

assert(html.includes('class="bottom-nav"'), 'Navigation générale absente');
assert(html.includes('id="coachingPage"'), 'Page Coaching absente');
assert(html.includes('id="coachingSessionsCard"'), 'Sessions internes absentes');
assert(html.includes('id="coachingWizardPanel"'), 'Wizard absent');

function withoutWizard(text) {
  return text.replace(/    <div id="coachingWizardPanel"[\s\S]*?<\/div>\n/, '');
}

const currentCoachingPage = html.match(/  <section id="coachingPage"[\s\S]*?<\/section>\n/);
const oldHtml = execFileSync('git', ['show', `${baseline}:index.html`], { encoding: 'utf8' });
const oldCoachingPage = oldHtml.match(/  <section id="coachingPage"[\s\S]*?<\/section>\n/);
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
    'scripts/check-v10-48.js'
  ],
  'Task 1 ne doit modifier que le shell et son guard'
);
assert(!changed.some(p => p.endsWith('.sql') || p.startsWith('supabase/')), 'Aucun SQL/Supabase');

if (process.argv.includes('--case=guardrails')) {
  console.log('V10.48 guardrails: OK');
} else {
  console.log('V10.48 checks: OK');
}
