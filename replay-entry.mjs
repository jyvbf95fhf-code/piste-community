/** Pure visibility/state rules for the Replay entry point. */
const ACTIVE_STATUSES = Object.freeze(['active', 'live', 'in_progress', 'ongoing']);
const COACHING_WAITING_STATUSES = Object.freeze(['waiting']);

export function replayEntryState(row = {}, type = '') {
  const status = String(row?.status || '').trim().toLowerCase();
  const active = ACTIVE_STATUSES.includes(status) || (type === 'coaching' && COACHING_WAITING_STATUSES.includes(status));
  return {
    visible: true,
    disabled: active,
    label: active ? 'Replay disponible après la fin de la piste' : '▶ Replay de la piste'
  };
}
