const encode = value => encodeURIComponent(value);
const decode = value => {
  try {
    const id = decodeURIComponent(value);
    return id && !id.includes('/') ? id : null;
  } catch {
    return null;
  }
};

import { calculateTrackAge, resolveTrackAgeReference } from './operational-time.mjs';
import { operationalAnalysisProjection } from './operational-data.mjs';

const terminal = status => status === 'Terminée' || status === 'Archivée';
const unavailable = 'Aucune donnée disponible';

export function resolveOperationalRoute(pathname) {
  const path = String(pathname || '').replace(/\/+$/, '') || '/';
  if (path === '/operational') return { type: 'entry' };
  if (path === '/operational/new') return { type: 'new' };
  if (path === '/operational/prepare') return { type: 'prepared' };
  const match = path.match(/^\/operational\/missions\/([^/]+)(?:\/(replay))?$/);
  if (!match) return null;
  const missionId = decode(match[1]);
  if (!missionId) return null;
  return { type: match[2] === 'replay' ? 'replay' : 'mission', missionId };
}

export function operationalMissionView(mission, { dogs = [] } = {}) {
  if (!mission || mission.kind !== 'operational') return null;
  const currentDog = dogs.find(dog => dog.id === mission.dogId);
  const finalized = terminal(mission.status);
  const active = mission.status === 'En cours';
  const draft = mission.status === 'Brouillon';
  const toComplete = mission.status === 'À compléter';
  const trackingState = mission.trackingState || (draft ? 'ready' : 'stopped');
  const trackingLabel = ({ ready: 'Prêt', active: 'Suivi actif', paused: 'Suivi en pause', stopped: 'Suivi arrêté' })[trackingState];
  const trackingElapsedMs = Number.isFinite(mission.trackingElapsedMs) ? mission.trackingElapsedMs : 0;
  const corridorEnabled = mission.olfactoryCorridorEnabled === true;
  const time = structuredClone(mission.time || {});
  const ageReference = resolveTrackAgeReference(time);
  time.trackAgePreview = ageReference ? calculateTrackAge(ageReference.at, Date.now(), ageReference.source) : null;
  const trace = structuredClone(mission.trace || []);
  const events = structuredClone(mission.events || []);
  const journal = structuredClone(mission.journal || []);
  const timeline = journal.map(entry => ({
    ...entry,
    point: entry.pointSequence ? trace.find(point => point.sequence === entry.pointSequence) || null : null,
    event: entry.eventId ? events.find(event => event.id === entry.eventId) || null : null
  }));

  return {
    id: mission.id,
    kind: mission.kind,
    status: mission.status,
    trackingState,
    trackingLabel,
    trackingElapsedMs,
    readOnly: finalized,
    title: `Mission terrain · ${currentDog?.name || mission.dog?.name || unavailable}`,
    dogId: mission.dogId || null,
    dogName: currentDog?.name || mission.dog?.name || unavailable,
    dogBreed: currentDog?.breed || mission.dog?.breed || null,
    handlerName: mission.handler?.name || unavailable,
    handler: mission.handler ? structuredClone(mission.handler) : null,
    createdAt: mission.createdAt || null,
    entryMode: mission.entryMode || 'quick',
    time,
    lastKnownPoint: mission.lastKnownPoint ? structuredClone(mission.lastKnownPoint) : null,
    progress: trace,
    events,
    journal,
    timeline,
    details: structuredClone(mission.details || {}),
    result: mission.result ?? mission.details?.result ?? null,
    person: structuredClone(mission.person || {}),
    context: structuredClone(mission.context || {}),
    places: structuredClone(mission.places || {}),
    dogEvaluation: structuredClone(mission.dogEvaluation || {}),
    fieldEvaluation: structuredClone(mission.fieldEvaluation || {}),
    pauseObservations: structuredClone(mission.pauseObservations || []),
    sourceDevice: structuredClone(mission.sourceDevice || null),
    provenance: structuredClone(mission.provenance || {}),
    analysisContract: operationalAnalysisProjection(mission),
    gpxAttachment: mission.gpxAttachment ? structuredClone(mission.gpxAttachment) : null,
    weatherDemo: mission.weatherDemo ? structuredClone(mission.weatherDemo) : null,
    distance: null,
    duration: null,
    weatherLabel: mission.weatherDemo ? 'Démonstration · non mesuré' : unavailable,
    corridor: {
      enabled: corridorEnabled,
      label: corridorEnabled ? 'ESTIMÉ · simulation' : null
    },
    weatherDemo: mission.weatherDemo ? structuredClone(mission.weatherDemo) : null,
    canStart: draft,
    canAddProgress: active && trackingState === 'active',
    canAddEvent: active && ['active', 'paused'].includes(trackingState),
    canPause: active && trackingState === 'active',
    canResume: active && trackingState === 'paused',
    canStop: active && ['active', 'paused'].includes(trackingState),
    canCloseField: active && ['active', 'paused'].includes(trackingState),
    canComplete: toComplete,
    canArchive: mission.status === 'Terminée' && trackingState === 'stopped',
    canEditDetails: !finalized,
    canToggleCorridor: !finalized,
    canReplay: finalized
  };
}

