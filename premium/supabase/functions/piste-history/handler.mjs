// src/coaching.mjs
var modes = [
  { id: "normal", icon: "modeNormal", title: "Normal", description: "Une piste connue, pour travailler un objectif ensemble.", visibility: "La piste est visible par tous les participants." },
  { id: "simple_blind", icon: "modeSimple", title: "Simple aveugle", description: "Le chien guide. Le conducteur d\xE9couvre la piste.", visibility: "Le Conducteur ne voit pas la piste. Coach, Traceur et Observateur la connaissent." },
  { id: "full_blind", icon: "modeDouble", title: "Double aveugle", description: "Observer sans orienter : le bin\xF4me et le Coach d\xE9couvrent.", visibility: "Seul le Traceur conna\xEEt la piste. Un Coach qui pose lui-m\xEAme la piste conserve la visibilit\xE9 du poseur." }
];
var traceTypes = [
  { id: "direct", title: "Terrain direct", description: "Le Traceur pr\xE9parera la piste sur le terrain.", icon: "terrainDirect" },
  { id: "prepared", title: "Trac\xE9 pr\xE9par\xE9", description: "Une piste choisie \xE0 l\u2019avance pour votre exercice.", icon: "trackPrepared" },
  { id: "gpx", title: "Import GPX", description: "Pr\xE9voir une piste issue d\u2019un fichier. Aucun fichier import\xE9 dans cet aper\xE7u.", icon: "gpxImport" },
  { id: "none", title: "Sans trac\xE9 pr\xE9par\xE9", description: "Organiser le coaching maintenant, d\xE9finir la piste plus tard.", icon: "trackNone" }
];
var roleTypes = [
  { id: "coach", title: "Coach", description: "Fixe l\u2019objectif, observe et accompagne le d\xE9brief.", icon: "roleCoach" },
  { id: "traceur", title: "Traceur", description: "Pr\xE9pare la piste et transmet les informations autoris\xE9es.", icon: "roleTracer" },
  { id: "driver", title: "Conducteur", description: "Travaille avec le chien et \xE9coute ses indications.", icon: "roleDriver" },
  { id: "observer", title: "Observateur", description: "Observe l\u2019exercice. Lecture seule, sans action ni modification.", icon: "roleObserver" }
];
var trackingScenarios = Object.freeze([
  { id: "connected_traceur", title: "Traceur avec application", description: "Le Traceur dispose de l\u2019application et r\xE9alise la pose.", normalOnly: false },
  { id: "self_trace", title: "Je trace pour moi-m\xEAme", description: "La m\xEAme personne r\xE9alisera la pose puis la rel\xE8ve.", normalOnly: true },
  { id: "external_traceur", title: "Traceur externe sans application", description: "Le Conducteur d\xE9clare sa mise en place. Aucune position du Traceur n\u2019existe dans l\u2019application.", normalOnly: false },
  { id: "external_driver_recorded", title: "Traceur externe \xB7 j\u2019enregistre sa pose", description: "Le t\xE9l\xE9phone Conducteur enregistre la pose du Traceur externe, puis sa propre rel\xE8ve.", normalOnly: true }
]);

