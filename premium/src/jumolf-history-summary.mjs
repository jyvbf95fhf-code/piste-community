// Read-only synthesis of the existing consent-filtered report. No canine score or causal diagnosis.
export function summarizeHistory(report={}) {
 const rows=[...new Map((report.history||[]).map(r=>[r.id,r])).values()];
 const facts=[];
 for(const [kind,label] of [['operational','OPS'],['coaching','Coaching']]) {
  const group=rows.filter(r=>r.kind===kind);
  const observed=group.filter(r=>Number.isFinite(r.metrics?.ruptures?.value));
  const repeated=observed.filter(r=>r.metrics.ruptures.value>0);
  if(repeated.length>=2) facts.push({text:`Des ruptures ont été signalées dans ${repeated.length} séances ${label}, sur ${observed.length} où cette observation est renseignée. Leur cause reste à examiner.`,ids:repeated.map(r=>r.id),type:'recurrence'});
  const outcomes=group.filter(r=>r.searchOutcome?.context==='search'&&['positive','assisted_positive','oriented_not_found','negative'].includes(r.searchOutcome.code));
  const found=outcomes.filter(r=>['positive','assisted_positive'].includes(r.searchOutcome.code));
  if(outcomes.length>=2)facts.push({text:`En ${label}, ${found.length} recherches sur ${outcomes.length} aux résultats renseignés se sont conclues par une découverte, directement ou après orientation du chien. Ce bilan décrit les issues déclarées, pas un niveau de maîtrise.`,ids:outcomes.map(r=>r.id),type:'outcome'});
 }
 const trends=[...(report.progress?.comparable||[])].filter(t=>t.comparison?.status==='comparable'&&new Set((t.evidence||[]).map(x=>x.sessionId||x.id)).size>=2);
 const gps=rows.filter(r=>Number.isFinite(r.metrics?.traveled_distance_m?.value)).length;
 const context=rows.filter(r=>r.context?.terrain||r.context?.weather||r.context?.wind).length;
 const recommendations=(report.recommendations||[]).map(rec=>({...rec,support:[...new Set((rec.evidence||[]).map(ev=>ev.sessionId||ev.id).filter(id=>rows.some(r=>r.id===id)))]})).sort((a,b)=>Number(b.personalized&&b.support.length>=2)-Number(a.personalized&&a.support.length>=2)||b.support.length-a.support.length);
 const recurring=recommendations.filter(r=>r.personalized&&r.support.length>=2).sort((a,b)=>Number(b.key==='interruptions')-Number(a.key==='interruptions'));
 if(!facts.length&&rows.length)facts.push({text:rows.length<2?'Une seule séance ne permet pas encore de repérer une récurrence.':'Aucune difficulté récurrente suffisamment documentée ne ressort actuellement. Cela ne signifie pas qu’il n’existe aucune difficulté.',ids:[],type:'limited'});
 return {rows,facts:facts.slice(0,3),trends,gps,context,recommendations:recurring.length?recurring.slice(0,2):recommendations.filter(r=>!r.personalized).slice(0,1),ops:rows.filter(r=>r.kind==='operational').length,coaching:rows.filter(r=>r.kind==='coaching').length};
}
