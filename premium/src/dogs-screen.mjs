import { Icon } from './icons.mjs';
import { EmptyState, StatusBadge, escapeHTML } from './components.mjs';
import { dogDisciplines, DOG_DISCIPLINES, DOG_PORTRAITS, DOG_STATUSES, summarizeDogActivity } from './dogs.mjs';

const e = escapeHTML;
const statusLabels = new Map(DOG_STATUSES.map(status => [status.id, status.label]));
const statusTone = status => status === 'active' ? 'gold' : status === 'training' ? 'cyan' : 'neutral';

function portraitMarkup(dog, className = '') {
  const portrait = DOG_PORTRAITS.find(item => item.id === dog.portrait);
  const content = dog.personalPhotoDataUrl
    ? `<img src="${e(dog.personalPhotoDataUrl)}" alt="Photo de ${e(dog.name)}" loading="lazy">`
    : portrait?.src
    ? `<img src="${e(portrait.src)}" alt="Portrait de ${e(dog.name)}" loading="lazy">`
    : `<span class="dog-profile-silhouette" aria-hidden="true">${Icon('dog')}</span>`;
  return `<div class="dog-portrait-frame ${e(className)}">${content}</div>`;
}

export function DogPhotoMarkup(dog, className = '') {
  return portraitMarkup(dog, className);
}

function dogStatus(dog) {
  const label = statusLabels.get(dog.status) || 'Statut indisponible';
  return StatusBadge(label, statusTone(dog.status));
}

function ageLabel(dog) {
  if (dog.age) return dog.age;
  if (!dog.dateOfBirth) return 'Aucune donnée disponible';
  const birth = new Date(`${dog.dateOfBirth}T12:00:00`);
  if (!Number.isFinite(birth.getTime())) return 'Aucune donnée disponible';
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) years--;
  return years < 0 ? 'Aucune donnée disponible' : `${years} ${years === 1 ? 'an' : 'ans'}`;
}

function displayDistance(meters) {
  if (meters === null || meters === undefined) return 'Aucune donnée disponible';
  if (meters < 1000) return `${new Intl.NumberFormat('fr-FR').format(meters)} m`;
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(meters / 1000)} km`;
}

function displayDuration(minutes) {
  if (minutes === null || minutes === undefined) return 'Aucune donnée disponible';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder}` : `${hours} h`;
}

function pageHeading(kicker, title, subtitle, action = '') {
  return `<section class="page-heading dogs-heading"><span class="eyebrow">${e(kicker)}</span><div class="dogs-heading-row"><h1>${e(title)}</h1>${action}</div><p>${e(subtitle)}</p></section>`;
}

export function DogsListScreen(dogs = []) {
  const action = `<a class="button button-gold dogs-add-button" href="/dogs/new">${Icon('plus')}Ajouter un chien</a>`;
  const heading = pageHeading('VOS COMPAGNONS', 'Mes chiens', 'Profils de démonstration · données conservées dans cette visite', action);
  if (!dogs.length) {
    return `${heading}<section class="dogs-empty-list">${EmptyState('Aucun chien pour le moment','Ajoutez un profil mock pour composer votre équipe de démonstration.','dog')}<a class="button button-gold" href="/dogs/new">Ajouter un chien</a></section>`;
  }
  const cards = dogs.map(dog => {
    const summary = summarizeDogActivity(dog);
    const activity = summary.lastActivity ? `Dernière activité · ${e(summary.lastActivity)}` : 'Aucune activité disponible';
    const age = dog.age || ageLabel(dog);
    return `<a class="dog-list-card card" href="/dogs/${encodeURIComponent(dog.id)}" aria-label="Ouvrir le profil de ${e(dog.name)}">
      ${portraitMarkup(dog, 'dog-list-portrait')}
      <span class="dog-list-copy"><span class="dog-specialty">${e(dog.specialty || 'Spécialité indisponible')}</span><strong>${e(dog.name)}</strong><span class="dog-list-breed">${e(dog.breed || 'Race indisponible')} · ${e(age)}</span><span class="dog-list-meta">${summary.sessionCount ? `${summary.sessionCount} ${summary.sessionCount === 1 ? 'session' : 'sessions'}` : 'Aucune session associée'} · ${activity}</span></span>
      <span class="dog-list-trailing">${dogStatus(dog)}${Icon('arrow')}</span>
    </a>`;
  }).join('');
  return `${heading}<section class="dog-list" aria-label="Liste de vos chiens">${cards}</section><p class="dogs-demo-note">Tous les profils présentés sont fictifs. Les modifications sont temporaires.</p>`;
}

