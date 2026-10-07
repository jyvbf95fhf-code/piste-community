const deepFreeze=value=>{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);}
 return value;
};

const demoDog=deepFreeze({
 id:'demo-nox',name:'Nox',breed:'Berger allemand',age:'Profil fictif',specialty:'Recherche différée',
 profile:{
  wind_reaction:'Sensibilité au vent latéral · élevée',
  wet_terrain_reactivity:'Réactivité au terrain humide · bonne',
  resumptions:'Reprises observées · régulières',
  work_style:'Style de travail · méthodique / autonome',
  progression:'Qualité de progression · cohérente'
 }
});

const demos=[
 {
  id:'demo-nox-search',kind:'coaching',title:'Recherche différée · lisière',status:'Analyse mock · lecture seule',dog:demoDog,dogId:demoDog.id,handler:{name:'Sébastien'},handlerId:'demo-sebastien',
  terrain:'Forêt · lisière · clairière · sentier',trackAge:{seconds:6120,label:'1 h 42',provenance:'calculated'},
  disappearanceAt:'05:42',searchStartedAt:'07:24',weather:{temperature:'9 °C',humidity:'81 %',label:'9 °C · humidité 81 % · démonstration',provenance:'estimated'},wind:{direction:'NO',speed:'14 km/h',provenance:'estimated'},
  trace:[
   {sequence:1,x:32,y:224,timestamp:'2026-10-06T07:24:00.000Z',elapsedSeconds:0},
   {sequence:2,x:83,y:190,timestamp:'2026-10-06T07:46:00.000Z',elapsedSeconds:1320},
   {sequence:3,x:142,y:151,timestamp:'2026-10-06T07:58:00.000Z',elapsedSeconds:2040},
   {sequence:4,x:196,y:119,timestamp:'2026-10-06T08:03:00.000Z',elapsedSeconds:2340},
   {sequence:5,x:247,y:91,timestamp:'2026-10-06T08:11:00.000Z',elapsedSeconds:2820},
   {sequence:6,x:316,y:55,timestamp:'2026-10-06T08:16:00.000Z',elapsedSeconds:3120}
  ],
  referenceTrace:[{x:32,y:224},{x:91,y:180},{x:153,y:145},{x:211,y:111},{x:270,y:84},{x:316,y:55}],
  corridor:{geometry:[{x:28,y:213},{x:80,y:174},{x:137,y:135},{x:190,y:102},{x:241,y:74},{x:304,y:42}],provenance:'estimated'},
  probableZones:[{x:315,y:55,radius:18,label:'Zone probable'}],uncertaintyZones:[{x:282,y:72,radiusX:46,radiusY:27,label:'Incertitude'}],
  events:[
   {type:'Départ',timestamp:'2026-10-06T07:24:00.000Z',point:{x:32,y:224},marker:'D'},
   {type:'Premier indice',timestamp:'2026-10-06T07:46:00.000Z',point:{x:83,y:190}},
   {type:'Rupture secondaire',timestamp:'2026-10-06T07:58:00.000Z',point:{x:142,y:151}},
   {type:'Rupture',timestamp:'2026-10-06T08:03:00.000Z',point:{x:196,y:119}},
   {type:'Reprise',timestamp:'2026-10-06T08:11:00.000Z',point:{x:247,y:91}},
   {type:'Fin',timestamp:'2026-10-06T08:16:00.000Z',point:{x:316,y:55},marker:'FIN'}
  ],
  metrics:{distanceM:2800,durationSeconds:3120,distanceToReference:11,averageLateralOffset:6,maxLateralOffset:18,timeInCorridorSeconds:2280,timeOutsideCorridorSeconds:840,resumptionDelaySeconds:480,distanceReferenceRatio:1.08,investigationZones:2},
  provenance:{trace:'manual',referenceTrace:'estimated',events:'manual',weather:'estimated',wind:'estimated',distance:'calculated',trackAge:'calculated',corridor:'estimated'},
  demo:{label:'DÉMO · SCÉNARIO FICTIF',isFictional:true,searchType:'Recherche différée',handlerName:'Sébastien',trackAgeLabel:'1 h 42',durationLabel:'52 min',distanceLabel:'2,8 km',qualityLabel:'Bonne',qualityLevel:'high',globalConfidence:78,rupturesDetected:2,resumptionsDetected:1,temperatureLabel:'9 °C',humidityLabel:'81 %',windLabel:'14 km/h NO',dogProfile:demoDog.profile,
   timeline:[
    {time:'05:42',title:'Disparition / dernier contact',description:'Point de départ temporel · donnée fictive'},
    {time:'07:24',title:'Départ recherche',description:'Démarrage mock du scénario'},
    {time:'07:46',title:'Premier indice',description:'Indice fictif renseigné dans la chronologie'},
    {time:'07:58',title:'Rupture brève',description:'Signal de démonstration'},
    {time:'08:03',title:'Rupture',description:'Comportement compatible avec une rupture'},
    {time:'08:11',title:'Reprise',description:'Reprise fictive de progression'},
    {time:'08:16',title:'Fin · zone probable',description:'Hypothèse finale, non mesurée'}
   ]}
 },
 {
  id:'demo-nox-search-b',kind:'coaching',title:'Recherche différée · sous-bois humide',status:'Analyse mock · lecture seule',dog:demoDog,dogId:demoDog.id,handler:{name:'Sébastien'},handlerId:'demo-sebastien',
  terrain:'Sous-bois humide · pente douce',trackAge:{seconds:8280,label:'2 h 18',provenance:'calculated'},
  disappearanceAt:'04:58',searchStartedAt:'07:16',weather:{temperature:'6 °C',humidity:'93 %',label:'6 °C · humidité 93 % · démonstration',provenance:'estimated'},wind:{direction:'E',speed:'5 km/h',provenance:'estimated'},
  trace:[
   {sequence:1,x:38,y:217,timestamp:'2026-10-05T07:16:00.000Z',elapsedSeconds:0},
   {sequence:2,x:89,y:182,timestamp:'2026-10-05T07:31:00.000Z',elapsedSeconds:900},
   {sequence:3,x:151,y:158,timestamp:'2026-10-05T07:44:00.000Z',elapsedSeconds:1680},
   {sequence:4,x:211,y:112,timestamp:'2026-10-05T07:53:00.000Z',elapsedSeconds:2220},
   {sequence:5,x:266,y:88,timestamp:'2026-10-05T08:00:00.000Z',elapsedSeconds:2640},
   {sequence:6,x:320,y:48,timestamp:'2026-10-05T08:00:00.000Z',elapsedSeconds:2640}
  ],
  referenceTrace:[{x:38,y:217},{x:102,y:186},{x:161,y:148},{x:219,y:119},{x:278,y:80},{x:320,y:48}],
  corridor:{geometry:[{x:42,y:205},{x:95,y:172},{x:151,y:143},{x:204,y:98},{x:258,y:72},{x:309,y:36}],provenance:'estimated'},
  probableZones:[{x:320,y:48,radius:15,label:'Zone probable'}],uncertaintyZones:[{x:294,y:68,radiusX:38,radiusY:24,label:'Incertitude'}],
  events:[
   {type:'Départ',timestamp:'2026-10-05T07:16:00.000Z',point:{x:38,y:217},marker:'D'},
   {type:'Premier indice',timestamp:'2026-10-05T07:31:00.000Z',point:{x:89,y:182}},
   {type:'Rupture',timestamp:'2026-10-05T07:44:00.000Z',point:{x:151,y:158}},
   {type:'Reprise',timestamp:'2026-10-05T07:53:00.000Z',point:{x:211,y:112}},
   {type:'Reprise',timestamp:'2026-10-05T08:00:00.000Z',point:{x:266,y:88}},
   {type:'Fin',timestamp:'2026-10-05T08:00:00.000Z',point:{x:320,y:48},marker:'FIN'}
  ],
  metrics:{distanceM:2300,durationSeconds:2640,distanceToReference:19,averageLateralOffset:10,maxLateralOffset:31,timeInCorridorSeconds:1620,timeOutsideCorridorSeconds:1020,resumptionDelaySeconds:270,distanceReferenceRatio:1.16,investigationZones:3},
  provenance:{trace:'manual',referenceTrace:'estimated',events:'manual',weather:'estimated',wind:'estimated',distance:'calculated',trackAge:'calculated',corridor:'estimated'},
  demo:{label:'DÉMO · SCÉNARIO FICTIF',isFictional:true,searchType:'Recherche différée',handlerName:'Sébastien',trackAgeLabel:'2 h 18',durationLabel:'44 min',distanceLabel:'2,3 km',qualityLabel:'Bonne',qualityLevel:'high',globalConfidence:64,rupturesDetected:1,resumptionsDetected:2,temperatureLabel:'6 °C',humidityLabel:'93 %',windLabel:'5 km/h E',dogProfile:demoDog.profile,
   timeline:[
    {time:'04:58',title:'Disparition / dernier contact',description:'Point de départ temporel · donnée fictive'},
    {time:'07:16',title:'Départ recherche',description:'Démarrage mock du scénario'},
    {time:'07:31',title:'Premier indice',description:'Indice fictif renseigné dans la chronologie'},
    {time:'07:44',title:'Rupture',description:'Signal de démonstration'},
    {time:'07:53',title:'Reprise',description:'Reprise fictive de progression'},
    {time:'08:00',title:'Fin · zone probable',description:'Hypothèse finale, non mesurée'}
   ]}
 }
];
deepFreeze(demos);

export const JUMOLF_DEMO_PRIMARY_ID='demo-nox-search';
export const JUMOLF_DEMO_DOG_ID='demo-nox';
export const listJumolfDemoSources=()=>structuredClone(demos);
export const getJumolfDemoSource=id=>structuredClone(demos.find(item=>item.id===id)||null);
export const getJumolfDemoDog=()=>structuredClone(demoDog);
