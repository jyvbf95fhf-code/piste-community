const matchesRoute = (route, root) => route === root || route.startsWith(`${root}/`);

const routeThemes = [
  ['/new-session', 'coaching'],
  ['/coaching/session', 'coaching'],
  ['/qa/coaching', 'coaching'],
  ['/operational', 'operational'],
  ['/dogs', 'dogs'],
  ['/sessions', 'sessions'],
  ['/tracks', 'tracks'],
  ['/track-builder', 'tracks'],
  ['/community', 'community'],
  ['/live', 'coaching'],
  ['/notifications', 'community'],
  ['/science', 'science'],
  ['/scientific', 'science'],
  ['/jumolf', 'science'],
  ['/stats', 'analytics'],
  ['/admin', 'analytics'],
];

export function themeForRoute(route = '/') {
  const normalized = `/${String(route).split('?')[0].split('#')[0].split('/').filter(Boolean).join('/')}`;
  if (normalized === '/') return 'home';
  if (normalized.startsWith('/live/ops/')) return 'operational';
  if (normalized.startsWith('/live/coaching/')) return 'coaching';
  return routeThemes.find(([root]) => matchesRoute(normalized, root))?.[1] || 'base';
}