export function operationalReplayView(mission) {
  if (!mission || mission.kind !== 'operational' || !terminal(mission.status)) return null;
  const corridorEnabled = mission.olfactoryCorridorEnabled === true;
  const trace = structuredClone(mission.trace || []);
  const events = structuredClone(mission.events || []);
  const journal = structuredClone(mission.journal || []);
  const timeline = journal.map(entry => ({
    ...entry,
    point: entry.pointSequence ? trace.find(point => point.sequence === entry.pointSequence) || null : null,
    event: entry.eventId ? events.find(event => event.id === entry.eventId) || null : null
  }));
  return {
    id: mission.id,
    kind: 'operational',
    title: `Mission terrain · ${mission.dog?.name || unavailable}`,
    status: mission.status,
    trackingState: mission.trackingState || 'stopped',
    trackingElapsedMs: Number.isFinite(mission.trackingElapsedMs) ? mission.trackingElapsedMs : 0,
    readOnly: true,
    entryMode: mission.entryMode || 'quick',
    time: structuredClone(mission.time || {}),
    places: structuredClone(mission.places || {}),
    person: structuredClone(mission.person || {}),
    context: structuredClone(mission.context || {}),
    dogEvaluation: structuredClone(mission.dogEvaluation || {}),
    fieldEvaluation: structuredClone(mission.fieldEvaluation || {}),
    pauseObservations: structuredClone(mission.pauseObservations || []),
    sourceDevice: structuredClone(mission.sourceDevice || null),
    provenance: structuredClone(mission.provenance || {}),
    analysisContract: operationalAnalysisProjection(mission),
    dog: mission.dog ? structuredClone(mission.dog) : null,
    handler: mission.handler ? structuredClone(mission.handler) : null,
    details: structuredClone(mission.details || {}),
    result: mission.result ?? mission.details?.result ?? null,
    lastKnownPoint: mission.lastKnownPoint ? structuredClone(mission.lastKnownPoint) : null,
    trace,
    events,
    journal,
    timeline,
    gpxAttachment: mission.gpxAttachment ? structuredClone(mission.gpxAttachment) : null,
    distance: null,
    duration: null,
    weather: mission.weatherDemo ? { ...structuredClone(mission.weatherDemo), label: 'Démonstration · non mesuré' } : null,
    olfactoryCorridor: corridorEnabled
      ? { enabled: true, label: 'ESTIMÉ · simulation', geometry: 'mock-overlay' }
      : null
  };
}

export function operationalSessionRows(missions = []) {
  return (missions || []).filter(mission => mission?.kind === 'operational').map(mission => {
    const finalized = terminal(mission.status);
    const encodedId = encode(mission.id);
    return {
      id: mission.id,
      kind: 'operational',
      provenance: 'Mission opérationnelle',
      href: finalized ? `/sessions/${encodedId}` : `/operational/missions/${encodedId}`,
      replayHref: finalized ? `/sessions/${encodedId}/replay` : null,
      title: `Mission terrain · ${mission.dog?.name || unavailable}`,
      status: mission.status,
      trackingState: mission.trackingState || null,
      trackingLabel: mission.trackingState === 'paused' ? 'Suivi en pause' : null,
      dogId: mission.dogId || null,
      dogName: mission.dog?.name || unavailable,
      modeLabel: 'Mission opérationnelle',
      roleLabel: mission.handler?.name ? `Conducteur · ${mission.handler.name}` : 'Conducteur',
      date: mission.createdAt || unavailable,
      trackAge: mission.time?.trackAgeAtStart?.label || null,
      distance: null,
      duration: Number.isFinite(mission.time?.trackingActiveDurationMs) ? `${Math.floor(mission.time.trackingActiveDurationMs / 60_000)} min · simulation` : null,
      canResume: false,
      readOnly: finalized
    };
  });
}
