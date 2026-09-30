#!/usr/bin/env node
const fs = require('node:fs');
const assert = require('node:assert/strict');

const generator = fs.readFileSync('scripts/generate-version.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const source = JSON.parse(fs.readFileSync('version.json', 'utf8'));

assert.match(generator, /version:'10\.54'/, 'generator release must be 10.54');
assert.match(generator, /version\.json generated: 10\.54/, 'generator log must identify 10.54');
assert.match(app, /const APP_RELEASE_VERSION='10\.54'/, 'runtime release fallback must be 10.54');
assert.match(html, />Version 10\.54<\//, 'static release label must be 10.54');
assert.equal(source.version, '10.54', 'version.json source must declare 10.54');
assert.match(source.build, /^(source|[0-9a-f]{7,40})$/, 'version.json build must remain compatible');
assert(!/version:'10\.53'/.test(generator), 'active generator fallback still contains 10.53');
assert(!/const APP_RELEASE_VERSION='10\.53'/.test(app), 'active runtime fallback still contains 10.53');
assert(!/>Version 10\.53<\//.test(html), 'active static label still contains 10.53');

console.log('PASS check-v10-54-release-metadata');
