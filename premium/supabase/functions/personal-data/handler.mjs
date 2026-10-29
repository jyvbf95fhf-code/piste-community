// src/persistence-contract.mjs
var PERSISTENCE_KINDS = Object.freeze(["profile", "dog", "track", "ops", "session-dog-link"]);
var persistenceUuid = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
function validatePersistenceRecord(record2) {
  const keys = ["schemaVersion", "kind", "id", "revision", "updatedAt", "deletedAt", "payload"];
  if (!record2 || Object.keys(record2).some((k) => !keys.includes(k)) || record2.schemaVersion !== 1 || !PERSISTENCE_KINDS.includes(record2.kind) || !persistenceUuid(record2.id) || !Number.isSafeInteger(record2.revision) || record2.revision < 1 || typeof record2.updatedAt !== "string" || !Number.isFinite(Date.parse(record2.updatedAt)) || record2.deletedAt !== null && (typeof record2.deletedAt !== "string" || !Number.isFinite(Date.parse(record2.deletedAt))) || !record2.payload || typeof record2.payload !== "object" || Array.isArray(record2.payload)) throw Error("Dossier de sauvegarde invalide.");
  return structuredClone(record2);
}
function persistenceTrackDates(value) {
  const dates = {};
  for (const field of ["createdAt", "updatedAt"]) if (Object.hasOwn(value, field)) {
    const x = value[field];
    if (typeof x !== "string" || x.length > 40 || !/^\d{4}-\d\d-\d\dT/.test(x) || !Number.isFinite(Date.parse(x))) throw Error("Date du trac\xE9 invalide.");
    dates[field] = x;
  }
  return dates;
}

// src/track-canine.mjs
var CANINE_LEVELS = [
  { id: "initiation", label: "Initiation", distanceKm: 0.15, range: "50 \xE0 300 m", terrain: "nature", transitions: "few", maxTurns: 1, criteria: "Piste courte, direction simple, r\xE9compense pr\xE9par\xE9e et objectif unique.", limits: "Adapter au jeune chien et au d\xE9butant ; r\xE9duire ou interrompre selon les observations. Aucun \xE2ge ni seuil universel." },
  { id: "consolidation", label: "Consolidation", distanceKm: 0.6, range: "300 \xE0 1 000 m", terrain: "nature", transitions: "few", maxTurns: 3, criteria: "R\xE9p\xE9tition document\xE9e, quelques angles et continuit\xE9 ; conserver les autres conditions autant que possible.", limits: "La r\xE9p\xE9tition ne prouve pas l\u2019acquisition. Comparer uniquement des s\xE9ances suffisamment document\xE9es." },
  { id: "diversification", label: "Diversification", distanceKm: 1.2, range: "600 \xE0 2 000 m", terrain: "mixed", transitions: "several", maxTurns: 6, criteria: "Explorer les transitions renseign\xE9es et les changements de milieu, un facteur nouveau \xE0 la fois.", limits: "Aucune hi\xE9rarchie universelle des sols ; un rev\xEAtement OSM doit \xEAtre v\xE9rifi\xE9 sur place." },
  { id: "operational", label: "Complexit\xE9 op\xE9rationnelle", distanceKm: 2, range: "1 000 \xE0 4 000 m", terrain: "mixed", transitions: "several", maxTurns: 12, criteria: "Sc\xE9nario pr\xE9par\xE9, difficult\xE9s combin\xE9es choisies et protocole d\u2019observation explicite.", limits: "R\xE9serv\xE9 \xE0 un travail adapt\xE9 et encadr\xE9. Ce niveau ne certifie aucune aptitude op\xE9rationnelle officielle." }
].map((l) => ({ ...l, updatedAt: "2026-10-20", minAngle: 45 }));
var CANINE_SKILLS = [
  { id: "motivation", label: "Motivation et premi\xE8res pistes", key: null, objective: "Observer l\u2019engagement sur une t\xE2che simple avec une r\xE9compense adapt\xE9e." },
  { id: "continuity", label: "Continuit\xE9, ruptures et reprises", key: "interruptions", objective: "D\xE9crire les ruptures et reprises signal\xE9es, les aides et le contexte sans pr\xE9sumer leur cause." },
  { id: "angles", label: "Changements de direction", key: "reference", objective: "Observer la conduite et les \xE9carts \xE0 une r\xE9f\xE9rence connue aux changements de direction." },
  { id: "surfaces", label: "Transitions et environnements", key: "conditions", objective: "Documenter les comportements autour de transitions v\xE9rifi\xE9es sur le terrain." },
  { id: "regularity", label: "R\xE9gularit\xE9 entre s\xE9ances", key: "regularity", objective: "R\xE9p\xE9ter une t\xE2che et documenter les conditions de comparaison." },
  { id: "track-age", label: "\xC2ge de piste document\xE9", key: "track-age", objective: "Consigner le d\xE9lai r\xE9el entre pose et recherche sans lui attribuer seul les observations." }
];

