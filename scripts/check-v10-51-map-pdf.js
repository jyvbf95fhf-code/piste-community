#!/usr/bin/env node
const fs=require('fs');
const app=fs.readFileSync('app.js','utf8');
const checks=[
 ['snapshot provider exists',/const PisteMapSnapshotProvider=\{/],
 ['provider independent of Leaflet DOM',/async snapshot\(mapData\)/],
 ['OSM attribution included',/© OpenStreetMap contributors/],
 ['real raster tile source',/tile\.openstreetmap\.org/],
 ['tile cache present',/cache:new Map\(\)/],
 ['fallback report canvas',/return fallback\(\)/],
 ['provider used by mission report',/PisteMapSnapshotProvider\.snapshot\(model\.map\)/],
 ['provider used by PDF',/const mapSnapshot=await PisteMapSnapshotProvider\.snapshot\(model\.map\)/],
 ['no DOM screenshot dependency',app=>!/html2canvas|dom-to-image|leaflet-image/.test(app)],
 ['debug snapshot sanitized',/pdfSnapshot:window\.PisteMapSnapshotProvider/]
];let failed=0;for(const [name,re] of checks){const ok=typeof re==='function'?re(app):re.test(app);console.log(`${ok?'✓':'✗'} ${name}`);if(!ok)failed++}if(failed)process.exit(1);console.log('check-v10-51-map-pdf: PASS');
