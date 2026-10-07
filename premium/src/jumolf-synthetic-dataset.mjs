export const JUMOLF_SYNTHETIC_SEED='PISTE-JUMOLF-SYNTHETIC-2026';
export const JUMOLF_SYNTHETIC_SESSION_COUNT=150;
export const JUMOLF_SYNTHETIC_TRAINING_COUNT=100;
export const JUMOLF_SYNTHETIC_OPERATIONAL_COUNT=50;
export const JUMOLF_SYNTHETIC_DOG_ID='demo-nox';
const dog=Object.freeze({id:JUMOLF_SYNTHETIC_DOG_ID,name:'Nox',breed:'Berger allemand',age:'Profil fictif',specialty:'Recherche différée'});
const phaseFor=index=>index<30?'phase_initiale':index<70?'consolidation':index<110?'maturite':'profil_confirme';
const phases=[
 {id:'phase_initiale',label:'Phase initiale',start:1,end:30,progress:.08},
 {id:'consolidation',label:'Consolidation',start:31,end:70,progress:.3},
 {id:'maturite',label:'Maturité',start:71,end:110,progress:.54},
 {id:'profil_confirme',label:'Profil confirmé',start:111,end:150,progress:.68}
];
const environments=['forêt','lisière','prairie','sentier','zone urbaine','périurbain','vignoble','chemin agricole','terrain mixte','zone humide','relief modéré','croisement complexe'];
const surfaces=['terre','herbe','sous-bois','gravier','bitume','béton','sol humide','feuilles','chemin forestier','mélange surfaces'];
const pollutionCauses=['passage humain','chiens tiers','circulation','croisement','activité récente','zone commerciale'];
const ageBands=[{id:'under_30m',min:5,max:30},{id:'30_90m',min:30,max:90},{id:'90m_3h',min:90,max:180},{id:'3_6h',min:180,max:360},{id:'6_12h',min:360,max:720},{id:'over_12h',min:720,max:1080}];
const ageDistribution={training:[.13,.31,.29,.17,.08,.02],operational:[.04,.14,.27,.27,.19,.09]};
const atypicalIndices=new Map([[8,'excellent_adverse'],[19,'incomplete_gps'],[31,'high_pollution_breaks'],[43,'old_track'],[54,'weak_favorable'],[66,'variable_wind'],[77,'long_route'],[89,'excellent_polluted'],[101,'low_quality'],[114,'many_breaks'],[128,'long_operational'],[143,'unexpectedly_stable']]);
const hashSeed=value=>{let hash=2166136261;for(const char of String(value)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;};
function seededRandom(seed){let state=hashSeed(seed);return()=>{state=(state+0x6D2B79F5)>>>0;let value=state;value=Math.imul(value^(value>>>15),value|1);value^=value+Math.imul(value^(value>>>7),value|61);return((value^(value>>>14))>>>0)/4294967296;};}
const pick=(random,values)=>values[Math.floor(random()*values.length)];
const chooseWeighted=(random,values,weights)=>{let needle=random(),sum=0;for(let index=0;index<values.length;index++){sum+=weights[index];if(needle<=sum)return values[index];}return values.at(-1);};
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const round=(value,digits=0)=>Number(value.toFixed(digits));
const ageLabel=minutes=>minutes===null?'Non renseigné':minutes<60?`${minutes} min`:`${Math.floor(minutes/60)} h${minutes%60?` ${minutes%60}`:''}`;
const timestampAt=(start,duration,ratio)=>new Date(Date.parse(start)+Math.round(duration*ratio*1000)).toISOString();
function weatherFor(random,index,phase,atypical){
 let temperature=round(-1+random()*27),humidity=Math.round(30+random()*68),windSpeed=round(random()*32,1),windDirection=pick(random,['face','arrière','latéral gauche','latéral droit','variable']);
 let rain=pick(random,['aucune','pluie légère','pluie récente','sol humide','pluie soutenue']);
 if(atypical==='variable_wind'){windSpeed=28;windDirection='variable';}
 if(atypical==='excellent_adverse'){temperature=2;humidity=94;windSpeed=31;windDirection='latéral gauche';rain='pluie récente';}
 if(atypical==='old_track'){humidity=87;rain='sol humide';}
 if(atypical==='weak_favorable'){temperature=14;humidity=56;windSpeed=4;windDirection='face';rain='aucune';}
 if(atypical==='unexpectedly_stable'){windSpeed=29;windDirection='variable';rain='pluie soutenue';}
 const available=!['incomplete_gps','low_quality'].includes(atypical)&&!(index%17===4)&&!(index%13===7);
 const conditions=available?{temperatureC:temperature,humidityPercent:humidity,windSpeedKmh:windSpeed,windDirection,rain}:null;
 return conditions?{...conditions,label:`${temperature} °C · humidité ${humidity} % · ${rain}`,provenance:index%5===0?'historical_weather':'estimated'}:null;
}
function trackAgeFor(random,kind,atypical){
 if(atypical==='old_track')return{seconds:86400,label:'24 h',status:'available',provenance:'manual',band:'over_12h'};
 if(random()<(kind==='training'?.025:.09))return{seconds:null,label:'Non renseigné',status:'unknown',provenance:null,band:'unknown'};
 const band=chooseWeighted(random,ageBands,ageDistribution[kind]),minutes=Math.round(band.min+random()*(band.max-band.min));
 return{seconds:minutes*60,label:ageLabel(minutes),status:'available',provenance:'manual',band:band.id};
}
function environmentFor(random,kind,index){
 let environment=pick(random,environments),surface=pick(random,surfaces);
 if(kind==='operational'&&random()<.38)environment=pick(random,['zone urbaine','périurbain','croisement complexe','terrain mixte','chemin agricole']);
 if(index%4===0)return{label:`${environment} · ${pick(random,environments.filter(item=>item!==environment))}`,primary:environment,surface,secondary:true};
 return{label:environment,primary:environment,surface,secondary:false};
}
function difficultyScore({age,environment,distanceKm,weather,pollution,turns,relief}){
 return clamp((age.band==='unknown'?1:age.band==='over_12h'?3:age.band==='6_12h'?2.4:age.band==='3_6h'?1.7:age.band==='90m_3h'?1:.4)
  +( /urbain|périurbain|croisement|mixte/.test(environment.primary)?1.15:0)
  +(weather?.windSpeedKmh>=22?1:0)+(weather?.rain==='pluie soutenue'?1.1:weather?.rain==='pluie récente'||weather?.rain==='sol humide'?.5:0)
  +(pollution==='high'?1.5:pollution==='medium'?.7:0)+(distanceKm>6?1:.25)+(turns>=5?.75:turns>=3?.35:0)+(relief>=2?1:relief>=1?.4:0),0,12);
}
function createSession(index,random,seed){
 const number=index+1,kind=index%3===0?'operational':'training',phase=phaseFor(index),phaseInfo=phases.find(item=>item.id===phase),atypical=atypicalIndices.get(index)||null;
 const startedAt=new Date(Date.parse('2023-10-03T08:00:00.000Z')+index*7*86400000).toISOString(),environment=environmentFor(random,kind,index),trackAge=trackAgeFor(random,kind,atypical),weather=weatherFor(random,index,phase,atypical);
 let pollution=chooseWeighted(random,['low','medium','high'],kind==='training'?[.5,.35,.15]:[.22,.42,.36]);
 if(['high_pollution_breaks','excellent_polluted','unexpectedly_stable'].includes(atypical))pollution='high';
 if(atypical==='weak_favorable')pollution='low';
 let distanceKm=round((kind==='training'?.5:1)+random()*(kind==='training'?4.5:9),2);
 if(atypical==='long_route')distanceKm=8.7;if(atypical==='long_operational')distanceKm=12.4;
 const turns=1+Math.floor(random()*7),relief=environment.primary.includes('relief')?2:Math.floor(random()*3),difficultyValue=difficultyScore({age:trackAge,environment,distanceKm,weather,pollution,turns,relief}),difficulty=difficultyValue<3?'facile':difficultyValue<5.5?'modérée':difficultyValue<8?'difficile':'très difficile';
 let qualityLevel=kind==='training'?chooseWeighted(random,['high','medium','low','insufficient'],[.52,.34,.11,.03]):chooseWeighted(random,['high','medium','low','insufficient'],[.19,.42,.29,.1]);
 if(['incomplete_gps','low_quality'].includes(atypical))qualityLevel='low';
 const qualityBase={high:94,medium:75,low:49,insufficient:21}[qualityLevel],referenceAvailable=kind==='training'?random()<.9:random()<.52;
 const gpsAvailable=qualityLevel!=='insufficient'&&atypical!=='incomplete_gps'&&random()<(kind==='training'?.96:.81),weatherAvailable=Boolean(weather)&&random()<(kind==='training'?.94:.72),timestampsComplete=qualityLevel!=='low'&&qualityLevel!=='insufficient'&&random()<.91;
 const missingInputs=[];if(!referenceAvailable)missingInputs.push('referenceTrace');if(!gpsAvailable)missingInputs.push('trace');if(!weatherAvailable)missingInputs.push('weather');if(!timestampsComplete)missingInputs.push('timestamps');
 const qualityScore=clamp(qualityBase-(missingInputs.length*7),10,100),quality={level:qualityLevel,score:qualityScore,availableInputs:['dog',...(gpsAvailable?['trace']:[]),...(referenceAvailable?['referenceTrace']:[]),'terrain',...(weatherAvailable?['weather','wind']:[]),'events'],missingInputs,explanation:`Qualité ${qualityLevel} · données synthétiques${missingInputs.length?` · manques : ${missingInputs.join(', ')}`:''}`};
 const scentPollution={level:pollution,causes:pollution==='low'?[]:Array.from({length:pollution==='high'?2:1},()=>pick(random,pollutionCauses))};
 const windLateral=weather?.windDirection?.startsWith('latéral'),ageDifficulty=trackAge.band==='unknown'?0:trackAge.seconds/3600;
 let ruptureChance=.32+(pollution==='high'?.28:pollution==='medium'?.12:0)+(windLateral?.12:0)+(difficultyValue*.035)-(phaseInfo.progress*.25);
 let ruptures=Array.from({length:3},()=>random()<ruptureChance?1:0).reduce((sum,value)=>sum+value,0);
 if(atypical==='high_pollution_breaks')ruptures=4;if(atypical==='many_breaks')ruptures=5;
 let resumptions=Math.max(0,ruptures-(random()<.18?1:0));if(atypical==='excellent_adverse'||atypical==='excellent_polluted')resumptions=ruptures;
 if(atypical==='weak_favorable')resumptions=0;
 const interruption=ruptures>0&&resumptions<ruptures,turningCount=turns;
 let durationMinutes=Math.round(distanceKm*(18+random()*17)+ruptures*(4+random()*9)+random()*8);
 if(atypical==='long_operational')durationMinutes=226;
 const durationSeconds=durationMinutes*60;
 let performance=38+phaseInfo.progress*24+(qualityScore-50)*.22+(weatherAvailable?5:-10)+(referenceAvailable?6:-7)+(gpsAvailable?6:-9)+(timestampsComplete?4:-8)-(pollution==='high'?12:pollution==='medium'?5:0)-(windLateral?Math.max(3,9-phaseInfo.progress*5):0)-Math.min(14,ageDifficulty*1.2)+(resumptions*.7-ruptures*1.2)+random()*17;
 if(atypical==='excellent_adverse'||atypical==='excellent_polluted'||atypical==='unexpectedly_stable')performance=82+random()*10;
 if(atypical==='weak_favorable')performance=31+random()*9;
 const confidence=clamp(Math.round(performance),18,96),resumptionDelaySeconds=resumptions?Math.round((240+(1-phaseInfo.progress)*800+(pollution==='high'?180:0)+random()*540)*(environment.surface==='terre'||environment.surface==='herbe'?.78:1)):null;
 const result=kind==='training'?pick(random,['réussite complète','réussite partielle','objectif atteint partiellement','interrompue','échec']):pick(random,['piste exploitée','progression utile','rupture non reprise','fin sur zone','interruption opérationnelle','résultat non renseigné']);
 const surfaceChanges=environment.secondary||random()<.3,events=[{type:'Départ',timestamp:startedAt,point:{x:20,y:225}}];
 if(random()<.72)events.push({type:'Indice',timestamp:timestampAt(startedAt,durationSeconds,.16+random()*.2),point:{x:68,y:195}});
 if(surfaceChanges)events.push({type:'Changement de surface',timestamp:timestampAt(startedAt,durationSeconds,.28+random()*.14),point:{x:105,y:170},surface:environment.surface});
 for(let r=0;r<ruptures;r++){
  const ratio=.35+(r/(Math.max(1,ruptures)))*.48,duration=Math.round(120+random()*900);
  events.push({type:'Rupture',timestamp:timestampAt(startedAt,durationSeconds,ratio),point:{x:130+r*24,y:155-r*14},durationSeconds:duration,probableCause:pick(random,['changement de substrat','pollution olfactive possible','vent latéral','investigation prolongée']),confidence:Math.round(45+random()*40),provenance:'synthetic'});
  if(r<resumptions)events.push({type:'Reprise',timestamp:timestampAt(startedAt,durationSeconds,Math.min(.9,ratio+.05+random()*.13)),point:{x:145+r*25,y:142-r*13}});
 }
 if(pollution!=='low'&&random()<.55)events.push({type:'Pollution olfactive',timestamp:timestampAt(startedAt,durationSeconds,.62),point:{x:230,y:91},cause:scentPollution.causes[0]||null});
 if(environment.primary==='zone humide'||environment.surface==='sol humide')events.push({type:'Zone humide',timestamp:timestampAt(startedAt,durationSeconds,.56),point:{x:208,y:107}});
 events.push({type:'Fin de piste',timestamp:timestampAt(startedAt,durationSeconds,1),point:{x:320,y:45},result});events.sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
 const pointCount=gpsAvailable?Math.max(3,Math.round(distanceKm*1.4)):0,trace=Array.from({length:pointCount},(_,pointIndex)=>({sequence:pointIndex+1,x:round(24+296*pointIndex/Math.max(1,pointCount-1),1),y:round(222-177*pointIndex/Math.max(1,pointCount-1)+Math.sin((index+pointIndex)*.8)*14,1),timestamp:timestampsComplete?timestampAt(startedAt,durationSeconds,pointIndex/Math.max(1,pointCount-1)):null,elapsedSeconds:timestampsComplete?Math.round(durationSeconds*pointIndex/Math.max(1,pointCount-1)):null}));
 const reference=referenceAvailable?Array.from({length:5},(_,pointIndex)=>({x:round(24+296*pointIndex/4,1),y:round(222-177*pointIndex/4+Math.sin((index+pointIndex)*.6)*9,1)})):null;
 const windOffset=windLateral?10:weather?.windDirection==='face'?3:-3,corridor=weather&&trackAge.status==='available'?{geometry:trace.length?trace.map((point,pointIndex)=>({x:point.x,y:clamp(point.y+windOffset+Math.sin(pointIndex+index)*3,8,250)})):null,provenance:'estimated',status:'estimated'}:null;
 const avgSpeed=distanceKm*1000/durationSeconds,metrics={distanceM:Math.round(distanceKm*1000),durationSeconds,ruptures,resumptions,averageLateralOffset:round(3+ruptures*1.6+(windLateral?3:0)+random()*7,1),maxLateralOffset:round(8+ruptures*3+random()*16,1),distanceToReference:referenceAvailable?round(5+random()*45,1):null,resumptionDelaySeconds,investigationZones:Math.max(0,Math.round(ruptures*.8+random()*2)),speedMps:round(avgSpeed,2),distanceReferenceRatio:referenceAvailable?round(1+random()*.42,2):null};
 const turnDirections=Array.from({length:turns},()=>pick(random,['gauche','droite'])),leftTurns=turnDirections.filter(value=>value==='gauche').length,rightTurns=turns-leftTurns;
 const ruralContext=/forêt|lisière|prairie|sentier|vignoble|agricole|humide|relief/.test(environment.primary),conditionalLeftWindow=trackAge.band==='30_90m'&&ruralContext;
 const microSignals={hesitations:Math.max(0,Math.round(ruptures*.45+(metrics.averageLateralOffset>13?1:0)+(metrics.investigationZones>2?1:0)+(conditionalLeftWindow&&leftTurns>0?1.15:0)+(random()<.22?1:0))),left_turn_hesitations:conditionalLeftWindow&&leftTurns>0?1:0,right_turn_hesitations:0,zigzag_index:round(Math.min(5,metrics.averageLateralOffset/8+(windLateral?.35:0)),2),temporary_corridor_exits:Math.max(0,Math.round((metrics.maxLateralOffset>27?1:0)+(windLateral&&confidence<65?1:0))),investigation_seconds:metrics.investigationZones*Math.round(18+random()*38),lateral_deviation_m:metrics.averageLateralOffset,turn_directions:turnDirections,left_turns:leftTurns,right_turns:turnDirections.filter(value=>value==='droite').length,provenance:'synthetic_derived'};
 const confidenceFactors={quality:qualityScore,weather:weatherAvailable?1:0,reference:referenceAvailable?1:0,gps:gpsAvailable?1:0,events:timestampsComplete?1:.5,trackAge:trackAge.status==='unknown'?null:trackAge.seconds,uncertainty:'synthetic'};
 const title=`${kind==='training'?'Entraînement':'Suivi opérationnel'} · ${environment.primary}`;
 return{id:`synthetic-nox-${String(number).padStart(3,'0')}`,kind,type:kind,title,status:'Données synthétiques / Démonstration',synthetic:true,syntheticLabel:'Données synthétiques / Démonstration',datasetSeed:seed,sequence:number,phase:{id:phase,label:phaseInfo.label,progress:phaseInfo.progress},dog:structuredClone(dog),dogId:dog.id,handler:{name:'Conducteur de démonstration',anonymized:true},handlerId:'synthetic-handler-demo',startedAt,finishedAt:new Date(Date.parse(startedAt)+durationSeconds*1000).toISOString(),terrain:environment.label,environment,surface:environment.surface,weather:weatherAvailable?weather:null,wind:weatherAvailable?{direction:weather.windDirection,speed:`${weather.windSpeedKmh} km/h`,speedKmh:weather.windSpeedKmh,provenance:weather.provenance}:null,trackAge,disappearanceAt:trackAge.status==='available'?new Date(Date.parse(startedAt)-trackAge.seconds*1000).toISOString():null,trace,referenceTrace:reference,corridor,probableZones:confidence>=60?[{x:320,y:45,radius:12+Math.round((100-confidence)/10),label:'Zone probable · estimée'}]:[],uncertaintyZones:[{x:270,y:75,radiusX:20+Math.round((100-confidence)/3),radiusY:15+Math.round((100-confidence)/5),label:'Incertitude · estimée'}],events,metrics,microSignals,ruptures,resumptions,resumptionDelaySeconds,scentPollution,difficulty:{score:round(difficultyValue,1),level:difficulty,turns,relief},durationMinutes,distanceKm,result,quality,confidence,confidenceFactors,provenance:{synthetic:'synthetic_demo',trace:gpsAvailable?'phone_gps':'unknown',referenceTrace:referenceAvailable?'gpx_import':'unknown',events:'manual',weather:weatherAvailable?(weather.provenance||'historical_weather'):'unknown',wind:weatherAvailable?'estimated':'unknown',distance:'calculated',trackAge:trackAge.provenance||'unknown',corridor:corridor?'estimated':'unknown',microSignals:'synthetic_derived'},benchmark_session:false,blind_analysis_available:kind==='training'&&qualityLevel==='high'&&timestampsComplete&&number%6===0,atypicalCode:atypical};
}
let defaultDataset=null;
export function generateJumolfSyntheticDataset({seed=JUMOLF_SYNTHETIC_SEED}={}){
 if(seed===JUMOLF_SYNTHETIC_SEED&&defaultDataset)return structuredClone(defaultDataset);
 const random=seededRandom(seed),sessions=Array.from({length:JUMOLF_SYNTHETIC_SESSION_COUNT},(_,index)=>createSession(index,random,seed));
 const benchmarkTargets=[['facile',session=>session.difficulty.level==='facile'],['modéré',session=>session.difficulty.level==='modérée'],['difficile',session=>session.difficulty.level==='difficile'],['forte pollution',session=>session.scentPollution.level==='high'],['âge élevé',session=>session.trackAge.seconds>=21600],['performance élevée',session=>session.confidence>=85],['cas atypique',session=>Boolean(session.atypicalCode)]];
 const benchmarkIds=new Set();for(const [,matches]of benchmarkTargets){const candidate=sessions.find(item=>!benchmarkIds.has(item.id)&&matches(item));if(candidate){candidate.benchmark_session=true;benchmarkIds.add(candidate.id);}}
 const dataset={seed,synthetic:true,label:'Données synthétiques / Démonstration',dog:structuredClone(dog),period:{start:sessions[0].startedAt,end:sessions.at(-1).startedAt},sessions,distribution:{training:sessions.filter(item=>item.kind==='training').length,operational:sessions.filter(item=>item.kind==='operational').length},phases:structuredClone(phases)};
 if(seed===JUMOLF_SYNTHETIC_SEED)defaultDataset=structuredClone(dataset);
 return structuredClone(dataset);
}
export function getJumolfSyntheticSession(id,sessions=generateJumolfSyntheticDataset().sessions){return structuredClone(sessions.find(item=>item.id===id)||null);}