// src/track-geographic.mjs
function geographicCoordinates({ x, y }) {
  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 180 || Math.abs(y) > 90) throw Error("Coordonn\xE9es g\xE9ographiques invalides.");
  return { x, y, space: "wgs84" };
}
function geographicDistance(a, b) {
  const rad = (v) => v * Math.PI / 180, dy = rad(b.y - a.y), dx = rad(b.x - a.x), h = Math.sin(dy / 2) ** 2 + Math.cos(rad(a.y)) * Math.cos(rad(b.y)) * Math.sin(dx / 2) ** 2;
  return 6371e3 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

// src/track-route-segments.mjs
var routeSegmentKey = (a, b) => JSON.stringify([a.x, a.y, b.x, b.y]);
function normalizeTrackRoute(route, a, b) {
  if (!route || !["IGN", "OSM", "Geoapify", "ORS"].includes(route.provider) || route.key !== routeSegmentKey(a, b) || !Array.isArray(route.coordinates) || route.coordinates.length < 2 || route.coordinates.length > 5e4) throw Error("Itin\xE9raire invalide.");
  const coordinates = route.coordinates.map((c) => {
    if (!Array.isArray(c) || c.length < 2) throw Error("Itin\xE9raire invalide.");
    geographicCoordinates({ x: c[0], y: c[1] });
    return [c[0], c[1]];
  });
  if (geographicDistance(a, { x: coordinates[0][0], y: coordinates[0][1] }) > 100 || geographicDistance(b, { x: coordinates.at(-1)[0], y: coordinates.at(-1)[1] }) > 100) throw Error("Choisissez des points plus proches des routes ou chemins.");
  return { key: route.key, provider: route.provider, coordinates };
}
function routeForSegment(a, b) {
  if (b?.space !== "wgs84" || b.incomingMode !== "follow" || b.breakBefore) return null;
  try {
    return normalizeTrackRoute(b.route, a, b);
  } catch {
    return null;
  }
}
function segmentCoordinates(a, b) {
  if (b.breakBefore) return [];
  if (b.space === "wgs84" && b.incomingMode === "follow") {
    const route = routeForSegment(a, b);
    return route ? [[a.x, a.y], ...route.coordinates, [b.x, b.y]] : [];
  }
  return [[a.x, a.y], [b.x, b.y]];
}
var trackHasPendingRoutes = (points) => points.some((p, i) => i > 0 && p.space === "wgs84" && p.incomingMode === "follow" && !p.breakBefore && !routeForSegment(points[i - 1], p));

// src/coaching-geographic-reference.mjs
var valid = (p) => p?.space === "wgs84" && Number.isFinite(p.x) && Math.abs(p.x) <= 180 && Number.isFinite(p.y) && Math.abs(p.y) <= 90;
function hasGeographicReference(session) {
  const points = session?.preparation?.geometry?.points;
  return ["prepared", "gpx"].includes(session?.traceType) && Array.isArray(points) && points.length >= 2 && points.every(valid) && !trackHasPendingRoutes(points);
}
function preparedReferenceGeometry(points) {
  if (!Array.isArray(points) || !points.length || !points.every(valid) || trackHasPendingRoutes(points)) return null;
  const fix = (p) => ({ latitude: p.y, longitude: p.x });
  const segments = [[fix(points[0])]];
  for (let i = 1; i < points.length; i++) {
    const coords = segmentCoordinates(points[i - 1], points[i]);
    if (!coords.length) segments.push([fix(points[i])]);
    else segments.at(-1).push(...coords.slice(1).map(([longitude, latitude]) => ({ latitude, longitude })));
  }
  return { provenance: "prepared-geographic", phase: points.length > 1 ? "finished" : "before", segments };
}

// src/coaching-gps-model.mjs
var GPS_LIMITS = Object.freeze({ accuracyM: 30, ageMs: 15e3, futureMs: 5e3, gapMs: 15e3 });
var finite = Number.isFinite;

// src/coaching-session-control.mjs
var id = (x) => typeof x === "string" && x.length > 0 && x.trim() === x;
var phases = ["PREPARATION", "LAYING", "TRACK_FINISHED", "LAYING_WAIT", "SEARCH_READY", "SEARCH_RUNNING", "SEARCH_FINISHED", "DEBRIEF", "ARCHIVED", "CANCELLED", "INTERRUPTED"];
var isCollectivelyClosed = (phase) => ["DEBRIEF", "ARCHIVED", "CANCELLED", "INTERRUPTED"].includes(phase);
function canParticipate(p, participantId) {
  return !!p?.team?.some((person) => person.id === participantId) && !p.session?.control?.closure && !p.session?.control?.departures?.some((d) => d.participantId === participantId);
}
var empty = () => ({ revision: 0, actions: [], departures: [] });
function coherent(r) {
  return !!r?.session?.id && r.preparationState?.session?.id === r.session.id && JSON.stringify(r.session) === JSON.stringify(r.preparationState.session) && phases.includes(r.searchState?.phase);
}
function started(r) {
  return r.searchState.phase !== "PREPARATION" || ["active", "finished", "in_place"].includes(r.tracerState?.phase) || r.tracerState?.recordingStoppedAt != null || !!r.searchState.search_started_at;
}
function sessionControlView(r, actor2) {
  const control = r?.session?.control || empty(), member = coherent(r) && id(actor2?.participantId) && r.session.participants.some((p) => p.id === actor2.participantId) && canParticipate(r.preparationState, actor2.participantId), open = member && !isCollectivelyClosed(r.searchState.phase), creator = member && r.session.creatorParticipantId === actor2.participantId;
  return { sessionId: r?.session?.id ?? null, revision: control.revision, phase: r?.searchState?.phase, canCancel: !!(open && creator && !started(r)), canInterrupt: !!(open && creator && started(r)), canLeave: !!(open && !creator), canReturnHome: true };
}

// src/coaching-remote-reference.mjs
function remoteReferenceView(session, { canRead, driver = false } = {}) {
  if (!["gpx", "prepared"].includes(session.traceType)) return { traceType: session.traceType || "direct", reference: null, referenceStart: null, referenceStatus: "none" };
  const r = session.preparation;
  if (!r) return { traceType: session.traceType, reference: null, referenceStart: null, referenceStatus: "required" };
  const first = r.geometry.points[0];
  return { traceType: session.traceType, reference: canRead ? { name: r.name, source: r.source, geometry: preparedReferenceGeometry(r.geometry.points) } : null, referenceStart: driver ? { latitude: first.y, longitude: first.x } : null, referenceStatus: canRead ? "available" : "hidden" };
}

// src/coaching-preparation.mjs
var gpsStates = Object.freeze({ acquiring: "Acquisition en cours", fresh: "Position fra\xEEche \xB7 simul\xE9e", stale: "Position ancienne \xB7 simul\xE9e", unavailable: "Position indisponible" });
var phaseLabels = Object.freeze({ created: "Session cr\xE9\xE9e", preparing: "Pr\xE9paration en cours", ready: "Pr\xEAt \xE0 tracer", external_ready: "Disponibilit\xE9 externe d\xE9clar\xE9e", waiting_driver: "Attente du Conducteur", approaching: "Approche du d\xE9part", arrived: "Arriv\xE9 au d\xE9part" });
var functions = roleTypes.map((r) => r.id);
var copy = (value) => structuredClone(value);
var roleName = (role) => roleTypes.find((r) => r.id === role)?.title;
var pointSlots = { coach: { x: 94, y: 184 }, traceur: { x: 206, y: 105 }, driver: { x: 116, y: 224 }, observer: { x: 275, y: 204 } };
var geometry = Object.freeze({ start: { x: 70, y: 242 }, arrival: { x: 282, y: 64 }, reference: "M70 242 Q90 194 137 188 T207 136 Q223 76 282 64", pose: "M70 242 Q82 202 133 192 T201 140 Q215 85 282 64", releve: "M70 242 Q102 212 133 198 Q168 188 189 160" });
function referenceStart(session) {
  const p = session?.preparation?.start;
  if (hasGeographicReference(session)) {
    const first = session.preparation.geometry.points[0];
    return { latitude: first.y, longitude: first.x, space: "wgs84" };
  }
  return ["prepared", "gpx"].includes(session?.traceType) && p?.space === "mock-map" && Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: p.x, y: p.y } : null;
}
function teamFrom(session) {
  return session.participants.map((p) => {
    const assigned = functions.filter((role) => role === "observer" ? session.roles.observers.includes(p.id) : session.roles[role] === p.id);
    const solo = session.roles.traceur === p.id && session.roles.driver === p.id;
    return { ...p, functions: assigned, activeFunction: solo ? "traceur" : p.id === "self" && assigned.includes(session.creatorRole) ? session.creatorRole : assigned.includes("traceur") ? "traceur" : assigned[0] };
  }).filter((p) => p.functions.length);
}
function mockPoints(team) {
  const count = {};
  return Object.fromEntries(team.map((p) => {
    const role = p.activeFunction, slot = pointSlots[role], n = count[role] || 0;
    count[role] = n + 1;
    return [p.id, { x: slot.x + n * 18, y: slot.y + n * 14 }];
  }));
}
function createPreparation(session) {
  if (!session?.prototype || !modes.some((m) => m.id === session.mode) || !traceTypes.some((t) => t.id === session.traceType)) throw Error("Session mock cr\xE9\xE9e requise.");
  const snapshot2 = copy(session), team = teamFrom(snapshot2);
  const scenario = snapshot2.scenario === "self_trace" ? "solo" : snapshot2.scenario === "connected_traceur" ? snapshot2.roles.traceur === snapshot2.roles.driver ? "solo" : "session" : "session";
  return { session: snapshot2, team, points: mockPoints(team), viewerId: team.some((p) => p.id === "self") ? "self" : team[0].id, phase: "created", traceurKind: ["connected_traceur", "self_trace"].includes(snapshot2.scenario) ? "internal" : "external", gps: "acquiring", positionsPresent: true, missingActors: [], layers: false, physicalLaid: false, scenario, productScenario: snapshot2.scenario, external: { name: "", state: "En pr\xE9paration \xB7 d\xE9clar\xE9" } };
}
function needsSessionReference(s) {
  return s.traceurKind === "internal" && ["prepared", "gpx"].includes(s.session.traceType) && !s.session.preparation?.id;
}
function canChooseSessionReference(s) {
  const viewer = s.team.find((person) => person.id === s.viewerId);
  return canParticipate(s, s.viewerId) && needsSessionReference(s) && s.productScenario === "connected_traceur" && ["created", "preparing"].includes(s.phase) && !s.physicalLaid && viewer?.activeFunction === "traceur" && viewer.functions.includes("traceur") && viewer.id === s.session.roles.traceur;
}
function preparationView(s) {
  const viewer = s.team.find((p) => p.id === s.viewerId), role = viewer.activeFunction, mode = s.session.mode;
  const readSpatial = mode === "normal" || role === "traceur" || mode === "simple_blind" && role !== "driver";
  const coachPoserReference = ["prepared", "gpx"].includes(s.session.traceType) && typeof s.session.preparation?.id === "string" && s.session.preparation.id.trim().length > 0 && mode === "full_blind" && role === "coach" && s.traceurKind === "internal" && viewer.id === s.session.roles.coach && viewer.id === s.session.roles.traceur && viewer.functions.includes("coach") && viewer.functions.includes("traceur") && !viewer.functions.includes("driver");
  const readReference = readSpatial || coachPoserReference;
  const concealTracer = mode === "full_blind" && role !== "traceur";
  const team = s.team.filter((p) => !(s.traceurKind === "external" && p.activeFunction === "traceur")).map((p) => ({ id: p.id, name: concealTracer && p.activeFunction === "traceur" ? "Traceur \u2014 masqu\xE9" : p.name, role: p.activeFunction, roleLabel: roleName(p.activeFunction), functions: [...p.functions], self: p.id === viewer.id, status: s.session.control?.departures?.some((d) => d.participantId === p.id) ? "Participation arr\xEAt\xE9e" : concealTracer && p.activeFunction === "traceur" ? "Informations masqu\xE9es" : p.activeFunction === "traceur" ? s.phase === "ready" ? "Pr\xEAt \xE0 tracer" : "Pr\xE9paration" : p.activeFunction === "driver" ? "En attente" : p.activeFunction === "observer" ? "Lecture seule" : "Supervision" }));
  const markers = [];
  for (const p of team) {
    const freshness = p.self ? s.gps : "fresh";
    const permitted = mode === "normal" || role === "traceur" || p.self || mode === "simple_blind" && (role !== "driver" || p.role !== "traceur");
    if (!canParticipate(s, p.id) || !permitted || !s.positionsPresent || s.missingActors.includes(p.id) || !["fresh", "stale"].includes(freshness)) continue;
    const point = s.points[p.id];
    if (!point) continue;
    markers.push({ ...point, id: p.id, role: p.role, name: p.name, freshness });
  }
  const paths = [];
  if (readReference && ["prepared", "gpx"].includes(s.session.traceType) && s.session.preparation?.id) paths.push({ kind: "reference", label: "R\xE9f\xE9rence pr\xE9par\xE9e \xB7 simul\xE9e", d: geometry.reference });
  if (readSpatial && s.layers && s.traceurKind === "internal") paths.push({ kind: "pose", label: "Pose \xB7 couche de test fictive", d: geometry.pose });
  if (readSpatial && s.layers) paths.push({ kind: "releve", label: "Rel\xE8ve \xB7 couche de test fictive", d: geometry.releve });
  const start = readReference || role === "driver" ? referenceStart(s.session) : null;
  const knownStart = !!start;
  const actions = role === "traceur" && s.traceurKind === "internal" && !needsSessionReference(s) ? ["created", "preparing", "approaching"].includes(s.phase) ? [{ id: knownStart ? "approach" : "ready", label: knownStart ? "Rejoindre le d\xE9part" : "Me d\xE9clarer pr\xEAt \xE0 tracer" }] : s.phase === "ready" ? [{ id: "ready", label: "Ouvrir la carte terrain" }] : [] : [];
  const external = s.traceurKind === "external" && (mode !== "full_blind" || role === "traceur") ? { name: s.external.name, state: s.external.state } : null;
  const displayedGps = !s.positionsPresent || s.missingActors.includes(viewer.id) ? "unavailable" : s.gps;
  const preparation = readReference && s.session.preparation ? copy(s.session.preparation) : null;
  const scenarioActions = s.productScenario === "external_traceur" ? s.phase !== "external_ready" && role === "driver" ? [{ id: "external-ready", label: "Le traceur est en place" }] : [] : s.productScenario === "external_driver_recorded" ? s.phase === "created" && role === "driver" ? [{ id: "start-pose", label: "D\xE9marrer l\u2019enregistrement de pose" }] : s.phase === "external_ready" && role === "driver" ? [{ id: "external-ready", label: "Le traceur est en place" }] : [] : [];
  return { ...s.session.preparation?.geometry?.points?.every((p) => p.space === "wgs84") ? { geographicRoute: readReference ? copy(s.session.preparation.geometry.points) : role === "driver" && start?.space === "wgs84" ? [{ x: start.longitude, y: start.latitude, space: "wgs84", kind: "start" }] : [] } : {}, phase: s.phase, phaseLabel: phaseLabels[s.phase], code: s.session.code, scenario: s.productScenario, mode, modeLabel: modes.find((m) => m.id === mode).title, traceType: s.session.traceType, traceLabel: traceTypes.find((t) => t.id === s.session.traceType).title, dog: { ...s.session.dog }, viewerId: viewer.id, role, roleLabel: roleName(role), team, external, externalPosition: null, gps: displayedGps, gpsLabel: gpsStates[displayedGps], knownStart, showStart: knownStart, start, arrival: readSpatial && paths.length ? { ...geometry.arrival } : null, markers, paths, actions: canParticipate(s, s.viewerId) ? [...actions, ...scenarioActions] : [], preparation, knowledgeNotice: viewer.functions.includes("traceur") && viewer.functions.includes("driver"), referenceHidden: !readSpatial, coachPoserReference, physicalLaid: false, referenceSelectionRequired: needsSessionReference(s), canChooseReference: canChooseSessionReference(s) };
}

