// Compare the generated markup, never the mounted DOM modified by Leaflet/place labels.
// Owner, URL and mounted root are part of the identity to prevent cross-screen reuse.
export function createArchiveRenderGuard(){
 let previous=null;
 return ({route,ownerId,html,root,force=false})=>{
  if(route.split('?')[0]!=='/tracks'||!ownerId){previous=null;return false;}
  const same=!force&&root?.isConnected===true&&previous?.root===root&&previous.route===route&&previous.ownerId===ownerId&&previous.html===html;
  previous={route,ownerId,html,root};
  return same;
 };
}
