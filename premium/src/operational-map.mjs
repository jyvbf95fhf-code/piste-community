import {GpsMapMarkup} from './coaching-gps-screen.mjs';
import {MapShell} from './map-shell.mjs';
export function OperationalMap(view,{interactive=false}={}){
 if(!view||view.kind!=='operational'&&!view.id)return '';
 if(view.gpsTrack)return GpsMapMarkup(view.gpsTrack,null,(view.events||[]).filter(event=>event.point?.space==='wgs84').map(event=>({id:event.id,type:event.type,point:event.point})));
 return MapShell({trace:view.progress||view.trace||[],events:view.events||[],showStart:false},{operational:{missionId:view.id}});
}
