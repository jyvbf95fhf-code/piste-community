import {coachingVideoSlot} from './coaching-video-pilot.mjs';
import {ReadOnlyRealMap} from './read-only-real-map.mjs';
import {escapeHTML as e,EmptyState,StatusBadge} from './components.mjs';

const hrefFor=session=>`/live/${session.sessionType==='ops'?'ops':'coaching'}/${encodeURIComponent(session.sessionId)}`;
const stateLabel=value=>({PREPARATION:'Préparation',LAYING:'Pose en cours',TRACK_FINISHED:'Pose terminée',LAYING_WAIT:'En attente',SEARCH_READY:'Recherche prête',SEARCH_RUNNING:'Recherche en cours',DEBRIEF:'Débrief',ARCHIVED:'Terminée'})[value]||value;
const coachingModes={normal:'Normal',simple_blind:'Simple aveugle',full_blind:'Double aveugle'};
const coachingModeBadge=session=>{
 if(session.sessionType==='ops')return '';
 const label=Object.hasOwn(coachingModes,session.mode)?coachingModes[session.mode]:session.modeLabel;
 return label?`<span data-live-coaching-mode>${StatusBadge(label,'neutral')}</span>`:'';
};
const typeLabel=session=>session.sessionType==='ops'?'OPS · Observateur de trace':'Coaching · Observateur';
function sessionCard(session){return `<article class="card live-session-card" data-live-session-type="${e(session.sessionType)}"><div>${StatusBadge(session.sessionType==='ops'?'OPS LIVE':'COACHING LIVE',session.sessionType==='ops'?'terrain':'cyan')}${coachingModeBadge(session)}<span class="live-role-label">${e(typeLabel(session))}</span></div><h3>${e(session.title||session.dogName||'Session en cours')}</h3><p>${e(session.ownerDisplayName||'Session partagée')}${session.state?` · ${e(stateLabel(session.state))}`:''}${session.activity?` · ${e(session.activity.label)}`:''}${session.startedAt?` · ${e(session.startedAt)}`:''}</p><a class="button button-gold" href="${e(hrefFor(session))}">Voir le Live</a></article>`;}
function group(title,items,empty){return `<section class="live-list-group"><h2>${title}</h2>${items.length?`<div class="live-session-list">${items.map(sessionCard).join('')}</div>`:`<p class="live-empty">${empty} · Les sessions autorisées apparaîtront ici.</p>`}</section>`;}
export function LiveScreen({ownSessions=[],contactSessions=[],invitations=[],refreshing=false,error=''}={}){
 const unique=items=>[...new Map(items.filter(s=>!s.isOwner&&!s.ended).map(s=>[s.sessionType+':'+s.sessionId,s])).values()];const contacts=unique(contactSessions),pending=unique(invitations),active=contacts.filter(s=>s.activity?.state!=='disconnected'),offline=contacts.filter(s=>s.activity?.state==='disconnected');
 return `<section class="live-page live-directory" data-live-screen><header class="live-heading"><div class="live-heading-top"><span class="eyebrow">LE TERRAIN EN DIRECT</span><span class="live-observer-chip">Lecture seule</span></div><div class="live-title-row"><h1>Live</h1><button type="button" class="button button-dark" data-refresh-friend-live ${refreshing?'disabled':''}>${refreshing?'Actualisation…':'Actualiser'}</button></div><p>Suivez les pistes de vos amis, selon les accès qu’ils vous accordent.</p><div class="live-availability"><span class="live-presence-dot" aria-hidden="true"></span><strong>${active.length} ${active.length>1?'pistes disponibles':'piste disponible'}</strong></div>${error?`<p role="status">${e(error)}</p>`:''}</header>${group('À observer',active,'Aucun Live disponible pour le moment')}${offline.length?group('Sans activité récente',offline,''):''}${pending.length?group('Invitations à rejoindre',pending,''):''}</section>`;
}

const opsResultLabels={
 positive:'Personne retrouvée par le chien',
 assisted_positive:'Personne retrouvée après orientation du chien',
 oriented_not_found:'Orientation donnée · personne non retrouvée',
 negative:'Personne non retrouvée',
 interrupted:'Recherche interrompue',
 no_target:'Exercice sans personne à découvrir'
};

