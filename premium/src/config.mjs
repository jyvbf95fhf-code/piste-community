export const PROTOTYPE_MODE = true;
export const MOCK_SCENARIO = 'terrain-morning';
export function debugSnapshot(route = location.pathname) {
  return Object.freeze({ route, prototypeMode: PROTOTYPE_MODE, mockScenario: MOCK_SCENARIO });
}
