const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const catalog = fs.readFileSync('map-base-layers.mjs', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(catalog.includes("provider:'esri-world-imagery'"), 'Esri provider missing from central catalog');
assert(catalog.includes('server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/'), 'Esri tile URL missing from central catalog');
assert(catalog.includes('previewOnly:true') && catalog.includes('productionAllowed:false'), 'Satellite must be Preview-only');
assert(app.includes('const PISTE_SATELLITE_PREVIEW_ENABLED=TERRAIN_ENGINE_PREVIEW_OR_DEV'), 'Satellite Preview gate missing');
assert(app.includes("location.hostname!=='stats-piste-community.vercel.app'"), 'Production hostname must remain outside Satellite Preview gate');
assert(app.includes('const satelliteEnabled=PISTE_SATELLITE_PREVIEW_ENABLED'), 'Satellite layer is not gated by environment');
assert(app.includes('satelliteEnabled?L.tileLayer'), 'Satellite layer construction is not controlled');
assert(html.includes('id="plannerBaseSatellite"'), 'Planner Satellite control missing');
assert(html.includes('data-coaching-base="satellite"'), 'Coaching Satellite control missing');
assert(html.includes('data-ops-base="satellite"'), 'OPS Satellite control missing');
assert(app.includes('syncTerrainBaseLayerControls'), 'Central base-layer UI synchronizer missing');
assert(app.includes("fallbackBaseLayer(mapId,'tileerror')"), 'Satellite tile fallback missing');
assert(!/api[_-]?key|secret|token\s*[:=]/i.test(catalog), 'Satellite catalog contains a secret-like value');
assert(app.includes('Vue Satellite 3D') || app.includes('Satellite 3D'), 'MapLibre 3D status must remain unchanged');
console.log('v10.53 satellite preview guard: PASS');
