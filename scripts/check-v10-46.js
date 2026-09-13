const fs=require('fs');
const assert=require('assert/strict');
const {execFileSync}=require('child_process');

const read=p=>fs.readFileSync(p,'utf8');
const app=read('app.js');
const html=read('index.html');
const css=read('v2.css');
const baseline='c2f02af2eb9de64ec5cf1712bb0589923c1a101f';

assert.equal(
  execFileSync('git',['rev-parse','stable-v10.45.1^{}'],{encoding:'utf8'}).trim(),
  baseline,
  'stable-v10.45.1 doit rester la baseline V10.46'
);

execFileSync('git',['merge-base','--is-ancestor',baseline,'HEAD']);

function source(name,text=app){
  const start=text.search(new RegExp(`^(?:async )?function ${name}\\(`,'m'));
  assert(start>=0,`Fonction absente: ${name}`);
  const rest=text.slice(start);
  const next=rest.slice(1).search(/\n(?:async )?function /);
  return next<0?rest:rest.slice(0,next+1);
}

const old=execFileSync(
  'git',
  ['show',`${baseline}:app.js`],
  {encoding:'utf8'}
);

for(const name of [
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
  'coachingDriverTrail'
]){
  assert.equal(
    source(name),
    source(name,old),
    `${name}: moteur Coaching V10.45.1 modifié`
  );
}

assert(
  html.includes('class="bottom-nav"'),
  'Navigation générale absente'
);

assert(
  html.includes('data-coaching-panel="messages"'),
  'Panneau Messages absent'
);

// Assertions V10.46 : elles DOIVENT échouer avant l’implémentation UX.
assert(
  source('setCoachingStage').includes(
    "document.body.classList.toggle('coaching-session-active'"
  ),
  'Le mode plein écran doit être piloté depuis setCoachingStage'
);

assert(
  css.includes('body.coaching-session-active .bottom-nav'),
  'La navigation générale doit être masquée pendant le terrain Coaching'
);

assert(
  css.includes('body.coaching-session-active #activeSessionDock'),
  'Le dock de session générale doit être masqué pendant le terrain Coaching'
);

assert(
  css.includes('safe-area-inset-bottom'),
  'Le mode Coaching doit conserver la safe-area iPhone'
);

assert(
  !html.includes('data-coaching-quick='),
  'Les messages pré-rédigés doivent être retirés'
);

assert(
  html.includes('id="coachingMessageInput"'),
  'Le champ message libre doit rester présent'
);

assert(
  html.includes('id="sendCoachingMessage"'),
  'Le bouton d’envoi libre doit rester présent'
);

assert(
  html.includes('id="coachingMessages"'),
  'L’historique des messages doit rester présent'
);

assert(
  source('sendCoachingMessage').includes('coaching_messages'),
  'L’envoi de messages libres doit rester actif'
);

assert(
  source('loadCoachingMessages').includes('coaching_messages'),
  'Le chargement de l’historique doit rester actif'
);

assert(
  html.includes('id="coachingMessageUnreadBadge"'),
  'Badge non-lu absent'
);

assert(
  html.includes('id="coachingMessageToast"'),
  'Toast message absent'
);

assert(
  css.includes('body.coaching-session-active .bottom-nav'),
  'Règle plein écran absente'
);

assert(
  source('setCoachingStage').includes('coaching-session-active'),
  'setCoachingStage ne pilote pas le plein écran'
);

assert(
  source('setCoachingPanel').includes('markCoachingMessagesSeen'),
  'Messages ne remet pas les non-lus à zéro'
);

const changed=execFileSync(
  'git',
  ['diff',baseline,'--name-only'],
  {encoding:'utf8'}
).trim().split('\n').filter(Boolean);

assert(
  !changed.some(
    p=>p.endsWith('.sql') || p.startsWith('supabase/functions/')
  ),
  'V10.46 ne doit contenir ni SQL ni Edge Function'
);

require('./verify-current-assets')();

console.log('V10.46 checks: OK');
