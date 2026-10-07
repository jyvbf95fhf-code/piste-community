import { mock } from './data.mjs';

export const DOG_STATUSES = Object.freeze([
  { id: 'active', label: 'Actif' },
  { id: 'training', label: 'En formation' },
  { id: 'retired', label: 'Retraité / Réformé' },
  { id: 'archived', label: 'Archivé' }
]);

export const DOG_DISCIPLINES = Object.freeze([
  { id: 'tracking', label: 'Piste' },
  { id: 'defense', label: 'Défense' },
  { id: 'search', label: 'Recherche' },
  { id: 'narcotics', label: 'Stupéfiants' },
  { id: 'other', label: 'Autre discipline' }
]);

export const DOG_PORTRAITS = Object.freeze([
  { id: 'terrain-nox', label: 'Portrait terrain', src: '/src/assets/hero-malinois-mountain.png' },
  { id: 'silhouette', label: 'Illustration', src: null }
]);

const demoDogs = [
  {
    id: 'nox',
    name: mock.dog.name,
    breed: mock.dog.breed,
    sex: null,
    dateOfBirth: null,
    age: mock.dog.age,
    registrationNumber: null,
    specialty: 'Pistage',
    status: 'active',
    portrait: 'terrain-nox',
    disciplines: ['tracking'],
    sessions: [mock.session, mock.recent],
    isDemonstration: true
  },
  {
    id: 'uma',
    name: 'Uma',
    breed: 'Berger allemand',
    sex: null,
    dateOfBirth: null,
    age: '18 mois',
    registrationNumber: null,
    specialty: 'Recherche',
    status: 'training',
    portrait: 'silhouette',
    disciplines: ['search'],
    sessions: [],
    isDemonstration: true
  },
  {
    id: 'arko',
    name: 'Arko',
    breed: 'Labrador retriever',
    sex: null,
    dateOfBirth: null,
    age: '8 ans',
    registrationNumber: null,
    specialty: 'Détection',
    status: 'retired',
    portrait: 'silhouette',
    disciplines: [],
    sessions: [],
    isDemonstration: true
  }
];

const clone = value => structuredClone(value);
const allowedFields = new Set([
  'name', 'officialName', 'breed', 'sex', 'dateOfBirth', 'retirementDate', 'age', 'registrationNumber',
  'specialty', 'status', 'portrait', 'personalPhotoDataUrl', 'notes', 'disciplines'
]);

function normalizePhotoDataUrl(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^data:image\/(?:png|jpeg|webp|gif);base64,[a-z\d+/]+=*$/i.test(value)) {
    throw new Error('La photo doit être une image locale PNG, JPEG, WebP ou GIF.');
  }
  return value;
}

