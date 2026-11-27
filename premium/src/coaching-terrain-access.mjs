const supervisionPhases=new Set(['SEARCH_READY','SEARCH_RUNNING','SEARCH_FINISHED']);

function blindTerrainOpen(state,viewerId){
 return Boolean(viewerId)&&supervisionPhases.has(state.search.phase)
  &&!state.session.control?.departures?.some(departure=>departure.participantId===viewerId);
}

export function coachHasBlindTerrain(state,viewerId){
 return state.session.mode==='full_blind'&&blindTerrainOpen(state,viewerId)
  &&Boolean(state.members?.some(member=>member.id===viewerId&&member.role==='coach'));
}

// Live access is checked by the existing RPC before this projection runs.
export function liveViewerHasBlindTerrain(state,viewerId){
 const driverId=state.session.roles?.driver;
 const drivers=(state.members||[]).filter(member=>member.role==='driver');
 return ['simple_blind','full_blind'].includes(state.session.mode)&&blindTerrainOpen(state,viewerId)
  &&(Boolean(driverId)||drivers.length>0)
  &&viewerId!==driverId&&!drivers.some(member=>member.id===viewerId);
}
