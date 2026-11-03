# Premium archives and detected departure place

Approved in conversation: first recorded GPS point supplies commune/nearby address, visibly labelled Lieu détecté au départ; manual intervention address wins and remains editable in existing forms. Never infer person/context. Offline keeps actual coordinates and cached labels. No GPS means no invented place.

Mes pistes: compact heading/categories; one-line search; advanced filters collapsed by default; compact archive rows with real route thumbnail, title/dog/date/distance/duration, restrained OPS/Coaching/prepared colors and a secondary ⋮ menu. Retain all filters, sorting, bulk selection/deletion and existing destinations. Use blue night/cyan/gold and mobile 320/390/430. Numeric distances rounded sensibly.

Approach chosen: improve existing renderer/controllers rather than rebuild. Real aerial miniatures use local Leaflet and authorized device/prepared geometry only, lazily mounted to avoid loading every archive. If tiles fail, real route geometry remains. Place names use IGN reverse geocoding (falling back to the official commune boundary lookup when no street is identifiable) from the first accessible recorded GPS point, cached per account locally; no new GPS permission request, no SQL/Auth/RLS change. Never recover hidden Coaching pose geometry. Late responses cannot update another account or detached screen. Personal/location data remains outside generated or demo content.

Delivery: tested private preview for iPhone review; production stays on the previous fixes.

## Approved follow-up: compact top and correct collections
User requested less vertical space and four collections: Toutes combines sessions plus prepared tracks in chronological order; Opérationnelles contains only OPS; Entraînements contains all Coaching including explicitly linked training; Préparées remains. Domain provenance/classification in stored records stays unchanged. Return/title/refresh share one compact row, filters and selection share another. On phones Operational reads OPS with the full accessible label. Healthy sync status is compact and all warning/error states remain visible. Preview only.
