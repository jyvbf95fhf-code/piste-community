import {geographicDistance} from './track-geographic.mjs';
import {createTrackDraft} from './track-editor.mjs';
import {routeSegmentKey} from './track-route-segments.mjs';
import {trackGeometry} from './track-canine.mjs';
const highways=new Set(['residential','living_street','pedestrian','service','unclassified','tertiary','tertiary_link','footway','path','track','cycleway','steps']);
const rural=new Set(['path','track','cycleway']);
const surfaces=new Map([
 ...['asphalt','concrete','concrete:plates','concrete:lanes','paved','paving_stones','sett','cobblestone','unhewn_cobblestone','metal','wood'].map(x=>[x,x]),
 ...['grass','ground','dirt','earth','mud','sand','gravel','fine_gravel','compacted','pebblestone','unpaved','rock'].map(x=>[x,x])
]);
export const surfaceLabel=value=>({asphalt:'Bitume',concrete:'Béton','concrete:plates':'Dalles de béton','concrete:lanes':'Bandes de béton',paved:'Revêtement dur',paving_stones:'Pavés',sett:'Pavés',cobblestone:'Pavés',unhewn_cobblestone:'Pavés',metal:'Métal',wood:'Bois',grass:'Herbe',ground:'Sol naturel',dirt:'Terre',earth:'Terre',mud:'Boue',sand:'Sable',gravel:'Gravier',fine_gravel:'Gravier fin',compacted:'Sol compacté',pebblestone:'Galets',unpaved:'Non revêtu',rock:'Roche'})[value]||'Surface inconnue';
const canonicalSurface=value=>surfaces.get(value)||null;
const coord=n=>[n.lon,n.lat];
const meters=(a,b)=>geographicDistance({x:a[0],y:a[1]},{x:b[0],y:b[1]});
const validNode=n=>Number.isSafeInteger(n?.id)&&Number.isFinite(n.lon)&&Math.abs(n.lon)<=180&&Number.isFinite(n.lat)&&Math.abs(n.lat)<=90;
const blocked=t=>['no','private','customers','permit','discouraged'].includes(t?.access)||['no','private','discouraged','use_sidepath'].includes(t?.foot)||t?.construction||t?.highway==='construction'||t?.area==='yes';
export function validateSmartOptions({commune,distanceKm,terrain,transitions,geometry}={}){
 if(!commune||!/^(?:\d{5}|2[AB]\d{3})$/.test(commune.code)||!Array.isArray(commune.center)||!validNode({id:1,lon:commune.center[0],lat:commune.center[1]}))throw Error('Sélectionnez une commune de France.');
 if(geometry&&(!Number.isInteger(geometry.maxTurns)||geometry.maxTurns<0||geometry.maxTurns>30||!Number.isFinite(geometry.minAngle)||geometry.minAngle<30||geometry.minAngle>150))throw Error('Critères géométriques invalides.');
 const km=Number(distanceKm);if(!Number.isFinite(km)||km<(geometry?.maxTurns>=0?.05:.5)||km>10)throw Error(geometry?'Choisissez une distance entre 0,05 et 10 km.':'Choisissez une distance entre 0,5 et 10 km.');
 if(!['urban','nature','mixed'].includes(terrain)||!['any','few','several'].includes(transitions))throw Error('Critères de parcours invalides.');
 return {commune,distanceKm:km,terrain,transitions,...geometry?{geometry:{...geometry}}:{}};
}
function networkGraph(data){
 if(!Array.isArray(data?.elements)||data.elements.length>150000||data.remark)throw Error('Données cartographiques incomplètes. Réessayez plus tard.');
 const nodes=new Map(data.elements.filter(e=>e.type==='node'&&validNode(e)&&!blocked(e.tags)&&!['wall','fence'].includes(e.tags?.barrier)).map(e=>[e.id,e]));
 const adj=new Map(),add=e=>{if(!adj.has(e.from))adj.set(e.from,[]);adj.get(e.from).push(e);};
 for(const way of data.elements){if(way.type!=='way'||!highways.has(way.tags?.highway)||blocked(way.tags)||!Array.isArray(way.nodes)||way.nodes.length>20000)continue;
  for(let i=1;i<way.nodes.length;i++){const a=nodes.get(way.nodes[i-1]),b=nodes.get(way.nodes[i]);if(!a||!b||a.id===b.id)continue;const distanceM=meters(coord(a),coord(b));if(distanceM<=0||distanceM>2000)continue;
   const edge={from:a.id,to:b.id,key:`${way.id}:${i}`,nodeIds:[a.id,b.id],coordinates:[coord(a),coord(b)],distanceM,surface:canonicalSurface(way.tags.surface),terrain:rural.has(way.tags.highway)?'nature':'urban'};
   if(way.tags['oneway:foot']!=='-1')add(edge);
   if(way.tags['oneway:foot']!=='yes')add({...edge,from:b.id,to:a.id,nodeIds:[b.id,a.id],coordinates:[coord(b),coord(a)]});
  }
 }
 // Preserve junctions, access direction and every mapped surface transition.
 const junction=id=>{const rows=adj.get(id)||[];return rows.length!==2||new Set(rows.map(e=>`${e.surface}:${e.terrain}`)).size!==1;};
 const compressed=new Map();
 for(const [id,rows] of adj){if(!junction(id))continue;const out=[];for(const first of rows){let edge={...first,nodeIds:[...first.nodeIds],coordinates:[...first.coordinates]},seen=new Set(edge.nodeIds);while(!junction(edge.to)){const next=adj.get(edge.to)?.find(e=>e.to!==edge.nodeIds.at(-2));if(!next||seen.has(next.to))break;edge={...edge,to:next.to,nodeIds:[...edge.nodeIds,next.to],coordinates:[...edge.coordinates,...next.coordinates.slice(1)],distanceM:edge.distanceM+next.distanceM};seen.add(next.to);}if(edge.to!==id)out.push(edge);}compressed.set(id,out);}
 // An isolated ring has no junction. It cannot produce our open, junction-based proposals.
 return {nodes,adj:compressed};
}
function trimmedEdge(edge,length){if(length>=edge.distanceM)return edge;const coordinates=[edge.coordinates[0]];let sum=0;for(let i=1;i<edge.coordinates.length;i++){const a=edge.coordinates[i-1],b=edge.coordinates[i],d=meters(a,b);if(sum+d>=length){const f=(length-sum)/d;coordinates.push([a[0]+f*(b[0]-a[0]),a[1]+f*(b[1]-a[1])]);break;}coordinates.push(b);sum+=d;}return {...edge,coordinates,distanceM:length};}
const hard=new Set(['asphalt','concrete','concrete:plates','concrete:lanes','paved','paving_stones','sett','cobblestone','unhewn_cobblestone','wood','metal']);
const sameMaterial=(a,b)=>a===b||[a,b].every(x=>['ground','dirt','earth'].includes(x))||[a,b].every(x=>['paving_stones','sett','cobblestone','unhewn_cobblestone'].includes(x));
const confirmedTransition=(a,b)=>a&&b&&!sameMaterial(a,b)&&!([a,b].includes('paved')&&hard.has(a)&&hard.has(b))&&!([a,b].includes('unpaved')&&!hard.has(a)&&!hard.has(b));
export function smartSurfaceTransitions(proposal){let last=null,distanceM=0;const rows=[];for(const edge of proposal?.edges||[]){if(confirmedTransition(last,edge.surface))rows.push({kind:'transition',coordinate:edge.coordinates[0],distanceM,label:surfaceLabel(last)+' → '+surfaceLabel(edge.surface)});last=edge.surface;distanceM+=edge.distanceM;}return rows;}
function statistics(edges){let distanceM=0,known=0,urban=0,nature=0,transitions=0,last=null;const surfaceDistances={};for(const e of edges){distanceM+=e.distanceM;if(e.surface){known+=e.distanceM;surfaceDistances[e.surface]=(surfaceDistances[e.surface]||0)+e.distanceM;if(confirmedTransition(last,e.surface))transitions++;}last=e.surface;if(e.terrain==='urban')urban+=e.distanceM;else nature+=e.distanceM;}return {distanceM,knownSurfaceRatio:known/distanceM,urbanRatio:urban/distanceM,natureRatio:nature/distanceM,transitions,surfaceDistances};}
const transitionSatisfied=(stats,wanted)=>wanted==='any'||wanted==='few'&&stats.transitions<=1||wanted==='several'&&stats.transitions>=2;
function score(stats,options){const terrain=options.terrain==='urban'?stats.urbanRatio:options.terrain==='nature'?stats.natureRatio:1-Math.abs(stats.urbanRatio-.5);const transition=options.transitions==='few'?-Math.min(stats.transitions,10)*.15:options.transitions==='several'?Math.min(stats.transitions,4)*.3:0;return terrain*3+stats.knownSurfaceRatio+transition;}
export function generateSmartTracks(data,input){
 const options=validateSmartOptions(input),target=options.distanceKm*1000,{nodes,adj}=networkGraph(data);if(!adj.size)return [];
 const pool=[...adj.keys()].filter(id=>options.terrain==='mixed'||(adj.get(id)||[]).some(e=>e.terrain===(options.terrain==='urban'?'urban':'nature')));
 const origin=options.startPoint||options.commune.center;
 const nearest=pool.sort((a,b)=>meters(coord(nodes.get(a)),origin)-meters(coord(nodes.get(b)),origin));
 const starts=[];for(const id of nearest){if(options.startPoint){if(meters(coord(nodes.get(id)),origin)>120)break;if(starts.length===1)break;}else if(starts.some(other=>meters(coord(nodes.get(id)),coord(nodes.get(other)))<=Math.max(180,target*.25)))continue;starts.push(id);if(starts.length===(options.startPoint?1:12))break;}
 let beam=starts.map(id=>({node:id,ids:new Set([id]),edges:[],length:0,start:coord(nodes.get(id))})),candidates=[],expanded=0;
 for(let step=0;beam.length&&step<250&&expanded<30000;step++){
  const next=[];for(const s of beam){for(const e of adj.get(s.node)||[]){expanded++;if(e.nodeIds.slice(1).some(id=>s.ids.has(id)))continue;const remainder=target-s.length,edge=trimmedEdge(e,remainder),edges=[...s.edges,edge],length=s.length+edge.distanceM,ids=new Set([...s.ids,...e.nodeIds]);
   if(length>=target-.01){const coordinates=edges.flatMap((e,i)=>i?e.coordinates.slice(1):e.coordinates),end=coordinates.at(-1);if(meters(s.start,end)<Math.max(options.geometry?20:80,target*.15))continue;const stats=statistics(edges);if(options.terrain==='urban'&&stats.urbanRatio<.75||options.terrain==='nature'&&stats.natureRatio<.75||options.terrain==='mixed'&&(stats.urbanRatio<.15||stats.natureRatio<.15))continue;
    candidates.push({...options.geometry?{geometry:trackGeometry(coordinates,options.geometry)}:{},edges,coordinates,nodeIds:[...ids],...stats,transitionsSatisfied:transitionSatisfied(stats,options.transitions),requested:options,rank:score(stats,options),signature:new Set(edges.flatMap(e=>e.nodeIds.slice(1).map((id,i)=>[id,e.nodeIds[i]].sort((a,b)=>a-b).join(':'))))});
   }else next.push({node:e.to,ids,edges,length,start:s.start});
  }}
  // Keep alternatives from different departure areas; bound work on the iPhone.
  const groups=new Map();for(const s of next){const key=s.edges[0]?.from;const rows=groups.get(key)||[];rows.push(s);groups.set(key,rows);}beam=[];for(const rows of groups.values()){rows.sort((a,b)=>(score(statistics(b.edges),options)+b.length/target*.3)-(score(statistics(a.edges),options)+a.length/target*.3));beam.push(...rows.slice(0,12));}
  if(candidates.length>500)break;
 }
 const selected=[];candidates.sort((a,b)=>Number(b.geometry?.satisfied??true)-Number(a.geometry?.satisfied??true)||Number(b.transitionsSatisfied)-Number(a.transitionsSatisfied)||b.rank-a.rank);
 for(const c of candidates){if(selected.some(p=>{for(const key of c.signature)if(p.signature.has(key))return true;return false;}))continue;selected.push(c);if(selected.length===3)break;}
 return selected.map(({signature,rank,...p},i)=>({...p,id:`proposal-${i+1}`,title:`Proposition ${i+1}`}));
}
export function smartTrackDraft(proposal,commune){
 if(!proposal?.edges?.length||!proposal.coordinates?.length)throw Error('Proposition indisponible.');
 const points=[{id:'smart-start',x:proposal.coordinates[0][0],y:proposal.coordinates[0][1],space:'wgs84',kind:'start',incomingMode:null}];
 for(const [i,edge] of proposal.edges.entries()){const end=edge.coordinates.at(-1),a=points.at(-1),b={id:`smart-${i+1}`,x:end[0],y:end[1],space:'wgs84',kind:i===proposal.edges.length-1?'arrival':'via',incomingMode:'follow'};b.route={key:routeSegmentKey(a,b),provider:'OSM',coordinates:edge.coordinates};points.push(b);}
 const name=`${commune.name} · ${(proposal.distanceM/1000).toFixed(1).replace('.',',')} km`.slice(0,80);
 const notes=`Proposition initiale OpenStreetMap : ${proposal.transitions} transitions renseignées ; ${Math.round(proposal.knownSurfaceRatio*100)} % des surfaces connues. ${Object.keys(proposal.surfaceDistances).map(surfaceLabel).join(', ')||'Surfaces inconnues'}. Critères ${proposal.transitionsSatisfied?'atteints':'partiellement atteints'}. Accès et surfaces à vérifier sur le terrain. L’édition peut modifier ces caractéristiques.`;
 const draft=createTrackDraft({track:{name,source:'draw',provenance:'smart-osm',notes,description:'Parcours proposé sur les rues et chemins cartographiés autour de '+commune.name,geometry:{points}}});return {...draft,baseline:null,dirty:true,activeMode:'follow'};
}