// src/coaching-driver-gps-model.mjs
function searchGpsActiveMs(s, now = Date.now()) {
  if (s.phase !== "SEARCH_RUNNING") return s.searchActiveDurationMs ?? 0;
  const start = Date.parse(s.search_started_at || "");
  if (!Number.isFinite(start)) return 0;
  const open = s.searchTrackingState === "paused" ? Math.max(0, now - Date.parse(s.searchPausedAt)) : 0;
  return Math.max(0, now - start - s.searchTotalPausedMs - open);
}

// src/coaching-session-flow.mjs
function archivePermissionView(s, p) {
  const v = preparationView(p), id2 = p.session.creatorParticipantId, member = p.team.some((a) => a.id === v.viewerId), creator = !!id2 && member && v.viewerId === id2, authorization = s.archiveAuthorization;
  const beneficiaryParticipantId = p.session.roles.coach, beneficiary = p.team.find((a) => a.id === beneficiaryParticipantId && a.functions.includes("coach"));
  const active = authorization?.sessionId === p.session.id && authorization.status === "active" && authorization.grantedByParticipantId === id2 && authorization.beneficiaryParticipantId === beneficiaryParticipantId && !!beneficiary;
  return { sessionId: p.session.id, revision: authorization?.revision ?? 0, status: active ? "active" : "none", beneficiaryParticipantId, beneficiaryName: beneficiary?.name || "Coach", canManageArchive: s.phase === "DEBRIEF" && creator && !!beneficiary && beneficiaryParticipantId !== id2, canArchive: s.phase === "DEBRIEF" && (creator || active && isSearchCoach(p)) };
}

