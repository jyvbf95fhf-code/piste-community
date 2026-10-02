import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const app = read('app.js');
const admin = read('admin.js');
const adminCss = read('admin.css');
const styles = read('styles.css');
const v2 = read('v2.css');
const sw = read('sw.js');
const html = read('index.html');
const layers = read('map-base-layers.mjs');
const replay = read('replay-player.mjs');

assert.match(styles, /safe-area-inset-top/);
assert.match(styles, /safe-area-inset-bottom/);
assert.match(v2, /safe-area-inset-bottom/);
assert.match(adminCss, /\.admin-centre[^{]*\{[^}]*safe-area-inset-bottom/);
assert.match(adminCss, /\.admin-centre button[^}]*min-height:44px/);

assert.equal((app.match(/navigator\.geolocation\.watchPosition\s*\(/g) || []).length, 1, 'one native GPS watcher only');
assert.match(app, /const stop=reason=>[\s\S]*?clearWatch/);
assert.match(app, /createReplayPlayer/);
assert.match(app, /destroyReplaySurface/);
assert.match(replay, /requestAnimationFrame/);
assert.doesNotMatch(app, /setInterval\([^)]*replay/i, 'Replay must not create an interval clock');

assert.match(sw, /piste-community-v2125/);
assert.match(sw, /skipWaiting\(\)/);
assert.match(sw, /clients\.claim\(\)/);
assert.match(sw, /critical[\s\S]*app\\\.js/);
assert.match(sw, /critical[\s\S]*admin\\\.js/);
assert.match(sw, /critical[\s\S]*admin\\\.css/);
assert.match(sw, /critical[\s\S]*version\\\.json/);
assert.match(sw, /caches\.keys\(\)[\s\S]*delete/);
assert.match(app, /serviceWorker\.register\(['"]\.\/sw\.js/);

assert.match(admin, /dashboard:'Tableau de bord'/);
for (const label of ['users:\'Utilisateurs\'', 'activity:\'Activité\'', 'statistics:\'Statistiques\'', 'feedback:\'Retours\'', 'operations:\'Opérations\'', 'research:\'Recherche\'']) assert.match(admin, new RegExp(label));
assert.doesNotMatch(admin, /service_role|SUPABASE_SERVICE_ROLE|VERCEL_TOKEN|ghp_[A-Za-z0-9]/i);
assert.match(layers, /satellite[\s\S]*productionAllowed:false/);

for (const category of ['measured', 'calculated', 'estimated', 'unknown']) {
  assert.match(app, new RegExp(category));
}
assert.match(app, /profiles/);
assert.doesNotMatch(app, /auth\.admin|updateUser\s*\(/i);
assert.doesNotMatch(app, /fetch\([^)]*weather[\s\S]{0,240}for\s*\(/i);

console.log('check-v10-55-mobile-hardening: PASS');
