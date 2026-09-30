const fs = require('node:fs');
const assert = require('node:assert/strict');

const generator = fs.readFileSync('scripts/generate-version.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const sourceVersion = JSON.parse(fs.readFileSync('version.json', 'utf8'));

assert.match(generator, /version:'10\.54'/, 'build version source must be 10.54');
assert.match(generator, /version\.json generated: 10\.54/, 'build log version must be 10.54');
assert.match(app, /const APP_RELEASE_VERSION='10\.54'/, 'application release fallback must be 10.54');
assert.match(html, />Version 10\.54<\//, 'static release label must be 10.54');
assert.match(sourceVersion.version, /^\d+\.\d+$/, 'version.json source format must be valid');
assert.equal(sourceVersion.version, '10.54', 'version.json source must declare the release version');

console.log('PASS release metadata compatibility guard');
