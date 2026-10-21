import { dogDisciplines } from './dogs.mjs';
export { isProtectedDog } from './dogs.mjs';

// Stored profile.primary_dog_id remains the single preference, including cloud backup.
// Array order is registration order; a cloud refresh must preserve an existing row's place.
export function activeTrackingDogs(dogs = []) {
  return dogs.filter(dog => dog.status === 'active' && dogDisciplines(dog).includes('tracking'));
}

export function resolveDogId(dogs = [], id) {
  if (typeof id !== 'string' || !id) return null;
  const matches = dogs.filter(dog => dog.id === id || dog.cloudId === id);
  return matches.length === 1 ? matches[0].id : null;
}

export function resolveDefaultTrackingDog(dogs = [], primaryDogId = null) {
  const eligible = activeTrackingDogs(dogs);
  const localId = resolveDogId(dogs, primaryDogId);
  return eligible.find(dog => dog.id === localId) || eligible[0] || null;
}
