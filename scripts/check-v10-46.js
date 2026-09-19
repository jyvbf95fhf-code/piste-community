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
  // V10.49 replaces this direct transition with a role-checked two-second hold.
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
  css.includes('/* V10.46 — Coaching terrain compact */'),
  'Styles terrain compact V10.46 absents'
);

assert(
  css.includes('#coachingLivePanel.active-terrain'),
  'Styles spécifiques au terrain actif absents'
);

assert(
  css.includes('#coachingLivePanel.active-terrain .coaching-tabs'),
  'Onglets terrain non optimisés'
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
  app.includes('let coachingUnreadMessages=0'),
  'État local des messages non lus absent'
);

assert(
  app.includes('function renderCoachingMessageUnread'),
  'Rendu du badge absent'
);

assert(
  app.includes('function markCoachingMessagesSeen'),
  'Reset des non-lus absent'
);

assert(
  app.includes('function showCoachingMessageToast'),
  'Toast message absent'
);

assert(
  app.includes('function handleIncomingCoachingMessage'),
  'Gestion des messages entrants absente'
);

assert(
  app.includes("},payload=>handleIncomingCoachingMessage(payload)).subscribe()"),
  'La subscription Messages doit transmettre le payload entrant'
);

const messageBehavior=Function(`
  let coachingUnreadMessages=0,coachingMessageToastTimer=null;
  let coachingPanel='team',loads=0,lastDelay=null,pendingCallback=null;
  const session={user:{id:'current-user'}};
  const badge={textContent:'0',hidden:true};
  const toast={textContent:'',hidden:true};
  const document={getElementById:id=>id==='coachingMessageUnreadBadge'?badge:toast};
  const clearTimeout=()=>{};
  const setTimeout=(callback,delay)=>{pendingCallback=callback;lastDelay=delay;return 1};
  const loadCoachingMessages=()=>{loads+=1};
  ${source('renderCoachingMessageUnread')}
  ${source('markCoachingMessagesSeen')}
  ${source('showCoachingMessageToast')}
  ${source('handleIncomingCoachingMessage')}
  handleIncomingCoachingMessage({new:{author_id:'other-user'}});
  const otherInactive={unread:coachingUnreadMessages,badgeHidden:badge.hidden,toastHidden:toast.hidden,loads,lastDelay};
  pendingCallback();
  const toastHiddenAfterTimeout=toast.hidden;
  markCoachingMessagesSeen();toast.hidden=true;
  handleIncomingCoachingMessage({new:{author_id:'current-user'}});
  const ownInactive={unread:coachingUnreadMessages,toastHidden:toast.hidden,loads};
  coachingPanel='messages';
  handleIncomingCoachingMessage({new:{author_id:'other-user'}});
  return {otherInactive,toastHiddenAfterTimeout,ownInactive,otherActive:{unread:coachingUnreadMessages,toastHidden:toast.hidden,loads},badge};
`)();

assert.deepEqual(
  messageBehavior.otherInactive,
  {unread:1,badgeHidden:false,toastHidden:false,loads:1,lastDelay:2500},
  'Un message distant hors onglet doit afficher un non-lu et un toast temporaire'
);
assert.equal(messageBehavior.toastHiddenAfterTimeout,true,'Le callback du toast doit le masquer');
assert.deepEqual(
  messageBehavior.ownInactive,
  {unread:0,toastHidden:true,loads:2},
  'Un message propre doit seulement actualiser l’historique'
);
assert.deepEqual(
  messageBehavior.otherActive,
  {unread:0,toastHidden:true,loads:3},
  'Un message distant dans l’onglet actif doit seulement actualiser l’historique'
);
assert.deepEqual(
  messageBehavior.badge,
  {textContent:'0',hidden:true},
  'Ouvrir Messages doit remettre le badge à zéro et le masquer'
);

const panelReset=Function(`
  let coachingUnreadMessages=3,coachingPanel='team',coachingMap=null;
  const badge={textContent:'3',hidden:false};
  const document={getElementById:()=>badge,querySelectorAll:()=>[]};
  const $=()=>null;
  const setTimeout=()=>{};
  ${source('renderCoachingMessageUnread')}
  ${source('markCoachingMessagesSeen')}
  ${source('setCoachingPanel')}
  setCoachingPanel('messages');
  return {unread:coachingUnreadMessages,panel:coachingPanel,badge};
`)();
assert.deepEqual(
  panelReset,
  {unread:0,panel:'messages',badge:{textContent:'0',hidden:true}},
  'setCoachingPanel doit nettoyer les non-lus à l’ouverture de Messages'
);

const messageCleanup=Function(`
  let coachingUnreadMessages=2,coachingMessageToastTimer=42;
  let coachingRoomPoll=1,coachingPreviewSharedAt=1,coachingPreviewWatch=null,coachingOwnPosition={};
  let coachingMapRefreshTimer=null,coachingWeatherTimer=null,coachingLiveWeather={},coachingTerrainPaused=true;
  let coachingPreviewPosition={},coachingPreviewMarker=null,coachingPreviewAccuracyCircle=null,coachingChannel=null;
  const clearedTimers=[];
  const badge={textContent:'2',hidden:false};
  const toast={hidden:false};
  const document={getElementById:id=>id==='coachingMessageUnreadBadge'?badge:toast};
  const clearInterval=()=>{};
  const clearTimeout=timer=>{clearedTimers.push(timer)};
  const stopCoachingPresence=()=>{};
  const stopTraceurTracking=()=>{};
  const navigator={geolocation:null};
  const supabase={removeChannel:()=>{}};
  const $=id=>id==='coachingMessageToast'?toast:null;
  ${source('renderCoachingMessageUnread')}
  ${source('markCoachingMessagesSeen')}
  ${source('clearCoachingRealtime')}
  clearCoachingRealtime();
  return {unread:coachingUnreadMessages,badge,toastHidden:toast.hidden,timer:coachingMessageToastTimer,toastTimerCleared:clearedTimers.includes(42)};
`)();

assert.deepEqual(
  messageCleanup,
  {unread:0,badge:{textContent:'0',hidden:true},toastHidden:true,timer:null,toastTimerCleared:true},
  'Quitter une session doit nettoyer son badge et son toast'
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
    p=>p.endsWith('.sql')&&!['PISTE_V10.48_COACHING_MEMBER_SELF_LEAVE.sql','PISTE_V10.48_COACHING_MEMBER_SELF_LEAVE_DRY_RUN.sql','PISTE_V10.49_COACHING_ACTIVE_DEBRIEF.sql','PISTE_V10.49_COACHING_ACTIVE_DEBRIEF_VERIFY.sql'].includes(p) || p.startsWith('supabase/functions/')
  ),
  'V10.46 ne doit contenir ni SQL ni Edge Function'
);

require('./verify-current-assets')();

console.log('V10.46 checks: OK');
