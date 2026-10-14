import {escapeHTML as e} from './components.mjs';
import {GpsMapMarkup} from './coaching-gps-screen.mjs';
import {gpsIcon} from './coaching-gps-ui.mjs';
import {preparedReferenceGeometry} from './coaching-geographic-reference.mjs';
const empty=()=>({provenance:'map-context',phase:'before',segments:[]});
export function geographicPoint(p){if(p?.space&&p.space!=='wgs84')return null;let latitude,longitude;if(p?.space==='wgs84'){latitude=p.latitude??p.y;longitude=p.longitude??p.x;}else if(Number.isFinite(p?.latitude)&&Number.isFinite(p?.longitude)){latitude=p.latitude;longitude=p.longitude;}else return null;return Number.isFinite(latitude)&&Math.abs(latitude)<=90&&Number.isFinite(longitude)&&Math.abs(longitude)<=180?{...p,latitude,longitude}:null;}
function observed(track){if(track?.provenance!=='device-geolocation'||!Array.isArray(track.segments))return null;const segments=track.segments.map(s=>Array.isArray(s)?s.map(geographicPoint):[]);if(segments.some(s=>s.some(p=>!p)))return null;return {...track,segments};}
function geometry(points){if(!Array.isArray(points)||!points.length)return null;const p=points.map(geographicPoint);if(p.some(x=>!x))return null;return preparedReferenceGeometry(p.map((x,i)=>({...points[i],space:'wgs84',x:x.longitude,y:x.latitude})));}
export function ReadOnlyRealMap(view={}, {label='Carte réelle · lecture seule'}={}){
 const allowed=view.synthetic!==true,pose=allowed?observed(view.gpsSearch)||observed(view.gpsTrack)||observed(view.gpsPose):null;
 const reference=allowed?(view.gpsSearch?observed(view.gpsPose):null)||geometry(view.referenceTrace):null;
 const planned=allowed?geometry(view.geographicRoute):null;
 const trace=allowed&&!pose?geometry(view.trace):null;
 const start=allowed&&view.showStart!==false?geographicPoint(view.start):null;
 const fallback=start?geometry([{...start,space:'wgs84',x:start.longitude,y:start.latitude}]):null;
 const events=allowed?(view.events||[]).flatMap(event=>{const p=geographicPoint(event.point);return p?[{id:event.id,type:event.type,point:{...p,space:'wgs84'}}]:[]}):[];
 const visible=track=>track?{...track,showStart:view.endpointVisibility?.start!==false,showArrival:view.endpointVisibility?.arrival!==false}:track;
 const actual=visible(pose||empty()),ref=visible(reference||trace),available=actual.segments.flat().length||ref?.segments?.flat().length||planned?.segments?.flat().length||fallback?.segments?.flat().length;
 return `<section class="real-map-reader" data-real-map-reader data-gps-kind="${view.gpsSearch?'search':'pose'}" aria-label="${e(label)}"><div class="gps-map-stage">${GpsMapMarkup(actual,ref,events,visible(planned||fallback)).replace('aria-label="Carte de la pose GPS"',`aria-label="${e(label)}"`)}<div class="gps-map-controls"><button type="button" class="gps-map-control" data-gps-center aria-label="Recentrer la carte">${gpsIcon('center')}</button><details class="gps-layer-picker"><summary class="gps-map-control" aria-label="Choisir le fond cartographique">${gpsIcon('layers')}</summary><div class="gps-layer-options"><button type="button" data-gps-layer="plan">Plan</button><button type="button" data-gps-layer="aerial">Vue aérienne</button><p data-gps-map-status role="status"></p></div></details></div></div><p class="real-map-availability">${available?'Coordonnées géographiques disponibles · lecture seule.':'Positions et tracés géographiques indisponibles. Fond de carte de contexte uniquement.'}</p></section>`;
}
