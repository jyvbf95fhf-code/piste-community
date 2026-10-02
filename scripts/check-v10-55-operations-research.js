'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const admin = read('admin.js');
const html = read('index.html');
const css = read('admin.css');
const ok = (value, message) => assert.ok(value, message);

ok(admin.includes("operations:'Opérations'") && admin.includes("research:'Recherche'"), 'Bloc 6 tabs missing');
ok(admin.includes('renderOperations') && admin.includes('renderResearch'), 'Bloc 6 renderers missing');
ok(admin.includes("fetch('./version.json'"), 'Operations must verify public version metadata');
ok(admin.includes('navigator.onLine'), 'Operations network state must be observable');
ok(admin.includes('navigator.serviceWorker'), 'Operations Service Worker state must be observable');
ok(admin.includes('Non vérifié') && admin.includes('Indisponible'), 'Operations needs explicit uncertainty states');
ok(admin.includes("current==='research'?'dashboard':current"), 'Research must reuse existing protected aggregate RPC');
ok(admin.includes('Aucune trace GPS') && /quotas.*non connectés|télémétrie de quota/i.test(admin), 'Research must state minimization/backend limits');
ok(admin.includes('measured') && admin.includes('calculated') && admin.includes('estimated') && admin.includes('unknown'), 'Scientific provenance vocabulary missing');
ok(!/service_role|VERCEL_TOKEN|github_pat|BEGIN PRIVATE KEY/i.test(admin), 'Privileged secrets must not reach frontend');
ok(!/supabase\.from\([^)]*(coaching_trace_points|coaching_live_points)/i.test(admin), 'Research must not load raw GPS traces');
ok(css.includes('.admin-health') && css.includes('.admin-research'), 'Bloc 6 responsive styles missing');
ok(html.includes('id="adminPage"'), 'Existing Admin shell must remain in use');
console.log('v10.55 operations/research guard: PASS');
