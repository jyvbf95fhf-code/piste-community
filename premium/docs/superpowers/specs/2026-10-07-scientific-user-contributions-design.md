# Scientific User Contributions — Design Specification

**Status:** Draft for user review
**Date:** 2026-10-07
**Scope:** Local mock contribution consent, pseudonymized scientific corpus, and user/scientific interfaces.

## 1. Goal

Prepare a mock/local product flow through which a user may explicitly authorize selected categories of synthetic session data for a pseudonymized scientific corpus. The Scientific Private Space may analyze only projections built from those grants. The existing longitudinal JUMOLF dataset of 150 synthetic sessions remains a separate demonstration dataset and is never merged with the contribution corpus.

This design is a product simulation. It does not claim legal compliance, guaranteed anonymization, or scientific validation.

## 2. Non-goals and permanent boundaries

- No backend, Supabase, SQL, RLS, real Auth, remote storage, payment, or external service.
- No real user data, real multi-user contribution, real GPS, real weather, or remote AI.
- No complete Admin console.
- No edits to Coaching, OPS, Sessions, Dogs, or their business stores.
- No changes to the existing 150-session JUMOLF synthetic dataset or its analyses.
- No commits, pushes, merges, tags, or deployment in this work.

All new contributors and contribution sessions are synthetic fixtures. Runtime consent edits and audit events live in memory for the current app session only.

## 3. Product principles

1. Consent is OFF by default. Participation and every data category are independent choices; first-time category controls are unchecked.
2. Refusing or withdrawing does not remove any core PISTE functionality.
3. Consent can only be granted or changed by the contributor’s own mock user flow. Researcher, scientific owner, and Admin actions cannot grant consent on someone else’s behalf.
4. The scientific corpus contains only explicit pseudonymized projections. It never receives a complete source session object.
5. Scientific views use stable pseudonyms and do not display names, emails, internal IDs, or direct identity mappings.
6. OPS sharing is a separate, stricter opt-in and remains OFF by default.
7. Small or distinctive groups are suppressed or coarsened before scientific results are rendered.
8. Provenance, synthetic status, consent category, inclusion reason, and data quality travel with every projected field where applicable.
9. Revocation changes current eligibility immediately. Historical analysis records may remain for local reproducibility, clearly marked as based on a contribution that has since been revoked.

## 4. Architecture: three bounded blocks

### 4.1 Consent and governance

Owns the contributor’s current consent view, append-only consent history, per-session inclusion choices, mock researcher roles, and a local governance audit journal. It exposes read-only consent snapshots to projection and corpus code. It does not own scientific analyses or business session models.

### 4.2 Pseudonymization and corpus

Owns synthetic contributor fixtures, deterministic stable pseudonyms, a whitelist-only session projection, OPS field policy, corpus construction, group aggregation, and re-identification risk suppression. Corpus inputs are synthetic contribution fixtures only; the existing JUMOLF longitudinal dataset is not an input.

### 4.3 Interfaces

Adds the contributor-facing research settings and data summary under Profile, plus a Corpus area under `/scientific`. Existing scientific tools may link to or filter the new corpus, but their current dataset view and calculations remain unchanged in this phase. Profile and Corpus screens state “Simulation de corpus scientifique” and “Données synthétiques / Démonstration”.

## 5. Consent model

### 5.1 Current consent snapshot

The current mock consent snapshot is derived from an append-only sequence of events. The projection layer consumes a detached snapshot with this conceptual shape:

```js
{
  consentId,
  mockUserId,
  participationEnabled: false,
  status,                // disabled | active | partial | withdrawn
  consentVersion,        // "scientific-consent-v1"
  grantedAt,
  revokedAt,
  updatedAt,
  source,                // "user-settings"
  categories: {
    training_session: false,
    gps_trace: false,
    weather: false,
    dog_metrics: false,
    field_events: false,
    longitudinal_history: false,
    reference_trace: false,
    jumolf_feedback: false,
    driver_annotations: false
  },
  opsCategories: {
    tracking_metrics: false,
    pseudonymized_trace: false,
    non_sensitive_events: false,
    weather: false,
    track_age: false,
    generic_environment: false
  }
}
```

