import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [sw, index] = await Promise.all([
  fs.readFile('sw.js', 'utf8'),
  fs.readFile('index.html', 'utf8')
]);

assert.match(sw, /const C='piste-community-v2125'/, 'cache lineage must advance for this build');
assert.match(sw, /critical=/, 'critical assets must be classified');
assert.match(sw, /critical\?fetch\(e\.request,\{cache:'no-store'\}\)/, 'critical assets must use network-first refresh');
assert.match(sw, /caches\.keys\(\).*filter\(k=>k!==C/, 'old caches must be removed on activation');
assert.match(sw, /version.*json/, 'version metadata must be treated as critical');
assert.match(index, /app\.js\?v=1049-1/, 'the existing app asset entry must remain compatible');
console.log('PASS v10.55 service worker cache invalidation contract');
