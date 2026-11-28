import {gpsDistance} from './coaching-gps-model.mjs';
import {gpsIcon} from './coaching-gps-ui.mjs';

// The rotation extension defaults to suppressing native iOS page gestures.
globalThis.L?.Map?.mergeOptions?.({preventPageGestures:false});

export const CoachingHeadingButton='<button type="button" class="gps-map-control" data-coaching-heading aria-label="Suivre le cap de marche" title="Suivre le cap de marche" aria-pressed="false" hidden>'+gpsIcon('compass')+'</button>';

export function walkingHeading(from,to,nativeHeading,speed){
 if(Number.isFinite(nativeHeading)&&nativeHeading>=0&&nativeHeading<360&&Number.isFinite(speed)&&speed>=0.8)return nativeHeading;
 if(!from||to.timestamp<=from.timestamp||to.timestamp-from.timestamp>15000||
  gpsDistance(from,to)<Math.max(8,from.accuracy,to.accuracy))return null;
 const radians=Math.PI/180;
 const lat1=from.latitude*radians,lat2=to.latitude*radians;
 const delta=(to.longitude-from.longitude)*radians;
 const x=Math.sin(delta)*Math.cos(lat2);
 const y=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(delta);
 return (Math.atan2(x,y)/radians+360)%360;
}

export function createCoachingHeading(map,root){
 const button=root?.querySelector('[data-coaching-heading]');
 if(!button||typeof map.setHeading!=='function')return null;
 let enabled=false,following=false,fix=null,anchor=null,course=null;
 const updateButton=()=>{
  button.hidden=root.dataset.coachingHeading!=='active';
  button.setAttribute('aria-pressed',String(enabled));
  const label=enabled?'Remettre le nord en haut':'Suivre le cap de marche';
  button.setAttribute('aria-label',label);
  button.title=label;
 };
 const follow=()=>{
  if(!enabled||!following)return;
  if(fix)map.panTo([fix.latitude,fix.longitude],{animate:false});
  if(course!==null)map.setHeading(course,{deadzone:2});
 };
 const stop=()=>{
  enabled=false;
  following=false;
  map.stopHeadingUp();
  map.setBearing(0);
 };
 button.addEventListener('click',()=>{
  if(enabled)stop();
  else{enabled=true;following=true;follow();}
  updateButton();
 });
 map.on('dragstart',()=>{
  following=false;
  map.stopHeadingUp();
 });
 return {
  update(){
   if(root.dataset.coachingHeading!=='active'){
    if(enabled)stop();
    fix=anchor=course=null;
   }
   updateButton();
  },
  recenter(){
   if(!enabled)return false;
   following=true;
   follow();
   return !!fix;
  },
  onFix(point,heading,speed){
   if(root.dataset.coachingHeading!=='active'||fix&&point.timestamp<=fix.timestamp)return;
   fix=point;
   if(!anchor||point.timestamp-anchor.timestamp>15000)anchor=point;
   const next=walkingHeading(anchor,point,heading,speed);
   if(next!==null){course=next;anchor=point;}
   follow();
  }
 };
}
