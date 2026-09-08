const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('v2.css','utf8');
const sw=fs.readFileSync('sw.js','utf8');

for(const token of ['coachingDriverTrail','drawCoachingDriverTrail','coaching-driver-trail']){
  if(!(app+css).includes(token))throw new Error(`Correctif parcours conducteur absent : ${token}`);
}
if(!/const points=coachingDriverTrail\(liveGroups\)/.test(app))throw new Error('Le parcours conducteur doit utiliser les points GPS successifs filtrés.');
if(!/drawCoachingDriverTrail\(points\)/.test(app))throw new Error('Le calque conducteur dédié doit être rendu.');
if(!/line\.bringToFront\(\)/.test(app))throw new Error('Le parcours conducteur doit rester visible au-dessus du tracé préparé.');
if(!/ownOnly[\s\S]{0,500}userId===session\.user\.id/.test(app))throw new Error('Le parcours conducteur doit conserver la protection côté client du double aveugle.');
if(!app.includes("if(userPoints.length>1&&memberRole==='traceur')"))throw new Error('La boucle équipe doit tracer uniquement le Traceur, sans redessiner le Conducteur ni tracer Coach/Observateur.');
require('./verify-current-assets')();
if(/service_role|VAPID_PRIVATE|-----BEGIN (?:RSA|PRIVATE)|sk_live_/i.test(app+html+sw))throw new Error('Secret détecté.');

console.log('Contrôle V10.38.2 OK : parcours conducteur Coaching dédié, progressif et au premier plan.');
