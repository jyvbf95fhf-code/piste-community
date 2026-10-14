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
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="30" height="30" role="img" aria-label="${label}"><title>${label}</title><circle cx="16" cy="16" r="14" fill="#102438" stroke="#e5c17c" stroke-width="2"/><circle cx="16" cy="16" r="11" fill="#e5c17c"/><text x="16" y="21" text-anchor="middle" fill="#102438" font-family="system-ui,sans-serif" font-weight="700" font-size="15">${letter}</text></svg>`;
}
export function drawRouteEndpointMarkers(L,layers,track){
 // Older map adapters may expose only circle markers.
 if(!L.marker||!L.divIcon)return;
 for(const {letter,point} of routeEndpointMarkers(track))L.marker([point.latitude,point.longitude],{icon:L.divIcon({className:'gps-endpoint-marker',html:endpointBadge(letter),iconSize:[30,30],iconAnchor:[15,15]}),title:letter==='D'?'Départ':'Arrivée',zIndexOffset:letter==='A'?1100:1000,keyboard:true}).addTo(layers);
}
