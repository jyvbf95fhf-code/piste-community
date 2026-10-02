#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const generator = fs.readFileSync('scripts/generate-version.js', 'utf8');
const version = JSON.parse(fs.readFileSync('version.json', 'utf8'));
const layers = fs.readFileSync('map-base-layers.mjs', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

assert.match(generator, /version:'10\.55'/, 'version generator must emit 10.55');
assert.match(generator, /VERCEL_GIT_COMMIT_SHA\|\|process\.env\.GIT_COMMIT_SHA/, 'build must prefer Vercel/Git SHA');
assert.match(app, /const APP_RELEASE_VERSION='10\.55'/, 'runtime release fallback must be 10.55');
assert.match(html, />Version 10\.55<\//, 'static release label must be 10.55');
assert.strictEqual(version.version, '10.55', 'version.json must declare 10.55');
assert.match(String(version.build), /^[0-9a-f]{7,40}$/i, 'version.json source build must be a real SHA prefix');
assert.match(app, /const APP_VERSION='10\.49'/, 'historical report/export APP_VERSION must remain unchanged');
assert.match(layers, /satellite[\s\S]*previewOnly:true[\s\S]*productionAllowed:false/, 'Satellite must remain Preview-only');
assert.match(sw, /const C='piste-community-v2125'/, 'validated Service Worker cache contract must remain v2125');

console.log('V10.55 release metadata guard: PASS');
