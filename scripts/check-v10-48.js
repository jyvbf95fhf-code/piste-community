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
  const button={disabled:false};
  const fields={coachingRouteSelect:{value:'route-1'},createCoachingSession:button,coachingVisibility:{value:'full_blind'}};
  const route={id:'route-1',route:[[1,2],[3,4]]};
  const $=id=>fields[id]||null;
  const trainingRoutes=[route];
  const coachingCreationMembers=()=>members;
  const coachingWithoutPreparedRouteV1045=()=>false;
  const validateCoachingConfigurationV10423=()=>valid?{ok:true}:{ok:false,message:'configuration invalide'};
  const setUiText=(id,text)=>messages.push([id,text]);
  const supabase={rpc:async(name,payload)=>{events.push('rpc');rpcCalls++;return {data:{id:'session-1'},error:null}}};
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
  if(events.join('|')!=='rpc|load|open,session-1|render|sync')throw new Error('ordre historique createCoaching modifié: '+events.join('|'));
  if(button.disabled)throw new Error('bouton création laissé désactivé');
  if(!events.includes('rpc'))throw new Error('RPC absent');
  return true;
})().catch(error=>{console.error(error.message);process.exit(1)})`;
execFileSync(process.execPath,['-e',createHarness],{stdio:'inherit'});
assert(!source('createCoaching').includes('p_search_mode'), 'createCoaching ne doit pas envoyer p_search_mode');

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
  .trim().split('\n').filter(Boolean);
assert.deepEqual(
  changed.sort(),
  [
    '.superpowers/sdd/2026-09-13-v10-48-coaching-guided-prep/task-1-report.md',
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
