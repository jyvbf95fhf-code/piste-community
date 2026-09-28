#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('v2.css', 'utf8');

assert(!html.includes('coachingWizardMapVisibility'), 'legacy map visibility block is still rendered');
for (const id of ['coachingWizardMapVisibilityCoach','coachingWizardMapVisibilityTraceur','coachingWizardMapVisibilityDriver','coachingWizardMapVisibilityObserver']) {
  assert(!html.includes(id), `legacy role checkbox remains: ${id}`);
}
assert(html.includes('Tracé de référence'), 'reference route section is missing');
assert(/Tracé de référence[\s\S]{0,120}facultatif/i.test(html), 'reference route section must be optional');
assert(html.includes('coachingWizardTrackOptions'), 'existing route preparation controls disappeared');
assert(/coachingWizardDrawRoute/.test(html) && /coachingWizardImportRoute/.test(html), 'draw/import controls disappeared');
assert(/coachingWizardExistingRoute/.test(html), 'saved route selector disappeared');
assert(/function canRoleSeeReferenceRoute\(/.test(app), 'central reference route visibility reader is missing');
assert(/coachingDataVisibility\([^]*canRoleSeeReferenceRoute/.test(app), 'map rendering does not use central reference visibility');
assert(!/mapVisibilityByRole/.test(app), 'user-configurable mapVisibilityByRole remains in app code');
assert(!/coachingWizardMapVisibility/.test(app), 'legacy map visibility wiring remains in app code');
assert(/method:'none'/.test(app) || /method\s*===\s*'none'/.test(app), 'none route state is missing');
assert(/function coachingWizardWithoutPreparedRoute/.test(app), 'optional route creation path is missing');
assert(/coachingWizardWithoutPreparedRoute\(\)/.test(app), 'submit path does not preserve optional route');
assert(/min-width:\s*0/.test(css) || /overflow-x:\s*hidden/.test(css), 'mobile overflow protection is missing');
assert(!/navigator\.geolocation\.watchPosition/.test(app.slice(app.indexOf('function canRoleSeeReferenceRoute'), app.indexOf('function canRoleSeeReferenceRoute')+2000)), 'reference route reader must not add GPS');
console.log('V10.54 optional reference route guard: OK');
