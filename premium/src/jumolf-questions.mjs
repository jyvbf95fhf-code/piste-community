import {escapeHTML as e} from './components.mjs';

export const QUESTION_MIN_SESSIONS=5;
const finished=new Set(['DEBRIEF','ARCHIVED','Terminée','Archivée']);
const suggestions=['Que devrais-je travailler ?', 'Sur quelles pistes tu te bases ?', 'Adapte à 20 minutes'];
const sessionTime=s=>Date.parse(s.finishedAt||s.startedAt)||0;
const meters=new Intl.NumberFormat('fr-FR',{style:'unit',unit:'meter',maximumFractionDigits:1});
const dateTime=new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short'});
const distanceLabels={
 reference_point_mean_m:'Écart moyen',reference_point_max_m:'Écart maximal',
 average_lateral_offset_m:'Écart latéral moyen',max_lateral_offset_m:'Écart latéral maximal',
 traveled_distance_m:'Distance parcourue'
};

export function jumolfQuestionSessions(sessions,dogId){
 const eligible=sessions.filter(s=>s.id&&s.dogId===dogId&&s.kind==='coaching'&&s.dataOrigin==='account'&&!s.demo&&!s.synthetic&&finished.has(s.status));
 return [...new Map(eligible.map(s=>[s.id,s])).values()].sort((a,b)=>sessionTime(b)-sessionTime(a));
}

