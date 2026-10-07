const average=values=>{const usable=values.filter(Number.isFinite);return usable.length?usable.reduce((sum,value)=>sum+value,0)/usable.length:null;};
const round=(value,digits=1)=>Number.isFinite(value)?Number(value.toFixed(digits)):null;
const qualityScore={high:100,medium:72,low:43,insufficient:15};
const mean=(sessions,selector)=>average(sessions.map(selector));
const groupStats=sessions=>({count:sessions.length,averageConfidence:round(mean(sessions,item=>item.confidence)),averageTrackAgeMinutes:round(mean(sessions,item=>item.trackAge.seconds===null?null:item.trackAge.seconds/60)),averageDistanceKm:round(mean(sessions,item=>item.distanceKm),2),averageRuptures:round(mean(sessions,item=>item.ruptures)),averageResumptions:round(mean(sessions,item=>item.resumptions)),averageQuality:round(mean(sessions,item=>qualityScore[item.quality.level]))});
const phaseLabel={phase_initiale:'Phase initiale',consolidation:'Consolidation',maturite:'Maturité',profil_confirme:'Profil confirmé'};
const ageGroup=minutes=>minutes===null?'Non renseigné':minutes<60?'< 1 h':minutes<180?'1–3 h':minutes<360?'3–6 h':minutes<720?'6–12 h':'> 12 h';
const temperatureBand=value=>value===null?'Météo indisponible':value<7?'Froid':value<18?'Tempéré':'Chaud';
const humidityBand=value=>value===null?'Humidité indisponible':value<45?'Faible':value<70?'Moyenne':'Élevée';
function byGroup(sessions,key,labelOf){
 const groups=new Map();for(const session of sessions){const label=labelOf(session);if(!groups.has(label))groups.set(label,[]);groups.get(label).push(session);}
 return [...groups.entries()].map(([label,rows])=>({key:label,label,...groupStats(rows)})).sort((a,b)=>a.label.localeCompare(b.label,'fr'));
}
export function buildJumolfSyntheticAnalytics(sessions=[]){
 const rows=sessions.filter(item=>item?.synthetic===true),training=rows.filter(item=>item.kind==='training'),operational=rows.filter(item=>item.kind==='operational');
 const referenceCount=rows.filter(item=>Array.isArray(item.referenceTrace)&&item.referenceTrace.length>0).length,completeCount=rows.filter(item=>item.quality.missingInputs.length===0).length;
 const phaseOrder=['phase_initiale','consolidation','maturite','profil_confirme'];
 const summaries=byGroup(rows,'phase',item=>item.phase.id).sort((a,b)=>phaseOrder.indexOf(a.key)-phaseOrder.indexOf(b.key)).map(group=>({...group,label:phaseLabel[group.key]||group.key,sessionCount:group.count}));
 const ageTrends=byGroup(rows,'ageBand',item=>ageGroup(item.trackAge.seconds===null?null:item.trackAge.seconds/60));
 const weatherTrends=byGroup(rows,'temperature',item=>temperatureBand(item.weather?.temperatureC??null));
 const environmentTrends=byGroup(rows,'environment',item=>item.environment.primary);
 const pollutionTrends=byGroup(rows,'pollution',item=>item.scentPollution.level);
 const typeComparison={training:groupStats(training),operational:groupStats(operational)};
 return{
  totalSessions:rows.length,trainingCount:training.length,operationalCount:operational.length,
  totalDistanceM:rows.reduce((sum,item)=>sum+(item.metrics.distanceM||0),0),totalDurationSeconds:rows.reduce((sum,item)=>sum+(item.metrics.durationSeconds||0),0),
  averageTrackAgeMinutes:round(mean(rows,item=>item.trackAge.seconds===null?null:item.trackAge.seconds/60)),
  unknownTrackAgeCount:rows.filter(item=>item.trackAge.status==='unknown').length,
  averageRuptures:round(mean(rows,item=>item.ruptures)),averageResumptions:round(mean(rows,item=>item.resumptions)),averageConfidence:round(mean(rows,item=>item.confidence)),
  averageQuality:round(mean(rows,item=>qualityScore[item.quality.level])),referenceRate:rows.length?round(referenceCount/rows.length*100):null,
  completeDataRate:rows.length?round(completeCount/rows.length*100):null,
  training:groupStats(training),operational:groupStats(operational),
  period:{start:rows[0]?.startedAt||null,end:rows.at(-1)?.startedAt||null},
  trends:{confidenceByPhase:summaries.map(({key,label,count,averageConfidence})=>({key,label,count,averageConfidence})),resumptionDelayByPhase:summaries.map(({key,label,count})=>({key,label,count,averageDelaySeconds:round(mean(rows.filter(item=>item.phase.id===key),item=>item.resumptionDelaySeconds))})),performanceByTrackAge:ageTrends,performanceByWeather:weatherTrends,performanceByHumidity:byGroup(rows,'humidity',item=>humidityBand(item.weather?.humidityPercent??null)),performanceByEnvironment:environmentTrends,performanceByPollution:pollutionTrends,trainingVsOperational:typeComparison},
  groups:{trainingVsOperational:typeComparison},
  synthetic:true
 };
}
export function compareJumolfSyntheticGroups(sessions=[],dimension='kind',first='training',second='operational'){
 const selectors={kind:item=>item.kind,ageBand:item=>ageGroup(item.trackAge.seconds===null?null:item.trackAge.seconds/60),environment:item=>item.environment.primary,pollution:item=>item.scentPollution.level,humidity:item=>humidityBand(item.weather?.humidityPercent??null),weather:item=>temperatureBand(item.weather?.temperatureC??null)};
 const selector=selectors[dimension]||selectors.kind,left=sessions.filter(item=>selector(item)===first),right=sessions.filter(item=>selector(item)===second);
 return[['Sessions','count',left.length,right.length],['Confiance moyenne','averageConfidence',groupStats(left).averageConfidence,groupStats(right).averageConfidence],['Distance moyenne · km','averageDistanceKm',groupStats(left).averageDistanceKm,groupStats(right).averageDistanceKm],['Ruptures moyennes','averageRuptures',groupStats(left).averageRuptures,groupStats(right).averageRuptures],['Reprises moyennes','averageResumptions',groupStats(left).averageResumptions,groupStats(right).averageResumptions],['Qualité moyenne','averageQuality',groupStats(left).averageQuality,groupStats(right).averageQuality]].map(([label,key,valueA,valueB])=>({label,key,first:{label:first,value:valueA},second:{label:second,value:valueB},derived:true}));
}
export function buildJumolfSyntheticDogProfile(sessions=[]){
 const rows=sessions.filter(item=>item.synthetic===true&&item.dog?.id==='demo-nox'),training=rows.filter(item=>item.kind==='training'),operational=rows.filter(item=>item.kind==='operational'),phaseRows=byGroup(rows,'phase',item=>item.phase.id).sort((a,b)=>['phase_initiale','consolidation','maturite','profil_confirme'].indexOf(a.key)-['phase_initiale','consolidation','maturite','profil_confirme'].indexOf(b.key)).map(item=>({...item,label:phaseLabel[item.key]||item.key,sessionCount:item.count}));
 const lateral=rows.filter(item=>item.weather?.windDirection?.startsWith('latéral')),nonLateral=rows.filter(item=>item.weather&& !item.weather.windDirection?.startsWith('latéral'));
 const natural=rows.filter(item=>['terre','herbe','sous-bois','sol humide','feuilles','chemin forestier'].includes(item.surface));
 const urban=rows.filter(item=>/urbain|périurbain|croisement/.test(item.environment.primary));
 const meanLateral=mean(lateral,item=>item.confidence),meanOther=mean(nonLateral,item=>item.confidence),meanNaturalDelay=mean(natural,item=>item.resumptionDelaySeconds),meanNaturalConfidence=mean(natural,item=>item.confidence),meanUrban=mean(urban,item=>item.confidence),meanAll=mean(rows,item=>item.confidence);
 const trackAgeGroups=byGroup(rows,'age',item=>ageGroup(item.trackAge.seconds===null?null:item.trackAge.seconds/60)),environmentGroups=byGroup(rows,'environment',item=>item.environment.primary);
 return{dog:{id:'demo-nox',name:'Nox',breed:'Berger allemand',age:'Profil fictif',specialty:'Recherche différée'},synthetic:true,label:'Profil basé sur données synthétiques',sessionCount:rows.length,trainingCount:training.length,operationalCount:operational.length,totalDistanceM:rows.reduce((sum,item)=>sum+item.metrics.distanceM,0),averageTrackAgeMinutes:round(mean(rows,item=>item.trackAge.seconds===null?null:item.trackAge.seconds/60)),averageRuptures:round(mean(rows,item=>item.ruptures)),averageResumptions:round(mean(rows,item=>item.resumptions)),averageConfidence:round(meanAll),phases:phaseRows,trends:{windLateralSensitivity:{lateralConfidence:round(meanLateral),otherConfidence:round(meanOther),difference:round(meanLateral===null||meanOther===null?null:meanLateral-meanOther)},naturalSurfaceResumptionDelaySeconds:round(meanNaturalDelay),naturalSurfaceConfidence:round(meanNaturalConfidence),urbanConfidence:round(meanUrban),confidenceByPhase:phaseRows.map(item=>({label:item.label,value:item.averageConfidence,count:item.sessionCount})),trackAgeGroups,environmentGroups},forcesApparentes:[...(meanNaturalConfidence!==null&&meanAll!==null&&meanNaturalConfidence>=meanAll?['Confiance moyenne au moins comparable sur les surfaces naturelles du scénario']:[]),...(meanLateral!==null&&meanOther!==null&&Math.abs(meanLateral-meanOther)<8?['Confiance descriptive proche entre les catégories de vent renseignées']:[])],situationsDifficiles:[...(meanUrban!==null&&meanAll!==null&&meanUrban<meanAll?['Contexte urbain, périurbain ou croisement complexe · confiance moyenne inférieure à la moyenne du dataset']:[]),...(rows.some(item=>item.scentPollution.level==='high'&&item.difficulty.score>=7)?['Quelques sessions combinent pollution élevée et difficulté forte']:[])],atypicalSessions:rows.filter(item=>item.atypicalCode).length,anomalyCount:detectJumolfSyntheticAnomalies(rows).length,limitations:'Analyse descriptive des données synthétiques uniquement ; aucune conclusion scientifique ou canine réelle.'};
}
export function detectJumolfSyntheticAnomalies(sessions=[]){
 const anomalies=[];for(const item of sessions){const add=(code,title,why)=>anomalies.push({id:`${item.id}-${code}`,sessionId:item.id,title,why,kind:item.kind,startedAt:item.startedAt,synthetic:true});
  if(item.distanceKm>10)add('long-route','Distance atypique',`${item.distanceKm} km dépasse le seuil de démonstration de 10 km.`);
  if(item.ruptures>=5)add('multiple-breaks','Ruptures nombreuses',`${item.ruptures} ruptures sont enregistrées dans cette session.`);
  if(item.trackAge.seconds!==null&&item.trackAge.seconds>=64800)add('old-track','Âge de piste élevé',`Âge déclaré : ${item.trackAge.label}.`);
  if(item.scentPollution.level==='high'&&item.ruptures>=4)add('pollution-breaks','Pollution et ruptures',`Pollution ${item.scentPollution.level} avec ${item.ruptures} ruptures consignées.`);
  if(item.confidence<=40&&item.scentPollution.level==='low'&&item.weather?.windSpeedKmh<8)add('low-confidence-favorable','Confiance mock basse en conditions favorables',`Le score mock de ${item.confidence} est bas alors que la pollution et le vent déclarés sont faibles.`);
  if(item.confidence>=80&&(item.weather?.windSpeedKmh>=28||item.scentPollution.level==='high'))add('strong-adverse','Résultat élevé en contexte contraignant',`Confiance mock ${item.confidence} malgré un vent soutenu ou une pollution élevée.`);
  if(item.weather?.windDirection==='variable'&&item.weather.windSpeedKmh>=28)add('variable-wind','Vent variable soutenu',`Vent variable à ${item.weather.windSpeedKmh} km/h.`);
  if(item.quality.level==='low'&&item.trace.length===0)add('partial-trace','Trace indisponible',`Qualité ${item.quality.level} avec trace synthétique absente.`);
 }
 return anomalies;
}
export function filterJumolfSyntheticSessions(sessions=[],filters={}){
 return sessions.filter(item=>item.synthetic===true)
  .filter(item=>!filters.type||filters.type==='all'||item.kind===filters.type)
  .filter(item=>!filters.age||filters.age==='all'||item.trackAge.band===filters.age)
  .filter(item=>!filters.environment||filters.environment==='all'||item.environment.primary===filters.environment)
  .filter(item=>!filters.weather||filters.weather==='all'||(filters.weather==='unknown'?!item.weather:item.weather?.rain===filters.weather))
  .filter(item=>!filters.difficulty||filters.difficulty==='all'||item.difficulty.level===filters.difficulty)
  .filter(item=>!filters.pollution||filters.pollution==='all'||item.scentPollution.level===filters.pollution)
  .filter(item=>!filters.quality||filters.quality==='all'||item.quality.level===filters.quality)
  .filter(item=>!filters.result||filters.result==='all'||item.result===filters.result);
}
