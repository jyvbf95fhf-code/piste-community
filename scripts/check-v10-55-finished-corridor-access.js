import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync('app.js', 'utf8');
const start = app.indexOf('function historicalCorridorRole');
const end = app.indexOf('\nfunction historicalCorridorWeather', start);
assert.ok(start >= 0 && end > start, 'historical corridor access functions missing');

const source = app.slice(start, end);
const context = {
  session: { user: { id: 'member-1' } },
  coachingHistoricalAccess(row) {
    const member = row?.coaching_members?.some(m => m.user_id === 'member-1' && ['accepted', 'active'].includes(m.invitation_status));
    return { canReadDebrief: member && ['in_progress', 'closed'].includes(row?.debrief_status) };
  },
  coachingHistoricalProof: () => null,
  coachingOdorAuthorized: () => true
};
vm.runInNewContext(`${source}\nthis.historicalCorridorAllowed = historicalCorridorAllowed;`, context);

const track = [{ lat: 45, lon: 2 }, { lat: 45.001, lon: 2.001 }];
const member = { user_id: 'member-1', invitation_status: 'accepted', role: 'driver' };

assert.equal(
  context.historicalCorridorAllowed({ type: 'coaching', reference: track, row: { debrief_status: 'track_finished', coaching_members: [member] } }),
  true,
  'a finished, authorized session must allow corridor calculation'
);
assert.equal(
  context.historicalCorridorAllowed({ type: 'coaching', reference: track, row: { debrief_status: 'track_finished', coaching_members: [] } }),
  false,
  'a non-member must not gain corridor access'
);
context.coachingOdorAuthorized = () => false;
assert.equal(
  context.historicalCorridorAllowed({ type: 'coaching', reference: track, row: { debrief_status: 'track_finished', coaching_members: [member] } }),
  false,
  'visibility rules must still deny a hidden corridor'
);

console.log('PASS v10.55 finished corridor access guard');