export function jumolfQuestionIntent(question){
 const text=question.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/[’']/g,' ').replace(/\s+/g,' ').trim();
 const timing=text.match(/(?:^|\D)(\d{1,3})\s*(?:minutes?|min)\b/);
 if(timing&&/\b(adapt\w*|exercice|seance|entrainement|piste|temps|j ai)\b/.test(text))return {type:'duration',minutes:Number(timing[1])};
 if(/\b(pourquoi|justifi\w*|preuves?|sources?)\b|(?:quelles?|sur quoi)\b.*(?:pistes?|seances?|bas\w*|appui\w*)/.test(text))return {type:'evidence'};
 if(/\b(conseil\w*|travaill\w*|propos\w*|exercices?|recommand\w*)\b|prochain\w*\s+(?:piste|seance|entrainement)/.test(text))return {type:'recommendation'};
 return {type:'unknown'};
}

function answer(intent,recommendation,dogName){
 switch(intent.type){
 case 'recommendation':
  if(recommendation?.key==='reference'){
   return {text:`Pour la prochaine piste de ${dogName}, choisis un parcours court avec un virage bien repérable. Au débrief, repère sur la carte où la recherche s’écarte du tracé de pose. Si tu as observé un écart sur le terrain, note à quel endroit ${dogName} a repris la piste. Un écart GPS seul ne suffit pas pour juger le travail du chien.`,recommendation};
  }
  return {text:recommendation
   ? `${recommendation.title}. ${recommendation.objective}`
   : `Je te propose une piste familière avec ${dogName}. Note un événement précis et les conditions du moment pour que les prochaines pistes puissent éclairer ton choix d’exercice.`,recommendation};
 case 'evidence':
  return {text:recommendation?'Voici les observations qui motivent la proposition.':'Je n’ai pas assez d’observations pour justifier une recommandation personnalisée.',evidence:recommendation?.evidence,showEvidence:true};
 case 'duration':{
  const {minutes}=intent;
  if(minutes<10||minutes>90)return {text:'Pour cet essai, indique une durée entre 10 et 90 minutes.'};
  const intro=Math.round(minutes*.15),debrief=Math.round(minutes*.2);
  return {text:`Pour ${minutes} minutes : ${intro} min pour fixer un objectif, jusqu’à ${minutes-intro-debrief} min pour la piste, et ${debrief} min de débrief. ${recommendation?.objective||'Choisis une piste familière et relève un seul point à observer.'} Adapte le temps de piste à ton chien.`,evidence:recommendation?.evidence};
 }
 default:
  return {text:'Je peux proposer un exercice, montrer les pistes qui le justifient ou adapter l’exercice à une durée. Essaie une de ces questions.'};
 }
}

export function jumolfQuestionAnswers(questions,report,dogName){
 const recommendation=report?.recommendations.find(r=>r.personalized&&r.evidence.length)||null;
 return questions.map(question=>({question,...answer(jumolfQuestionIntent(question),recommendation,dogName)}));
}

function observationText({key,label,value}){
 if(Object.hasOwn(distanceLabels,key)&&Number.isFinite(value)){
  return distanceLabels[key]+' : '+(value>0&&value<1?'moins de 1 m':meters.format(value));
 }
 if((key==='duration_seconds'||key==='track_age')&&Number.isFinite(value)){
  return label+' : '+Math.round(value/60)+' min';
 }
 return label+' : '+value;
}

function evidenceList(evidence,open){
 if(!evidence?.length)return '';
 const label=evidence.length===1?'Voir la piste utilisée':`Voir les ${evidence.length} pistes utilisées`;
 return `<details class="jumolf-question-evidence" ${open?'open':''}><summary>${label}</summary><ul>${evidence.map(s=>{
  const at=Date.parse(s.date),stamp=Number.isFinite(at)?dateTime.format(at):'';
  return `<li><a href="/jumolf/session/${encodeURIComponent(s.sessionId)}">${e(s.title)}${stamp?' · '+e(stamp):''}</a>
   <span>${e(s.observations.map(observationText).join(' · '))}</span></li>`;
 }).join('')}</ul></details>`;
}

export function JumolfQuestionsScreen({dog,dogs=[],count=0,consents={},answers=[],canPrepare=false}={}){
 const back='/jumolf'+(dog?'?dog='+encodeURIComponent(dog.id):'');
 const header=`<a class="jumolf-back" href="${e(back)}">← Retour à JUMOLF</a><h1>Demander à JUMOLF</h1>`;
 let content;
 if(!consents.dog_history||!consents.ai_analysis){
  content='<p>Activez l’historique du chien et les interprétations JUMOLF pour accéder aux conseils.</p><a class="jumolf-button secondary" href="/jumolf/settings">Gérer mes consentements</a>';
 }else if(!dog){
  content='<p>Choisis le chien sur lequel poser ta question.</p>';
 }else if(count<QUESTION_MIN_SESSIONS){
  const remaining=QUESTION_MIN_SESSIONS-count;
  content=`<p><strong>${count} pistes Coaching sur ${QUESTION_MIN_SESSIONS}</strong></p><p>Termine encore ${remaining} piste${remaining===1?'':'s'} Coaching avec ${e(dog.name)} pour débloquer ses conseils.</p>`;
 }else{
  const latest=answers.at(-1);
  content=`<p>Pose une question sur les 5 dernières pistes Coaching de ${e(dog.name)}. Tes questions sont traitées sur cet appareil.</p>
  <ol class="jumolf-question-thread" aria-live="polite">${answers.map(a=>`<li><p><strong>Toi</strong> · ${e(a.question)}</p><p><strong>JUMOLF</strong> · ${e(a.text)}</p>${evidenceList(a.evidence||a.recommendation?.evidence,a.showEvidence)}</li>`).join('')}</ol>
  <form class="jumolf-question-form" data-jumolf-question="ask" data-dog="${e(dog.id)}">
   <label for="jumolf-question">Ta question</label><textarea id="jumolf-question" name="question" maxlength="240" rows="2" placeholder="Que devrais-je travailler avec ${e(dog.name)} ?"></textarea>
   <button type="submit" class="jumolf-button primary">Envoyer</button>
   <div class="jumolf-question-suggestions">${suggestions.map(value=>`<button type="submit" class="jumolf-button secondary" name="example" value="${e(value)}">${e(value)}</button>`).join('')}</div>
  </form>
  ${canPrepare&&latest?.recommendation?`<form data-jumolf-question="prepare" data-dog="${e(dog.id)}"><button class="jumolf-button secondary" type="submit">Préparer l’exercice en Coaching</button></form>`:''}`;
 }
 const chooser=consents.dog_history&&consents.ai_analysis&&dogs.length?`<label class="v3-dog-chooser">Mon chien<select data-jumolf-question-dog><option value="">Choisir un chien</option>${dogs.map(item=>`<option value="${e(item.id)}" ${item.id===dog?.id?'selected':''}>${e(item.name)}</option>`).join('')}</select></label>`:'';
 return `<section class="jumolf-panel jumolf-question-panel">${header}${chooser}${content}</section>`;
}