function metric(label, value, tone = '') {
  return `<article class="dog-metric ${tone}"><span>${e(label)}</span><strong>${e(value)}</strong></article>`;
}

function disciplineSection(dog) {
  const selected = new Set(dogDisciplines(dog));
  return `<section class="dog-section dog-disciplines"><div class="dog-section-heading"><span class="eyebrow">COMPÉTENCES</span><h2>Disciplines</h2></div><div class="dog-discipline-list">${DOG_DISCIPLINES.map(discipline => {
    const active = selected.has(discipline.id);
    return `<div class="dog-discipline ${active ? 'is-listed' : ''}"><span class="dog-discipline-mark">${active ? Icon('check') : Icon('compass')}</span><strong>${e(discipline.label)}</strong><small>${active ? 'Mentionnée dans la démonstration' : 'Aucune donnée disponible'}</small></div>`;
  }).join('')}</div></section>`;
}

function historySection(dog) {
  const sessions = Array.isArray(dog.sessions) ? dog.sessions : [];
  const content = sessions.length
    ? `<ol class="dog-history-list">${sessions.map(session => `<li class="dog-history-entry"><div class="dog-history-symbol">${Icon('route')}</div><div class="dog-history-copy"><strong>${e(session.title || 'Session sans intitulé')}</strong><span>${e(session.date || 'Date indisponible')}</span><span>${e(session.distance || 'Distance indisponible')} · ${e(session.duration || 'Durée indisponible')}</span></div><div class="dog-history-status">${StatusBadge(session.status || 'Statut indisponible', session.status ? 'gold' : 'neutral')}<a href="/sessions">Consulter</a></div></li>`).join('')}</ol>`
    : EmptyState('Aucune session associée','L’historique de ce chien ne contient pas encore de session de démonstration.','route');
  return `<section class="dog-section dog-history"><div class="dog-section-heading"><span class="eyebrow">ACTIVITÉ</span><h2>Sessions récentes</h2></div>${content}</section>`;
}

function scienceSection() {
  return `<section class="dog-section dog-science"><div class="dog-section-heading"><span class="eyebrow cyan">ESPACE FUTUR · DÉMONSTRATION</span><h2>Science &amp; santé</h2><p>Aucune donnée médicale réelle n’est collectée.</p></div><div class="dog-science-grid">${[
    ['Température','Aucune donnée disponible'],
    ['Fréquence cardiaque','Aucune donnée disponible'],
    ['Observations','Aucune donnée disponible'],
    ['Données scientifiques','Aucune donnée disponible']
  ].map(([label,value]) => `<article class="dog-science-item"><span>${e(label)}</span><strong>${e(value)}</strong></article>`).join('')}</div></section>`;
}