All category values initialize to `false`, including after the user presses “Participer”. Participation records explicit intent to configure sharing, but no field is projected until its category is enabled. OPS categories remain false unless individually enabled after a separate warning and confirmation.

The participation switch and the category controls are distinct. Turning participation ON appends a user event but leaves every category OFF until the user enables each one. The model therefore never infers category permission from the participation switch.

Derived status rules:

- `disabled`: participation is OFF.
- `active`: participation is ON and all offered non-OPS categories are enabled.
- `partial`: participation is ON and zero or some, but not all, categories are enabled. With zero enabled categories, the UI states `Aucune catégorie autorisée` and the projector emits no data.
- `withdrawn`: the most recent user action withdrew participation; all current categories are treated as OFF.

OPS status is shown independently as `OPS : Non partagé` or `OPS : Partagé partiellement` according to selected OPS categories. OPS permission never follows from general participation.

### 5.2 Consent categories

Each category is independently toggleable and has plain-language explanation in the UI:

| Category key | User-facing category | Projection scope |
| --- | --- | --- |
| `training_session` | Données de session d’entraînement | Generic type, coarse date period, and session eligibility metadata |
| `gps_trace` | Traces GPS | Pseudonymized, spatially coarsened training trace only |
| `weather` | Météo | Available weather fields with source and quality |
| `dog_metrics` | Métriques du chien | Whitelisted derived metrics attached to a pseudonymous dog |
| `field_events` | Événements terrain | Allowlisted event kinds and coarse timing |
| `longitudinal_history` | Historique longitudinal | Stable pseudonymous dog linkage and coarse time periods |
| `reference_trace` | Données de référence / traceur | Pseudonymized reference geometry only when separately authorized |
| `jumolf_feedback` | Feedback JUMOLF | Explicit evaluation values, not free-form identity-bearing context |
| `driver_annotations` | Annotations du conducteur | OFF by default; included only through this dedicated category |

The first consent screen contains no prechecked category. “Participer” and “Ne pas participer” have equal prominence and are equally easy to select.

### 5.3 OPS consent

The OPS warning is always shown before OPS category settings:

> Les missions opérationnelles peuvent contenir des informations sensibles. Elles ne sont jamais incluses automatiquement dans le corpus scientifique.

OPS-specific categories are OFF by default and independent:

- `tracking_metrics`: aggregate distance, duration, pause totals, and available quality.
- `pseudonymized_trace`: spatially coarsened trace with no precise coordinates.
- `non_sensitive_events`: only allowlisted event kinds, without free-text notes.
- `weather`: available synthetic/mock weather fields.
- `track_age`: rounded track-age bands, never exact disappearance time.
- `generic_environment`: broad environment classes only.

The OPS projection must never contain searched-person identity, address, phone, medical data, free text, sensitive photos/documents, private coordinates, operational risks, confidential context, or the complete mission object. These values are excluded by construction, not copied and then hidden.

### 5.4 Append-only history and versioning

Every user change appends an immutable event. Events include `consent_id`, mock user reference, event type, changed categories, consent version, source, and event time. Event types include `participation_enabled`, `category_enabled`, `category_disabled`, `ops_category_enabled`, `ops_category_disabled`, `session_excluded`, `session_restored`, and `participation_withdrawn`.

The current view is reconstructed by folding events in order. No change overwrites prior events. A later consent-policy version creates new events with a new version; it does not rewrite old history. Mock timestamps are deterministic/test-injected.

### 5.5 Withdrawal and session exclusion

`Retirer ma participation` opens a confirmation that explains the provisional product behavior:

- Future contributions stop immediately.
- Existing sessions not yet included in a corpus snapshot become ineligible.
- Previously generated local analysis/run records may remain for reproducibility, but carry a `contribution_revoked` marker and are excluded from new corpus builds.
- This is a prototype governance model, not a legal promise.

