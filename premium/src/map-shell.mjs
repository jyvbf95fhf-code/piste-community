import {ReadOnlyRealMap} from './read-only-real-map.mjs';
// Receives an already filtered projection. Drawing units never become geographic coordinates.
export function MapShell(view={},options={}){return ReadOnlyRealMap(view,{label:options.postSession?'Carte de session · lecture seule':'Carte du terrain · lecture seule'});}