export function DogProfileScreen(dog) {
  if (!dog) return DogNotFoundScreen();
  const summary = summarizeDogActivity(dog);
  const edit = `<a class="button button-dark dog-edit-button" href="/dogs/${encodeURIComponent(dog.id)}/edit">${Icon('edit')}Modifier le profil</a>`;
  const identity = `<section class="dog-profile-hero card">${portraitMarkup(dog, 'dog-profile-portrait')}<div class="dog-profile-identity"><span class="dog-specialty">${e(dog.specialty || 'Spécialité indisponible')}</span><h1>${e(dog.name)}</h1>${dog.officialName ? `<p class="dog-official-name">Nom officiel · ${e(dog.officialName)}</p>` : ''}<p>${e(dog.breed || 'Race indisponible')} · ${e(dog.sex || 'Sexe indisponible')} · ${e(ageLabel(dog))}</p><p>${e(dog.registrationNumber || 'Matricule indisponible')}</p>${['retired','archived'].includes(dog.status)&&dog.retirementDate?`<p class="dog-retirement-date">Date de réforme / retraite · ${e(dog.retirementDate)}</p>`:''}<div class="dog-profile-status">${dogStatus(dog)}${dog.isDemonstration ? StatusBadge('DÉMONSTRATION','neutral') : ''}</div></div></section>`;
  const metrics = `<section class="dog-section dog-activity-summary"><div class="dog-section-heading"><span class="eyebrow">ACTIVITÉ MOCK</span><h2>Repères principaux</h2></div><div class="dog-metrics-grid">${[
    metric('Sessions', summary.sessionCount ? String(summary.sessionCount) : 'Aucune donnée disponible'),
    metric('Distance totale', displayDistance(summary.totalDistanceMeters)),
    metric('Durée cumulée', displayDuration(summary.totalDurationMinutes)),
    metric('Dernière activité', summary.lastActivity || 'Aucune donnée disponible')
  ].join('')}</div><div class="dog-secondary-metrics">${metric('Distance moyenne', displayDistance(summary.averageDistanceMeters))}${metric('Durée moyenne', displayDuration(summary.averageDurationMinutes))}${metric('Sessions terminées', summary.completionRate === null ? 'Aucune donnée disponible' : `${summary.completionRate} %`)}${metric('Tendance', summary.trend || 'Aucune donnée disponible')}</div></section>`;
  const notes = `<section class="dog-section dog-notes"><div class="dog-section-heading"><span class="eyebrow">REPÈRES TERRAIN</span><h2>Notes</h2></div><p class="dog-notes-copy">${e(dog.notes || 'Aucune note')}</p></section>`;
  const sessionLink = `<a class="button button-dark dog-sessions-link" href="/sessions?dog=${encodeURIComponent(dog.id)}">Voir les sessions de ce chien</a>`;
  return `<a class="back-link dogs-back-link" href="/dogs">← Mes chiens</a><div class="dog-profile-actions">${edit}</div>${identity}${metrics}${disciplineSection(dog)}${notes}${historySection(dog)}${sessionLink}${scienceSection()}<p class="dogs-demo-note">Profil et mesures de démonstration · aucune donnée médicale réelle.</p>`;
}

function input(name, label, value = '', type = 'text', attributes = '') {
  return `<label class="dog-form-field" for="dog-${e(name)}">${e(label)}<input id="dog-${e(name)}" name="${e(name)}" type="${e(type)}" value="${e(value || '')}" ${attributes}></label>`;
}

function select(name, label, options, selected) {
  return `<label class="dog-form-field" for="dog-${e(name)}">${e(label)}<select id="dog-${e(name)}" name="${e(name)}">${options.map(option => `<option value="${e(option.id)}" ${option.id === selected ? 'selected' : ''}>${e(option.label)}</option>`).join('')}</select></label>`;
}