// src/coaching-search.mjs
var searchPhases = Object.freeze({ PREPARATION: "Session en attente", LAYING: "Traceur en pose", TRACK_FINISHED: "Pose termin\xE9e", LAYING_WAIT: "Traceur en place \xB7 attente", SEARCH_READY: "Recherche pr\xEAte", SEARCH_RUNNING: "Recherche en cours", SEARCH_FINISHED: "Recherche termin\xE9e", DEBRIEF: "D\xE9brief \xB7 lecture seule", ARCHIVED: "Session archiv\xE9e \xB7 lecture seule", CANCELLED: "Session annul\xE9e", INTERRUPTED: "Session interrompue" });
function isSearchCoach(p) {
  const v = preparationView(p);
  return v.role === "coach" && v.viewerId === p.session.roles.coach && p.team.some((a) => a.id === v.viewerId && a.functions.includes("coach"));
}

// src/coaching-tracer.mjs
function messageActor(p) {
  const person = p?.team?.find((a) => a.id === p.viewerId), role = person?.activeFunction;
  if (!person || !["coach", "traceur", "driver"].includes(role) || !person.functions.includes(role) || p.session.roles[role] !== person.id) throw Error("Messagerie r\xE9serv\xE9e aux fonctions d\xE9sign\xE9es de cette session.");
  return { id: person.id, name: person.name, role };
}
function sessionMessages(state, p) {
  let actor2;
  try {
    actor2 = messageActor(p);
  } catch {
    return { messages: [], unread: 0 };
  }
  const messages = state.messages.filter((m) => !m.sessionId || m.sessionId === p.session.id).map((m) => {
    const outgoing = m.participantId ? m.participantId === actor2.id : !!m.outgoing;
    const read = outgoing || (Array.isArray(m.readBy) ? m.readBy.includes(actor2.id) : !!m.read);
    const masked = p.session.mode === "full_blind" && actor2.role !== "traceur" && m.role === "Traceur", sender = masked ? "Traceur \u2014 masqu\xE9" : m.sender;
    return { id: m.id, sender, role: m.role, time: m.time, text: m.text, sessionId: m.sessionId, participantId: masked ? null : m.participantId, outgoing, read };
  });
  return { messages, unread: messages.filter((m) => !m.read && !m.outgoing).length };
}