// src/track-geographic.mjs
function geographicCoordinates({ x, y }) {
  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 180 || Math.abs(y) > 90) throw Error("Coordonn\xE9es g\xE9ographiques invalides.");
  return { x, y, space: "wgs84" };
}
function geographicDistance(a, b) {
  const rad = (v) => v * Math.PI / 180, dy = rad(b.y - a.y), dx = rad(b.x - a.x), h = Math.sin(dy / 2) ** 2 + Math.cos(rad(a.y)) * Math.cos(rad(b.y)) * Math.sin(dx / 2) ** 2;
  return 6371e3 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
var trackDeparture = (p) => p.space === "wgs84" ? { longitude: p.x, latitude: p.y, space: "wgs84" } : { x: p.x, y: p.y, space: "mock-map" };

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

// src/track-editor.mjs
var TRACK_MAP_BOUNDS = Object.freeze({ width: 360, height: 300 });

// src/track-smart-engine.mjs
var surfaces = new Map([
  ...["asphalt", "concrete", "concrete:plates", "concrete:lanes", "paved", "paving_stones", "sett", "cobblestone", "unhewn_cobblestone", "metal", "wood"].map((x) => [x, x]),
  ...["grass", "ground", "dirt", "earth", "mud", "sand", "gravel", "fine_gravel", "compacted", "pebblestone", "unpaved", "rock"].map((x) => [x, x])
]);

// src/track-mission-model.mjs
function missionTimeline(poseAt, departureAt, position = 0) {
  const parse = (v) => typeof v === "number" ? v : typeof v === "string" && v.trim() ? Date.parse(v) : NaN;
  const start = parse(poseAt), end = parse(departureAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > 31 * 864e5) return { valid: false, at: null, ageSeconds: null, reason: "Renseignez fin de pose et d\xE9part pr\xE9vus dans l\u2019ordre, sur une p\xE9riode maximale de 31 jours." };
  const at = start + (end - start) * Math.max(0, Math.min(1, Number(position) || 0));
  return { valid: true, start, end, at, ageSeconds: Math.round((at - start) / 1e3), plannedAgeSeconds: Math.round((end - start) / 1e3), provenance: "calculated-from-declarations" };
}
var MISSION_WEATHER_LABELS = { wind_speed_kmh: "Vent (km/h)", wind_direction_deg: "Vent venant de (\xB0)", wind_gusts_kmh: "Rafales, maximum heure pr\xE9c\xE9dente (km/h)", temperature_c: "Temp\xE9rature (\xB0C)", humidity_pct: "Humidit\xE9 (%)", precipitation_mm: "Pr\xE9cipitations, cumul heure pr\xE9c\xE9dente (mm)" };

// src/jumolf-training-memory.mjs
var clone = (x) => structuredClone(x);
var fail = () => {
  throw Error("Pr\xE9paration p\xE9dagogique incompatible avec ce compte ou ce chien.");
};
var text = (x, n = 600) => typeof x === "string" && x.trim() && x.length <= n;
var list = (x) => Array.isArray(x) && x.length <= 20 && x.every((v) => text(v));
var iso = (x) => typeof x === "string" && Number.isFinite(Date.parse(x));
var fields = ["version", "id", "ownerId", "dogId", "createdAt", "level", "skill", "objective", "criteria", "instructions", "observations", "limits", "parameters", "schedule", "weather", "recommendationId"];
function normalizeTrainingMemory(input, { ownerId, dogId } = {}) {
  if (!input || typeof input !== "object" || Object.keys(input).some((k) => !fields.includes(k)) || input.version !== 1 || !text(input.id, 100) || !text(input.ownerId, 100) || input.ownerId !== ownerId || input.dogId !== dogId || !text(input.dogId, 100) || !iso(input.createdAt) || input.level !== null && !CANINE_LEVELS.some((l) => l.id === input.level) || input.skill !== null && !CANINE_SKILLS.some((s) => s.id === input.skill) || !text(input.objective) || !["criteria", "instructions", "observations", "limits"].every((k) => list(input[k]))) fail();
  const p = input.parameters;
  if (!p || Object.keys(p).some((k) => !["distanceM", "turns"].includes(k)) || p.distanceM !== null && (!Number.isFinite(p.distanceM) || p.distanceM < 0) || p.turns !== null && (!Number.isInteger(p.turns) || p.turns < 0 || p.turns > 1e3)) fail();
  if (input.schedule !== null) {
    const s = input.schedule, t = missionTimeline(s?.poseAt, s?.departureAt);
    if (!s || Object.keys(s).some((k) => !["poseAt", "departureAt", "plannedAgeSeconds", "provenance"].includes(k)) || !t.valid || s.plannedAgeSeconds !== t.plannedAgeSeconds || s.provenance !== "calculated-from-declarations") fail();
  }
  if (input.weather !== null) {
    const w = input.weather;
    if (!w || Object.keys(w).some((k) => !["basis", "observedAt", "source", "values"].includes(k)) || !["declared-constant", "provider-model"].includes(w.basis) || !text(w.source, 160) || w.observedAt !== null && !Number.isFinite(w.observedAt) || !w.values || Object.keys(w.values).some((k) => !Object.hasOwn(MISSION_WEATHER_LABELS, k) || !Number.isFinite(w.values[k]))) fail();
  }
  if (input.recommendationId !== void 0 && !text(input.recommendationId, 160)) fail();
  if (JSON.stringify(input).length > 16e3) fail();
  return clone(input);
}

// src/personal-change.mjs
function personalChanged(ownerId) {
  if (ownerId && typeof globalThis.dispatchEvent === "function" && typeof Event === "function") globalThis.dispatchEvent(new Event("piste:personal-change"));
}

// src/profile-store.mjs
var DEFAULTS = Object.freeze({ theme: "system", distance_unit: "km", speed_unit: "km/h", time_format: "24h", map_default: "standard", density: "comfortable", language: "fr" });
var clone2 = (value) => structuredClone(value);
function createProfileStore(initial = {}, { ownerId = null, storage = null } = {}) {
  let state = { primary_dog_id: initial.primary_dog_id ?? null, avatar: initial.avatar ?? "initials", preferences: { ...DEFAULTS, ...initial.preferences } };
  const key = ownerId ? "piste-v2-profile:" + encodeURIComponent(ownerId) : null;
  let blocked = false, warning = "";
  if (key && storage) try {
    const raw = storage.getItem(key);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.version !== 1 || saved.ownerId !== ownerId || !saved.profile) throw Error();
      const p = saved.profile, validator = createProfileStore();
      validator.setAvatar(p.avatar);
      if (p.primary_dog_id !== null && typeof p.primary_dog_id !== "string") throw Error();
      validator.setPrimaryDog(p.primary_dog_id);
      validator.setPreferences(p.preferences);
      state = validator.snapshot();
    }
  } catch {
    blocked = true;
    warning = "Sauvegarde du profil illisible : original conserv\xE9.";
  }
  const commit = (next) => {
    if (key) {
      if (blocked) throw Error(warning);
      try {
        if (!storage) throw Error();
        storage.setItem(key, JSON.stringify({ version: 1, ownerId, profile: next }));
        warning = "";
      } catch {
        warning = "Profil non enregistr\xE9 : stockage local indisponible.";
        throw Error(warning);
      }
    }
    state = next;
    personalChanged(ownerId);
    return clone2(state);
  };
  return Object.freeze({
    persistenceWarning: () => warning,
    restoreCloud(payload) {
      const validator = createProfileStore();
      validator.setAvatar(payload.avatar);
      validator.setPrimaryDog(payload.primary_dog_id);
      validator.setPreferences(payload.preferences);
      return commit(validator.snapshot());
    },
    snapshot: () => clone2(state),
    setPrimaryDog(id) {
      return commit({ ...state, primary_dog_id: id == null ? null : String(id) });
    },
    setAvatar(value) {
      if (!["initials", "terrain", "silhouette"].includes(value)) throw new TypeError("Avatar mock inconnu.");
      return commit({ ...state, avatar: value });
    },
    setPreferences(patch = {}) {
      const next = { ...state.preferences };
      const allowed = { theme: ["system", "dark", "light"], distance_unit: ["km", "m"], speed_unit: ["km/h"], time_format: ["24h", "12h"], map_default: ["standard", "topographic", "satellite"], density: ["comfortable", "compact"], language: ["fr", "en"] };
      for (const [key2, value] of Object.entries(patch)) {
        if (!Object.hasOwn(allowed, key2)) continue;
        if (!allowed[key2].includes(value)) throw new TypeError(`Valeur invalide pour ${key2}.`);
        next[key2] = value;
      }
      return commit({ ...state, preferences: next });
    }
  });
}

