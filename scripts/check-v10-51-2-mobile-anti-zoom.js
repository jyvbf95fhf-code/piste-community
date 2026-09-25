#!/usr/bin/env node
const fs=require('fs');
const css=fs.readFileSync('v2.css','utf8');
const html=fs.readFileSync('index.html','utf8');
function ok(condition,label){if(!condition){console.error(`FAIL ${label}`);process.exitCode=1}else console.log(`PASS ${label}`)}
ok(css.includes('touch-action:manipulation'),'application touch-action manipulation present');
ok(css.includes('.leaflet-container, .leaflet-container *')&&css.includes('touch-action:auto'),'Leaflet touch-action override present');
ok(!/user-scalable\s*=\s*no/i.test(html),'viewport does not disable user scaling');
ok(!/touch-action\s*:\s*none[^}]*leaflet-container/i.test(css),'no Leaflet touch-action none regression');
ok(!css.includes('gpsManager')&&!css.includes('gpsPermission'),'no GPS experimental code in CSS branch');
console.log('check-v10-51-2-mobile-anti-zoom: PASS');