// src/server/coaching-service.mjs
var poseRole = (s) => s.session.scenario === "external_traceur" ? null : ["external_driver_recorded", "self_trace"].includes(s.session.scenario) ? "driver" : "traceur";
function prep(s, viewerId) {
  const p = createPreparation(s.session);
  if (s.session.scenario === "self_trace") {
    for (const person of p.team) if (person.id === s.session.roles.driver) person.activeFunction = ["SEARCH_READY", "SEARCH_RUNNING", "DEBRIEF", "ARCHIVED"].includes(s.search.phase) ? "driver" : "traceur";
  }
  return { ...p, points: {}, positionsPresent: false, missingActors: [], gps: "unavailable", phase: s.session.scenario === "external_driver_recorded" ? "created" : ["gpx", "prepared"].includes(s.session.traceType) ? { approaching: "approaching", arrived: "arrived", ready: "ready" }[s.approachPhase] || "created" : "ready", viewerId };
}
var departed = (s, id2) => s.session.control?.departures?.some((d) => d.participantId === id2);
var snapshot = (s, p) => ({ session: s.session, preparationState: p, tracerState: s.tracer, searchState: s.search });
function actor(s, id2) {
  const a = s.members.find((m) => m.id === id2);
  if (!a) throw Object.assign(Error("Session inaccessible."), { status: 403 });
  return a;
}
function projectRemoteSession(s, userId, now = Date.now()) {
  const a = actor(s, userId), p = prep(s, userId);
  if (departed(s, userId)) return { id: s.session.id, version: s.version, ownerId: s.ownerId, role: a.role, dog: s.session.dog.name, mode: s.session.mode, phase: "LEFT", team: [], pose: null, search: null, poseStatus: "unavailable", searchActiveMs: null, events: [], messages: [], unread: 0, notes: [] };
  const closed = ["DEBRIEF", "ARCHIVED"].includes(s.search.phase), canSee = (other) => closed || other === a.role || a.role === "traceur" || s.session.mode === "normal" || s.session.mode === "simple_blind" && (a.role !== "driver" || other !== "traceur");
  const pose = canSee("traceur") ? structuredClone(s.tracer.gpsPose || null) : null, search = canSee("driver") ? structuredClone(s.search.gpsSearch || null) : null;
  return { ...userId === s.ownerId && s.pendingTeam ? { pendingTeam: structuredClone(s.pendingTeam) } : {}, referenceCoachAuthorized: s.referenceCoachAuthorized === true, canProposeReference: s.search.phase === "PREPARATION" && ["gpx", "prepared"].includes(s.session.traceType) && (a.role === poseRole(s) || s.session.mode !== "full_blind" && (userId === s.ownerId || a.role === "coach" && s.referenceCoachAuthorized) && !(s.session.mode === "simple_blind" && a.role === "driver")), referenceProposal: s.referenceProposal && (userId === s.referenceProposal.authorId || a.role === poseRole(s)) ? structuredClone(s.referenceProposal) : null, control: sessionControlView(snapshot(s, p), { participantId: userId }), archivePermission: archivePermissionView(s.search, p), notes: closed ? [s.search.driverDebriefNote, s.search.coachDebriefNote].filter(Boolean).map((n) => structuredClone(n)) : [], ...sessionMessages(s.tracer, p), ...remoteReferenceView(s.session, { canRead: canSee("traceur"), driver: a.role === "driver" }), approachPhase: a.role === poseRole(s) ? s.approachPhase || null : null, id: s.session.id, version: s.version, ownerId: s.ownerId, role: a.role, scenario: s.session.scenario || "connected_traceur", poseRecorder: poseRole(s), poseStatus: !poseRole(s) ? "unavailable" : !canSee("traceur") ? "hidden" : pose ? "available" : "pending", mode: s.session.mode, dog: s.session.dog.name, phase: s.search.phase, tracerPhase: s.tracer.phase, trackingState: s.search.searchTrackingState, team: s.members.map((m) => ({ id: m.id, name: s.session.mode === "full_blind" && a.role !== "traceur" && m.role === "traceur" && !closed ? "Traceur \u2014 masqu\xE9" : m.name, role: m.role, left: !!departed(s, m.id) })), pose, search, searchActiveMs: canSee("driver") ? searchGpsActiveMs(s.search, now) : null, trackFinishedAt: canSee("traceur") ? s.search.track_finished_at || null : null, events: (s.search.events || []).map(({ id: id2, type, phase, text }) => ({ id: id2, type, phase, text })), recorderSequence: a.role === poseRole(s) && ["PREPARATION", "LAYING", "TRACK_FINISHED"].includes(s.search.phase) ? s.recorders.tracer?.sequence ?? 0 : a.role === "driver" ? s.recorders.driver?.sequence ?? 0 : 0, qa: s.qa === true };
}

