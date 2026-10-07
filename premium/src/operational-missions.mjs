import { gpxFixtures } from './track-library.mjs';
import { DOG_EVALUATION_CRITERIA, FIELD_EVALUATION_CRITERIA, OPERATIONAL_PAUSE_CLASSIFICATIONS, normalizeOperationalMission } from './operational-data.mjs';
import { calculateTrackAge, resolveTrackAgeReference } from './operational-time.mjs';

export const OPERATIONAL_MISSION_STATUSES = Object.freeze([
  'Brouillon',
  'En cours',
  'À compléter',
  'Terminée',
  'Archivée'
]);

export const OPERATIONAL_EVENT_TYPES = Object.freeze([
  'Départ',
  'Rupture',
  'Reprise',
  'Indice',
  'Objet trouvé',
  'Zone particulière',
  'Changement notable',
  'Fin de piste'
]);

const DETAIL_FIELDS = new Set([
  'searchedPerson',
  'searchedPersonDescription',
  'lastKnownDescription',
  'lastContactAt',
  'elapsedDelay',
  'context',
  'environment',
  'observations',
  'result',
  'notes'
]);
const PERSON_FIELDS = new Set(['identity', 'age', 'ageRange', 'sex', 'description', 'clothing', 'footwear', 'mobility', 'vulnerability', 'expectedBehavior', 'movementMethod']);
const TIME_FIELDS = new Set(['disappearanceAt', 'lastContactAt', 'timePrecision']);
const PLACE_FIELDS = new Set(['interventionAddress', 'interventionCommune', 'interventionSector', 'lastKnownDescription', 'probableTrackStart', 'confirmedTrackStart']);
const CONTEXT_FIELDS = new Set(['circumstances', 'environmentType', 'risks', 'observations', 'additionalInfo']);

const clone = value => structuredClone(value);
const formatSimulationTime = elapsedMs => {
  const totalSeconds = Math.floor(Math.max(0, Number(elapsedMs) || 0) / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `T+${hours}:${minutes}:${seconds} · simulation`;
};

function requireText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`Le champ ${label} est requis.`);
  return text;
}

function requireMission(records, id) {
  const mission = records.get(id);
  if (!mission) throw new Error('Mission opérationnelle introuvable.');
  return mission;
}

function requireEditable(mission) {
  if (mission.status === 'Terminée' || mission.status === 'Archivée') {
    throw new Error('Cette mission est en lecture seule.');
  }
}

function requireStatus(mission, expected, action) {
  if (mission.status !== expected) {
    throw new Error(`Transition impossible : ${action} est indisponible au statut ${mission.status}.`);
  }
}

function mockPoint(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || !Number.isFinite(Number(value.x)) || !Number.isFinite(Number(value.y))) {
    throw new Error('Utilisez un point de carte mock avec x et y; aucune coordonnée GPS n’est acceptée.');
  }
  if ('lat' in value || 'lon' in value || 'latitude' in value || 'longitude' in value) {
    throw new Error('Les coordonnées GPS réelles ne sont pas acceptées dans une mission mock.');
  }
  const x = Number(value.x);
  const y = Number(value.y);
  if (x < 0 || x > 100 || y < 0 || y > 100) {
    throw new Error('Le point de carte mock doit rester dans la zone 0–100.');
  }
  return { x, y, space: 'mock-map' };
}