export function DogFormScreen(dog = null) {
  const editing = !!dog;
  const title = editing ? 'Modifier le profil' : 'Ajouter un chien';
  const heading = pageHeading('PROFIL MOCK · MODIFICATIONS TEMPORAIRES', title, 'Les photos et modifications restent dans cette visite et disparaissent au rechargement.');
  const disciplines = new Set(dogDisciplines(dog || {}));
  const isRetired = ['retired','archived'].includes(dog?.status || 'active');
  const disciplineFields = DOG_DISCIPLINES.map(item => `<label class="dog-discipline-choice"><input type="checkbox" name="disciplines" value="${e(item.id)}" ${disciplines.has(item.id) ? 'checked' : ''}><span>${e(item.label)}</span></label>`).join('');
  const personalPhoto = !!dog?.personalPhotoDataUrl;
  const photoEditor = `<section class="dog-photo-editor" aria-label="Photo du chien"><div class="dog-form-photo-preview" data-dog-photo-preview>${portraitMarkup(dog || { name:'Nouveau chien', portrait:'silhouette' }, 'dog-form-photo-preview-frame')}</div><div class="dog-photo-actions"><label class="button button-dark dog-photo-pick"><span>${personalPhoto ? 'Remplacer la photo' : 'Ajouter une photo'}</span><input type="file" name="photo" accept="image/png,image/jpeg,image/webp,image/gif" data-dog-photo aria-label="${personalPhoto ? 'Remplacer la photo' : 'Ajouter une photo'}"></label><button class="button button-dark dog-photo-reset" type="button" data-dog-photo-reset ${personalPhoto ? '' : 'hidden'}>Utiliser le portrait mock</button><small>Image locale · 3 Mo maximum · aucun envoi</small><p class="dog-photo-feedback" role="status" aria-live="polite"></p></div></section>`;
  const retirement = `<div class="dog-retirement-field" data-dog-retirement-field ${isRetired ? '' : 'hidden'}>${input('retirementDate','Date de réforme / retraite',dog?.retirementDate || '', 'date', isRetired ? '' : 'disabled')}</div>`;
  return `<a class="back-link dogs-back-link" href="${editing ? `/dogs/${encodeURIComponent(dog.id)}` : '/dogs'}">← ${editing ? 'Profil du chien' : 'Mes chiens'}</a>${heading}<form class="dog-form card" data-dog-form="${editing ? 'update' : 'create'}" ${editing ? `data-dog-id="${e(dog.id)}"` : ''}>
    ${photoEditor}
    ${input('name','Nom',dog?.name || '', 'text', 'required maxlength="60" autocomplete="off"')}
    ${input('officialName','Nom officiel',dog?.officialName || '', 'text', 'maxlength="100" autocomplete="off"')}
    ${input('breed','Race',dog?.breed || '', 'text', 'maxlength="80" autocomplete="off"')}
    ${select('sex','Sexe',[{id:'',label:'Non renseigné'},{id:'female',label:'Femelle'},{id:'male',label:'Mâle'}],dog?.sex || '')}
    ${input('dateOfBirth','Date de naissance',dog?.dateOfBirth || '', 'date')}
    ${input('specialty','Spécialité',dog?.specialty || '', 'text', 'maxlength="80" autocomplete="off"')}
    ${input('registrationNumber','Matricule',dog?.registrationNumber || '', 'text', 'maxlength="60" autocomplete="off"')}
    ${select('status','Statut',DOG_STATUSES,dog?.status || 'active').replace('name="status"','name="status" data-dog-status')}
    ${retirement}
    ${select('portrait','Portrait mock',DOG_PORTRAITS,dog?.portrait || 'silhouette')}
    <fieldset class="dog-discipline-fieldset"><legend>Disciplines</legend><div class="dog-discipline-choices">${disciplineFields}</div></fieldset>
    <label class="dog-form-field dog-notes-field" for="dog-notes">Notes<textarea id="dog-notes" name="notes" maxlength="1200" rows="4">${e(dog?.notes || '')}</textarea></label>
    <p class="dog-form-feedback" role="status" aria-live="polite"></p>
    <div class="dog-form-actions"><button class="button button-gold" type="submit">${editing ? 'Enregistrer les modifications' : 'Ajouter le chien'}</button><a class="button button-dark" href="${editing ? `/dogs/${encodeURIComponent(dog.id)}` : '/dogs'}">Annuler</a></div>
  </form>`;
}

export function DogNotFoundScreen() {
  return `<a class="back-link dogs-back-link" href="/dogs">← Mes chiens</a><section class="dogs-not-found">${EmptyState('Chien introuvable','Ce profil n’existe pas dans les données mock de cette visite.','dog')}<a class="button button-gold" href="/dogs">Retour à la liste</a></section>`;
}
