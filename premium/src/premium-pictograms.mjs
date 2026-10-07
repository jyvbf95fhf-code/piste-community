// A shared fine-line trail vocabulary, reserved for coaching and track creation.
const drawings={
 modeNormal:'<circle cx="9" cy="30" r="3"/><circle cx="31" cy="10" r="3"/><path d="M9 24c0-12 22 4 22-8"/><path class="pictogram-accent" d="m18 25 3 3 6-8"/><path d="M5 9h10M10 4v10" opacity=".35"/>',
 modeSimple:'<circle cx="9" cy="29" r="3"/><circle cx="31" cy="11" r="3"/><path d="M9 23c0-8 8-4 12-6" stroke-dasharray="2 3"/><path d="M22 17c4-1 9 3 9-1"/><path class="pictogram-accent" d="M5 11c3-5 7-5 10 0m-8 2 6-6"/><path d="M25 28h10m-5-5v10" opacity=".4"/>',
 modeDouble:'<circle cx="9" cy="29" r="3"/><circle cx="31" cy="11" r="3"/><path d="M9 23c0-12 22 4 22-7" stroke-dasharray="2 3"/><path d="m5 9 4 4 4-4m14 21 4 4 4-4"/><path class="pictogram-accent" d="M18 9v22" opacity=".45"/>',
 terrainDirect:'<path d="m4 31 9-13 6 7 7-14 10 20" opacity=".4"/><circle cx="8" cy="31" r="2.5"/><path d="M8 25c1-9 17 2 20-9"/><path class="pictogram-accent" d="m24 7 6 3-6 3"/><path d="M30 10v9"/>',
 trackPrepared:'<path d="m5 11 10-4 10 4 10-4v24l-10 4-10-4-10 4Z" opacity=".4"/><path d="M15 7v24m10-20v24" opacity=".3"/><circle cx="10" cy="25" r="2.5"/><path d="M10 20c4-10 15 6 20-2"/><path class="pictogram-accent" d="m25 17 3 3 6-7"/>',
 gpxImport:'<path d="M10 4h14l7 7v24H10Zm14 0v8h7" opacity=".5"/><path d="M16 29c0-11 10 1 10-9" stroke-dasharray="2 3"/><circle cx="16" cy="30" r="2"/><path class="pictogram-accent" d="M5 12v10m-4-4 4 4 4-4"/>',
 trackNone:'<circle cx="10" cy="29" r="3"/><path d="M10 23c2-12 18 6 20-8" stroke-dasharray="2 4" opacity=".65"/><path d="M26 7h9m-4.5-4.5v9" class="pictogram-accent"/><path d="M7 9h8M11 5v8" opacity=".3"/>',
 roleCoach:'<circle cx="13" cy="11" r="4"/><path d="M5 30v-4a8 8 0 0 1 16 0v4" opacity=".65"/><path d="M24 9c7 0 11 4 11 10m-11-5c4 0 6 2 6 5"/><path class="pictogram-accent" d="m24 30 3-6 3 4 5-9"/><path d="M5 35h30" opacity=".3"/>',
 roleTracer:'<circle cx="8" cy="30" r="3"/><path d="M8 24c0-8 20 2 22-7"/><path d="m17 12 12-9 5 5-12 9-7 2Zm12-9 5 5M17 12l5 5"/><path class="pictogram-accent" d="M27 29h8m-4-4v8"/>',
 roleDriver:'<path d="m16 16-2-11 8 7 7-7 1 12 6 4-2 5-7 2-4 7-10-3"/><path d="m21 18 4-1m5 5h4M19 24l6 4"/><circle cx="6" cy="12" r="3"/><path d="M2 31v-9a5 5 0 0 1 8-4m1 7 8 1" class="pictogram-accent"/>',
 roleObserver:'<path d="M4 19c9-12 23-12 32 0-9 12-23 12-32 0Z" opacity=".65"/><circle cx="20" cy="19" r="5"/><path class="pictogram-accent" d="M8 33h24" stroke-dasharray="2 4"/><path d="M18 5h4m-4 28h4" opacity=".3"/>',
 trackBuilder:'<path d="M5 7h30v28H5Z" opacity=".25"/><circle cx="11" cy="28" r="2.5"/><path d="M11 23c0-12 12 5 16-7"/><path class="pictogram-accent" d="m22 12 9-9 5 5-9 9-6 1Zm9-9 5 5"/><path d="M5 17h7m5 11v7" opacity=".25"/>'
};
export function PremiumPictogram(name) {
 return `<svg class="icon premium-pictogram" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${drawings[name] || drawings.trackBuilder}</svg>`;
}