function optionalText(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

export function createOperationalMissionStore({
  idFactory = () => `operational-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  clock = () => Date.now()
} = {}) {
  const records = new Map();

  const isoNow = () => new Date(clock()).toISOString();

  function trackingElapsedMs(mission, at = clock()) {
    if (!mission.trackingStartedAt) return 0;
    const end = mission.trackingStoppedAt ?? at;
    const openPause = mission.trackingPausedAt === null ? 0 : Math.max(0, end - mission.trackingPausedAt);
    return Math.max(0, end - mission.trackingStartedAt - mission.trackingPausedMs - openPause);
  }

  function appendJournal(mission, kind, { elapsedMs = trackingElapsedMs(mission), pointSequence = null, eventId = null } = {}) {
    const sequence = mission.journal.length + 1;
    mission.journal.push({
      id: `${mission.id}-journal-${sequence}`,
      sequence,
      kind,
      elapsedMs,
      timeLabel: mission.trackingStartedAt === null ? 'Avant départ · simulation' : formatSimulationTime(elapsedMs),
      ...(pointSequence === null ? {} : { pointSequence }),
      ...(eventId === null ? {} : { eventId })
    });
  }

  function startTracking(id, { lastKnownPoint } = {}) {
    const mission = requireMission(records, id);
    requireStatus(mission, 'Brouillon', 'Commencer le pistage');
    if (mission.trackingState !== 'ready') throw new Error('Le suivi ne peut être démarré qu’une seule fois.');
    mission.lastKnownPoint = mockPoint(lastKnownPoint);
    const trackingStartedAt = clock();
    mission.status = 'En cours';
    mission.trackingState = 'active';
    mission.startedAt = new Date(trackingStartedAt).toISOString();
    mission.trackingStartedAt = trackingStartedAt;
    mission.time.trackingStartedAt = trackingStartedAt;
    const ageReference = resolveTrackAgeReference(mission.time, trackingStartedAt);
    mission.time.trackAgeAtStart = ageReference
      ? { ...calculateTrackAge(ageReference.at, trackingStartedAt, ageReference.source), provenance: 'calculated' }
      : null;
    if (mission.time.trackAgeAtStart) mission.provenance['time.trackAgeAtStart'] = 'calculated';
    else delete mission.provenance['time.trackAgeAtStart'];
    appendJournal(mission, 'tracking_started', { elapsedMs: 0 });
    return snapshot(mission);
  }

  function pauseTracking(id) {
    const mission = requireMission(records, id);
    requireStatus(mission, 'En cours', 'Mettre le pistage en pause');
    if (mission.trackingState !== 'active') throw new Error('Seul un suivi actif peut être mis en pause.');
    const pausedAt = clock();
    const elapsedMs = trackingElapsedMs(mission, pausedAt);
    mission.trackingPausedAt = pausedAt;
    mission.trackingState = 'paused';
    mission.pauseObservations.push({
      id: `${mission.id}-pause-${mission.pauseObservations.length + 1}`,
      classification: 'manual_pause', detectedAt: pausedAt, endedAt: null, duration: null,
      detectionSource: 'user_action', confirmationState: 'user_confirmed',
      confirmedBy: mission.handler.id, note: null
    });
    appendJournal(mission, 'tracking_paused', { elapsedMs });
    return snapshot(mission);
  }

  function resumeTracking(id) {
    const mission = requireMission(records, id);
    requireStatus(mission, 'En cours', 'Reprendre le pistage');
    if (mission.trackingState !== 'paused' || mission.trackingPausedAt === null) throw new Error('Seul un suivi en pause peut être repris.');
    const resumedAt = clock();
    const elapsedMs = trackingElapsedMs(mission, resumedAt);
    mission.trackingPausedMs += Math.max(0, resumedAt - mission.trackingPausedAt);
    mission.time.pauseDurationMs = mission.trackingPausedMs;
    closeManualPause(mission, resumedAt);
    mission.trackingPausedAt = null;
    mission.trackingState = 'active';
    appendJournal(mission, 'tracking_resumed', { elapsedMs });
    return snapshot(mission);
  }

  function stopTracking(id) {
    const mission = requireMission(records, id);
    requireStatus(mission, 'En cours', 'Arrêter le pistage');
    if (!['active', 'paused'].includes(mission.trackingState)) throw new Error('Le suivi est déjà arrêté.');
    const trackingStoppedAt = clock();
    const elapsedMs = trackingElapsedMs(mission, trackingStoppedAt);
    if (mission.trackingState === 'paused' && mission.trackingPausedAt !== null) {
      mission.trackingPausedMs += Math.max(0, trackingStoppedAt - mission.trackingPausedAt);
      closeManualPause(mission, trackingStoppedAt);
      mission.trackingPausedAt = null;
    }
    mission.trackingStoppedAt = trackingStoppedAt;
    mission.trackingState = 'stopped';
    mission.status = 'À compléter';
    mission.fieldClosedAt = isoNow();
    mission.time.trackingStoppedAt = trackingStoppedAt;
    mission.time.trackingActiveDurationMs = elapsedMs;
    mission.time.pauseDurationMs = mission.trackingPausedMs;
    const ageReference = resolveTrackAgeReference(mission.time, trackingStoppedAt);
    mission.time.trackAgeAtStop = ageReference
      ? { ...calculateTrackAge(ageReference.at, trackingStoppedAt, ageReference.source), provenance: 'calculated' }
      : null;
    if (mission.time.trackAgeAtStop) mission.provenance['time.trackAgeAtStop'] = 'calculated';
    else delete mission.provenance['time.trackAgeAtStop'];
    const createdAtMs = Date.parse(mission.createdAt);
    mission.time.totalMissionDurationMs = Number.isFinite(createdAtMs) ? Math.max(0, trackingStoppedAt - createdAtMs) : null;
    const lastPoint = mission.trace.at(-1);
    if (lastPoint) lastPoint.isTrackingEnd = true;
    appendJournal(mission, 'tracking_stopped', { elapsedMs });
    appendJournal(mission, 'ready_to_complete', { elapsedMs });
    return snapshot(mission);
  }

  function snapshot(mission) {
    return mission ? { ...clone(mission), trackingElapsedMs: trackingElapsedMs(mission) } : null;
  }

  function getMutable(id) {
    return requireMission(records, id);
  }

  function closeManualPause(mission, endedAt) {
    const pause = [...mission.pauseObservations].reverse().find(item => item.classification === 'manual_pause' && item.endedAt === null);
    if (pause) {
      pause.endedAt = endedAt;
      pause.duration = Math.max(0, endedAt - pause.detectedAt);
    }
  }

  function normalizedEvaluation(current, input, criteria) {
    const next = { ...current };
    for (const [key, raw] of Object.entries(input || {})) {
      if (key === 'comment') {
        next.comment = optionalText(raw);
        continue;
      }
      if (!criteria.includes(key)) throw new Error(`Critère d’évaluation inconnu : ${key}.`);
      if (raw === null || raw === undefined || raw === '') {
        next[key] = null;
        continue;
      }
      const score = Number(raw);
      if (!Number.isInteger(score) || score < 1 || score > 5) throw new Error('Les évaluations utilisent une échelle unique de 1 à 5.');
      next[key] = score;
    }
    return next;
  }

  return Object.freeze({
    list() {
      return [...records.values()].map(snapshot);
    },

    get(id) {
      return snapshot(records.get(id));
    },

    createDraft({ dog, handler, entryMode = 'quick', details = {}, person = {}, time = {}, places = {}, context = {} } = {}) {
      if (!dog?.id) throw new Error('Un chien est requis pour démarrer une mission.');
      if (!handler?.id) throw new Error('Un conducteur mock est requis pour démarrer une mission.');
      const id = requireText(idFactory(), 'identifiant');
      if (records.has(id)) throw new Error('L’identifiant de mission existe déjà.');
      const createdAt = isoNow();
      const mission = {
        id,
        kind: 'operational',
        status: 'Brouillon',
        trackingState: 'ready',
        dogId: String(dog.id),
        dog: { id: String(dog.id), name: requireText(dog.name, 'nom du chien'), breed: optionalText(dog.breed) },
        handler: { id: String(handler.id), name: requireText(handler.name, 'nom du conducteur') },
        createdAt,
        startedAt: null,
        trackingStartedAt: null,
        trackingStoppedAt: null,
        trackingPausedAt: null,
        trackingPausedMs: 0,
        fieldClosedAt: null,
        completedAt: null,
        archivedAt: null,
        lastKnownPoint: null,
        trace: [],
        events: [],
        journal: [],
        details: {
          searchedPerson: null,
          searchedPersonDescription: null,
          lastKnownDescription: null,
          lastContactAt: null,
          elapsedDelay: null,
          context: null,
          environment: null,
          observations: null,
          result: null,
          notes: null,
          ...details
        },
        entryMode: entryMode === 'prepared' ? 'prepared' : 'quick',
        person,
        time,
        places,
        context,
        gpxAttachment: null,
        weatherDemo: null,
        olfactoryCorridorEnabled: false
      };
      const provenance = {};
      for (const [group, values] of Object.entries({ person, time, places, context, details })) {
        for (const [key, value] of Object.entries(values || {})) if (value !== null && value !== undefined && value !== '') provenance[`${group}.${key}`] = 'manual';
      }
      mission.provenance = provenance;
      const normalized = normalizeOperationalMission(mission);
      records.set(id, normalized);
      return snapshot(normalized);
    },

    start: startTracking,
    startTracking,
    pauseTracking,
    resumeTracking,
    stopTracking,

    trackingElapsedMs(id, at = clock()) {
      return trackingElapsedMs(getMutable(id), at);
    },

    updateDetails(id, patch = {}) {
      const mission = getMutable(id);
      requireEditable(mission);
      for (const [key, value] of Object.entries(patch)) {
        const text = optionalText(value);
        if (DETAIL_FIELDS.has(key)) {
          mission.details[key] = text;
          if (key === 'searchedPerson') mission.person.identity = text;
          if (key === 'searchedPersonDescription') mission.person.description = text;
          if (key === 'lastKnownDescription') mission.places.lastKnownDescription = text;
          if (key === 'lastContactAt') mission.time.lastContactAt = text;
          if (key === 'context') mission.context.circumstances = text;
          if (key === 'environment') { mission.context.environmentType = text; mission.environment.type = text; }
          if (key === 'observations') mission.context.observations = text;
          if (key === 'notes') mission.context.additionalInfo = text;
          if (key === 'result') mission.result = text;
        } else if (PERSON_FIELDS.has(key)) {
          mission.person[key] = text;
          if (key === 'identity') mission.details.searchedPerson = text;
          if (key === 'description') mission.details.searchedPersonDescription = text;
        } else if (TIME_FIELDS.has(key)) {
          mission.time[key] = text;
          if (key === 'lastContactAt') mission.details.lastContactAt = text;
        } else if (PLACE_FIELDS.has(key)) {
          if (key === 'confirmedTrackStart') mission.places[key] = text ? { description: text, point: null, confirmationState: 'user_confirmed', provenance: 'user_confirmed' } : null;
          else mission.places[key] = text;
          if (key === 'lastKnownDescription') mission.details.lastKnownDescription = text;
        } else if (CONTEXT_FIELDS.has(key)) {
          mission.context[key] = text;
          if (key === 'circumstances') mission.details.context = text;
          if (key === 'environmentType') { mission.details.environment = text; mission.environment.type = text; }
          if (key === 'observations') mission.details.observations = text;
          if (key === 'additionalInfo') mission.details.notes = text;
        } else {
          throw new Error(`Champ de mission non modifiable : ${key}.`);
        }
        const provenanceKey=`${PERSON_FIELDS.has(key)?'person':TIME_FIELDS.has(key)?'time':PLACE_FIELDS.has(key)?'places':CONTEXT_FIELDS.has(key)?'context':'details'}.${key}`;
        if (text !== null) mission.provenance[provenanceKey] = key === 'confirmedTrackStart' ? 'user_confirmed' : 'manual';
        else delete mission.provenance[provenanceKey];
      }
      return snapshot(mission);
    },

    recordPauseClassification(id, input = {}) {
      const mission = getMutable(id);
      requireEditable(mission);
      const classification = input.classification;
      if (!OPERATIONAL_PAUSE_CLASSIFICATIONS.includes(classification) || classification === 'manual_pause') {
        throw new Error('Classification d’immobilité automatique invalide.');
      }
      const confirmationState = ['pending', 'confirmed', 'ignored', 'unconfirmed'].includes(input.confirmationState) ? input.confirmationState : 'pending';
      const duration = input.duration === null || input.duration === undefined ? null : Number(input.duration);
      if (duration !== null && (!Number.isFinite(duration) || duration < 0)) throw new Error('La durée d’immobilité doit être positive ou indisponible.');
      mission.pauseObservations.push({
        id: `${mission.id}-pause-${mission.pauseObservations.length + 1}`,
        classification,
        detectedAt: input.detectedAt ?? null,
        endedAt: input.endedAt ?? null,
        duration,
        detectionSource: optionalText(input.detectionSource),
        confirmationState,
        confirmedBy: optionalText(input.confirmedBy),
        note: optionalText(input.note)
      });
      return snapshot(mission);
    },

    saveEvaluation(id, { dog = {}, field = {} } = {}) {
      const mission = getMutable(id);
      requireEditable(mission);
      mission.dogEvaluation = normalizedEvaluation(mission.dogEvaluation, dog, DOG_EVALUATION_CRITERIA);
      mission.fieldEvaluation = normalizedEvaluation(mission.fieldEvaluation, field, FIELD_EVALUATION_CRITERIA);
      mission.provenance.dogEvaluation = 'manual';
      mission.provenance.fieldEvaluation = 'manual';
      return snapshot(mission);
    },

    addProgressPoint(id, point) {
      const mission = getMutable(id);
      requireEditable(mission);
      requireStatus(mission, 'En cours', 'Ajouter une progression');
      if (mission.trackingState !== 'active') throw new Error('La progression est suspendue pendant la pause.');
      const normalized = mockPoint(point);
      if (!normalized) throw new Error('Un point de carte mock est requis.');
      const sequence = mission.trace.length + 1;
      const elapsedMs = trackingElapsedMs(mission);
      mission.trace.push({ ...normalized, sequence, role: sequence === 1 ? 'departure' : 'progress', elapsedMs, label: sequence === 1 ? 'Départ' : `Progression ${sequence - 1}` });
      appendJournal(mission, 'progress', { elapsedMs, pointSequence: sequence });
      return snapshot(mission);
    },

    addEvent(id, { type, note, point } = {}) {
      const mission = getMutable(id);
      requireEditable(mission);
      requireStatus(mission, 'En cours', 'Ajouter un événement');
      if (!['active', 'paused'].includes(mission.trackingState)) throw new Error('Aucun événement ne peut être ajouté après l’arrêt du suivi.');
      if (!OPERATIONAL_EVENT_TYPES.includes(type)) throw new Error('Type d’événement terrain invalide.');
      const normalizedPoint = mockPoint(point);
      const sequence = mission.events.length + 1;
      const elapsedMs = trackingElapsedMs(mission);
      const occurredAt = clock();
      const trackAgeReference = resolveTrackAgeReference(mission.time, occurredAt);
      const event = {
        id: `${mission.id}-event-${sequence}`,
        sequence,
        type,
        note: optionalText(note),
        point: normalizedPoint,
        elapsedMs,
        timeLabel: formatSimulationTime(elapsedMs),
        occurredAt,
        trackAge: trackAgeReference ? { ...calculateTrackAge(trackAgeReference.at, occurredAt, trackAgeReference.source), provenance: 'calculated' } : null
      };
      mission.events.push(event);
      appendJournal(mission, 'terrain_event', { elapsedMs, eventId: event.id });
      return snapshot(mission);
    },

    setCorridorEnabled(id, enabled) {
      const mission = getMutable(id);
      requireEditable(mission);
      if (typeof enabled !== 'boolean') throw new Error('L’état du couloir doit être activé ou désactivé.');
      mission.olfactoryCorridorEnabled = enabled;
      mission.olfactoryCorridor = {
        enabled,
        provenance: enabled ? 'estimated' : null,
        label: enabled ? 'ESTIMÉ · simulation' : null
      };
      if (enabled) mission.provenance.olfactoryCorridor = 'estimated';
      else delete mission.provenance.olfactoryCorridor;
      return snapshot(mission);
    },

    setWeatherDemo(id, enabled) {
      const mission = getMutable(id);
      requireEditable(mission);
      if (typeof enabled !== 'boolean') throw new Error('L’état météo doit être activé ou désactivé.');
      mission.weatherDemo = enabled ? {
        source: 'demo',
        provenance: 'demo',
        label: 'Démonstration · non mesuré',
        wind: 'Ouest · simulation',
        speed: '8 km/h · simulation',
        temperature: '16 °C · simulation'
      } : null;
      if (enabled) mission.provenance.weatherDemo = 'demo';
      else delete mission.provenance.weatherDemo;
      return snapshot(mission);
    },

    attachGpxDemo(id, fixtureId) {
      const mission = getMutable(id);
      requireStatus(mission, 'À compléter', 'Associer un GPX de démonstration');
      const fixture = gpxFixtures.find(item => item.id === fixtureId);
      if (!fixture) throw new Error('Choisissez un GPX de démonstration existant.');
      mission.gpxAttachment = {
        fixtureId: fixture.id,
        fileName: fixture.fileName,
        name: fixture.name,
        provenance: 'fixture',
        metadata: { sourceType: 'external_gps', importType: 'mock_fixture', manufacturer: null, deviceModel: null },
        geometry: null
      };
      mission.traceMetadata = { sourceType: 'gpx_import', sourceDevice: null, importType: 'mock_fixture' };
      mission.provenance.gpxAttachment = 'fixture';
      return snapshot(mission);
    },

    setSourceDevice(id, input = {}) {
      const mission = getMutable(id);
      requireStatus(mission, 'À compléter', 'Enregistrer la provenance de l’appareil');
      const value = key => optionalText(input[key]);
      const sourceType = value('sourceType');
      if (sourceType && !['external_gps', 'phone_gps', 'gpx_import'].includes(sourceType)) throw new Error('Type de source d’appareil inconnu.');
      mission.sourceDevice = {
        manufacturer: value('manufacturer'),
        deviceModel: value('deviceModel'),
        sourceType,
        importType: value('importType')
      };
      mission.provenance.sourceDevice = 'manual';
      return snapshot(mission);
    },

    closeField(id) {
      return stopTracking(id);
    },

    complete(id) {
      const mission = getMutable(id);
      requireStatus(mission, 'À compléter', 'Terminer');
      if (mission.trackingState !== 'stopped') throw new Error('Arrêtez le pistage avant de terminer la mission.');
      mission.status = 'Terminée';
      mission.completedAt = isoNow();
      appendJournal(mission, 'mission_completed');
      return snapshot(mission);
    },

    archive(id) {
      const mission = getMutable(id);
      requireStatus(mission, 'Terminée', 'Archiver');
      if (mission.trackingState !== 'stopped') throw new Error('Seule une mission terminée dont le suivi est arrêté peut être archivée.');
      mission.status = 'Archivée';
      mission.archivedAt = isoNow();
      appendJournal(mission, 'mission_archived');
      return snapshot(mission);
    },

    clear() {
      records.clear();
    }
  });
}
