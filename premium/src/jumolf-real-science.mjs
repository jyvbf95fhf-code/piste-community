// Account-only descriptive adapter. Existing synthetic learning engines stay isolated.
import {analyzeJumolfSnapshot} from './jumolf-analysis-engine.mjs';
import {compareJumolfSessions} from './jumolf-comparison.mjs';
import {applyJumolfSourceConsents} from './jumolf-consent.mjs';
import {gpsDistance} from './coaching-gps-model.mjs';
const real=s=>s?.dataOrigin==='account'&&!s.synthetic&&!s.demo&&['coaching','operational'].includes(s.kind)&&['DEBRIEF','ARCHIVED','Terminée','Archivée'].includes(s.status);
const finite=n=>Number.isFinite(n)&&n>=0;
const measure=(value,extra={})=>({value:finite(value)?value:null,status:finite(value)?'calculé':'indisponible',provenance:finite(value)?'calculated':null,...extra});
const timestamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?Date.parse(v):null;
const eventKind=e=>String(e.type||'').trim().toLocaleLowerCase('fr');
const rupture=e=>['rupture','perte de piste'].includes(eventKind(e));
const resumption=e=>['reprise','reprise de piste'].includes(eventKind(e));
const eventEvidence=(e,s)=>({id:e.id||null,sessionId:s.id,type:e.type,timestamp:e.timestamp||null,provenance:'recorded-event'});
const geographic=p=>p?.space==='wgs84'&&Number.isFinite(p.x)&&Math.abs(p.x)<=180&&Number.isFinite(p.y)&&Math.abs(p.y)<=90?{latitude:p.y,longitude:p.x}:null;
function offsets(source){
 const trace=(source.trace||[]).map(geographic),reference=(source.referenceTrace||[]).map(geographic);
 if(!trace.length||!reference.length||trace.some(p=>!p)||reference.some(p=>!p))return {status:'Coordonnées géographiques réelles insuffisantes.',values:null};
 if(trace.length*reference.length>250000)return {status:'Calcul des écarts indisponible : volume supérieur à 250 000 couples de points sur cet appareil.',values:null};
 const values=trace.map(p=>reference.reduce((n,r)=>Math.min(n,gpsDistance(p,r)),Infinity));
 return {values,status:'Écart aux points de référence enregistrés, sans interpolation.',searchPoints:trace.length,referencePoints:reference.length};
}
export function analyzeRealJumolfSnapshot(input,{consents={},...options}={}){
 if(!real(input))return null;
 const s=applyJumolfSourceConsents({dogs:[],sessions:[input],tracks:[],operational:[]},consents).sessions[0];
 const run=analyzeJumolfSnapshot(s,{...options,consents:{...consents,ai_analysis:false}});
 const events=s.events||[],breaks=events.filter(rupture),returns=events.filter(resumption);
 // Zero is justified only by an explicitly complete observation log, never by an empty projection.
 run.metrics.ruptures=measure(breaks.length|| (s.eventsComplete===true?0:null),{evidence:breaks.map(e=>eventEvidence(e,s))});
 run.metrics.resumptions=measure(returns.length|| (s.eventsComplete===true?0:null),{evidence:returns.map(e=>eventEvidence(e,s))});
 run.metrics.duration_seconds=measure(s.metrics?.durationSeconds,{method:'recorded-active-duration'});
 for(const value of Object.values(run.metrics))if(typeof value.value==='number'&&!finite(value.value)){value.value=null;value.status='indisponible';value.provenance=null;}
 const spatial=consents.gps?offsets(s):{values:null,status:'Calcul des écarts désactivé par le consentement GPS.'};
 const method={method:'nearest-recorded-points',searchPoints:spatial.searchPoints??null,referencePoints:spatial.referencePoints??null};
 run.metrics.reference_point_mean_m=measure(spatial.values?.length?spatial.values.reduce((a,b)=>a+b,0)/spatial.values.length:null,method);
 run.metrics.reference_point_max_m=measure(spatial.values?.length?spatial.values.reduce((n,v)=>Math.max(n,v),0):null,method);
 // No mock signals, confidence weights or odor-plume diagnosis enter this path.
 run.hypotheses=[];run.anomaly_signals=[];
 if(consents.ai_analysis){
  const ordered=events.filter(e=>timestamp(e.timestamp)!==null&&(rupture(e)||resumption(e))).slice().sort((a,b)=>timestamp(a.timestamp)-timestamp(b.timestamp));
  const first=ordered.findIndex(rupture),next=first>=0?ordered.slice(first+1).find(e=>resumption(e)&&timestamp(e.timestamp)>timestamp(ordered[first].timestamp)):null;
  if(next){const evidence=[eventEvidence(ordered[first],s),eventEvidence(next,s)];run.hypotheses.push({id:'reported-discontinuity',title:'Discontinuité de suivi signalée puis reprise',status:'exploratory',method:'recorded-event-sequence',explanation:'Les signalements horodatés sont compatibles avec une interruption du suivi puis une reprise déclarée. Ils ne prouvent pas une perte d’odeur.',evidence,supporting_factors:['Une rupture et une reprise sont explicitement enregistrées dans cet ordre.'],limiting_factors:['Aucune mesure directe du signal olfactif.','Les effets du chien, du conducteur, du terrain et de la météo ne sont pas séparés.','Aucune probabilité ni confiance calibrée n’est calculée.']});}
 }
 const observations=[...(breaks.length?[{label:`${breaks.length} rupture(s) explicitement enregistrée(s)`,evidence:breaks.map(e=>eventEvidence(e,s))}]:[]),...(returns.length?[{label:`${returns.length} reprise(s) explicitement enregistrée(s)`,evidence:returns.map(e=>eventEvidence(e,s))}]:[])];
 run.real_science={sourceId:s.id,dataOrigin:'account',observations,interpretationStatus:run.hypotheses.length?'exploratory':'insufficient',interpretationReason:!consents.ai_analysis?'Interprétations désactivées par le consentement.':'Une séquence horodatée de rupture puis reprise est nécessaire ; aucune cause olfactive ne peut être établie avec les seules données actuelles.',geometryStatus:spatial.status};
 run.limitations=['Analyse descriptive de données réelles autorisées.','Les événements décrivent des signalements ; leur absence ne vaut pas zéro ni absence de difficulté.','Le GPS suit le téléphone du conducteur, pas les mouvements précis du chien.','Les écarts comparent des points enregistrés ; ils ne mesurent pas un écart latéral continu à une piste vraie.','La précision GPS et la densité d’échantillonnage peuvent expliquer des écarts.',spatial.status,'Aucune causalité olfactive, probabilité ou progression du chien n’est établie.'];
 if(!consents.gps)for(const key of ['duration_seconds','traveled_distance_m','speed_m_s','reference_point_mean_m','reference_point_max_m','average_lateral_offset_m','max_lateral_offset_m'])run.metrics[key]={...run.metrics[key],value:null,status:'indisponible · consentement GPS désactivé',provenance:null};
 run.missing_inputs=[...new Set([...run.missing_inputs,...Object.entries(run.metrics).filter(([,m])=>m.value===null).map(([k])=>k)])];
 return run;
}
const metrics=['ruptures','resumptions','average_lateral_offset_m','max_lateral_offset_m','reference_point_mean_m','reference_point_max_m','traveled_distance_m','duration_seconds'];
const baseLimits=['Série descriptive, sans test statistique ni démonstration causale.','Une baisse ou une hausse ne constitue pas une amélioration ou une dégradation du chien.','Les variations de distance, durée et nombre d’événements ne sont pas normalisées entre elles.','Séances de types distincts analysées séparément ; aucune identité n’est inférée du nom.','Les séries de signalements ne décrivent pas la fréquence globale des difficultés : les observations manquantes sont exclues, sans les remplacer par zéro.'];
export function buildRealJumolfProfile(dogId,sources=[],{consents={}}={}){
 const insufficient=reason=>({dogId:consents.dog_history?dogId:null,status:'insufficient',trends:[],reason,limits:baseLimits});
 if(!consents.dog_history||!consents.session_comparison)return insufficient('Les consentements historique du chien et comparaison sont nécessaires aux séries. Les métriques GPS requièrent leur consentement séparé.');
 if(!dogId)return insufficient('Aucun chien explicitement associé.');
 const permitted=applyJumolfSourceConsents({dogs:[],sessions:sources,tracks:[],operational:[]},consents).sessions;
 const unique=[...new Map(permitted.filter(s=>real(s)&&(s.dogId||s.dog?.id)===dogId).map(s=>[s.id,s])).values()];
 const rows=unique.map(source=>({source,analysis:analyzeRealJumolfSnapshot(source,{consents})}));
 const trends=[];
 for(const kind of ['coaching','operational'])for(const key of metrics){
  const eligible=rows.filter(r=>r.source.kind===kind&&timestamp(r.source.startedAt)!==null&&finite(r.analysis?.metrics[key]?.value)).sort((a,b)=>timestamp(a.source.startedAt)-timestamp(b.source.startedAt));
  if(eligible.length<2)continue;
  const comparison=compareJumolfSessions(eligible.map(r=>({...r.source,metrics:r.analysis.metrics})));
  const evidence=eligible.map(({source:s,analysis:r})=>({id:s.id,title:s.title||'Séance',date:s.startedAt,value:r.metrics[key].value,provenance:r.metrics[key].provenance,method:r.metrics[key].method||'recorded-input',context:{kind:s.kind,terrain:s.terrain??null,age:s.trackAge?.seconds??null,weather:s.weather??null,wind:s.wind??null,handlerId:s.handlerId??null},eventEvidence:r.metrics[key].evidence||[]}));
  const values=evidence.map(e=>e.value),diff=values.slice(1).map((v,i)=>v-values[i]),ties=new Set(evidence.map(e=>timestamp(e.date))).size!==evidence.length;
  const status=ties?'insufficient':evidence.length<3?'two_observations':'descriptive';
  const direction=ties?'Ordre chronologique insuffisant':diff.every(v=>v===0)?'Valeurs identiques':diff.every(v=>v>=0)?'Hausse descriptive':diff.every(v=>v<=0)?'Baisse descriptive':'Variations dans les deux sens';
  const modes=new Set(eligible.map(r=>r.source.mode).filter(Boolean));
  trends.push({metric:key,kind,status,direction,delta:ties?null:values.at(-1)-values[0],evidence,comparison:{status:modes.size>1?'partially_comparable':comparison.status,label:modes.size>1?'Partiellement comparable':comparison.status_label,reasons:[...comparison.reasons,...(modes.size>1?['Modes de visibilité différents entre les séances.']:[])]},excludedCount:rows.filter(r=>r.source.kind===kind).length-eligible.length,limits:[...baseLimits,...comparison.limitations,...(status!=='descriptive'?['Moins de trois observations chronologiques distinctes : tendance non établie.']:[]),...(comparison.status!=='comparable'?['Contexte partiellement renseigné ou différent : la variation est descriptive et ne compare pas des conditions contrôlées.']:[]),...(key.includes('reference_point')?['Écarts aux points de référence, sensibles à la précision GPS et à l’échantillonnage.']:[])]});
 }
 return {dogId,status:trends.some(t=>t.status==='descriptive')?'descriptive':'insufficient',trends,sessionCount:unique.length,reason:trends.length?'Les variations ci-dessous décrivent uniquement les observations disponibles.':'Données insuffisantes : au moins deux séances distinctes, datées et documentées par métrique sont nécessaires.',limits:baseLimits};
}
