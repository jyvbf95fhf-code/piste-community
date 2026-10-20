// Editorial training rules. No predictive model, clinical diagnosis or qualification.
export const CANINE_RULE_VERSION='2026-10-20.1';
export const CANINE_LEVELS=[
 {id:'initiation',label:'Initiation',distanceKm:.15,range:'50 à 300 m',terrain:'nature',transitions:'few',maxTurns:1,criteria:'Piste courte, direction simple, récompense préparée et objectif unique.',limits:'Adapter au jeune chien et au débutant ; réduire ou interrompre selon les observations. Aucun âge ni seuil universel.'},
 {id:'consolidation',label:'Consolidation',distanceKm:.6,range:'300 à 1 000 m',terrain:'nature',transitions:'few',maxTurns:3,criteria:'Répétition documentée, quelques angles et continuité ; conserver les autres conditions autant que possible.',limits:'La répétition ne prouve pas l’acquisition. Comparer uniquement des séances suffisamment documentées.'},
 {id:'diversification',label:'Diversification',distanceKm:1.2,range:'600 à 2 000 m',terrain:'mixed',transitions:'several',maxTurns:6,criteria:'Explorer les transitions renseignées et les changements de milieu, un facteur nouveau à la fois.',limits:'Aucune hiérarchie universelle des sols ; un revêtement OSM doit être vérifié sur place.'},
 {id:'operational',label:'Complexité opérationnelle',distanceKm:2,range:'1 000 à 4 000 m',terrain:'mixed',transitions:'several',maxTurns:12,criteria:'Scénario préparé, difficultés combinées choisies et protocole d’observation explicite.',limits:'Réservé à un travail adapté et encadré. Ce niveau ne certifie aucune aptitude opérationnelle officielle.'}
].map(l=>({...l,updatedAt:'2026-10-20',minAngle:45}));
export const CANINE_SKILLS=[
 {id:'motivation',label:'Motivation et premières pistes',key:null,objective:'Observer l’engagement sur une tâche simple avec une récompense adaptée.'},
 {id:'continuity',label:'Continuité, ruptures et reprises',key:'interruptions',objective:'Décrire les ruptures et reprises signalées, les aides et le contexte sans présumer leur cause.'},
 {id:'angles',label:'Changements de direction',key:'reference',objective:'Observer la conduite et les écarts à une référence connue aux changements de direction.'},
 {id:'surfaces',label:'Transitions et environnements',key:'conditions',objective:'Documenter les comportements autour de transitions vérifiées sur le terrain.'},
 {id:'regularity',label:'Régularité entre séances',key:'regularity',objective:'Répéter une tâche et documenter les conditions de comparaison.'},
 {id:'track-age',label:'Âge de piste documenté',key:'track-age',objective:'Consigner le délai réel entre pose et recherche sans lui attribuer seul les observations.'}
];
export function canineOptions(input={}){
 const level=CANINE_LEVELS.find(l=>l.id===input.level);if(!level)throw Error('Choisissez un niveau pédagogique disponible.');
 const skill=input.skill||'motivation';if(!CANINE_SKILLS.some(s=>s.id===skill))throw Error('Compétence ciblée indisponible.');
 const number=(key,fallback)=>input[key]===undefined?fallback:Number(String(input[key]).replace(',','.'));
 const distanceKm=number('distanceKm',level.distanceKm),maxTurns=number('maxTurns',level.maxTurns),minAngle=number('minAngle',level.minAngle);
 if(!Number.isFinite(distanceKm)||distanceKm<.05||distanceKm>10)throw Error('Choisissez une distance entre 0,05 et 10 km.');
 if(!Number.isInteger(maxTurns)||maxTurns<0||maxTurns>30||!Number.isFinite(minAngle)||minAngle<30||minAngle>150)throw Error('Géométrie invalide : 0 à 30 angles, seuil entre 30 et 150°.');
 const terrain=input.terrain??level.terrain,transitions=input.transitions??level.transitions;
 if(!['urban','nature','mixed'].includes(terrain)||!['any','few','several'].includes(transitions))throw Error('Critères de parcours invalides.');
 const minTurns=skill==='angles'?1:0;if(maxTurns<minTurns)throw Error('Le travail des angles demande au moins un changement de direction.');
 return {level:level.id,skill,distanceKm,terrain,transitions,maxTurns,minAngle,geometry:{minTurns,maxTurns,minAngle}};
}
// Iterative Douglas–Peucker, 10 m tolerance: map bends, never olfactory difficulty.
export function trackGeometry(coordinates,{minTurns=0,maxTurns=30,minAngle=45}={}){
 if(!coordinates?.length)return {turns:0,angles:[],satisfied:true};
 const origin=coordinates[0],scale=Math.cos(origin[1]*Math.PI/180),p=coordinates.map(c=>[(c[0]-origin[0])*111320*scale,(c[1]-origin[1])*111320]);
 const keep=new Set([0,p.length-1]),stack=[[0,p.length-1]];
 while(stack.length){const [a,b]=stack.pop(),dx=p[b][0]-p[a][0],dy=p[b][1]-p[a][1],len=dx*dx+dy*dy;let far=100,index=-1;
  for(let i=a+1;i<b;i++){const t=len?Math.max(0,Math.min(1,((p[i][0]-p[a][0])*dx+(p[i][1]-p[a][1])*dy)/len)):0,d=(p[i][0]-p[a][0]-t*dx)**2+(p[i][1]-p[a][1]-t*dy)**2;if(d>far){far=d;index=i;}}
  if(index>=0){keep.add(index);stack.push([a,index],[index,b]);}
 }
 const points=[...keep].sort((a,b)=>a-b).map(i=>p[i]),angles=[];
 for(let i=1;i<points.length-1;i++){const a=points[i-1],b=points[i],c=points[i+1],u=[b[0]-a[0],b[1]-a[1]],v=[c[0]-b[0],c[1]-b[1]],norm=Math.hypot(...u)*Math.hypot(...v);if(!norm)continue;const angle=Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/norm)))*180/Math.PI;if(angle>=minAngle)angles.push(Math.round(angle));}
 return {turns:angles.length,angles,satisfied:angles.length>=minTurns&&angles.length<=maxTurns,method:`Simplification cartographique 10 m ; déviation ≥ ${minAngle}°`,minTurns,maxTurns,minAngle};
}
export function buildCanineBrief(proposal,options,context={}){
 const o=canineOptions(options),level=CANINE_LEVELS.find(l=>l.id===o.level),skill=CANINE_SKILLS.find(s=>s.id===o.skill);
 const evidence=(context.recommendations||[]).filter(r=>r.key===skill.key&&r.personalized===true).flatMap(r=>r.evidence||[]);
 const geometry=proposal.geometry||trackGeometry(proposal.coordinates,o.geometry);
 return {version:CANINE_RULE_VERSION,level:level.label,skill:skill.label,objective:skill.objective,criteria:level.criteria,personalized:evidence.length>0,evidence,declarations:context.declarations||[],
  parameters:[`Distance calculée sur les chemins : ${Math.round(proposal.distanceM)} m (cible déclarée : ${Math.round(o.distanceKm*1000)} m).`,`Géométrie calculée : ${geometry.turns} changements ≥ ${o.minAngle}° ; ${o.geometry.minTurns} à ${o.maxTurns} demandés · ${geometry.satisfied?'respecté':'non atteint'}.`,`${proposal.transitions} transitions cartographiées ; ${Math.round((1-proposal.knownSurfaceRatio)*100)} % de surfaces inconnues.`, `Terrain estimé par les types de chemins OSM : ${Math.round(proposal.urbanRatio*100)} % rues / ${Math.round(proposal.natureRatio*100)} % chemins.`, 'Âge de piste, météo, accessibilité et difficulté olfactive : inconnus avant vérification et observation.'],
  preparation:['Vérifier les autorisations d’accès, la circulation, les obstacles, les surfaces et un itinéraire de repli.','Préparer une récompense adaptée ; choisir les conditions et noter le délai de piste réellement obtenu.','Définir qui connaît la référence et choisir le mode Coaching compatible avec ces connaissances.'],
  steps:[level.criteria,skill.objective,'Recueillir les observations sans provoquer une rupture ni imposer une difficulté au chien. Adapter les aides et arrêter en cas de fatigue, stress ou danger.'],
  observations:['Noter départ, arrivée, durée, pauses, aides, ruptures et reprises effectivement signalées.','Situer les observations aux angles et transitions vérifiés ; conserver les conditions et les inconnues.'],
  success:['Critère à fixer avant départ : tâche observée dans les conditions prévues avec aides et interruptions consignées.','Relire le protocole avec le conducteur ou le coach ; aucune réussite n’est attribuée automatiquement.'],
  limits:[level.limits,'Règles pédagogiques éditoriales datées, ajustables ; plages suggérées non validées comme seuils scientifiques.','Les angles calculés ne mesurent pas la difficulté olfactive. Aucune rupture ni reprise du chien n’est prédite.','Une variation de résultat ne démontre ni diagnostic ni effet causal de cet exercice.','Carte potentiellement incomplète ; aucune mesure terrain ou garantie de sécurité. Toute édition change les caractéristiques initiales.'],
  lessons:['geometrie','progression','protocoles','bienetre'],range:level.range};
}
