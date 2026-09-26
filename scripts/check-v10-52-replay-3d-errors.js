'use strict';
const assert = require('assert');

async function main(){
  const {mapErrorKind}=await import('../replay-3d-prototype.mjs');
  const dem=mapErrorKind({sourceId:'terrainSource',error:new Error('DEM tile unavailable')},{loaded:true});
  assert.strictEqual(dem.kind,'dem');
  assert.strictEqual(dem.fatal,false);
  const tile=mapErrorKind({sourceId:'osm',tile:{},error:new Error('tile network error')},{loaded:true});
  assert.strictEqual(tile.kind,'tile');
  assert.strictEqual(tile.fatal,false);
  const fatal=mapErrorKind({error:new Error('WebGL context lost')},{loaded:true});
  assert.strictEqual(fatal.kind,'fatal');
  assert.strictEqual(fatal.fatal,true);
  console.log('check-v10-52-replay-3d-errors: PASS');
}
main().catch(error=>{console.error(error);process.exitCode=1});
