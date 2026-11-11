// Visual trial only: routes and application permissions stay unchanged.
export function forestSceneForRoute(route='/') {
 const path=String(route).split(/[?#]/)[0];
 const under=root=>path===root||path.startsWith(root+'/');
 if(under('/profile/dogs')||under('/dogs'))return 'dogs';
 if(under('/live'))return 'live';
 if(under('/operational'))return 'ops';
 if(under('/jumolf')||under('/scientific'))return 'jumolf';
 if(under('/tracks')||under('/track-builder'))return 'tracks';
 if(under('/statistics'))return 'statistics';
 if(under('/new-session')||under('/coaching')||under('/sessions'))return 'coaching';
 if(under('/community')||under('/notifications')||under('/profile'))return 'community';
 return null;
}
