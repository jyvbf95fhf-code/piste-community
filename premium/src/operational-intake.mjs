import { escapeHTML as e, EmptyState } from './components.mjs';
import { Icon } from './icons.mjs';

const dogOptions = dogs => (dogs || []).filter(dog => dog.status !== 'archived')
  .map(dog => `<option value="${e(dog.id)}">${e(dog.name)} · ${e(dog.specialty || dog.breed || 'Chien')}</option>`).join('');

export function getNavigationLinks(address) {
  const destination = String(address ?? '').trim();
  if (!destination) return [];
  const query = encodeURIComponent(destination);
  return [
    { label: 'Apple Plans', href: `https://maps.apple.com/?daddr=${query}` },
    { label: 'Google Maps', href: `https://www.google.com/maps/dir/?api=1&destination=${query}` },
    { label: 'Waze', href: `https://waze.com/ul?q=${query}&navigate=yes` }
  ];
}

export function OperationalNavigation(address) {
  const links = getNavigationLinks(address);
  if (!links.length) return '';
  return `<details class="operational-navigation" data-operational-navigation><summary>Ouvrir l’itinéraire</summary><nav aria-label="Choisir une application de navigation">${links.map(link => `<a href="${e(link.href)}" target="_blank" rel="noopener noreferrer">${e(link.label)} ${Icon('arrow')}</a>`).join('')}</nav></details>`;
}

function actorSummary(handler) {
  return `<input type="hidden" name="handlerId" value="${e(handler?.id || 'mock-current-user')}"><input type="hidden" name="handlerName" value="${e(handler?.name || 'Conducteur')}"><p class="operational-intake-actor">Conducteur · ${e(handler?.name || 'Conducteur connecté')}</p>`;
}

export function OperationalEntryChoices({ missions = [], dogs = [] } = {}) {
  const active = missions.filter(mission => ['Brouillon', 'En cours', 'À compléter'].includes(mission.status));
  const dogState = (dogs || []).some(dog => dog.status !== 'archived') ? '' : EmptyState('Aucun chien disponible', 'Ajoutez ou activez un profil chien avant de préparer une mission.', 'premiumBrandDog');
  return `<section class="operational-page operational-entry" data-operational-view="entry"><a class="back-link" href="/">← Accueil</a><header class="operational-heading"><span class="eyebrow">PISTAGE OPÉRATIONNEL · SIMULATION</span><h1>Pistage opérationnel</h1><p>Choisissez comment préparer l’intervention. Les deux parcours ouvrent la même mission terrain.</p></header>${active.length?`<section class="operational-active-list" aria-label="Missions à reprendre"><h2>Reprendre une mission</h2>${active.map(mission=>`<a class="card operational-resume-card" href="/operational/missions/${encodeURIComponent(mission.id)}"><span class="operational-resume-mark">${Icon('navLive')}</span><span><strong>Mission · ${e(mission.dog?.name || 'Chien indisponible')}</strong><em>${e(mission.status)} · Reprendre la mission</em></span>${Icon('arrow')}</a>`).join('')}</section>`:''}${dogs.length?`<div class="operational-entry-choices" aria-label="Préparer une mission"><a class="card operational-entry-choice operational-entry-choice-quick" data-operational-entry-choice="quick" href="/operational/new"><span class="operational-entry-choice-icon">${Icon('navLive')}</span><span><strong>Départ rapide</strong><small>Urgence · partir immédiatement</small></span><span aria-hidden="true">${Icon('arrow')}</span></a><a class="card operational-entry-choice operational-entry-choice-prepared" data-operational-entry-choice="prepared" href="/operational/prepare"><span class="operational-entry-choice-icon">${Icon('navSessions')}</span><span><strong>Préparer une mission</strong><small>Renseigner les informations avant le départ</small></span><span aria-hidden="true">${Icon('arrow')}</span></a></div>`:dogState}</section>`;
}

