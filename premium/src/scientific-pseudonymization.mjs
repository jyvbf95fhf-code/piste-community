function hash(value) {
  let result=2166136261;
  for(const char of String(value)) result=Math.imul(result ^ char.charCodeAt(0),16777619)>>>0;
  return result>>>0;
}

function createMap(keys=[], namespace='', minimum=100, width=3) {
  const sorted=[...new Set(keys.map(String))].sort();
  const capacity=10**width-minimum;
  if(sorted.length>capacity) throw new RangeError('Trop de clés pour l’espace de pseudonymes configuré.');
  const offset=hash(namespace)%capacity;
  return new Map(sorted.map((key,index)=>[key,String(minimum+((offset+index)%capacity)).padStart(width,'0')]));
}

export function createStablePseudonymizer({namespace='scientific-corpus-v1',registry={}}={}) {
  const contributors=createMap(registry.contributors||[],`${namespace}:handler`,100,3);
  const dogs=createMap(registry.dogs||[],`${namespace}:dog`,100,3);
  const sessions=createMap(registry.sessions||[],`${namespace}:session`,10000,5);
  const resolve=(map,key,kind,width,minimum)=>{
    const stable=String(key);
    if(map.has(stable)) return map.get(stable);
    return String(minimum+(hash(`${namespace}:${kind}:${stable}`)%(10**width-minimum))).padStart(width,'0');
  };
  return Object.freeze({
    contributorId:key=>`HANDLER-${resolve(contributors,key,'handler',3,100)}`,
    dogId:key=>`DOG-${resolve(dogs,key,'dog',3,100)}`,
    sessionId:key=>`SCI-SESSION-${resolve(sessions,key,'session',5,10000)}`
  });
}
