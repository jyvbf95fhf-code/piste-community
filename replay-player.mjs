function finiteTimestamp(value) {
  return Number.isFinite(value) ? value : null;
}

function interpolateValue(a, b, ratio, key) {
  if (!Number.isFinite(a?.[key]) || !Number.isFinite(b?.[key])) return undefined;
  return a[key] + (b[key] - a[key]) * ratio;
}

/** Return a visual-only position at an absolute replay timestamp. */
export function sampleReplayTrackAt(points, timestamp) {
  const track = (Array.isArray(points) ? points : []).filter(point => finiteTimestamp(point?.timestamp));
  if (!track.length || !Number.isFinite(timestamp) || timestamp < track[0].timestamp) return null;
  if (timestamp >= track[track.length - 1].timestamp) return { ...track[track.length - 1], timestamp };
  let low = 0;
  let high = track.length - 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (track[middle].timestamp <= timestamp) low = middle;
    else high = middle;
  }
  const from = track[low];
  const to = track[high];
  const span = to.timestamp - from.timestamp;
  const ratio = span > 0 ? (timestamp - from.timestamp) / span : 0;
  const result = {
    ...from,
    timestamp,
    lat: from.lat + (to.lat - from.lat) * ratio,
    lon: from.lon + (to.lon - from.lon) * ratio
  };
  for (const key of ['altitude', 'speed', 'heading', 'accuracy']) {
    const value = interpolateValue(from, to, ratio, key);
    if (value !== undefined) result[key] = value;
  }
  return result;
}

function nowMs() {
  return typeof performance?.now === 'function' ? performance.now() : Date.now();
}

function requestFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === 'function') return globalThis.requestAnimationFrame(callback);
  return setTimeout(() => callback(nowMs()), 16);
}

function cancelFrame(id) {
  if (typeof globalThis.cancelAnimationFrame === 'function') globalThis.cancelAnimationFrame(id);
  else clearTimeout(id);
}

export function createReplayPlayer(dataset, options = {}) {
  const tracks = dataset?.tracks || {};
  const capabilities = dataset?.capabilities || {};
  const startTimestamp = finiteTimestamp(capabilities.startTimestamp);
  const endTimestamp = finiteTimestamp(capabilities.endTimestamp);
  const duration = startTimestamp !== null && endTimestamp !== null ? Math.max(0, endTimestamp - startTimestamp) : 0;
  const listeners = new Set();
  if (typeof options.onUpdate === 'function') listeners.add(options.onUpdate);
  let currentTime = startTimestamp ?? 0;
  let playing = false;
  let frameId = null;
  let previousFrame = null;
  let playbackRate = 1;

  const snapshot = () => {
    const positions = {};
    for (const actor of ['traceur', 'driver']) positions[actor] = sampleReplayTrackAt(tracks[actor], currentTime);
    return {
      currentTime,
      duration,
      progress: duration ? Math.max(0, Math.min(1, (currentTime - (startTimestamp ?? 0)) / duration)) : 0,
      playing,
      positions
    };
  };
  const emit = () => {
    const state = snapshot();
    listeners.forEach(listener => listener(state));
    return state;
  };
  const stopFrame = () => {
    if (frameId !== null) cancelFrame(frameId);
    frameId = null;
  };
  const finish = () => {
    stopFrame();
    playing = false;
    previousFrame = null;
    emit();
  };
  const frame = timestamp => {
    if (!playing) return;
    const currentFrame = Number.isFinite(timestamp) ? timestamp : nowMs();
    const delta = previousFrame === null ? 0 : Math.max(0, currentFrame - previousFrame);
    previousFrame = currentFrame;
    currentTime = Math.min(endTimestamp ?? currentTime, currentTime + delta * playbackRate);
    emit();
    if (endTimestamp !== null && currentTime >= endTimestamp) finish();
    else frameId = requestFrame(frame);
  };
  return {
    play() {
      if (playing || !capabilities.replayAvailable || startTimestamp === null) return false;
      if (endTimestamp !== null && currentTime >= endTimestamp) currentTime = startTimestamp;
      playing = true;
      previousFrame = null;
      emit();
      frameId = requestFrame(frame);
      return true;
    },
    pause() {
      if (!playing) return false;
      playing = false;
      previousFrame = null;
      stopFrame();
      emit();
      return true;
    },
    seek(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return false;
      const target = numeric >= (startTimestamp ?? 0) ? numeric : (startTimestamp ?? 0) + numeric;
      currentTime = Math.max(startTimestamp ?? 0, Math.min(endTimestamp ?? target, target));
      previousFrame = null;
      emit();
      return true;
    },
    setPlaybackRate(rate) {
      const numeric = Number(rate);
      if (!Number.isFinite(numeric) || numeric <= 0) return false;
      playbackRate = numeric;
      previousFrame = null;
      emit();
      return true;
    },
    reset() {
      playing = false;
      previousFrame = null;
      stopFrame();
      currentTime = startTimestamp ?? 0;
      emit();
      return true;
    },
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    destroy() {
      playing = false;
      previousFrame = null;
      stopFrame();
      listeners.clear();
    },
    get currentTime() { return currentTime; },
    get duration() { return duration; },
    get isPlaying() { return playing; },
    get playbackRate() { return playbackRate; },
    snapshot
  };
}