export function LiveDetailScreen(projection,{wide=false,now=Date.now()}={}){
 const resultScreen=projection?.sessionType==='ops'&&projection.missionFinished===true;
 if(!resultScreen&&(projection?.ended||projection?.status==='ended'||projection?.state==='Fin de piste'))return `<section class="live-page live-ended" data-live-ended><span class="eyebrow">DIFFUSION CLÔTURÉE</span><h1>Live terminé</h1><p>La diffusion est arrêtée. Aucune nouvelle position n’est transmise aux observateurs.</p><a class="button button-gold" href="/live">Retour au Live</a></section>`;
 if(!projection)return `<section class="live-page">${EmptyState('Live indisponible','Cette session n’est pas partagée avec vous ou votre accès a été révoqué.','shield')}<a class="button button-dark" href="/live">Retour au Live</a></section>`;
 const ops=projection.sessionType==='ops';
 const map=ops?{gpsTrack:projection.gpsTrack,trace:projection.trace,events:projection.events||[]}:projection.map||{};
 const track=ops?projection.gpsTrack:map.gpsSearch||map.gpsPose;
 const distance=ops?projection.distance:track?.distanceM;
 const seconds=ops?projection.trackingSeconds:Number.isFinite(track?.elapsedMs)?Math.floor(track.elapsedMs/1000):null;
 const dog=ops?projection.dogName:typeof projection.dog==='string'?projection.dog:projection.dog?.name;
 const phase=resultScreen?'Mission terminée':ops&&projection.state==='Pause'?'En pause':ops&&projection.state==='En cours'?'Pistage en cours':stateLabel(ops?projection.state:projection.phase);
 const outcome=resultScreen&&Object.hasOwn(opsResultLabels,projection.outcome)?opsResultLabels[projection.outcome]:null;
 const expanded=ops&&wide;
 const last=projection.lastPositionAt;
 const gps=ops&&!resultScreen&&Number.isFinite(last)&&now-last>15000
  ? `Position GPS non actualisée · dernier point à ${new Date(last).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`
  : projection.activity?.label;
 const type=ops?'OPS':'Coaching';
 const activity=projection.activity;
 const activityState=['live','waiting','disconnected'].includes(activity?.state)?activity.state:'unknown';
 const metrics=[
  ['Distance',Number.isFinite(distance)?`${Math.round(distance)} m`:null],
  ['Durée',Number.isFinite(seconds)?`${Math.floor(seconds/60)} min ${seconds%60} s`:null],
  ['Âge de piste',ops?projection.trackAge:null]
 ].filter(([,value])=>value!==null&&value!==undefined&&value!=='Non renseigné');
 const details=ops?projection.handlerName:null;
 return `<section class="live-page live-detail live-observer-view${expanded?' live-observer-wide live-observer-map-fullscreen':''}" data-live-role="${ops?'ops_trace_observer':'observer'}">
  <header class="live-observer-header">
   <div class="live-observer-navigation">
    <a class="back-link" href="/live">← Live</a><span class="live-observer-chip">Lecture seule</span>
    ${ops?`<a class="button button-dark" href="${expanded?'?ecran=0':'?ecran=1'}">${expanded?'Fermer la carte':'Grand écran'}</a><button type="button" class="button button-dark" data-copy-ops-screen>Copier le lien grand écran</button>`:''}
   </div>
   <div class="live-observer-title"><h1>${e(dog||`Live ${type}`)}</h1>${dog?StatusBadge(type,ops?'terrain':'cyan'):''}${coachingModeBadge(projection)}</div>
   ${details?`<p>${e(details)}</p>`:''}
  </header>
  ${resultScreen?`<div class="live-observer-result" role="status"><span>Mission terminée</span><strong>${e(outcome||'Résultat en attente')}</strong></div>`:''}
  ${!ops&&projection.mode==='normal'&&projection.phase==='SEARCH_RUNNING'?coachingVideoSlot(projection.id,'viewer'):''}
  <div class="live-observer-map">
   ${expanded?`<div class="live-map-overlay-top"><strong>${e(dog||'Live OPS')}</strong><span>Lecture seule</span><a href="?ecran=0" class="live-map-close" aria-label="Fermer la carte">✕ Fermer la carte</a></div>`:''}
   <div class="live-observer-status" data-observer-activity="${activityState}" ${!resultScreen&&(phase||gps)?'':'hidden'}>
    ${phase?`<strong>${e(phase)}</strong>`:''}
    ${gps?`<span role="status">${e(gps)}</span>`:''}
   </div>
   ${ReadOnlyRealMap(map,{label:`Carte Live ${type} · lecture seule`,followSessionId:expanded?projection.sessionId:null,conductorMarker:ops})}
   ${metrics.length?`<dl class="live-observer-metrics">${metrics.map(([label,value])=>`<div><dt>${label}</dt><dd>${e(value)}</dd></div>`).join('')}</dl>`:''}
  </div>
  ${ops&&projection.corridor?`<p class="live-estimated-corridor">${e(projection.corridor.label)} · couche estimée autour de la trace</p>`:''}
  ${ops&&projection.events?.length?`<details class="live-observer-events"><summary>Événements partagés · ${projection.events.length}</summary><ul>${projection.events.map(event=>`<li>${e(event.type)}</li>`).join('')}</ul></details>`:''}
 </section>`;
}