export function dogDisciplines(dog = {}) {
  if (Array.isArray(dog.disciplines)) return [...dog.disciplines];
  const legacy = String(dog.specialty || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
  if (/piste|pistage|tracking/.test(legacy)) return ['tracking'];
  if (/defense/.test(legacy)) return ['defense'];
  if (/recherche|search/.test(legacy)) return ['search'];
  if (/stup|narcotic/.test(legacy)) return ['narcotics'];
  return [];
}

export function resolveDogsRoute(path) {
  const route = String(path || '').replace(/\/+$/, '') || '/';
  if (route === '/dogs') return { type: 'list' };
  if (route === '/dogs/new') return { type: 'create' };
  const match = route.match(/^\/dogs\/([^/]+)(?:\/(edit))?$/);
  if (!match) return null;
  let dogId;
  try {
    dogId = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  if (!dogId || dogId.includes('/')) return null;
  return { type: match[2] ? 'edit' : 'profile', dogId };
}

function validateDog(dog) {
  if (!String(dog.name || '').trim()) throw new Error('Le nom du chien est requis.');
  if (!DOG_STATUSES.some(status => status.id === dog.status)) throw new Error('Statut de chien invalide.');
}

export function createDogsStore({ dogs = demoDogs } = {}) {
  const records = clone(dogs);
  let nextId = 1;

  function snapshot(dog) {
    return dog ? clone(dog) : null;
  }

  return Object.freeze({
    list() {
      return records.map(snapshot);
    },
    get(id) {
      return snapshot(records.find(dog => dog.id === id));
    },
    create(values = {}) {
      const dog = {
        id: `dog-${nextId++}`,
        name: String(values.name || '').trim(),
        officialName: String(values.officialName || '').trim() || null,
        breed: String(values.breed || '').trim(),
        sex: values.sex || null,
        dateOfBirth: values.dateOfBirth || null,
        retirementDate: values.retirementDate || null,
        age: values.age || null,
        registrationNumber: String(values.registrationNumber || '').trim() || null,
        specialty: String(values.specialty || '').trim() || null,
        status: values.status || 'active',
        portrait: values.portrait || 'silhouette',
        personalPhotoDataUrl: normalizePhotoDataUrl(values.personalPhotoDataUrl),
        notes: String(values.notes || '').trim() || null,
        disciplines: Array.isArray(values.disciplines) ? [...values.disciplines] : [],
        sessions: [],
        isDemonstration: true
      };
      if (!DOG_PORTRAITS.some(portrait => portrait.id === dog.portrait)) throw new Error('Portrait mock invalide.');
      validateDog(dog);
      records.push(dog);
      return snapshot(dog);
    },
    update(id, patch = {}) {
      const dog = records.find(record => record.id === id);
      if (!dog) return null;
      const next = { ...dog };
      for (const [key, value] of Object.entries(patch)) {
        if (!allowedFields.has(key)) continue;
        if (key === 'disciplines') next[key] = Array.isArray(value) ? [...value] : [];
        else if (key === 'personalPhotoDataUrl') next[key] = normalizePhotoDataUrl(value);
        else next[key] = value;
      }
      if (typeof next.name === 'string') next.name = next.name.trim();
      if (typeof next.officialName === 'string') next.officialName = next.officialName.trim() || null;
      if (typeof next.notes === 'string') next.notes = next.notes.trim() || null;
      validateDog(next);
      if (!DOG_PORTRAITS.some(portrait => portrait.id === next.portrait)) throw new Error('Portrait mock invalide.');
      Object.assign(dog, next);
      return snapshot(dog);
    },
    archive(id) {
      return this.update(id, { status: 'archived' });
    }
  });
}

function distanceInMeters(value) {
  const match = String(value || '').match(/(\d+(?:[.,]\d+)?)\s*(km|m)\b/i);
  if (!match) return null;
  const amount = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * (match[2].toLowerCase() === 'km' ? 1000 : 1));
}

function durationInMinutes(value) {
  const text = String(value || '');
  const hours = text.match(/(\d+)\s*h(?:\s*(\d+)\s*(?:min)?)?/i);
  if (hours) return Number(hours[1]) * 60 + Number(hours[2] || 0);
  const minutes = text.match(/(\d+)\s*min/i);
  return minutes ? Number(minutes[1]) : null;
}

function sumWhenComplete(values) {
  if (!values.length || values.some(value => value === null)) return null;
  return values.reduce((sum, value) => sum + value, 0);
}

export function summarizeDogActivity(dog = {}) {
  const sessions = Array.isArray(dog.sessions) ? dog.sessions : [];
  const distances = sessions.map(session => distanceInMeters(session.distance));
  const durations = sessions.map(session => durationInMinutes(session.duration));
  const totalDistanceMeters = sumWhenComplete(distances);
  const totalDurationMinutes = sumWhenComplete(durations);
  const knownStatuses = sessions.map(session => {
    const status = String(session.status || '').trim().toLocaleLowerCase('fr');
    if (['terminée', 'terminee', 'terminé', 'termine'].includes(status)) return true;
    if (['à reprendre', 'a reprendre', 'en cours', 'en pause'].includes(status)) return false;
    return null;
  });
  const completionRate = knownStatuses.length && knownStatuses.every(value => value !== null)
    ? Math.round(knownStatuses.filter(Boolean).length / knownStatuses.length * 100)
    : null;

  return {
    sessionCount: sessions.length,
    totalDistanceMeters,
    totalDurationMinutes,
    averageDistanceMeters: totalDistanceMeters === null || !sessions.length ? null : Math.round(totalDistanceMeters / sessions.length),
    averageDurationMinutes: totalDurationMinutes === null || !sessions.length ? null : Math.round(totalDurationMinutes / sessions.length),
    completionRate,
    lastActivity: sessions[0]?.date || null,
    trend: null
  };
}
