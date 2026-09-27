const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const app = fs.readFileSync('app.js', 'utf8');
const start = app.indexOf('function normalizeHistoricalTimestamp');
const end = app.indexOf('\nfunction ', start + 10);
assert.ok(start >= 0, 'historical timestamp normalizer missing');
assert.ok(end > start, 'historical timestamp normalizer boundary missing');
const source = app.slice(start, end);
const context = {};
vm.runInNewContext(`${source}\nthis.normalizeHistoricalTimestamp = normalizeHistoricalTimestamp;`, context);
const normalize = context.normalizeHistoricalTimestamp;

const t0 = Date.parse('2026-01-01T00:00:00.000Z');
const t1 = t0 + 10_000;
const t2 = t0 + 20_000;
const t3 = t0 + 30_000;
const numericTrack = [t0, t1, t2, t3].map((timestamp, index) => ({ lat: 45 + index / 1000, lon: 2 + index / 1000, timestamp }));

assert.equal(normalize(t0), t0, 'finite millisecond timestamps must remain numeric');
assert.equal(normalize('2026-01-01T00:00:10.000Z'), t1, 'ISO timestamps must normalize');
assert.equal(normalize('not-a-timestamp'), null, 'invalid timestamps must be rejected');
assert.equal(normalize(null), null, 'null timestamps must be rejected');

const visibleAt = currentTime => numericTrack.filter(point => {
  const timestamp = normalize(point.timestamp);
  return timestamp !== null && timestamp <= currentTime;
});

const atT1 = visibleAt(t1);
const atT2 = visibleAt(t2);
const atT3 = visibleAt(t3);
assert.equal(atT1.length, 2, 'Replay start should expose the first two points');
assert.ok(atT2.length > atT1.length, 'visible points must grow as currentTime advances');
assert.equal(atT3.length, numericTrack.length, 'Replay end should expose all points');

console.log('PASS v10.53 replay corridor timestamp normalization guard');
