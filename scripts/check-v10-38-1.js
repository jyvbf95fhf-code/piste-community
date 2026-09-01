const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('v2.css','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of ['syncCoachingPanelStatus','applySafeCoachingRealtimeStatus','refreshActiveCoachingSession','refreshCoachingMapLayout']){
  if(!app.includes(token))throw new Error(`Correctif Coaching absent : ${token}`);
}
if(/Object\.assign\(activeCoachingSession\s*,\s*payload\.new\)/.test(app))throw new Error('Le contenu temps réel non filtré ne doit pas remplacer la session active.');
if(!/await refreshActiveCoachingSession\(id\)/.test(app))throw new Error('La session filtrée par rôle doit être rechargée au changement de statut.');
if(!/status==='live'[\s\S]{0,900}await renderCoachingMap\(\);refreshCoachingMapLayout\(\)/.test(app))throw new Error('La carte invitée doit être rendue et recalculée au démarrage.');
if(/\.waiting-room \.coaching-map-shell\s*\{\s*display\s*:\s*none/i.test(css))throw new Error('La salle d’attente masque encore la carte.');
if(!/\.waiting-room \.coaching-map-shell\s*\{\s*display\s*:\s*block/i.test(css))throw new Error('La carte de salle d’attente doit rester visible.');
if(!/piste-community-v2079/.test(sw)||!/app\.js\?v=1078/.test(html+sw)||!/v2\.css\?v=2062/.test(html+sw))throw new Error('Cache V10.38.1 incohérent.');
if(/service_role|VAPID_PRIVATE|-----BEGIN (?:RSA|PRIVATE)|sk_live_/i.test(app+html+sw))throw new Error('Secret détecté.');

console.log('Contrôle V10.38.1 OK : carte Coaching invitée, transition temps réel et double aveugle protégés.');
