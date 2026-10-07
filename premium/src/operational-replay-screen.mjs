import { escapeHTML as e, EmptyState, StatusBadge } from './components.mjs';
import { OperationalMap } from './operational-map.mjs';
import { operationalJournalMarkup } from './operational-screen.mjs';
import { OperationalNavigation } from './operational-intake.mjs';

export function OperationalReplayScreen(view) {
  if (!view?.readOnly || view.kind !== 'operational') {
    return `<section class="operational-replay-page">${EmptyState('Replay indisponible','Le replay est accessible après la clôture et la finalisation de la mission.','navLive')}<a class="button button-dark" href="/sessions">Retour aux sessions</a></section>`;
  }
  const traceMessage = view.trace.length ? `${view.trace.length} point(s) de progression mock` : 'Tracé terrain indisponible';
  const eventContent = view.journal?.length
    ? `${operationalJournalMarkup(view.journal,view.events,view.trace,view.handler?.name)}${view.events.length?'':'<p class="operational-events-empty">Événements indisponibles. Aucun événement terrain enregistré.</p>'}`
    : '<p>Journal indisponible.</p>';
  const confirmedStart=typeof view.places?.confirmedTrackStart==='object'?view.places.confirmedTrackStart?.description:view.places?.confirmedTrackStart;
  const detailRows = [
    ['Chien', view.dog?.name],
    ['Conducteur', view.handler?.name],
    ['Adresse d’intervention', view.places?.interventionAddress],
    ['Commune', view.places?.interventionCommune],
    ['Secteur', view.places?.interventionSector],
    ['Dernier point connu', view.places?.lastKnownDescription],
    ['Départ probable', view.places?.probableTrackStart],
    ['Départ confirmé', confirmedStart],
    ['Âge de piste au départ', view.time?.trackAgeAtStart?.label || 'non renseigné'],
    ['Âge de piste à l’arrêt', view.time?.trackAgeAtStop?.label || 'non renseigné'],
    ['Personne recherchée', view.details?.searchedPerson],
    ['Contexte', view.details?.context],
    ['Environnement', view.details?.environment],
    ['Résultat', view.result ?? view.details?.result],
    ['Appareil source', [view.sourceDevice?.manufacturer,view.sourceDevice?.deviceModel].filter(Boolean).join(' · ') || null]
  ].filter(([,value])=>value);
  const evaluations=[['Chien',view.dogEvaluation],['Terrain',view.fieldEvaluation]].map(([label,values])=>{
    const available=Object.entries(values||{}).filter(([key,value])=>key!=='comment'&&value!==null&&value!==undefined);
    if(!available.length&&!values?.comment)return '';
    return `<section class="card operational-replay-details"><h2>Évaluation · ${label}</h2>${available.length?`<dl>${available.map(([key,value])=>`<div><dt>${e(key)}</dt><dd>${e(value)} / 5</dd></div>`).join('')}</dl>`:'<p>Aucune note standardisée disponible.</p>'}${values?.comment?`<p>${e(values.comment)}</p>`:''}</section>`;
  }).join('');
  const pauseRows=(view.pauseObservations||[]).map(item=>`<li><strong>${e(item.classification)}</strong><span>${item.duration===null?'Durée indisponible':`${Math.round(item.duration/1000)} s · simulation`} · ${e(item.confirmationState||'état indisponible')}</span>${item.note?`<p>${e(item.note)}</p>`:''}</li>`).join('');
  const corridor = view.olfactoryCorridor
    ? `<aside class="operational-corridor-note"><strong>${e(view.olfactoryCorridor.label)}</strong><span>Couche indicative conservée de la mission mock.</span></aside>`
    : '';
  const weather = view.weather
    ? `<section class="card operational-weather-panel"><span class="eyebrow">MÉTÉO · DÉMONSTRATION</span><h2>Vent et conditions</h2><span class="operational-mock-label">Démonstration · non mesuré</span><p>${e(view.weather.wind)}</p><p>${e(view.weather.speed)} · ${e(view.weather.temperature)}</p></section>`
    : '<section class="card operational-weather-panel"><span class="eyebrow">MÉTÉO</span><h2>Conditions indisponibles</h2><p>Aucune donnée météo enregistrée pour cette mission.</p></section>';
  const gpx = view.gpxAttachment
    ? `<section class="card operational-gpx-panel"><span class="eyebrow">GPX · MÉTADONNÉES MOCK</span><h2>${e(view.gpxAttachment.fileName)}</h2><p>${e(view.gpxAttachment.provenance)} · géométrie indisponible</p><p>${e(view.gpxAttachment.metadata?.manufacturer||'Fabricant indisponible')} · ${e(view.gpxAttachment.metadata?.deviceModel||'Modèle indisponible')} · ${e(view.gpxAttachment.metadata?.importType||'Type d’import indisponible')}</p></section>`
    : '';
  return `<section class="operational-page operational-replay-page" data-operational-replay="${e(view.id)}"><a class="back-link" href="/sessions">← Sessions</a><header class="operational-heading"><span class="eyebrow">REPLAY DE MISSION · LECTURE SEULE</span><h1>${e(view.title)}</h1><p>${StatusBadge(view.status,view.status==='Archivée'?'neutral':'gold')} <span>Lecture seule</span></p>${OperationalNavigation(view.places?.interventionAddress)}</header><section class="operational-map-panel operational-replay-map-panel"><div class="operational-map-heading"><div><span class="eyebrow">CARTE APRÈS MISSION</span><h2>Progression enregistrée</h2></div><span class="operational-mock-label">MOCK · AUCUN GPS RÉEL</span></div><div class="operational-replay-legend"><span>Départ</span><span>Progression mock</span><span>Fin du suivi</span><span>Événements</span></div>${OperationalMap(view,{interactive:false})}<p class="operational-replay-trace-status">${e(traceMessage)}</p>${corridor}</section><section class="card operational-replay-details"><h2>Synthèse de mission</h2>${detailRows.length?`<dl>${detailRows.map(([label,value])=>`<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join('')}</dl>`:EmptyState('Informations indisponibles','Aucune information facultative n’a été renseignée.','navLive')}</section><section class="card operational-events-panel"><h2>Journal terrain · simulation</h2>${eventContent}</section>${pauseRows?`<section class="card operational-replay-details"><h2>Pauses et immobilités annotées</h2><ul>${pauseRows}</ul><p>Les annotations non confirmées ne sont pas comptées comme pauses actives.</p></section>`:''}${evaluations}${weather}${gpx}<p class="operational-readonly-note">La mission est consultable en lecture seule. Aucune donnée absente n’est reconstruite.</p><a class="button button-dark" href="/sessions">Retour aux sessions</a></section>`;
}
