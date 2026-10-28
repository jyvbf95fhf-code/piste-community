// Joining never changes the recording phase or the visibility policy.
export const coachingJoinPhases=Object.freeze(['PREPARATION','LAYING','TRACK_FINISHED','LAYING_WAIT','SEARCH_READY','SEARCH_RUNNING','SEARCH_FINISHED','DEBRIEF','ARCHIVED']);
export const canJoinCoaching=phase=>coachingJoinPhases.includes(phase);
export const targetedCoachingExpiresAt='9999-12-31T23:59:59.000Z';
