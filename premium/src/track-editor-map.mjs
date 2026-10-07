import {escapeHTML as e} from './components.mjs';

const clamp=(value,max)=>Math.max(0,Math.min(max,value));
const routePath=(points,index)=>{
 const from=points[index-1],to=points[index],start=`M${from.x} ${from.y}`;
 if(to.incomingMode!=='follow')return `${start} L${to.x} ${to.y}`;
 const dx=to.x-from.x,dy=to.y-from.y,length=Math.max(1,Math.hypot(dx,dy));
 const bend=(index%2?1:-1)*Math.min(24,length*.14);
 const controlX=clamp((from.x+to.x)/2-(dy/length)*bend,360);
 const controlY=clamp((from.y+to.y)/2+(dx/length)*bend,300);
 return `${start} Q${Math.round(controlX)} ${Math.round(controlY)} ${to.x} ${to.y}`;
};
const pointName=(point,index)=>point.kind==='start'?'Départ':point.kind==='arrival'?'Arrivée':`Point intermédiaire ${index}`;

export function TrackEditorMap(draft,{selectedPointId=null}={}){
 const basemap=['standard','topographic','satellite'].includes(draft.basemap)?draft.basemap:'standard';
 const points=draft.points||[];
 const segments=points.slice(1).map((point,index)=>point.breakBefore?'':`<path class="track-editor-segment ${point.incomingMode==='follow'?'is-follow':'is-free'}" data-editor-segment="${index+1}" data-mode="${e(point.incomingMode||'free')}" d="${e(routePath(points,index+1))}" fill="none"><title>${point.incomingMode==='follow'?'Rues / chemins · simulation':'Libre'} · segment ${index+1}</title></path>`).join('');
 const markers=points.map((point,index)=>{
  const kind=point.kind||'via',name=pointName(point,index+1),selected=point.id===selectedPointId;
  const symbol=kind==='start'?`<circle class="track-editor-point-core" r="8"/><path class="track-editor-start-flag" d="M5 -6V-20l17 4-17 4"/>`:kind==='arrival'?`<circle class="track-editor-point-arrival-ring" r="12"/><path class="track-editor-arrival-diamond" d="m0-7 7 7-7 7-7-7Z"/>`:`<circle class="track-editor-point-core" r="6"/>`;
  return `<g class="track-editor-point track-editor-point--${e(kind)} ${selected?'is-selected':''}" data-editor-point-id="${e(point.id)}" data-point-kind="${e(kind)}" data-selected="${selected}" transform="translate(${point.x} ${point.y})" role="button" tabindex="0" aria-pressed="${selected}" aria-label="${e(name)}, déplacer ou sélectionner"><circle class="track-editor-point-hit" r="28" data-touch-target="44px-minimum"/><circle class="track-editor-point-halo" r="15"/>${symbol}<text class="track-editor-point-label" x="15" y="-12">${e(name)}</text><title>${e(name)} · appui long ou glisser pour déplacer</title></g>`;
 }).join('');
 const contour=`<g class="track-editor-contours" fill="none"><path d="M-10 54 Q74 5 142 56T370 34M-10 83Q65 35 145 80T370 59M-10 112Q70 65 151 108T370 89M-10 218Q68 155 142 214T370 179M-10 249Q75 185 151 244T370 210M-10 280Q76 217 160 274T370 242"/><path d="M31 0c24 37 18 53 4 73m92-78c-21 34-19 58 7 76m115-72c-18 39-12 61 11 82M48 188c20-27 45-30 67-7m92 36c25-31 49-33 79-11"/></g>`;
 const terrain=`<g class="track-editor-terrain"><path d="M0 102 52 62 104 84 154 42 204 76 256 29 310 71 360 38V300H0Z"/><path d="M0 173 48 146 102 161 156 124 207 156 260 107 314 142 360 115V300H0Z"/><path d="M0 234 60 207 119 227 175 189 231 218 292 176 360 202V300H0Z"/><path d="M0 82 47 44l27 8-21 6 28 3-30 9-7-12-21 24Zm190 34 37-34 25 6-22 7 22 6-34 8-7-11-15 18Zm105 47 31-28 24 6-20 6 21 6-33 7-7-10-16 13Z" class="track-editor-ridge"/></g>`;
 const forest=`<g class="track-editor-forest" aria-hidden="true">${[[28,130],[48,119],[68,134],[88,124],[113,143],[137,130],[161,144],[184,116],[207,134],[231,127],[255,145],[277,128],[300,150],[324,135],[35,164],[73,177],[117,170],[164,178],[210,163],[254,180],[304,174],[16,206],[56,219],[99,205],[145,222],[194,208],[239,227],[286,210],[334,223]].map(([x,y],i)=>`<path d="M${x} ${y+8}l7-14 7 14Z" class="track-editor-tree track-editor-tree-${i%3}"/>`).join('')}</g>`;
 const roads=`<g class="track-editor-roads" fill="none"><path d="M-8 268C56 248 67 188 123 192s71-54 101-70 50-9 76-42 49-38 70-40"/><path d="M-7 274C55 254 72 194 127 198s72-54 102-70 50-9 76-42 48-37 69-40"/><path d="M-6 91c46 15 72 4 108-13s56-10 84 5 47 28 83 19 52-28 97-16"/></g>`;
 const stream=`<path class="track-editor-water" d="M-4 194c41-18 59-17 83-5s40 31 66 28 37-32 62-34 42 14 57 12 26-20 41-25 33-4 57 7"/>`;
 const mapLabel=`Carte de démonstration ${basemap}. ${points.length} point(s). Ajoutez un point en touchant la carte.`;
 return `<div class="track-editor-map-wrap" data-editor-basemap="${basemap}" aria-label="Carte de tracé fictive"><svg class="track-editor-map track-editor-map--${basemap}" viewBox="0 0 360 300" preserveAspectRatio="xMidYMid meet" role="application" aria-label="${e(mapLabel)}" data-editor-map><defs><linearGradient id="editor-map-base" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#18313a"/><stop offset="1" stop-color="#101d28"/></linearGradient><linearGradient id="editor-map-surface" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#071522" stop-opacity=".17"/><stop offset="1" stop-color="#071522" stop-opacity=".47"/></linearGradient><radialGradient id="editor-map-glow"><stop stop-color="#d8bd7e" stop-opacity=".19"/><stop offset="1" stop-color="#d8bd7e" stop-opacity="0"/></radialGradient></defs><rect width="360" height="300" fill="url(#editor-map-base)"/><image class="track-editor-map-imagery" href="/src/assets/session-satellite-forest.png" x="0" y="0" width="360" height="300" preserveAspectRatio="xMidYMid slice"/><rect class="track-editor-map-overlay" width="360" height="300" fill="url(#editor-map-surface)"/><ellipse cx="70" cy="52" rx="185" ry="112" fill="url(#editor-map-glow)"/>${roads}<g class="track-editor-land">${terrain}</g>${forest}${stream}${contour}<g class="track-editor-paths">${segments}</g><g class="track-editor-points">${markers}</g><text class="track-editor-map-stamp" x="12" y="20">CARTE DE DÉMONSTRATION · AUCUN GPS RÉEL</text></svg><span class="track-editor-map-disclaimer">Aucun fond cartographique réel · tracé fictif</span></div>`;
}
