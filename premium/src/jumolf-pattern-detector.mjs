const MIN_SAMPLE=8;
const ageWindow=age=>age?.band==='30_90m'?'45–90 min':age?.band==='90m_3h'?'1 h 30–3 h':age?.band==='3_6h'?'3–6 h':null;
const rural=item=>/forêt|lisière|prairie|sentier|vignoble|agricole|humide|relief/.test(item.environment?.primary||'');
const microScore=item=>{
 const signal=item.microSignals||{};
 return Math.min(100,Math.round((signal.hesitations||0)*18+(signal.left_turn_hesitations||0)*20+(signal.zigzag_index||0)*14+(signal.temporary_corridor_exits||0)*20+(signal.investigation_seconds||0)/8+(signal.lateral_deviation_m||item.metrics?.averageLateralOffset||0)*1.4+(item.resumptionDelaySeconds||0)/35));
};
const avg=items=>items.length?items.reduce((sum,item)=>sum+microScore(item),0)/items.length:0;
const quality=items=>items.length?Math.round(items.reduce((sum,item)=>sum+(item.quality?.score||0),0)/items.length):0;
const reliability=(items,effect)=>Math.max(24,Math.min(92,Math.round(38+Math.min(items.length,30)*1.1+Math.min(effect,30)*.55+(quality(items)-50)*.18)));
const makeFinding=(id,title,conditions,focus,affected,baseline,metric,limiting=[])=>{
 const effect=Math.round(Math.max(0,metric-avg(baseline)));
 const count=affected.length, confidence=reliability(affected,effect);
 const enoughData=count>=MIN_SAMPLE&&baseline.length>=MIN_SAMPLE, strong=enoughData&&effect>=8;
 const confidenceLabel=!enoughData?'Faible':confidence>=75?'Élevée':confidence>=58?'Moyenne':'Faible';
 const qualityScore=quality(affected);
 const referenceMean=Math.round(avg(baseline)*10)/10,signalMean=Math.round(metric*10)/10;
 return {id,title,observation:`${focus} semble plus fréquent dans ces conditions : ${conditions}. Tendance observée sur ${count} sessions, avec ${affected.reduce((n,s)=>n+(s.microSignals?.hesitations||0)+(s.ruptures||0),0)} événements de suivi associés. Le score synthétique moyen du groupe est ${signalMean}, contre ${referenceMean} sur ${baseline.length} sessions de comparaison.`,conditions,sessions_count:count,reference_sessions:baseline.length,signal_mean:signalMean,reference_signal_mean:referenceMean,event_count:affected.reduce((n,s)=>n+(s.microSignals?.hesitations||0)+(s.ruptures||0),0),since:affected.length?affected[0].startedAt:null,confidence,confidence_label:confidenceLabel,data_quality:qualityScore>=75?'Bonne':qualityScore>=50?'Moyenne':'Limitée',data_quality_score:qualityScore,supporting_factors:[`${count} sessions dans le groupe conditionnel`,`score moyen ${signalMean} contre ${referenceMean} dans le groupe de comparaison`],limiting_factors:[...limiting,...(!enoughData?['Échantillon comparable trop réduit pour une recommandation fiable.']:[]),...(affected.some(item=>!item.weather)?['Certaines sessions ne disposent pas de météo complète.']:[]),'Météo, pollution et micro-signaux sont simulés.','La vitesse et les consignes du conducteur ne sont pas mesurées ; la part chien / conducteur ne peut pas être distinguée.','Les micro-signaux ne sont pas horodatés ; une séquence précise précédant une rupture ne peut pas être établie.','Toutes les sessions sont synthétiques et ne constituent pas une validation scientifique.'],why_missed:'Ce signal peut passer inaperçu en séance car une reprise rapide peut suivre l’hésitation sans rupture complète.',priority:!enoughData?'Données insuffisantes':strong&&confidence>=75?'Priorité élevée':strong&&confidence>=58?'Priorité moyenne':'À surveiller',recommendation:strong?{summary:`Comparer progressivement des séances comparables en variant un seul facteur à la fois : ${conditions}.`,environment:rural(affected[0])?'rural':affected[0]?.environment?.primary||'mixte',track_age_minutes:affected.some(item=>item.trackAge?.band==='30_90m')?60:180}:null,synthetic:true,metric:'micro-signal synthétique'};
};
export function detectJumolfPatterns(sessions=[]){
 const rows=sessions.filter(item=>item?.synthetic===true).slice().sort((a,b)=>String(a.startedAt).localeCompare(String(b.startedAt)));
 if(!rows.length)return [];
 const findings=[];
 // Inspect real condition groups and compare them with their remaining sample.
 for(const band of ['30_90m','90m_3h','3_6h'])for(const isRural of [true,false]){
  const group=rows.filter(item=>item.trackAge?.band===band&&rural(item)===isRural),base=rows.filter(item=>item.trackAge?.band!==band||rural(item)!==isRural);
  const effect=avg(group)-avg(base);if(group.length>=MIN_SAMPLE&&base.length>=MIN_SAMPLE&&effect>=5){
   const label=band==='30_90m'?'45 à 90 min':band==='90m_3h'?'1 h 30 à 3 h':'3 à 6 h';
   findings.push(makeFinding(`age-environment-${band}-${isRural?'rural':'other'}`,`Micro-signaux à surveiller · ${isRural?'milieu rural':'autres terrains'} · ${label}`,`pistes de ${label} en ${isRural?'milieu rural':'terrain varié'}`,'des hésitations ou écarts temporaires',group,base,avg(group),[]));
  }
 }
 for(const level of ['high','medium']){
  const group=rows.filter(item=>item.scentPollution?.level===level),base=rows.filter(item=>item.scentPollution?.level!==level),effect=avg(group)-avg(base),levelLabel=level==='high'?'élevée':'moyenne';
  if(group.length>=MIN_SAMPLE&&base.length>=MIN_SAMPLE&&effect>=5)findings.push(makeFinding(`pollution-${level}`,`Pollution olfactive · niveau ${levelLabel}`,`pollution ${levelLabel} et terrains observés`,'des hésitations ou ruptures',group,base,avg(group),['La pollution est déclarée dans les scénarios mock.']));
 }
 const leftWindow=rows.filter(item=>item.trackAge?.band==='30_90m'&&rural(item)&&item.microSignals?.left_turns>0),leftBaseline=rows.filter(item=>item.trackAge?.band==='30_90m'&&rural(item)&&!item.microSignals?.left_turns);
 if(leftWindow.length||leftBaseline.length)findings.push(makeFinding('left-junction-45-90-rural','Carrefours à gauche · piste de 45 à 90 min',`carrefours à gauche, piste de 45 à 90 min et milieu rural`,'des hésitations sur les changements à gauche',leftWindow,leftBaseline,avg(leftWindow),['Les changements gauche / droite sont simulés et le groupe comparable peut rester réduit.']));
 for(const band of ['30_90m','90m_3h']){
  const group=rows.filter(item=>item.trackAge?.band===band),mean=avg(group);
  if(group.length<MIN_SAMPLE)findings.push(makeFinding(`insufficient-${band}`,`Tendance émergente · ${ageWindow(group[0]?.trackAge)??'âge de piste'}`,`pistes de ${ageWindow(group[0]?.trackAge)??'cet âge'}`,'un signal encore incertain',group,rows.filter(item=>item.trackAge?.band!==band),mean,['Moins de huit sessions comparables.']));
 }
 const priority={'Priorité élevée':0,'Priorité moyenne':1,'À surveiller':2,'Données insuffisantes':3};
 const sorted=findings.sort((a,b)=>priority[a.priority]-priority[b.priority]||b.confidence-a.confidence||a.id.localeCompare(b.id));
 if(!sorted.length){const small=rows.slice(0,Math.min(rows.length,5));sorted.push(makeFinding('insufficient-overall','Données encore insuffisantes','conditions croisées encore peu représentées','un signal exploratoire',small,[],0,['Il faut davantage de sessions comparables.']));}
 return sorted;
}