Each candidate session has an inclusion state: `included`, `excluded_by_user`, `excluded_sensitive`, or `not_eligible`. User controls can change only eligible sessions between included and excluded. `excluded_sensitive` and `not_eligible` are system-controlled and cannot be overridden by the user or researcher.

## 6. Pseudonymization and identity separation

### 6.1 Stable identifiers

The local pseudonymizer deterministically maps synthetic source keys to stable display IDs:

- contributor: `HANDLER-NNN`
- dog: `DOG-NNN`
- session: `SCI-SESSION-NNNNN`

IDs remain stable across the in-memory corpus and longitudinal views for the same synthetic fixture. They are generated from internal synthetic fixture keys; real names, email addresses, and business-store IDs are never inputs. A deterministic test seed makes fixtures reproducible. Display IDs are not presented as anonymization guarantees.

### 6.2 Identity layer boundary

Contributor settings may know the current mock profile and its consent history. Scientific corpus rows contain only pseudonymous IDs and allowed projected fields. The corpus API has no reverse lookup, join key, or accessor for display identity. The fixture identity map remains in the contributor/governance side and is never passed into the scientific screen/controller.

The existing scientific role gate is extended conceptually to `scientific_owner`, `researcher`, and `scientific_reader`: Sébastien is `scientific_owner`, the demo ethologist is `researcher`, and a future reader fixture is `scientific_reader`. Roles grant corpus reading capabilities only; they do not imply contributor consent. Admin remains a future governance contract and cannot grant consent.

## 7. Whitelist projection contract

### 7.1 Interface

`projectSessionToScientificCorpus(session, consent, rules, sessionType)` returns either an explicit projected row or a structured exclusion result. It never spreads or clones the source session. It constructs a new object field by field from approved values.

The projection receives a detached source row, the contributor consent snapshot, session inclusion state, sensitivity rules, and pseudonymizer. For each projected field it retains:

- field value and unit, when applicable;
- source provenance;
- consent category that allowed it;
- quality/status;
- `synthetic: true`;
- `pseudonymized: true` for identity-linked values;
- inclusion reason.

If a category is denied, all fields in that category are omitted. Missing source values remain missing or explicitly unavailable; the projection never invents them.

### 7.2 Training sessions

Training sessions use only the opted-in categories. `training_session` controls whether an individual pseudonymous session row and session-level longitudinal link may exist. If it is OFF, independently enabled field categories may contribute only to a grouped aggregate without a session pseudonym or individual row; they are not silently upgraded into session-level sharing. If it is ON, opted-in field categories may be attached to that pseudonymous row. The interface explains this distinction.

Exact timestamps and precise location are not exposed in the multi-user corpus; permitted times are bucketed into coarse periods and permitted spatial traces are simplified/coarsened. Free-text annotations and feedback are excluded unless their dedicated categories are enabled. No source-only participant identity is included.

### 7.3 OPS sessions

OPS projection is a separate allowlist and separate function/policy. It accepts only the explicitly permitted OPS categories and returns a smaller schema than training projection. Exact times are reduced to time bands, track age rounded to a band, environment generalized, and geometry coarsened. It emits no mission title, description, free-form fields, or sensitive data even if present on the source fixture.

If a row is identified as OPS but has no explicit OPS category consent, the projection returns `excluded_sensitive` or `not_eligible` and no session data.

## 8. Synthetic multi-user fixtures and corpus

### 8.1 Fixture set

Create a separate deterministic demonstration fixture set containing approximately 10 synthetic contributors, multiple dogs and varied synthetic experience profiles. Fixtures exercise:

- no participation;
- full and partial non-OPS consent;
- GPS denied while weather allowed;
- annotations/feedback denied by default;
- OPS denied;
- explicitly partial OPS grant;
- revoked contribution;
- session-level user exclusion;
- system sensitivity exclusion.

Every fixture record is visibly marked synthetic. Fixtures do not import or reuse the 150-session longitudinal Nox dataset, the current user’s business stores, or real local session data.

