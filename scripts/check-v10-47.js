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
assert.equal(html.replace(entry[0],'').replaceAll('1047-1','1046-1').replaceAll('2081','2080'),oldHtml,'Écrans internes modifiés');
assert(!/<(?:input|select|form|textarea)\b/.test(entry[0]),'Aucun formulaire dupliqué');
const routes=[
 ['Créer une session','coachingCreatorRole'],
 ['Rejoindre une session','coachingInviteInput'],
 ['Mes sessions','coachingSessionsCard']
];
for(const [label,target] of routes){
 assert(entry[0].includes(`data-coaching-entry-target="${target}">${label}</button>`),`Accès absent: ${label}`);
 assert(oldHtml.includes(`id="${target}"`),`Cible inexistante: ${target}`);
 const calls=[];
 Function('showPage','setCoachingStage','$','setTimeout',`${source('openCoachingEntryTarget')}openCoachingEntryTarget('${target}');`)(
  id=>calls.push(['page',id]),stage=>calls.push(['stage',stage]),
  id=>({scrollIntoView:()=>calls.push(['scroll',id]),focus:()=>calls.push(['focus',id])}),callback=>callback()
 );
 assert.deepEqual(calls,[['page','coachingPage'],['stage','prepare'],['scroll',target],['focus',target]],`Navigation incorrecte: ${label}`);
}
assert(entry[0].includes('data-page="statsPage">Progression d’équipe</button>'));
assert(oldHtml.includes('id="statsPage"'));
assert(source('showPage').includes("if(id==='statsPage')loadStats(currentStatsScope||'mine')"));
assert(source('openUnifiedCoachingHome').includes("showPage('coachingEntryPage')"));
assert(app.includes("document.querySelectorAll('[data-coaching-entry-target]').forEach(b=>b.onclick=()=>openCoachingEntryTarget(b.dataset.coachingEntryTarget))"));
const changed=execFileSync('git',['diff','origin/main','--name-only'],{encoding:'utf8'}).trim().split('\n');
assert(!changed.some(p=>p.endsWith('.sql')||p.startsWith('supabase/')));
console.log('V10.47 checks: OK');
