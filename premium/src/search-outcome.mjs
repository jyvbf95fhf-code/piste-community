import {escapeHTML as e} from './components.mjs';
export const SEARCH_OUTCOMES=Object.freeze([
 ['positive','Positif','Personne retrouvée par le chien.'],
 ['assisted_positive','Orienté positif','Personne retrouvée grâce à une orientation du chien.'],
 ['oriented_not_found','Orienté sans découverte','Orientation donnée par le chien, personne non retrouvée.'],
 ['negative','Négatif','Personne non découverte, sans orientation exploitable.'],
 ['unreported','Non renseigné','Aucun résultat déclaré.']
]);
export function normalizeSearchOutcome(value){
 if(value==null)return null;
 if(typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['code','context','updatedAt'].includes(k))||!SEARCH_OUTCOMES.some(([id])=>id===value.code)||!['search','interrupted','no_target'].includes(value.context)||typeof value.updatedAt!=='string'||value.updatedAt.length>40||!/^\d{4}-\d\d-\d\dT/.test(value.updatedAt)||!Number.isFinite(Date.parse(value.updatedAt)))throw Error('Résultat de recherche invalide.');
 return {code:value.code,context:value.context,updatedAt:value.updatedAt};
}
export function readSearchOutcome(value){try{return normalizeSearchOutcome(value);}catch{return null;}}
export function OutcomeBadge(value){
 const v=readSearchOutcome(value),entry=SEARCH_OUTCOMES.find(([id])=>id===v?.code)||SEARCH_OUTCOMES.at(-1),excluded=v&&v.context!=='search';
 return `<span class="search-outcome-badge" data-search-outcome="${excluded?'excluded':entry[0]}"><strong>${e(excluded?(v.context==='interrupted'?'Recherche interrompue':'Exercice sans personne à découvrir'):entry[1])}</strong><small>${e(excluded?'Hors taux de découverte':entry[2])}</small></span>`;
}
export function OutcomeEditor({id,value=null,editable=false,domain='coaching'}={}){
 const v=readSearchOutcome(value);
 return `<section class="search-outcome-panel" data-outcome-panel="${e(id)}"><span class="eyebrow">BILAN PERSONNEL · ISSUE DE LA RECHERCHE</span>${OutcomeBadge(v)}${editable?`<details ${v?'':'open'}><summary>${v?'Modifier le résultat':'Renseigner le résultat'}</summary><form data-search-outcome-form data-domain="${domain}" data-session-id="${e(id)}"><label>Contexte<select name="context">${[['search','Recherche avec personne à découvrir'],['interrupted','Recherche interrompue · hors calcul'],['no_target','Exercice sans personne à découvrir · hors calcul']].map(([code,label])=>`<option value="${code}" ${v?.context===code?'selected':''}>${label}</option>`).join('')}</select></label><label>Résultat déclaré<select name="code">${[...SEARCH_OUTCOMES.slice(-1),...SEARCH_OUTCOMES.slice(0,-1)].map(([code,label,description])=>`<option value="${code}" ${(v?.code||'unreported')===code?'selected':''}>${label} · ${description}</option>`).join('')}</select></label><button class="button button-gold">Enregistrer le résultat</button><p>Votre bilan personnel est synchronisé avec votre compte. Les traces et le dossier partagé restent conservés.</p></form></details>`:''}</section>`;
}
export function summarizeSearchOutcomes(rows=[]){
 const unique=[...new Map(rows.map(r=>[`${r.kind}:${r.id}`,r])).values()],counts=Object.fromEntries(SEARCH_OUTCOMES.slice(0,4).map(([id])=>[id,0]));let unreported=0,excluded=0;const months=new Map();
 for(const row of unique){const v=readSearchOutcome(row.searchOutcome);if(['CANCELLED','INTERRUPTED','LEFT','Annulée','Interrompue','Participation arrêtée','À compléter'].includes(row.phase||row.status)||v&&v.context!=='search'){excluded++;continue;}if(!v||v.code==='unreported'){unreported++;continue;}counts[v.code]++;
  const date=row.finishedAt||row.startedAt||row.sortAt||row.createdAt,at=typeof date==='number'?date:Date.parse(date||'');const month=Number.isFinite(at)?new Date(at).toISOString().slice(0,7):null;if(month){const m=months.get(month)||{month,total:0,discovered:0};m.total++;if(['positive','assisted_positive'].includes(v.code))m.discovered++;months.set(month,m);}
 }
 const eligible=Object.values(counts).reduce((a,b)=>a+b,0),discovered=counts.positive+counts.assisted_positive;
 return {total:unique.length,counts,unreported,excluded,eligible,discovered,discoveryRate:eligible?Math.round(discovered/eligible*100):null,months:[...months.values()].sort((a,b)=>a.month.localeCompare(b.month))};
}
export function OutcomeStatistics(rows=[],{title='Issues des recherches',split=true}={}){
 const s=summarizeSearchOutcomes(rows),group=(kind,label)=>{const groupRows=rows.filter(r=>r.kind===kind||kind==='coaching'&&r.kind==='training');return groupRows.length?OutcomeStatistics(groupRows,{title:label,split:false}):'';};
 return `<section class="search-outcome-statistics"><header><span class="eyebrow">BILANS DÉCLARÉS</span><h2>${e(title)}</h2><p>Résultats personnels renseignés · aucune conclusion automatique sur la qualité du chien.</p></header><div class="outcome-counts">${SEARCH_OUTCOMES.slice(0,4).map(([id,label])=>`<article data-outcome-count="${id}"><strong>${s.counts[id]}</strong><span>${label}</span></article>`).join('')}</div><p><strong>${s.discoveryRate===null?'Taux indisponible':s.discoveryRate+' % de découvertes'}</strong> · ${s.discovered} / ${s.eligible} recherches renseignées et éligibles. Inclut les positifs et orientés positifs.</p><p>${s.unreported} non renseigné(s) · ${s.excluded} hors calcul (interruption ou absence de personne à découvrir).</p>${s.months.length?`<details><summary>Évolution par mois</summary><ul>${s.months.map(m=>`<li>${e(m.month)} · ${m.discovered} découverte(s) / ${m.total} recherche(s) renseignée(s)</li>`).join('')}</ul></details>`:''}${split?group('operational','OPS')+group('coaching','Coaching'):''}</section>`;
}