### 8.2 Corpus build

`buildScientificContributionCorpus` consumes only the synthetic contributor fixtures, current consent event projections, session-inclusion decisions, and the whitelist projector. It returns a detached corpus with aggregate counts, pseudonymized rows, category availability, and provenance. It does not modify the source fixtures or existing scientific dataset.

Dashboard summary includes pseudonymous contributor count, pseudonymous dog count, eligible session count, training/OPS split, aggregate quality, available categories, and category consent rates. Counts are synthetic and are never described as actual user contributions.

### 8.3 Filters and cohorts

Corpus filters use pseudonymous dog ID, broad experience band, session type, generalized environment, rounded track-age band, weather bands, quality, and available consent categories. Identity fields are not available as filters.

Multi-dog cohorts support saved name and deterministic criteria in memory. Cohort comparison reports sample size, quality, spread/dispersion, missingness, and differences observed. It never ranks dogs or claims causality.

## 9. Re-identification risk and display thresholds

`assessReidentificationRisk` is a deterministic local policy check. Inputs include session count, dog count, criterion precision, OPS rarity, environment uniqueness, timestamp precision, and whether location remains spatially detailed.

Initial thresholds:

- Cross-dog cohort statistics and comparisons require at least 5 eligible sessions **and** at least 3 pseudonymous dogs.
- A pseudonymous longitudinal dog profile requires at least 5 eligible sessions for that dog; it uses coarse periods and suppresses rare context combinations.
- Results below threshold show `Échantillon insuffisant pour afficher ce résultat.`
- High-risk combinations show `Résultat masqué : groupe trop petit` or a coarsened aggregate.
- OPS rows are additionally time-bucketed, spatially coarsened, and cannot be browsed as precise individual mission records.

Threshold policy is applied before rendering and before exposing cohort result details to UI code. UI-only hiding is insufficient.

## 10. User interfaces and routes

### 10.1 Profile / privacy

Add an entry under profile privacy/research:

- `Contribuer à la recherche scientifique`
- explanation: `Vous pouvez choisir de partager certaines données de piste sous forme pseudonymisée afin de contribuer aux analyses scientifiques de PISTE Community.`
- equal-weight actions `Participer` and `Ne pas participer`;
- independent category controls, all OFF on first activation;
- separate OPS warning and category controls;
- status labels for participation, each enabled category, OPS, and last change;
- `Comment mes données sont utilisées` educational view;
- `Mes données de recherche` summary.

Routes:

- `/profile/research`: contribution switch, category and OPS settings.
- `/profile/research/data`: current sharing summary, eligible/excluded sessions, change history, and withdrawal flow.
- `/profile/research/transparency`: `Comment mes données sont utilisées` explanation.

These routes remain accessible to the mock user independently of scientific role access.

### 10.2 My research data

Show current status, authorized categories, eligible and excluded session counts, OPS state, last change, consent version, and append-only history. Provide `Modifier mes autorisations`, `Exclure cette session`, and `Retirer ma participation`. Withdrawal requires a neutral explanation/confirmation with equal clarity and no punitive wording.

### 10.3 Scientific corpus

Add `/scientific/corpus` and a dashboard entry `Corpus scientifique`. This screen is available only through existing authorized scientific access. It shows only pseudonymous/aggregate data, a permanent `Simulation de corpus scientifique` banner, category filters, cohort summary, and suppression explanations. It does not replace or merge the existing scientific dashboard dataset.

### 10.4 Responsive and accessible UI

The controls are usable at 320, 375, 390, and 430 px, and at 1024, 1280, and 1440 px. Every category has a visible label and explanation, focus behavior is keyboard accessible, status is never conveyed by color alone, and denial/withdrawal actions are at least as discoverable as participation.

## 11. Governance and audit

The mock audit log is append-only and records consent granted/changed/revoked, category changes, session exclusions, researcher access changes, and system sensitivity exclusions. It retains mock event time, actor role, affected pseudonymous record where appropriate, event type, and consent version.