// src/config.mjs
var PROTOTYPE_MODE = true;

// src/data.mjs
if (!PROTOTYPE_MODE) throw new Error("Ce prototype ne poss\xE8de aucun adaptateur de donn\xE9es r\xE9el.");
var mock = Object.freeze({
  user: { name: "S\xE9bastien", initials: "SL", role: "Conducteur", permissions: { research: true, admin: true } },
  dog: { name: "Nox", breed: "Berger belge malinois", age: "3 ans" },
  session: { title: "Sous les pins", place: "For\xEAt de Fontainebleau", date: "Aujourd\u2019hui \xB7 08:30", distance: "1,2 km", duration: "24 min", status: "\xC0 reprendre" },
  activeSessions: [
    { title: "Sous les pins", date: "Aujourd\u2019hui \xB7 08:30", distance: "1,2 km", duration: "24 min", status: "EN COURS", terrain: "For\xEAt", trace: "red" },
    { title: "Cr\xEAte du Nord", date: "Aujourd\u2019hui \xB7 06:15", distance: "3,6 km", duration: "1 h 12", status: "EN PAUSE", terrain: "Montagne", trace: "blue" }
  ],
  recent: { title: "Lisi\xE8re de for\xEAt", date: "Hier \xB7 09:15", distance: "850 m", duration: "18 min" },
  stats: [{ value: "24", label: "Sessions" }, { value: "32,8", unit: "km", label: "Parcourus" }, { value: "18", unit: "h", label: "Sur le terrain" }],
  notification: "Votre session fictive \xAB Sous les pins \xBB est pr\xEAte \xE0 \xEAtre reprise."
});

// src/dogs.mjs
var DOG_STATUSES = Object.freeze([
  { id: "active", label: "Actif" },
  { id: "training", label: "En formation" },
  { id: "retired", label: "Retrait\xE9 / R\xE9form\xE9" },
  { id: "archived", label: "Archiv\xE9" }
]);
var DOG_DISCIPLINES = Object.freeze([
  { id: "tracking", label: "Piste" },
  { id: "defense", label: "D\xE9fense" },
  { id: "search", label: "Recherche" },
  { id: "narcotics", label: "Stup\xE9fiants" },
  { id: "other", label: "Autre discipline" }
]);
var DOG_PORTRAITS = Object.freeze([
  { id: "terrain-nox", label: "Portrait terrain", src: "/src/assets/hero-malinois-mountain.png" },
  { id: "silhouette", label: "Illustration", src: null }
]);
var demoDogs = [
  {
    id: "nox",
    name: mock.dog.name,
    breed: mock.dog.breed,
    sex: null,
    dateOfBirth: null,
    age: mock.dog.age,
    registrationNumber: null,
    specialty: "Pistage",
    status: "active",
    portrait: "terrain-nox",
    disciplines: ["tracking"],
    sessions: [mock.session, mock.recent],
    isDemonstration: true
  },
  {
    id: "uma",
    name: "Uma",
    breed: "Berger allemand",
    sex: null,
    dateOfBirth: null,
    age: "18 mois",
    registrationNumber: null,
    specialty: "Recherche",
    status: "training",
    portrait: "silhouette",
    disciplines: ["search"],
    sessions: [],
    isDemonstration: true
  },
  {
    id: "arko",
    name: "Arko",
    breed: "Labrador retriever",
    sex: null,
    dateOfBirth: null,
    age: "8 ans",
    registrationNumber: null,
    specialty: "D\xE9tection",
    status: "retired",
    portrait: "silhouette",
    disciplines: [],
    sessions: [],
    isDemonstration: true
  }
];
var clone3 = (value) => structuredClone(value);
var PROTECTED_DOG_ID = "10b00000-0000-4000-8000-000000000001";
function isProtectedDog(dog = {}) {
  return [dog.id, dog.cloudId].some((id) => typeof id === "string" && [PROTECTED_DOG_ID, `dog-${PROTECTED_DOG_ID}`].includes(id.toLowerCase()));
}
var allowedFields = /* @__PURE__ */ new Set([
  "name",
  "officialName",
  "breed",
  "sex",
  "dateOfBirth",
  "retirementDate",
  "age",
  "registrationNumber",
  "specialty",
  "status",
  "portrait",
  "personalPhotoDataUrl",
  "notes",
  "disciplines"
]);
function normalizePhotoDataUrl(value) {
  if (value === null || value === void 0 || value === "") return null;
  if (typeof value !== "string" || !/^data:image\/(?:png|jpeg|webp|gif);base64,[a-z\d+/]+=*$/i.test(value)) {
    throw new Error("La photo doit \xEAtre une image locale PNG, JPEG, WebP ou GIF.");
  }
  return value;
}
function validateDog(dog) {
  if (!String(dog.name || "").trim()) throw new Error("Le nom du chien est requis.");
  if (!DOG_STATUSES.some((status) => status.id === dog.status)) throw new Error("Statut de chien invalide.");
}
function createDogsStore({ dogs = demoDogs, ownerId = null, storage = null, idFactory = null } = {}) {
  let records = clone3(dogs), unreadable = false;
  const key = ownerId ? `piste-v2-dogs:${encodeURIComponent(ownerId)}` : null;
  try {
    const raw = key && storage?.getItem(key);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.version !== 1 || saved.ownerId !== ownerId || !Array.isArray(saved.dogs) || saved.dogs.length > 1e3) throw Error();
      const ids = /* @__PURE__ */ new Set();
      for (const dog of saved.dogs) {
        validateDog(dog);
        if (typeof dog.id !== "string" || ids.has(dog.id)) throw Error();
        ids.add(dog.id);
      }
      records = clone3(saved.dogs);
    }
  } catch {
    unreadable = true;
  }
  const persist = (next) => {
    if (!key || !storage) return;
    if (unreadable) throw Error("Sauvegarde des chiens illisible : aucune donn\xE9e existante remplac\xE9e.");
    try {
      storage.setItem(key, JSON.stringify({ version: 1, ownerId, dogs: next }));
      personalChanged(ownerId);
    } catch {
      throw Error("Profil chien non enregistr\xE9 : stockage local indisponible.");
    }
  };
  let nextId = 1;
  function snapshot(dog) {
    return dog ? clone3(dog) : null;
  }
  return Object.freeze({
    list() {
      return records.map(snapshot);
    },
    get(id) {
      return snapshot(records.find((dog) => dog.id === id));
    },
    restoreCloud(record2, localId = record2.id) {
      const r = validatePersistenceRecord(record2);
      if (r.kind !== "dog" || r.deletedAt) throw Error("Profil distant indisponible.");
      const check = createDogsStore({ dogs: [{ portrait: "silhouette", status: "active", ...r.payload, id: localId }] });
      const dog = check.update(localId, {});
      dog.isDemonstration = false;
      dog.cloudId = r.id;
      dog.cloudRevision = r.revision;
      const next = records.some((d) => d.id === localId) ? records.map((d) => d.id === localId ? dog : d) : [...records, dog];
      persist(next);
      records = next;
      return snapshot(dog);
    },
    create(values = {}) {
      const dog = {
        id: `dog-${idFactory ? idFactory() : ownerId ? crypto.randomUUID() : nextId++}`,
        name: String(values.name || "").trim(),
        officialName: String(values.officialName || "").trim() || null,
        breed: String(values.breed || "").trim(),
        sex: values.sex || null,
        dateOfBirth: values.dateOfBirth || null,
        retirementDate: values.retirementDate || null,
        age: values.age || null,
        registrationNumber: String(values.registrationNumber || "").trim() || null,
        specialty: String(values.specialty || "").trim() || null,
        status: values.status || "active",
        portrait: values.portrait || "silhouette",
        personalPhotoDataUrl: normalizePhotoDataUrl(values.personalPhotoDataUrl),
        notes: String(values.notes || "").trim() || null,
        disciplines: Array.isArray(values.disciplines) ? [...values.disciplines] : [],
        sessions: [],
        isDemonstration: !ownerId
      };
      if (!DOG_PORTRAITS.some((portrait) => portrait.id === dog.portrait)) throw new Error("Portrait mock invalide.");
      validateDog(dog);
      if (records.some((row) => row.id === dog.id)) throw Error("Identifiant de chien d\xE9j\xE0 utilis\xE9.");
      persist([...records, dog]);
      records.push(dog);
      return snapshot(dog);
    },
    update(id, patch = {}) {
      const dog = records.find((record2) => record2.id === id);
      if (!dog) return null;
      const next = { ...dog };
      for (const [key2, value] of Object.entries(patch)) {
        if (!allowedFields.has(key2)) continue;
        if (key2 === "disciplines") next[key2] = Array.isArray(value) ? [...value] : [];
        else if (key2 === "personalPhotoDataUrl") next[key2] = normalizePhotoDataUrl(value);
        else next[key2] = value;
      }
      if (typeof next.name === "string") next.name = next.name.trim();
      if (typeof next.officialName === "string") next.officialName = next.officialName.trim() || null;
      if (typeof next.notes === "string") next.notes = next.notes.trim() || null;
      validateDog(next);
      if (!DOG_PORTRAITS.some((portrait) => portrait.id === next.portrait)) throw new Error("Portrait mock invalide.");
      persist(records.map((row) => row.id === id ? next : row));
      Object.assign(dog, next);
      return snapshot(dog);
    },
    archive(id) {
      return this.update(id, { status: "archived" });
    },
    // Confirmation is collected by the app; this operation never edits session/history stores.
    remove(id, { confirmed = false } = {}) {
      if (confirmed !== true) throw Error("Confirmez explicitement la suppression du profil chien.");
      const dog = records.find((record2) => record2.id === id);
      if (!dog) return null;
      if (isProtectedDog(dog)) throw Error("Ce profil chien est prot\xE9g\xE9 et ne peut pas \xEAtre supprim\xE9.");
      const next = records.filter((record2) => record2.id !== id);
      persist(next);
      records = next;
      return snapshot(dog);
    }
  });
}

