export const traceurOnly = [
  { lat: 48.1001, lon: 7.1001, recorded_at: '2026-01-01T10:00:00.000Z', accuracy_m: 8 },
  { lat: 48.1002, lon: 7.1002, recorded_at: '2026-01-01T10:00:05.000Z', accuracy_m: 9, speed_mps: 1.2 }
];

export const driverOnly = [
  { lat: 48.2001, lon: 7.2001, t: 1767261600, accuracy_m: 12 },
  { lat: 48.2002, lon: 7.2002, t: 1767261605000, accuracy_m: 11, speed_mps: 2.4 }
];

export const traceurAndDriver = {
  traceur: traceurOnly,
  driver: [
    { lat: 48.3001, lon: 7.3001, recorded_at: '2026-01-01T11:00:00.000Z' },
    { lat: 48.3002, lon: 7.3002, recorded_at: '2026-01-01T11:00:10.000Z' }
  ]
};

export const noTimestamps = [
  { lat: 48.4001, lon: 7.4001 },
  { lat: 48.4002, lon: 7.4002 }
];

export const invalidPoints = [
  { lat: 'not-a-latitude', lon: 7.5, recorded_at: '2026-01-01T12:00:00Z' },
  { lat: 48.5001, lon: 181, recorded_at: '2026-01-01T12:00:05Z' },
  { lat: 48.5002, lon: 7.5002, recorded_at: 'not-a-date' }
];

export const partialHistorical = {
  driver: [
    { lat: 48.6001, lon: 7.6001, recorded_at: '2025-01-01T08:00:00Z' },
    { lat: 48.6002, lon: 7.6002 }
  ],
  markers: [
    { lat: 48.6001, lon: 7.6001, marker_type: 'loss', created_at: '2025-01-01T08:00:03Z' }
  ]
};

export const events = {
  markers: [
    { id: 'm-loss', lat: 48.1, lon: 7.1, marker_type: 'loss', created_at: '2026-01-01T10:00:02Z' },
    { id: 'm-recovery', lat: 48.1, lon: 7.1, marker_type: 'recovery', created_at: '2026-01-01T10:00:08Z' }
  ],
  observations: [
    { id: 'o-1', text: 'observation', created_at: '2026-01-01T10:00:06Z' }
  ],
  messages: [
    { id: 'msg-1', body: 'message', created_at: '2026-01-01T10:00:07Z' }
  ]
};
