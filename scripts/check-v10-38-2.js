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
if(!/!\['driver','solo'\]\.includes\(memberRole\)/.test(app))throw new Error('La boucle équipe ne doit pas redessiner le parcours conducteur.');
if(!/piste-community-v20(?:79|80|81)/.test(sw)||!/app\.js\?v=10(?:78|79|80)/.test(html+sw)||!/v2\.css\?v=20(?:62|63|64)/.test(html+sw))throw new Error('Cache V10.38.2+ incohérent.');
if(/service_role|VAPID_PRIVATE|-----BEGIN (?:RSA|PRIVATE)|sk_live_/i.test(app+html+sw))throw new Error('Secret détecté.');

console.log('Contrôle V10.38.2 OK : parcours conducteur Coaching dédié, progressif et au premier plan.');
