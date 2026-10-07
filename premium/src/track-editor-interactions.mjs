import {TRACK_MAP_BOUNDS} from './track-editor.mjs';

export function svgClientPointToMap({clientX,clientY,rect}={}){
 if(!rect||!(rect.width>0)||!(rect.height>0)||!Number.isFinite(clientX)||!Number.isFinite(clientY))return null;
 const scale=Math.min(rect.width/TRACK_MAP_BOUNDS.width,rect.height/TRACK_MAP_BOUNDS.height);
 if(!(scale>0))return null;
 const renderedWidth=TRACK_MAP_BOUNDS.width*scale,renderedHeight=TRACK_MAP_BOUNDS.height*scale;
 const offsetX=(rect.width-renderedWidth)/2,offsetY=(rect.height-renderedHeight)/2;
 const x=Math.max(0,Math.min(TRACK_MAP_BOUNDS.width,(clientX-rect.left-offsetX)/scale));
 const y=Math.max(0,Math.min(TRACK_MAP_BOUNDS.height,(clientY-rect.top-offsetY)/scale));
 return {x,y};
}
