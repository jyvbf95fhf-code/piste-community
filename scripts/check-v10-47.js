const fs=require('fs');
const assert=require('assert/strict');
const {execFileSync}=require('child_process');
const read=p=>fs.readFileSync(p,'utf8');
const app=read('app.js'),html=read('index.html');
const baseline=p=>execFileSync('git',['show',`origin/main:${p}`],{encoding:'utf8'});
const old=baseline('app.js'),oldHtml=baseline('index.html');
function source(name,text=app){
 const start=text.search(new RegExp(`^(?:async )?function ${name}\\(`,'m'));
 assert(start>=0,`Fonction absente: ${name}`);
 const rest=text.slice(start),next=rest.slice(1).search(/\n(?:async )?function /);
 return next<0?rest:rest.slice(0,next+1);
}
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
    `${name}: moteur Coaching origin/main modifié`
  );
}


for(const name of ['loadCoachingHub','setCoachingStage','setCoachingPanel','openCoachingSession','loadStats','showPage']){
 assert.equal(source(name),source(name,old),`${name} doit rester intacte`);
}
// Toutes les pages internes restent identiques, pas seulement leurs formulaires.
const entry=html.match(/  <section id="coachingEntryPage"[\s\S]*?<\/section>\n/);
assert(entry,'Nouvelle entrée Coaching absente');
assert.equal(html.replace(entry[0],'').replace(/app\.js\?v=1047-\d+/g,'app.js?v=1046-1').replace(/v2\.css\?v=208\d/g,'v2.css?v=2080').replace(/v2\.js\?v=202\d/g,'v2.js?v=2021'),oldHtml,'Écrans internes modifiés');
assert(!/<(?:input|select|form|textarea)\b/.test(entry[0]),'Aucun formulaire dupliqué');
const routes=[
 ['Créer une session','coachingCreatorRole','Préparer un nouvel entraînement'],
 ['Rejoindre une session','coachingInviteInput','Entrer avec un code d’invitation'],
 ['Mes sessions','coachingSessionsCard','Reprendre une session en attente ou en cours'],
 ['Progression d’équipe','statsPage','Consulter vos statistiques']
];
for(const [label,target,subtitle] of routes){
 const attr=target==='statsPage'?'data-page':'data-coaching-entry-target';
 const card=entry[0].match(new RegExp(`<button[^>]*${attr}="${target}"[^>]*>([\\s\\S]*?)</button>`));
 assert(card,`Accès absent: ${label}`);
 assert(card[1].includes(`<b>${label}</b>`),`Titre absent: ${label}`);
 assert(card[1].includes(`<small>${subtitle}</small>`),`Sous-texte absent: ${label}`);
 assert(card[1].includes('aria-hidden="true"'),`Icône décorative absente: ${label}`);
 assert(oldHtml.includes(`id="${target}"`),`Cible inexistante: ${target}`);
 if(target==='statsPage')continue;
 for(const leaveBeforeFrame of [false,true]){
  const calls=[],frames=[],timers=[];let active=true;
  const zone={tabIndex:target==='coachingSessionsCard'?-1:0,
   setAttribute:(key,value)=>calls.push(['attribute',key,value]),
   scrollIntoView:()=>calls.push(['scroll',target]),focus:()=>calls.push(['focus',target]),
   closest:()=>zone,classList:{add:()=>{},remove:()=>{}}};
  Function('showPage','setCoachingStage','$','requestAnimationFrame','setTimeout',`${source('openCoachingEntryTarget')}openCoachingEntryTarget('${target}');`)(
   id=>calls.push(['page',id]),stage=>calls.push(['stage',stage]),
   id=>id==='coachingPage'?{classList:{contains:()=>active}}:zone,
   callback=>frames.push(callback),callback=>timers.push(callback)
  );
  assert.deepEqual(calls,[['page','coachingPage'],['stage','prepare']],'Attendre le rendu avant scroll/focus');
  if(leaveBeforeFrame)active=false;
  while(frames.length)frames.shift()();
  const expected=[['page','coachingPage'],['stage','prepare']];
  if(!leaveBeforeFrame){
   if(target==='coachingSessionsCard')expected.push(['attribute','tabindex','-1']);
   expected.push(['scroll',target],['focus',target]);
  }
  assert.deepEqual(calls,expected,`Navigation incorrecte: ${label}`);
  timers.forEach(callback=>callback());
 }
}
// Exécute la logique visuelle réelle de la bottom nav, sans changer ses destinations.
const v2=read('v2.js');
const navBody=v2.match(/const setActive = \(page\) => \{([\s\S]*?)\n    \};/)[1];
for(const [page,expected] of [['coachingEntryPage',[]],['coachingPage',[]],['libraryPage',[2]],['recordPage',[2]],['homePage',[0]]]){
 const buttons=['homePage','dogPage','libraryPage','feedPage','profilePage'].map(page=>({dataset:{page},active:false,classList:{}}));
 buttons.forEach(b=>b.classList={add:()=>b.active=true,remove:()=>b.active=false});
 Function('buttons','page',navBody)(buttons,page);
 assert.deepEqual(buttons.flatMap((b,i)=>b.active?[i]:[]),expected,`Onglet actif incorrect: ${page}`);
}
assert(oldHtml.includes('id="statsPage"'));
assert(source('showPage').includes("if(id==='statsPage')loadStats(currentStatsScope||'mine')"));
assert(source('openUnifiedCoachingHome').includes("showPage('coachingEntryPage')"));
assert(app.includes("document.querySelectorAll('[data-coaching-entry-target]').forEach(b=>b.onclick=()=>openCoachingEntryTarget(b.dataset.coachingEntryTarget))"));
const changed=execFileSync('git',['diff','origin/main','--name-only'],{encoding:'utf8'}).trim().split('\n');
assert(!changed.some(p=>p.endsWith('.sql')||p.startsWith('supabase/')));
console.log('V10.47 checks: OK');
