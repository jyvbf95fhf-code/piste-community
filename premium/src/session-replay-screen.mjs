import {escapeHTML as e,EmptyState} from './components.mjs';
import {MapShell} from './map-shell.mjs';
import {formatElapsed,formatTimestamp} from './coaching-time.mjs';

export function SessionReplayScreen(view){
 if(!view?.map)return `<section class="session-replay-page">${EmptyState('Replay indisponible','Le débrief complet n’est pas disponible pour cette session.','route')}<a class="button button-dark" href="/sessions">Retour aux sessions</a></section>`;
 const pose=view.poseAvailable?'Pose Traceur · rouge':'Tracé de pose indisponible';
 const search=view.searchAvailable?'Relève Conducteur · cyan':'Tracé de relève indisponible';
 const temporal=view.temporal||{};
 const temporalRows=[['Fin de pose',temporal.trackFinishedAt?formatTimestamp(temporal.trackFinishedAt):'Indisponible'],['Début de recherche',temporal.searchStartedAt?formatTimestamp(temporal.searchStartedAt):'Indisponible'],['Âge de piste au départ',temporal.trackAgeAtSearchStart==null?'Indisponible':formatElapsed(temporal.trackAgeAtSearchStart)],['Fin de recherche',temporal.searchFinishedAt?formatTimestamp(temporal.searchFinishedAt):'Indisponible']];
 return `<section class="session-replay-page" data-session-replay="${e(view.id)}"><a class="back-link" href="/sessions/${e(encodeURIComponent(view.id))}">← Détail de session</a><header class="sessions-heading"><span class="eyebrow">REPLAY STATIQUE · POST-SESSION</span><h1>${e(view.title)}</h1><p>${e(view.mode)} · ${e(view.status)} · Lecture seule</p></header><section class="card session-replay-card"><div class="session-replay-legend"><span class="pose">${e(pose)}</span><span class="search">${e(search)}</span><span class="start">Départ</span><span class="arrival">Arrivée si disponible</span></div>${MapShell(view.map,{postSession:true})}<p>Relecture statique des seules données mock présentes. Aucune chronologie n’est interpolée.</p></section><section class="card session-replay-temporal"><span class="eyebrow">REPÈRES TEMPORELS</span><dl>${temporalRows.map(([label,value])=>`<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join('')}</dl></section></section>`;
}