export function QuickStartForm({ dogs = [], handler } = {}) {
  const choices = dogOptions(dogs);
  if (!choices) return EmptyState('Aucun chien disponible', 'Ajoutez ou activez un profil chien avant de démarrer.', 'premiumBrandDog');
  return `<section class="operational-page operational-start operational-intake-page" data-operational-view="quick"><a class="back-link" href="/operational">← Pistage opérationnel</a><header class="operational-heading"><span class="eyebrow">URGENCE · DÉPART RAPIDE</span><h1>Départ rapide</h1><p>Renseignez le minimum disponible. Les informations manquantes pourront être ajoutées après le terrain.</p></header><form class="card operational-start-form operational-intake-form" data-operational-intake-form="quick" data-operational-start-form><label for="operational-dog">Chien</label><select id="operational-dog" name="dogId" required>${choices}</select>${actorSummary(handler)}<fieldset><legend>Disparition / dernier contact <span>Facultatif</span></legend><label for="operational-disappearance-at">Date et heure de disparition<input id="operational-disappearance-at" type="datetime-local" name="disappearanceAt"></label><label for="operational-last-contact-at">Date et heure du dernier contact<input id="operational-last-contact-at" type="datetime-local" name="lastContactAt"></label></fieldset><fieldset><legend>Lieu <span>Facultatif</span></legend><label for="operational-intervention-address">Adresse / lieu d’intervention<input id="operational-intervention-address" name="interventionAddress" maxlength="240" autocomplete="street-address" placeholder="Adresse, parking, poste de commandement…"></label><div data-operational-intake-navigation></div><label for="operational-last-known-description">Dernier point connu<input id="operational-last-known-description" name="lastKnownDescription" maxlength="180" placeholder="Lieu ou repère, si disponible"></label></fieldset><p class="operational-form-note">Aucune heure ni adresse n’est obligatoire. La création de mission ne démarre pas le pistage.</p><button class="button button-gold" type="submit">Créer la mission ${Icon('arrow')}</button></form></section>`;
}

const textField = (label, name, { type = 'text', placeholder = '', maxLength = 500 } = {}) => `<label>${e(label)}<input type="${type}" name="${e(name)}" maxlength="${maxLength}" placeholder="${e(placeholder)}"></label>`;
const textArea = (label, name) => `<label>${e(label)}<textarea name="${e(name)}" rows="3"></textarea></label>`;

export function PreparedMissionForm({ dogs = [], handler } = {}) {
  const choices = dogOptions(dogs);
  if (!choices) return EmptyState('Aucun chien disponible', 'Ajoutez ou activez un profil chien avant de préparer une mission.', 'premiumBrandDog');
  return `<section class="operational-page operational-start operational-intake-page" data-operational-view="prepared"><a class="back-link" href="/operational">← Pistage opérationnel</a><header class="operational-heading"><span class="eyebrow">PRÉPARATION · MOCK</span><h1>Préparer une mission</h1><p>Renseignez les informations disponibles. Tout peut être complété plus tard.</p></header><form class="card operational-start-form operational-intake-form operational-prepared-form" data-operational-intake-form="prepared"><label for="operational-dog">Chien</label><select id="operational-dog" name="dogId" required>${choices}</select>${actorSummary(handler)}<fieldset><legend>Personne recherchée</legend>${textField('Identité / libellé','searchedPerson')}${textField('Âge','age',{type:'number'})}${textField('Tranche d’âge','ageRange')}${textField('Sexe','sex')}${textArea('Description','searchedPersonDescription')}${textField('Tenue','clothing')}${textField('Chaussures','footwear')}${textField('Mobilité','mobility')}${textField('Vulnérabilité','vulnerability')}${textArea('Comportement attendu','expectedBehavior')}${textField('Moyen de déplacement','movementMethod')}</fieldset><fieldset><legend>Temps</legend>${textField('Date et heure de disparition','disappearanceAt',{type:'datetime-local'})}${textField('Date et heure du dernier contact','lastContactAt',{type:'datetime-local'})}${textField('Précision de l’information','timePrecision')}</fieldset><fieldset><legend>Lieux</legend>${textField('Adresse / lieu d’intervention','interventionAddress',{placeholder:'Adresse, parking, poste de commandement…'})}<div data-operational-intake-navigation></div>${textField('Commune','interventionCommune')}${textField('Secteur','interventionSector')}${textField('Dernier point connu','lastKnownDescription')}${textField('Départ probable de piste','probableTrackStart')}</fieldset><fieldset><legend>Contexte</legend>${textArea('Circonstances','circumstances')}${textField('Type d’environnement','environmentType')}${textArea('Risques','risks')}${textArea('Observations','observations')}${textArea('Informations complémentaires','additionalInfo')}</fieldset><p class="operational-form-note">Tous les champs sont facultatifs hors choix du chien et du conducteur. Enregistrer la préparation ne démarre pas le pistage.</p><button class="button button-gold" type="submit">Enregistrer la préparation ${Icon('arrow')}</button></form></section>`;
}
