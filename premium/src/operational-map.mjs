import {MapShell} from './map-shell.mjs';
export function OperationalMap(view,{interactive=false}={}){
 if(!view||view.kind!=='operational'&&!view.id)return '';
 if(view.gpsTrack)return MapShell({gpsSearch:view.gpsTrack,events:view.events||[]},{postSession:true});
 return MapShell({trace:view.progress||view.trace||[],events:view.events||[],showStart:false},{operational:{missionId:view.id}});
}