// src/track-library.mjs
var mockStart = () => ({ x: 70, y: 242, space: "mock-map" });
var copy = (value) => structuredClone(value);
var gpxFixtures = Object.freeze([
  Object.freeze({ id: "gpx-pins", name: "Lisi\xE8re des pins", fileName: "lisiere-des-pins.gpx", source: "gpx", ownerId: null, start: Object.freeze(mockStart()) }),
  Object.freeze({ id: "gpx-cretes", name: "Sentier des cr\xEAtes", fileName: "sentier-des-cretes.gpx", source: "gpx", ownerId: null, start: Object.freeze(mockStart()) })
]);
var seed = [
  { id: "track-clairiere", name: "La clairi\xE8re", source: "draw", ownerId: "alex", start: mockStart(), description: "Exercice fictif \xB7 for\xEAt" },
  { id: "track-lisiere", name: "Lisi\xE8re du matin", source: "draw", ownerId: "camille", start: mockStart(), description: "Exercice fictif \xB7 lisi\xE8re" }
];
var validName = (value) => {
  const name = String(value || "").trim();
  if (!name || name.length > 80) throw Error("Choisissez un nom de 1 \xE0 80 caract\xE8res.");
  return name;
};
var validPoints = (value) => {
  if (!Array.isArray(value) || value.length < 2) throw Error("Un trac\xE9 modifiable doit contenir au moins deux points.");
  const geo = value.every((p) => p.space === "wgs84");
  if (!geo && value.some((p) => p.space === "wgs84")) throw Error("Espaces de coordonn\xE9es incompatibles.");
  return value.map((point, index) => {
    const x = Number(point.x), y = Number(point.y);
    if (!geo && (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 360 || y < 0 || y > 300)) throw Error("Coordonn\xE9e de trac\xE9 invalide.");
    const breakBefore = index > 0 && Boolean(point.breakBefore);
    return { id: String(point.id || `saved-point-${index + 1}`), ...geo ? geographicCoordinates({ x, y }) : { x, y }, kind: index === 0 ? "start" : point.kind === "arrival" && index === value.length - 1 ? "arrival" : "via", breakBefore, incomingMode: index === 0 || breakBefore ? null : ["free", "follow"].includes(point.incomingMode) ? point.incomingMode : "free", ...geo && index > 0 && !breakBefore && point.incomingMode === "follow" ? { route: normalizeTrackRoute(point.route, value[index - 1], point) } : {} };
  });
};
var optionalText = (value, max = 240) => String(value ?? "").trim().slice(0, max);
function createTrackLibrary({ storage, ownerId = null, includeDemo = true } = {}) {
  let items = includeDemo ? seed.map(copy) : [], nextId = 1, warning = "", blocked = false, observedRaw = null;
  const key = ownerId ? `piste-v2-prepared-tracks:${encodeURIComponent(ownerId)}` : null;
  if (key && storage) {
    try {
      const raw = storage.getItem(key);
      observedRaw = raw;
      if (raw) {
        const snapshot = JSON.parse(raw);
        if (snapshot.version !== 1 || snapshot.ownerId !== ownerId || !Array.isArray(snapshot.items) || snapshot.items.length > 1e3) throw Error("Sauvegarde incompatible");
        const ids = /* @__PURE__ */ new Set();
        const restored = snapshot.items.map((item) => {
          if (!item || item.ownerId !== "self" || !/^(track-local-[1-9][0-9]*|track-cloud-[0-9a-f-]{36})$/.test(item.id) || item.id.startsWith("track-local-") && !Number.isSafeInteger(Number(item.id.slice(12))) || ids.has(item.id) || !["draw", "gpx"].includes(item.source)) throw Error("Trac\xE9 invalide");
          ids.add(item.id);
          const normalized = { ...item.createdAt ? { createdAt: item.createdAt } : {}, ...item.updatedAt ? { updatedAt: item.updatedAt } : {}, id: item.id, ownerId: "self", source: item.source, name: validName(item.name), provenance: optionalText(item.provenance, 80), description: optionalText(item.description), category: optionalText(item.category, 80), difficulty: optionalText(item.difficulty, 80), dogId: optionalText(item.dogId, 80), notes: optionalText(item.notes, 1e3) };
          if (item.trainingMemory && ownerId) try {
            normalized.trainingMemory = normalizeTrainingMemory(item.trainingMemory, { ownerId, dogId: normalized.dogId });
          } catch {
            warning = "Pr\xE9paration p\xE9dagogique incompatible : trac\xE9 conserv\xE9 sans rattachement.";
          }
          if (item.fileName) normalized.fileName = optionalText(item.fileName, 240);
          if (item.copiedFrom?.id && ["prepared", "pose", "search", "reference"].includes(item.copiedFrom.kind)) normalized.copiedFrom = { id: optionalText(item.copiedFrom.id, 240), kind: item.copiedFrom.kind };
          if (item.geometry) {
            const points = validPoints(item.geometry.points);
            normalized.geometry = { points };
            normalized.start = trackDeparture(points[0]);
          } else normalized.start = mockStart();
          return normalized;
        });
        items = [...items, ...restored];
        nextId = 1 + Math.max(0, ...restored.filter((item) => item.id.startsWith("track-local-")).map((item) => Number(item.id.slice(12))));
      }
    } catch {
      blocked = true;
      warning = "Sauvegarde des trac\xE9s non restaur\xE9e. Les donn\xE9es existantes sont conserv\xE9es sans \xEAtre \xE9cras\xE9es.";
    }
  }
  if (key && !storage) warning = "Sauvegarde locale indisponible dans ce navigateur.";
  const commit = (next) => {
    if (key) {
      if (blocked) throw Error(warning);
      if (!storage) throw Error("Trac\xE9 non enregistr\xE9 : sauvegarde locale indisponible.");
      try {
        if (storage.getItem(key) !== observedRaw) throw Error("Trac\xE9s modifi\xE9s dans un autre onglet : rechargez avant de supprimer.");
        const raw = JSON.stringify({ version: 1, ownerId, items: next.filter((item) => item.ownerId === "self") });
        storage.setItem(key, raw);
        observedRaw = raw;
        warning = "";
      } catch (error) {
        if (error.message?.includes("autre onglet")) throw error;
        warning = "Trac\xE9 non enregistr\xE9 : sauvegarde locale impossible (stockage plein ou bloqu\xE9).";
        throw Error(warning);
      }
    }
    items = next;
    personalChanged(ownerId);
  };
  const list2 = () => items.map(copy);
  const find = (id) => {
    const item = items.find((t) => t.id === id);
    if (!item) throw Error("Ce trac\xE9 n\u2019est plus disponible.");
    return item;
  };
  const get = (id) => copy(find(id));
  const writable = (id) => {
    const item = find(id);
    if (ownerId && item.ownerId !== "self") throw Error("Ce trac\xE9 est en lecture seule pour ce compte.");
    return item;
  };
  const insert = (item) => {
    const saved = { ...item, createdAt: (/* @__PURE__ */ new Date()).toISOString(), id: `track-local-${nextId}`, ownerId: "self" };
    commit([...items, saved]);
    nextId++;
    return copy(saved);
  };
  return {
    list: list2,
    get,
    persistenceWarning: () => warning,
    restoreCloud(record2, localId = "track-cloud-" + record2.id) {
      const r = validatePersistenceRecord(record2);
      if (r.kind !== "track" || r.deletedAt) throw Error("Trac\xE9 distant indisponible.");
      if (r.payload.trainingMemory) normalizeTrainingMemory(r.payload.trainingMemory, { ownerId, dogId: r.payload.dogId });
      const normalized = createTrackLibrary().createPrepared(r.payload);
      const previous = items.find((item) => item.id === localId), retained = !normalized.trainingMemory && previous?.trainingMemory && previous.dogId === normalized.dogId && JSON.stringify(previous.geometry) === JSON.stringify(normalized.geometry) ? { trainingMemory: previous.trainingMemory } : {};
      const restored = { ...normalized, ...retained, ...persistenceTrackDates(r.payload), id: localId, ownerId: "self" };
      commit([...items.filter((item) => item.id !== localId), restored]);
      return copy(restored);
    },
    create(name) {
      return insert({ name: validName(name), source: "draw", start: mockStart(), description: "Votre trac\xE9 mock" });
    },
    createPrepared({ name, description = "", category = "", difficulty = "", dogId = "", notes = "", source = "draw", provenance = "manual", fileName, geometry, copiedFrom, trainingMemory } = {}) {
      if (!["draw", "gpx"].includes(source)) throw Error("Provenance source inconnue.");
      const points = validPoints(geometry?.points);
      return insert({ name: validName(name), source, provenance, ...source === "gpx" && fileName ? { fileName: optionalText(fileName, 240) } : {}, ...copiedFrom ? { copiedFrom: copy(copiedFrom) } : {}, description: optionalText(description), category: optionalText(category, 80), difficulty: optionalText(difficulty, 80), dogId: optionalText(dogId, 80), notes: optionalText(notes, 1e3), ...trainingMemory ? { trainingMemory: normalizeTrainingMemory(trainingMemory, { ownerId: ownerId || trainingMemory.ownerId, dogId }) } : {}, geometry: { points }, start: trackDeparture(points[0]) });
    },
    updatePrepared(id, patch = {}) {
      const current = writable(id);
      if (["pose", "search", "reference"].includes(current.source)) throw Error("Une trace de session est en lecture seule.");
      const next = { ...current, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      for (const key2 of ["name", "description", "category", "difficulty", "dogId", "notes"]) if (Object.hasOwn(patch, key2)) next[key2] = key2 === "name" ? validName(patch[key2]) : optionalText(patch[key2], key2 === "notes" ? 1e3 : key2 === "description" ? 240 : 80);
      if (Object.hasOwn(patch, "dogId") && patch.dogId !== current.dogId || Object.hasOwn(patch, "geometry") && JSON.stringify(patch.geometry) !== JSON.stringify(current.geometry)) delete next.trainingMemory;
      if (patch.trainingMemory) next.trainingMemory = normalizeTrainingMemory(patch.trainingMemory, { ownerId: ownerId || patch.trainingMemory.ownerId, dogId: next.dogId });
      if (Object.hasOwn(patch, "geometry")) next.geometry = { points: validPoints(patch.geometry?.points) };
      if (next.geometry?.points?.length) next.start = trackDeparture(next.geometry.points[0]);
      commit(items.map((item) => item.id === id ? next : item));
      return copy(next);
    },
    duplicatePrepared(id, { name } = {}) {
      const current = find(id);
      if (!current.geometry?.points?.length) throw Error("Aucune g\xE9om\xE9trie disponible \xE0 copier.");
      const { id: sourceId, ownerId: ownerId2, trainingMemory, ...fields2 } = copy(current);
      return insert({ ...fields2, name: validName(name || `${current.name} \xB7 copie`), source: "draw", provenance: "copy", copiedFrom: { id: sourceId, kind: "prepared" }, geometry: { points: validPoints(current.geometry.points) } });
    },
    duplicatePreparedPlan(id, { name } = {}) {
      const current = writable(id);
      if (!current.geometry?.points?.length) throw Error("Aucune g\xE9om\xE9trie disponible \xE0 copier.");
      const fields2 = copy(current);
      delete fields2.id;
      delete fields2.ownerId;
      if (fields2.trainingMemory) fields2.trainingMemory = { ...fields2.trainingMemory, id: globalThis.crypto.randomUUID(), createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      return this.createPrepared({ ...fields2, name: validName(name || `${current.name.slice(0, 72)} \xB7 copie`), source: "draw", provenance: "copy", copiedFrom: { id: current.id, kind: "prepared" } });
    },
    createCopy({ name, sourceId, sourceKind, points, description = "", category = "", difficulty = "", dogId = "", notes = "" } = {}) {
      if (!sourceId || !["pose", "search", "reference"].includes(sourceKind)) throw Error("Source de copie invalide.");
      return this.createPrepared({ name, description, category, difficulty, dogId, notes, source: "draw", provenance: "copy", geometry: { points: validPoints(points) }, copiedFrom: { id: String(sourceId), kind: sourceKind } });
    },
    importFixture(id, name) {
      const file = gpxFixtures.find((f) => f.id === id);
      if (!file) throw Error("Choisissez un fichier de d\xE9monstration.");
      return insert({ ...file, name: validName(name || file.name), description: "GPX de d\xE9monstration", provenance: "gpx-mock" });
    },
    rename(id, name) {
      const item = writable(id);
      commit(items.map((t) => t.id === id ? { ...item, name: validName(name) } : t));
      return get(id);
    },
    remove(id) {
      writable(id);
      commit(items.filter((t) => t.id !== id));
    }
  };
}

// src/operational-data.mjs
var OPERATIONAL_SCHEMA_VERSION = 2;
var OPERATIONAL_PROVENANCE = Object.freeze([
  "manual",
  "phone_gps",
  "gpx_import",
  "garmin",
  "weather_api",
  "historical_weather",
  "calculated",
  "estimated",
  "user_confirmed",
  "demo",
  "fixture"
]);
var OPERATIONAL_PAUSE_CLASSIFICATIONS = Object.freeze([
  "manual_pause",
  "auto_stationary_detected",
  "auto_stationary_confirmed_pause",
  "auto_stationary_reclassified_work"
]);
var DOG_EVALUATION_CRITERIA = Object.freeze([
  "motivation",
  "concentration",
  "regularity",
  "autonomy",
  "recoveryQuality",
  "fatigue",
  "distractions",
  "behavior",
  "handlerConfidence"
]);
var FIELD_EVALUATION_CRITERIA = Object.freeze([
  "terrainDifficulty",
  "weatherDifficulty",
  "trackAgeDifficulty",
  "odorPollution",
  "humanTrafficDensity",
  "reliefVegetation"
]);
var clone4 = (value) => structuredClone(value);
var object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
var array = (value) => Array.isArray(value) ? value : [];
var detailsDefaults = () => ({
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
var evaluationDefaults = (criteria) => Object.fromEntries(criteria.map((key) => [key, null]));
function normalizeOperationalMission(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Une mission op\xE9rationnelle doit \xEAtre un objet.");
  }
  const mission = clone4(input);
  const oldDetails = object(mission.details);
  const places = object(mission.places);
  const time = object(mission.time);
  const context = object(mission.context);
  const corridor = object(mission.olfactoryCorridor);
  mission.schemaVersion = OPERATIONAL_SCHEMA_VERSION;
  mission.entryMode = mission.entryMode === "prepared" ? "prepared" : "quick";
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
  mission.sourceDevice = mission.sourceDevice === void 0 ? null : mission.sourceDevice;
  mission.dogEvaluation = { ...evaluationDefaults(DOG_EVALUATION_CRITERIA), ...object(mission.dogEvaluation), comment: object(mission.dogEvaluation).comment ?? null };
  mission.fieldEvaluation = { ...evaluationDefaults(FIELD_EVALUATION_CRITERIA), ...object(mission.fieldEvaluation), comment: object(mission.fieldEvaluation).comment ?? null };
  mission.dataQuality = mission.dataQuality === void 0 ? null : mission.dataQuality;
  mission.result = mission.result === void 0 ? mission.details.result ?? null : mission.result;
  mission.provenance = object(mission.provenance);
  mission.olfactoryCorridor = {
    ...corridor,
    enabled: typeof corridor.enabled === "boolean" ? corridor.enabled : mission.olfactoryCorridorEnabled === true,
    provenance: corridor.provenance ?? (mission.olfactoryCorridorEnabled === true ? "estimated" : null),
    label: corridor.label ?? (mission.olfactoryCorridorEnabled === true ? "ESTIM\xC9 \xB7 simulation" : null)
  };
  mission.olfactoryCorridorEnabled = mission.olfactoryCorridor.enabled;
  mission.trace = array(mission.trace);
  mission.events = array(mission.events);
  mission.journal = array(mission.journal);
  return mission;
}

// src/coaching-gps-model.mjs
var GPS_LIMITS = Object.freeze({ accuracyM: 30, ageMs: 15e3, futureMs: 5e3, gapMs: 15e3 });
var finite = Number.isFinite;
function gpsDistance(a, b) {
  const rad = Math.PI / 180, dlat = (b.latitude - a.latitude) * rad, dlon = (b.longitude - a.longitude) * rad, h = Math.sin(dlat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dlon / 2) ** 2;
  return 6371e3 * 2 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
}
function normalizeGpsFix(position, now) {
  const c = position?.coords, t = position?.timestamp;
  if (!finite(now) || !finite(t) || !finite(c?.latitude) || Math.abs(c.latitude) > 90 || !finite(c?.longitude) || Math.abs(c.longitude) > 180 || !finite(c?.accuracy) || c.accuracy <= 0 || c.accuracy > GPS_LIMITS.accuracyM || now - t > GPS_LIMITS.ageMs || t - now > GPS_LIMITS.futureMs) return null;
  return { latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy, timestamp: t, receivedAt: now };
}
function validGpsPose(p, sessionId = p?.sessionId, actorId = p?.actorId) {
  try {
    if (p.version !== 1 || p.provenance !== "device-geolocation" || typeof p.sessionId !== "string" || !p.sessionId || typeof p.actorId !== "string" || !p.actorId || p.sessionId !== sessionId || p.actorId !== actorId || !["before", "active", "finished", "stopped"].includes(p.phase) || typeof p.gap !== "boolean" || !finite(p.elapsedMs) || p.elapsedMs < 0 || !finite(p.distanceM) || p.distanceM < 0 || !Array.isArray(p.segments)) return false;
    if (p.phase === "before" ? p.startedAt !== null || p.elapsedMs !== 0 || p.segments.length : p.startedAt !== null && !finite(p.startedAt)) return false;
    if (p.phase === "active" && p.startedAt === null || ["before", "active"].includes(p.phase) && p.endedAt !== null || ["finished", "stopped"].includes(p.phase) && (!finite(p.endedAt) || p.startedAt !== null && p.endedAt < p.startedAt)) return false;
    let last = -Infinity, distance = 0;
    for (const segment of p.segments) {
      if (!Array.isArray(segment) || !segment.length) return false;
      let prev = null;
      for (const point of segment) {
        if (!normalizeGpsFix({ timestamp: point.timestamp, coords: point }, point.receivedAt) || point.timestamp <= last || p.startedAt === null || point.timestamp < p.startedAt || p.endedAt !== null && point.receivedAt > p.endedAt) return false;
        if (prev) {
          if (point.timestamp - prev.timestamp > GPS_LIMITS.gapMs) return false;
          distance += gpsDistance(prev, point);
        }
        last = point.timestamp;
        prev = point;
      }
    }
    return Math.abs(distance - p.distanceM) < 1e-3;
  } catch {
    return false;
  }
}

// src/lobo-demo-identity.mjs
var LOBO_DEMO_OWNER_ID = "eeca6271-b459-443b-8c2f-46ce20215c8a";
var LOBO_DEMO_LABEL = "D\xE9monstration fictive";
var uuid = (n) => "10b00000-0000-4000-8000-" + String(n).padStart(12, "0");
var LOBO_DEMO_MANIFEST = Object.freeze({ version: 1, ownerId: LOBO_DEMO_OWNER_ID, label: LOBO_DEMO_LABEL, dogId: uuid(1), opsIds: Object.freeze(Array.from({ length: 20 }, (_, n) => uuid(1001 + n))), coachingIds: Object.freeze(Array.from({ length: 20 }, (_, n) => uuid(2001 + n))) });

// src/session-removal.mjs
var protectedIds = /* @__PURE__ */ new Set([...LOBO_DEMO_MANIFEST.opsIds, ...LOBO_DEMO_MANIFEST.coachingIds]);

// src/operational-missions.mjs
var OPERATIONAL_MISSION_STATUSES = Object.freeze([
  "Brouillon",
  "En cours",
  "\xC0 compl\xE9ter",
  "Termin\xE9e",
  "Archiv\xE9e"
]);
var OPERATIONAL_EVENT_TYPES = Object.freeze([
  "D\xE9part",
  "Rupture",
  "Reprise",
  "Indice",
  "Objet trouv\xE9",
  "Zone particuli\xE8re",
  "Changement notable",
  "Fin de piste"
]);

// src/persistence-domain-adapters.mjs
var pick = (value, keys) => Object.fromEntries(keys.filter((k) => Object.hasOwn(value, k)).map((k) => [k, structuredClone(value[k])]));
function preparePersistenceCandidate({ kind, localId, value }, { ownerId = null } = {}) {
  if (typeof localId !== "string" || !localId || !value || typeof value !== "object" || Array.isArray(value)) throw Error("Source de sauvegarde invalide.");
  let payload;
  if (kind === "profile") {
    const store = createProfileStore();
    store.setAvatar(value.avatar ?? "initials");
    store.setPrimaryDog(value.primary_dog_id ?? null);
    store.setPreferences(value.preferences || {});
    payload = store.snapshot();
  } else if (kind === "dog") {
    const fields2 = pick(value, ["name", "officialName", "breed", "sex", "dateOfBirth", "retirementDate", "age", "registrationNumber", "specialty", "status", "portrait", "personalPhotoDataUrl", "notes", "disciplines", "sessions"]);
    const store = createDogsStore({ dogs: [{ portrait: "silhouette", ...fields2, id: localId, status: fields2.status || "active" }] });
    payload = pick(store.update(localId, {}), Object.keys(fields2));
  } else if (kind === "track") {
    if (!value.geometry?.points?.every((p) => p.space === "wgs84")) throw Error("G\xE9om\xE9trie g\xE9ographique requise.");
    const normalized = createTrackLibrary().createPrepared(pick(value, ["name", "description", "category", "difficulty", "dogId", "notes", "source", "provenance", "fileName", "geometry", "copiedFrom", "trainingMemory"]));
    payload = { ...persistenceTrackDates(value), ...pick(normalized, ["name", "description", "category", "difficulty", "dogId", "notes", "source", "provenance", "fileName", "geometry", "copiedFrom", "trainingMemory"]) };
  } else if (kind === "ops") {
    if (value.kind !== "operational" || !OPERATIONAL_MISSION_STATUSES.includes(value.status)) throw Error("Dossier OPS invalide.");
    if (value.gpsTrack && !validGpsPose(value.gpsTrack, "ops:" + localId, value.gpsOwnerId)) throw Error("GPS OPS invalide.");
    payload = normalizeOperationalMission(pick(value, ["id", "kind", "schemaVersion", "entryMode", "status", "trackingState", "dogId", "dog", "handler", "createdAt", "trackingStartedAt", "trackingStoppedAt", "trackingPausedMs", "trackingPausedAt", "trackingElapsedMs", "details", "person", "time", "places", "context", "olfactoryCorridor", "trace", "events", "journal", "gpsTrack", "gpsOwnerId", "pauseObservations", "dogEvaluation", "fieldEvaluation", "finalization", "weatherSnapshot", "startedAt", "fieldClosedAt", "completedAt", "archivedAt", "lastKnownPoint", "provenance", "traceMetadata", "dataQuality", "environment", "result", "sourceDevice", "gpxAttachment", "weatherDemo", "olfactoryCorridorEnabled"]));
    payload.consultationOnly = true;
    payload.requiresExplicitResume = ["active", "paused", "ready"].includes(value.trackingState);
  } else if (kind === "session-dog-link") {
    if (typeof value.sessionId !== "string" || !value.sessionId || typeof value.dogId !== "string" || !value.dogId) throw Error("Association invalide.");
    payload = pick(value, ["sessionId", "dogId"]);
  } else throw Error("Domaine de sauvegarde inconnu.");
  if (value.trainingMemory && ["track", "session-dog-link"].includes(kind)) payload.trainingMemory = normalizeTrainingMemory(value.trainingMemory, { ownerId: ownerId || value.trainingMemory.ownerId, dogId: value.dogId });
  const result = { kind, localId, payload };
  if (new TextEncoder().encode(JSON.stringify(result)).byteLength + 512 > 2e5) throw Error("Dossier trop volumineux : original local conserv\xE9.");
  return result;
}

// src/persistence-journal.mjs
async function profileIdentity(ownerId) {
  const namespace = Uint8Array.from([107, 167, 184, 16, 157, 173, 17, 209, 128, 180, 0, 192, 79, 212, 48, 200]), name = new TextEncoder().encode("piste-v2-private-profile:" + ownerId), input = new Uint8Array(namespace.length + name.length);
  input.set(namespace);
  input.set(name, namespace.length);
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-1", input)).slice(0, 16);
  bytes[6] = bytes[6] & 15 | 80;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = [...bytes].map((v) => v.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// src/server/personal-data-http.mjs
var fail2 = (message, status = 400) => {
  throw Object.assign(Error(message), { status });
};
function createPersonalDataHandler({ authenticate, enabled, repositoryFor } = {}) {
  return async (request) => {
    const origin = request.headers.get("origin") || "", allowed = !origin || /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin) || /^https:\/\/piste-community-v2-premium(?:-[a-z0-9-]+-mw2f59b8p2-4030s-projects)?\.vercel\.app$/.test(origin);
    const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin", ...origin && allowed ? { "Access-Control-Allow-Origin": origin } : {}, "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info", "Access-Control-Allow-Methods": "POST,OPTIONS" };
    const respond = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
    try {
      if (!allowed) fail2("Origine non autoris\xE9e.", 403);
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
      if (request.method !== "POST") fail2("M\xE9thode non autoris\xE9e.", 405);
      const chunks = [];
      let length = 0;
      const reader = request.body?.getReader();
      if (Number(request.headers.get("content-length") || 0) > 2e5) {
        await reader?.cancel();
        fail2("Requ\xEAte trop volumineuse.", 413);
      }
      if (reader) for (; ; ) {
        const chunk = await reader.read();
        if (chunk.done) break;
        length += chunk.value.byteLength;
        if (length > 2e5) {
          await reader.cancel();
          fail2("Requ\xEAte trop volumineuse.", 413);
        }
        chunks.push(chunk.value);
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      let body;
      try {
        body = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        fail2("Requ\xEAte invalide.");
      }
      const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
      if (!token) fail2("Connexion requise.", 401);
      const user = await authenticate(token);
      if (!user?.id) fail2("Connexion expir\xE9e.", 401);
      if (!await enabled(user.id)) fail2("Compte non autoris\xE9 pour ce pilote.", 403);
      if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((k) => !["operation", "kind", "id", "cursor", "commandId", "expectedRevision", "payload"].includes(k))) fail2("Commande invalide.");
      if (!PERSISTENCE_KINDS.includes(body.kind)) fail2("Domaine invalide.");
      const repository = repositoryFor(user.id);
      if (body.operation === "list") {
        if (body.cursor != null && !persistenceUuid(body.cursor)) fail2("Curseur invalide.");
        return respond(await repository.list({ kind: body.kind, cursor: body.cursor ?? null }));
      }
      if (!persistenceUuid(body.id)) fail2("Identifiant invalide.");
      if (body.operation === "read") {
        const record3 = await repository.read({ kind: body.kind, id: body.id });
        if (!record3) fail2("Dossier inaccessible.", 404);
        return respond({ record: validatePersistenceRecord(record3) });
      }
      if (!["put", "remove"].includes(body.operation) || !persistenceUuid(body.commandId) || !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0) fail2("Commande invalide.");
      if (body.kind === "profile" && body.id !== await profileIdentity(user.id)) fail2("Identit\xE9 de profil invalide.");
      let payload = {};
      if (body.operation === "put") {
        try {
          payload = preparePersistenceCandidate({ kind: body.kind, localId: body.kind === "ops" ? body.payload?.id : body.id, value: body.payload }, { ownerId: user.id }).payload;
        } catch {
          fail2("Donn\xE9es de sauvegarde invalides.");
        }
        const dogId = body.kind === "profile" ? payload.primary_dog_id : payload.dogId;
        if (dogId && !persistenceUuid(dogId)) fail2("R\xE9f\xE9rence chien invalide.");
      }
      const record2 = await repository[body.operation]({ kind: body.kind, id: body.id, commandId: body.commandId, expectedRevision: body.expectedRevision, payload });
      return respond({ record: validatePersistenceRecord(record2) });
    } catch (error) {
      return respond({ error: error.status ? error.message : "Service de sauvegarde indisponible." }, error.status || 503);
    }
  };
}

// src/server/personal-data-repository.mjs
var columns = "id,kind,schema_version,revision,payload,updated_at,deleted_at";
var record = (r) => ({ schemaVersion: r.schema_version, kind: r.kind, id: r.id, revision: r.revision, payload: r.payload, updatedAt: r.updated_at, deletedAt: r.deleted_at });
var unwrap = (result) => {
  if (result.error) throw Object.assign(Error("Sauvegarde refus\xE9e."), { status: ["40001", "P0001"].includes(result.error.code) ? 409 : result.error.code === "42501" ? 403 : 503 });
  return result.data;
};
function createPersonalDataRepository(admin, ownerId) {
  const write = (operation, c) => admin.rpc("v2_personal_commit", { p_owner: ownerId, p_kind: c.kind, p_id: c.id, p_expected: c.expectedRevision, p_command: c.commandId, p_operation: operation, p_payload: c.payload || {} }).then(unwrap);
  return {
    async list({ kind, cursor = null }) {
      let query = admin.from("v2_personal_records").select(columns).eq("owner_id", ownerId).eq("kind", kind).order("id", { ascending: true });
      if (cursor) query = query.gt("id", cursor);
      const rows = unwrap(await query.limit(51));
      return { records: rows.slice(0, 50).map(record), cursor: rows.length > 50 ? rows[49].id : null };
    },
    async read({ kind, id }) {
      const row = unwrap(await admin.from("v2_personal_records").select(columns).eq("owner_id", ownerId).eq("kind", kind).eq("id", id).maybeSingle());
      return row ? record(row) : null;
    },
    put: (c) => write("put", c),
    remove: (c) => write("remove", c)
  };
}
export {
  createPersonalDataHandler,
  createPersonalDataRepository
};