Governance commands may suspend corpus inclusion, set an eligible session to `excluded_sensitive`, or revoke a researcher’s read access. There is deliberately no `consent_on_behalf_of_user` operation and no admin write path to a user’s consent categories.

## 12. Scientific access boundaries

The current `/scientific/*` gate remains authoritative. Mock roles map to view capabilities:

- `scientific_owner`: view corpus and manage local scientific workspace;
- `researcher`: view corpus and scientific workspace;
- `scientific_reader`: read-only corpus and scientific workspace.

None of these roles can read identity-layer data. The new contribution settings remain in the contributor’s Profile flow, not in the scientific role interface. A denied standard account sees the existing restricted-access experience and no corpus data.

## 13. Data flow

```text
Synthetic contributor fixtures
    ↓ user-controlled consent events + session inclusion decisions
Current consent snapshot (derived, OFF by default)
    ↓ field-by-field category checks
Whitelist projection ── OPS-specific stricter whitelist
    ↓ stable pseudonymization + provenance
Risk assessment and sample-threshold suppression
    ↓
Synthetic scientific contribution corpus
    ↓
Authorized scientific corpus screen (aggregate/pseudonymous only)
```

The separate 150-session JUMOLF longitudinal demo dataset is outside this flow.

## 14. Verification requirements

### Consent and governance

- Defaults and first activation leave every category OFF.
- Each category changes independently; OPS is separate and OFF by default.
- Every update appends a versioned event; prior events remain intact.
- Withdrawal turns off future inclusion and excludes unaggregated rows.
- Session exclusions are enforced before projection.
- Researcher/Admin cannot consent for a contributor.

### Projection and pseudonymization

- Projection returns only explicitly whitelisted fields and never spreads the source.
- Stable contributor, dog, and session pseudonyms repeat across builds for identical synthetic fixture keys.
- No real name/email/internal ID enters a scientific row.
- OPS poison fields (identity, address, phone, medical, free text, risk, photo/document, precise private coordinates) never appear in output.
- Category denial removes only that category’s fields; denied annotations and JUMOLF feedback remain absent.
- Provenance, quality, synthetic flag, pseudonymization flag, and inclusion reason are retained.
- Source fixtures and the existing 150-session dataset are unchanged.

### Corpus and disclosure controls

- Only eligible explicit-consent fixture projections enter the corpus.
- Withdrawn, non-consenting, excluded, and sensitive rows are absent from new builds.
- Aggregate counts, category rates, filters, cohorts, and comparisons are derived from projected rows.
- Minimum sample rules and risk checks suppress small/rare groups before UI data is returned.
- OPS aggregates use coarse time, environment, track-age, and geometry.
- No dog ranking or causal language is produced.

### UI and regression

- Participation OFF, category controls, OPS warning, data summary, exclusion, withdrawal, and transparency screens render and work.
- Scientific corpus dashboard and multi-dog filtering work for authorized mock roles; standard profile receives no corpus data.
- Mobile and desktop widths listed in section 10.4 have no horizontal overflow.
- No console errors, external requests, backend calls, or changes to JUMOLF/Coaching/OPS/session behavior.

## 15. Known limits

- All contributors, sessions, identities, consent, timestamps, and corpus rows are synthetic fixtures.
- In-memory edits reset when the page session ends; persistence is not part of this phase.
- Pseudonymization is not anonymization; real deployment requires dedicated privacy/security/legal review.
- Risk thresholds are product safeguards for this mock, not a guarantee against re-identification.
- No real researcher invitation, account management, Admin console, export, or cross-device synchronization exists.

## 16. Acceptance criteria

The design is accepted when a user can see and independently control OFF-by-default categories, explicitly opt into selected training/OPS fields, exclude a session, inspect current sharing and history, and withdraw; a deterministic whitelist projection can build a synthetic pseudonymized corpus from only eligible fixture records; scientific viewers see only pseudonymous/aggregated results after sample-risk checks; and the current JUMOLF dataset and all business stores remain untouched.
