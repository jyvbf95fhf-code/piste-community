import {sharedCoachingEntry} from './coaching-shared-entry.mjs';
import {escapeHTML as e} from './components.mjs';
import {GpsMapMarkup} from './coaching-gps-screen.mjs';
const chooses=p=>p?.phase==='PREPARATION'&&p.role==='traceur'&&p.poseRecorder==='traceur'&&p.scenario==='connected_traceur';
export function TraceurSourceActions(p,{busy=false}={}){
 if(!chooses(p)||sharedCoachingEntry(p).reference)return '';
 return `${p.traceType!=='direct'?`<button type="button" class="button button-dark" data-remote="choose-direct" ${busy?'disabled':''}>Tracer directement</button>`:''}<button type="button" class="button button-dark" data-remote="choose-prepared" ${busy?'disabled':''}>Utiliser un tracé préparé</button>`;
}
export function TraceurPreparationSheet(p,tracks=[],{busy=false}={}){
 if(!chooses(p))return '';
 return `<section class="card" data-traceur-preparation><h2>Choisir mon tracé préparé</h2><p>Choisissez une référence de votre bibliothèque ou importez un GPX. La pose GPS reste un enregistrement distinct.</p><form data-remote-form="prepared"><label>Mes tracés préparés<select name="trackId" required><option value="">Choisir un tracé</option>${tracks.map(t=>`<option value="${e(t.id)}">${e(t.name)}</option>`).join('')}</select></label><button class="button button-gold" ${busy||!tracks.length?'disabled':''}>Utiliser ce tracé</button></form>${!tracks.length?'<p>Aucun tracé géographique disponible dans votre bibliothèque.</p>':''}<form data-remote-form="gpx"><label>Importer un fichier GPX<input name="gpxFile" type="file" accept=".gpx,application/gpx+xml" required></label><button class="button button-dark" ${busy?'disabled':''}>Importer ce GPX</button></form><p>Le conducteur ne reçoit que les informations autorisées par le mode de la session.</p></section>`;
}
export function SharedCoachingClosed(p,{notice=''}={}){
 const title={CANCELLED:'Session annulée',INTERRUPTED:'Session interrompue',LEFT:'Participation terminée'}[p.phase];if(!title)return '';
 const recorded=!!(p.pose||p.search);
 return `<header class="coaching-heading"><span class="eyebrow">COACHING · BILAN</span><h1>${title}</h1><p>${e(p.dog||'Session Coaching')}</p></header>${notice?`<p class="remote-notice" role="status">${e(notice)}</p>`:''}<section class="card"><h2>Enregistrement arrêté</h2><p>Cette session est en lecture seule. Aucun suivi GPS ne sera relancé.</p>${!recorded?'<p>Aucun enregistrement GPS disponible pour cette session.</p>':`<div class="gps-report">${GpsMapMarkup(p.search||p.pose,p.search?p.pose:null,[])}</div>`}</section><section class="card"><h2>L’équipe</h2>${(p.team||[]).map(m=>`<p>${e(m.name)} · ${e({driver:'Conducteur',traceur:'Traceur',coach:'Coach',observer:'Observateur'}[m.role]||m.role)}</p>`).join('')||'<p>Participation terminée.</p>'}</section>${p.messages?.length?`<section class="card"><h2>Messages de la session</h2>${p.messages.map(m=>`<p><strong>${e(m.sender)}</strong> · ${e(m.text)}</p>`).join('')}</section>`:''}<button type="button" class="button button-gold" data-remote="home">Retour aux sessions</button>`;
}
export function SharedReviewFrame(content){return `<div class="shared-review" data-shared-review><div class="shared-review-content"><nav class="shared-review-back"><button type="button" class="button button-dark" data-remote="home">← Retour aux sessions</button></nav>${content}</div></div>`;}