// src/server/piste-history-http.mjs
var fail = (message, status = 400) => {
  throw Object.assign(Error(message), { status });
};
var checked = (r) => {
  if (r.error) fail("Historique indisponible.", 503);
  return r.data;
};
var uuid = (x) => typeof x === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
function createHistoryHandler({ admin, authenticate, clock = Date.now }) {
  return async (request) => {
    const origin = request.headers.get("origin") || "", allowed = !origin || /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin) || /^https:\/\/piste-community-v2-premium(?:-[a-z0-9-]+-mw2f59b8p2-4030s-projects)?\.vercel\.app$/.test(origin);
    const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin", ...origin && allowed ? { "Access-Control-Allow-Origin": origin } : {}, "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info", "Access-Control-Allow-Methods": "POST,OPTIONS" };
    const respond = (v, status = 200) => new Response(JSON.stringify(v), { status, headers });
    try {
      if (!allowed) fail("Origine non autoris\xE9e.", 403);
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
      if (request.method !== "POST") fail("M\xE9thode non autoris\xE9e.", 405);
      if (Number(request.headers.get("content-length") || 0) > 5e4) fail("Requ\xEAte trop volumineuse.", 413);
      const text = await request.text();
      if (text.length > 5e4) fail("Requ\xEAte trop volumineuse.", 413);
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        fail("Requ\xEAte invalide.");
      }
      const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1], user = token ? await authenticate(token) : null;
      if (!user?.id) fail("Connexion requise.", 401);
      const uid = user.id;
      const pilot = checked(await admin.from("coaching_remote_users").select("id").eq("id", uid).eq("enabled", true).maybeSingle());
      if (!pilot) fail("Compte non autoris\xE9.", 403);
      if (body?.operation === "catalogue") {
        const domain = body.domain || "coaching";
        if (!["coaching", "hidden", "ops", "track"].includes(domain) || body.cursor != null && (typeof body.cursor !== "string" || body.cursor.length > 240 || domain !== "hidden" && !uuid(body.cursor))) fail("Curseur invalide.");
        let q = domain === "coaching" ? admin.from("coaching_remote_sessions").select("id,state,owner_id,version,updated_at").contains("state", { members: [{ id: uid }] }) : domain === "hidden" ? admin.from("v2_history_hidden").select("item_key").eq("owner_id", uid) : admin.from("v2_personal_records").select("id,kind,payload,revision,updated_at,deleted_at").eq("owner_id", uid).eq("kind", domain).is("deleted_at", null);
        const column = domain === "hidden" ? "item_key" : "id";
        q = q.order(column, { ascending: true });
        if (body.cursor) q = q.gt(column, body.cursor);
        const rows = checked(await q.limit(26)), page = rows.slice(0, 25);
        return respond({ sessions: domain === "coaching" ? page.map((r) => {
          let p;
          try {
            p = projectRemoteSession(r.state, uid, clock());
          } catch {
            p = { dog: r.state.session?.dog?.name || "Chien indisponible", role: r.state.members?.find((m) => m.id === uid)?.role || "observer", phase: r.state.search?.phase || "UNKNOWN", pose: null, search: null };
          }
          return { ...p, id: r.id, version: r.version, ownerId: r.owner_id, createdAt: r.state.createdAt ?? null, updatedAt: r.updated_at };
        }) : [], hidden: domain === "hidden" ? page.map((r) => r.item_key) : [], records: ["ops", "track"].includes(domain) ? page : [], cursor: rows.length > 25 ? page.at(-1)[column] : null });
      }
      if (body?.operation !== "batch" || !Array.isArray(body.items) || !body.items.length || body.items.length > 100) fail("S\xE9lection invalide (1 \xE0 100 \xE9l\xE9ments).");
      const results = [];
      for (const item of body.items) {
        if (!item || typeof item.key !== "string" || item.key.length > 240 || !["hide", "delete"].includes(item.action) || item.force !== void 0 && typeof item.force !== "boolean" || item.expectedVersion !== void 0 && (!Number.isSafeInteger(item.expectedVersion) || item.expectedVersion < 0)) {
          results.push({ key: item?.key || "", status: "refused", reason: "Commande invalide." });
          continue;
        }
        const r = await admin.rpc("v2_history_action", { p_actor: uid, p_key: item.key, p_action: item.action, p_expected: item.expectedVersion ?? null, p_force: item.force === true });
        if (r.error) {
          const code = r.error.code;
          results.push({ key: item.key, status: ["42501", "22023", "55000", "40001"].includes(code) ? "refused" : "failed", reason: code === "55001" ? "Dossier ancien incoh\xE9rent : r\xE9essayez en suppression forc\xE9e." : code === "42501" ? "Droits insuffisants ou d\xE9monstration prot\xE9g\xE9e." : code === "55000" ? "Session active : arr\xEAt requis." : code === "40001" ? "Dossier modifi\xE9 : actualisez puis r\xE9essayez." : "\xC9chec de la transaction : aucune suppression partielle." });
        } else results.push(r.data);
      }
      return respond({ results });
    } catch (e) {
      return respond({ error: e.status ? e.message : "Historique temporairement indisponible." }, e.status || 503);
    }
  };
}
export {
  createHistoryHandler
};
