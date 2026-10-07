export const OPERATIONAL_SCHEMA_VERSION = 2;

export const OPERATIONAL_PROVENANCE = Object.freeze([
  'manual', 'phone_gps', 'gpx_import', 'garmin', 'weather_api',
  'historical_weather', 'calculated', 'estimated', 'user_confirmed', 'demo', 'fixture'
]);

export const OPERATIONAL_PAUSE_CLASSIFICATIONS = Object.freeze([
  'manual_pause',
  'auto_stationary_detected',
  'auto_stationary_confirmed_pause',
  'auto_stationary_reclassified_work'
]);

export const DOG_EVALUATION_CRITERIA = Object.freeze([
  'motivation', 'concentration', 'regularity', 'autonomy', 'recoveryQuality',
  'fatigue', 'distractions', 'behavior', 'handlerConfidence'
]);

export const FIELD_EVALUATION_CRITERIA = Object.freeze([
  'terrainDifficulty', 'weatherDifficulty', 'trackAgeDifficulty',
  'odorPollution', 'humanTrafficDensity', 'reliefVegetation'
]);

const clone = value => structuredClone(value);
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];

const detailsDefaults = () => ({
  searchedPerson: null,
  searchedPersonDescription: null,
  lastKnownDescription: null,
  lastContactAt: null,
  elapsedDelay: null,
  context: null,
  environment: null,
  observations: null,
  result: null,
  notes: null
});

const evaluationDefaults = criteria => Object.fromEntries(criteria.map(key => [key, null]));

export function normalizeOperationalMission(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Une mission opérationnelle doit être un objet.');
  }
  const mission = clone(input);
  const oldDetails = object(mission.details);
  const places = object(mission.places);
  const time = object(mission.time);
  const context = object(mission.context);
  const corridor = object(mission.olfactoryCorridor);

  mission.schemaVersion = OPERATIONAL_SCHEMA_VERSION;
  mission.entryMode = mission.entryMode === 'prepared' ? 'prepared' : 'quick';
  mission.details = { ...detailsDefaults(), ...oldDetails };
  mission.person = {
    identity: null,
    age: null,
    ageRange: null,
    sex: null,
    description: mission.details.searchedPersonDescription ?? null,
    clothing: null,
    footwear: null,
    mobility: null,
    vulnerability: null,
    expectedBehavior: null,
    movementMethod: null,
    ...object(mission.person)
  };
  mission.time = {
    disappearanceAt: null,
    lastContactAt: mission.details.lastContactAt ?? null,
    timePrecision: null,
    trackingStartedAt: mission.trackingStartedAt ?? null,
    trackingStoppedAt: mission.trackingStoppedAt ?? null,
    trackAgeAtStart: null,
    trackAgeAtStop: null,
    trackingActiveDurationMs: null,
    pauseDurationMs: 0,
    totalMissionDurationMs: null,
    ...time
  };
  mission.places = {
    interventionAddress: null,
    interventionCommune: null,
    interventionSector: null,
    lastKnownPoint: mission.lastKnownPoint ?? null,
    lastKnownDescription: mission.details.lastKnownDescription ?? null,
    probableTrackStart: null,
    confirmedTrackStart: null,
    ...places
  };
  mission.context = {
    circumstances: mission.details.context ?? null,
    environmentType: mission.details.environment ?? null,
    risks: null,
    observations: mission.details.observations ?? null,
    additionalInfo: mission.details.notes ?? null,
    ...context
  };
  mission.traceMetadata = {
    sourceType: null,
    sourceDevice: null,
    importType: null,
    ...object(mission.traceMetadata)
  };
  mission.pauseObservations = array(mission.pauseObservations);
  mission.environment = {
    type: mission.context.environmentType ?? null,
    weather: null,
    ...object(mission.environment)
  };
  mission.sourceDevice = mission.sourceDevice === undefined ? null : mission.sourceDevice;
  mission.dogEvaluation = { ...evaluationDefaults(DOG_EVALUATION_CRITERIA), ...object(mission.dogEvaluation), comment: object(mission.dogEvaluation).comment ?? null };
  mission.fieldEvaluation = { ...evaluationDefaults(FIELD_EVALUATION_CRITERIA), ...object(mission.fieldEvaluation), comment: object(mission.fieldEvaluation).comment ?? null };
  mission.dataQuality = mission.dataQuality === undefined ? null : mission.dataQuality;
  mission.result = mission.result === undefined ? mission.details.result ?? null : mission.result;
  mission.provenance = object(mission.provenance);
  mission.olfactoryCorridor = {
    ...corridor,
    enabled: typeof corridor.enabled === 'boolean' ? corridor.enabled : mission.olfactoryCorridorEnabled === true,
    provenance: corridor.provenance ?? (mission.olfactoryCorridorEnabled === true ? 'estimated' : null),
    label: corridor.label ?? (mission.olfactoryCorridorEnabled === true ? 'ESTIMÉ · simulation' : null)
  };
  mission.olfactoryCorridorEnabled = mission.olfactoryCorridor.enabled;
  mission.trace = array(mission.trace);
  mission.events = array(mission.events);
  mission.journal = array(mission.journal);
  return mission;
}

// Stable future JUMOLF/PDF contract. This is a lossless projection of present
// mock data; it performs no analysis and never derives missing measurements.
export function operationalAnalysisProjection(input) {
  const mission = normalizeOperationalMission(input);
  return {
    schemaVersion: OPERATIONAL_SCHEMA_VERSION,
    missionId: mission.id ?? null,
    kind: mission.kind ?? null,
    entryMode: mission.entryMode,
    status: mission.status ?? null,
    dogId: mission.dogId ?? mission.dog?.id ?? null,
    handlerId: mission.handler?.id ?? null,
    person: clone(mission.person),
    time: {
      disappearanceAt: mission.time.disappearanceAt,
      lastContactAt: mission.time.lastContactAt,
      trackingStartedAt: mission.time.trackingStartedAt,
      trackingStoppedAt: mission.time.trackingStoppedAt,
      trackAgeAtStart: clone(mission.time.trackAgeAtStart),
      trackAgeAtStop: clone(mission.time.trackAgeAtStop),
      trackingActiveDurationMs: mission.time.trackingActiveDurationMs,
      pauseDurationMs: mission.time.pauseDurationMs,
      totalMissionDurationMs: mission.time.totalMissionDurationMs
    },
    places: clone(mission.places),
    trace: clone(mission.trace),
    traceMetadata: clone(mission.traceMetadata),
    events: clone(mission.events),
    pauses: clone(mission.pauseObservations),
    environment: clone(mission.environment),
    weather: clone(mission.weatherDemo),
    result: mission.result,
    dogEvaluation: clone(mission.dogEvaluation),
    fieldEvaluation: clone(mission.fieldEvaluation),
    corridor: clone(mission.olfactoryCorridor),
    gpxAttachment: clone(mission.gpxAttachment ?? null),
    sourceDevice: clone(mission.sourceDevice),
    dataQuality: mission.dataQuality,
    provenance: clone(mission.provenance),
    journal: clone(mission.journal)
  };
}
