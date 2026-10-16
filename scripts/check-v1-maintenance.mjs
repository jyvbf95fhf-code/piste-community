import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const config=JSON.parse(await readFile('vercel.json','utf8'));
assert.equal(config.outputDirectory,'.v1-maintenance','Only the maintenance bundle may be published');
const build=spawnSync(process.execPath,['scripts/build-v1-maintenance.mjs'],{encoding:'utf8'});
assert.equal(build.status,0,build.stderr);
assert.deepEqual((await readdir('.v1-maintenance')).sort(),['icon.svg','index.html','sw.js']);
const html=await readFile('.v1-maintenance/index.html','utf8');
assert.ok(html.includes('Bientôt de retour'));
assert.ok(html.includes('PISTE Community évolue. Une nouvelle expérience de pistage arrive prochainement.'));
assert.ok(!/supabase|app\.js|config\.js|<form/i.test(html),'No V1 application or backend loaded');
for(const pathname of ['/','/index.html','/coaching/123','/admin','/app.js','/config.js','/supabase/functions/test','/premium/','/live/ops/123']){
 const rule=config.rewrites.find(r=>new RegExp('^'+r.source+'$').test(pathname));
 assert.equal(rule?.destination,'/index.html','Direct link must resolve to maintenance: '+pathname);
}
assert.equal(config.git.deploymentEnabled['chore/v1-maintenance-pause-20261016'],false);
const sw=await readFile('.v1-maintenance/sw.js','utf8');
assert.ok(!/localStorage|indexedDB|signOut|deleteDatabase|unregister/.test(sw),'Accounts and local records must be preserved');
assert.match(sw,/clients\.claim/);
assert.match(sw,/client\.navigate/);
console.log('PASS: isolated bundle, 9 direct links, exact copy, deployment guard, account/data preservation');
