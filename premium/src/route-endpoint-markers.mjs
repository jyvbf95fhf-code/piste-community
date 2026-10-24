export function routeEndpointMarkers(track){
 const points=(track?.segments||[]).flat();
 if(!points.length)return [];
 const markers=track.showStart===false?[]:[{letter:'D',point:points[0]}];
 if(['finished','stopped'].includes(track.phase)&&track.showArrival!==false)markers.push({letter:'A',point:points.at(-1)});
 return markers;
}
export function endpointBadge(letter){
 if(!['D','A'].includes(letter))throw new Error('Repère de parcours invalide');
 const label=letter==='D'?'Départ':'Arrivée';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="36" height="36" role="img" aria-label="${label}"><title>${label}</title><circle cx="20" cy="20" r="18" fill="#030908" stroke="${letter==='D'?'#63ff70':'#ff806d'}" stroke-width="3.5"/><circle cx="20" cy="20" r="13.5" fill="#07100e" stroke="${letter==='D'?'#63ff70':'#ff806d'}" stroke-opacity=".28" stroke-width="1"/><text x="20" y="26" text-anchor="middle" fill="${letter==='D'?'#78ff80':'#ffab99'}" font-family="system-ui,sans-serif" font-weight="800" font-size="19">${letter}</text></svg>`;
}
export function drawRouteEndpointMarkers(L,layers,track){
 // Older map adapters may expose only circle markers.
 if(!L.marker||!L.divIcon)return;
 for(const {letter,point} of routeEndpointMarkers(track))L.marker([point.latitude,point.longitude],{icon:L.divIcon({className:'gps-endpoint-marker',html:endpointBadge(letter),iconSize:[30,30],iconAnchor:[15,15]}),title:letter==='D'?'Départ':'Arrivée',zIndexOffset:letter==='A'?1100:1000,keyboard:true}).addTo(layers);
}
