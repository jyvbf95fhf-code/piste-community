import {retrospectivePoints} from './operational-retrospective.mjs';
import {MapShell} from './map-shell.mjs';
export function OperationalMap(view,{interactive=false}={}){
 if(!view||view.kind!=='operational'&&!view.id)return '';
 if(view.retrospective)return MapShell({geographicRoute:retrospectivePoints(view.retrospective)},{postSession:true});
 if(view.gpsTrack)return MapShell({gpsSearch:view.gpsTrack,events:view.events||[]},{postSession:true});
 return MapShell({trace:view.progress||view.trace||[],events:view.events||[],showStart:false},{operational:{missionId:view.id}});
}
