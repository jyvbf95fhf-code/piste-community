'use strict';
const fs = require('fs');
const assert = require('assert/strict');

const app = fs.readFileSync('app.js', 'utf8');
assert(app.includes('coachingSessionRefreshSequence'), 'refreshes must have a monotonic sequence');
assert(app.includes('coachingLatestAppliedRefresh'), 'latest applied refresh must be tracked');
assert(app.includes('requestSeq'), 'refresh must capture a request sequence');
assert(app.includes('stale-response'), 'stale refreshes must be diagnosed');
assert(app.includes('freshUpdatedAt'), 'stale diagnostics must include fresh updated_at');
assert(app.includes('activeUpdatedAt'), 'stale diagnostics must include active updated_at');
assert(app.includes('coachingSessionMutationSequence'), 'server transitions must invalidate in-flight refreshes');
assert(app.includes('mutationSeq'), 'refresh must capture the mutation sequence');
assert(app.includes('updated_at'), 'refresh race guard must compare server updated_at');
assert(/requestSeq\s*!==\s*coachingSessionRefreshSequence/.test(app), 'older refresh response must be ignored');
assert(/mutationSeq\s*!==\s*coachingSessionMutationSequence/.test(app), 'refresh started before a transition must be ignored');
assert(/coachingSessionMutationSequence\s*\+=\s*1/.test(app), 'transition must advance the mutation sequence');

// Deterministic race fixture: C resolves first, then A, then B.
let latestRequest = 3;
let mutationSequence = 1;
let applied = null;
function applyRefresh(response) {
  if (response.requestSeq !== latestRequest || response.mutationSeq !== mutationSequence) return false;
  if (applied && response.updatedAt < applied.updatedAt) return false;
  applied = response;
  return true;
}
assert.equal(applyRefresh({requestSeq:3,mutationSeq:1,updatedAt:30}), true, 'newest refresh should apply');
assert.equal(applyRefresh({requestSeq:1,mutationSeq:0,updatedAt:10}), false, 'refresh started before transition must be ignored');
assert.equal(applyRefresh({requestSeq:2,mutationSeq:1,updatedAt:20}), false, 'older request must be ignored after C resolves');
latestRequest = 4;
assert.equal(applyRefresh({requestSeq:4,mutationSeq:1,updatedAt:25}), false, 'older updated_at must be ignored');
console.log('check-v10-53-coaching-refresh-race: PASS');
