import {escapeHTML as e} from './components.mjs';

export function TrackEditorMap(draft,{selectedPointId=null}={}){
 if(draft.coordinateSpace==='wgs84')return `<div class="track-editor-map-wrap"><div class="track-geographic-map" data-editor-real-map ${draft.readOnly?`data-readonly="true" data-route="${e(JSON.stringify(draft))}"`:''} aria-label="Carte réelle du parcours préparé"></div><p data-editor-map-status role="status"></p></div>`;
 return `<div class="track-editor-map-wrap"><div class="track-geographic-map" data-editor-real-map data-readonly="true" data-route="${e(JSON.stringify({coordinateSpace:'wgs84',points:[],readOnly:true}))}" aria-label="Carte réelle · contexte"></div><p class="track-geometry-unavailable">Ancien tracé sans coordonnées géographiques disponibles.</p><p data-editor-map-status role="status"></p></div>`;
}
