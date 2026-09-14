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


const normalizeNavigation=text=>text.replaceAll('setCoachingEntryView(null);','').replace(" if(id==='recordPage'&&coachingWizard.active)resetCoachingWizard();\n",'').replace('if(coachingWizard.active)renderCoachingWizardParticipants();','').replace(" if(!guardCoachingWizardNavigation(id))return false;\n",'').replace(" if(showPage(page)===false)e.stopImmediatePropagation();\n"," showPage(page);\n");
for(const name of ['loadCoachingHub','setCoachingStage','setCoachingPanel','openCoachingSession','loadStats','showPage']){
 assert.equal(normalizeNavigation(source(name)),normalizeNavigation(source(name,old)),`${name} doit rester intacte hors nettoyage de navigation`);
}
// Toutes les pages internes restent identiques, pas seulement leurs formulaires.
const entry=html.match(/  <section id="coachingEntryPage"[\s\S]*?<\/section>\n/);
assert(entry,'Nouvelle entrée Coaching absente');
const normalizeHtml=text=>text.replace(/  <section id="coachingEntryPage"[\s\S]*?<\/section>\n/,'').replace('    <button id="coachingEntryBack" class="back" type="button" data-page="coachingEntryPage" hidden>← Retour</button>\n','').replace(/    <div id="coachingWizardPanel"[\s\S]*?(?=    <div class="record-head">)/,'').replace('        <button id="useCoachingWizardPreparation" class="primary hidden" type="button">Utiliser cette préparation</button>\n','').replace(/app\.js\?v=104[78]-\d+/g,'app.js?v=1046-1').replace(/v2\.css\?v=208[34]/g,'v2.css?v=2080').replace(/v2\.js\?v=202\d/g,'v2.js?v=2021');
assert.equal(normalizeHtml(html),normalizeHtml(oldHtml),'Écrans internes modifiés');
assert(!/<(?:input|select|form|textarea)\b/.test(entry[0]),'Aucun formulaire dupliqué');
assert(html.includes('id="coachingEntryBack"'),'Bouton Retour des sous-écrans absent');
assert(html.includes('data-page="coachingEntryPage" hidden>← Retour</button>'));
const viewBehavior=Function('$',`${source('setCoachingEntryView')}return setCoachingEntryView;`);
function element(){const classes=new Set();return {dataset:{},hidden:false,classList:{toggle:(c,on)=>on?classes.add(c):classes.delete(c),contains:c=>classes.has(c)}}}
const elements=Object.fromEntries(['coachingPage','coachingEntryBack','coachingPrepareStage','coachingSessionsCard','createBlock','joinBlock'].map(id=>[id,element()]));
elements.coachingCreatorRole={closest:()=>elements.createBlock};
elements.coachingInviteInput={closest:()=>elements.joinBlock};
const setView=viewBehavior(id=>elements[id]);
for(const target of ['coachingInviteInput','coachingSessionsCard']){
 setView(target);
 assert.equal(elements.createBlock.classList.contains('coaching-entry-hidden'),target!=='coachingCreatorRole');
 assert.equal(elements.joinBlock.classList.contains('coaching-entry-hidden'),target!=='coachingInviteInput');
 assert.equal(elements.coachingSessionsCard.classList.contains('coaching-entry-hidden'),target!=='coachingSessionsCard');
 assert.equal(elements.coachingPrepareStage.classList.contains('coaching-entry-hidden'),target==='coachingSessionsCard');
 assert.equal(elements.coachingEntryBack.hidden,false);
 setView(null);
 for(const id of ['createBlock','joinBlock','coachingSessionsCard','coachingPrepareStage'])assert(!elements[id].classList.contains('coaching-entry-hidden'),`${id} doit être restauré`);
 assert.equal(elements.coachingEntryBack.hidden,true);
 assert.equal(elements.coachingPage.dataset.entryView,undefined);
}
assert(source('showPage').includes('setCoachingEntryView(null);'),'Chaque navigation restaure les blocs');
assert(source('setCoachingStage').startsWith('function setCoachingStage(stage){setCoachingEntryView(null);'),'Toute transition restaure les blocs avant le terrain');
assert(read('v2.css').includes('#coachingPage .coaching-entry-hidden{display:none!important}'));
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
 if(['statsPage','coachingCreatorRole'].includes(target))continue;
 for(const leaveBeforeFrame of [false,true,'session']){
  const calls=[],frames=[],timers=[];let active=true,entryView=target;
  const zone={tabIndex:target==='coachingSessionsCard'?-1:0,
   setAttribute:(key,value)=>calls.push(['attribute',key,value]),
   scrollIntoView:()=>calls.push(['scroll',target]),focus:()=>calls.push(['focus',target]),
   closest:()=>zone,classList:{add:()=>{},remove:()=>{}}};
  Function('showPage','setCoachingStage','$','requestAnimationFrame','setTimeout','setCoachingEntryView',`${source('openCoachingEntryTarget')}openCoachingEntryTarget('${target}');`)(
   id=>calls.push(['page',id]),stage=>calls.push(['stage',stage]),
   id=>id==='coachingPage'?{classList:{contains:()=>active},dataset:{entryView},scrollIntoView:()=>calls.push(['scroll','coachingPage'])}:zone,
   callback=>frames.push(callback),callback=>timers.push(callback),mode=>assert.equal(mode,target)
  );
  assert.deepEqual(calls,[['page','coachingPage'],['stage','prepare']],'Attendre le rendu avant scroll/focus');
  if(leaveBeforeFrame===true)active=false;
  if(leaveBeforeFrame==='session')entryView=undefined;
  while(frames.length)frames.shift()();
  const expected=[['page','coachingPage'],['stage','prepare']];
  if(!leaveBeforeFrame){
   if(target==='coachingSessionsCard')expected.push(['attribute','tabindex','-1']);
   expected.push(['scroll','coachingPage'],['focus',target]);
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
assert(!changed.some(p=>p.endsWith('.sql')&&!['PISTE_V10.48_COACHING_MEMBER_SELF_LEAVE.sql','PISTE_V10.48_COACHING_MEMBER_SELF_LEAVE_DRY_RUN.sql'].includes(p)||p.startsWith('supabase/')));
console.log('V10.47 checks: OK');
