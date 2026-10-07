export function createHoldToUnlockController({
  durationMs = 2_000,
  schedule = (callback, delay) => setTimeout(callback, delay),
  cancelSchedule = handle => clearTimeout(handle),
  onProgress = () => {},
  onUnlock = () => {}
} = {}) {
  let timer = null;
  let pressed = false;
  let unlocked = false;

  const release = () => {
    if (!pressed || unlocked) return false;
    pressed = false;
    if (timer !== null) cancelSchedule(timer);
    timer = null;
    onProgress(0);
    return true;
  };

  return {
    press() {
      if (pressed || unlocked) return false;
      pressed = true;
      onProgress(1);
      timer = schedule(() => {
        if (!pressed || unlocked) return;
        pressed = false;
        unlocked = true;
        timer = null;
        onUnlock();
      }, durationMs);
      return true;
    },
    release,
    cancel: release,
    get pressed() { return pressed; },
    get unlocked() { return unlocked; }
  };
}
