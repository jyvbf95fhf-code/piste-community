import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTrackLibrary} from '../src/track-library.mjs';
import {trackDraftMetrics,createTrackDraft,moveTrackPoint} from '../src/track-editor.mjs';
const api=await import('../src/track-smart-engine.mjs').catch(()=>({}));
export const commune={code:'67125',name:'Epfig',center:[7.4675,48.3485]};
export function network(){const elements=[];for(let y=0;y<9;y++)for(let x=0;x<9;x++)elements.push({type:'node',id:y*9+x+1,lon:7.46+x*.002,lat:48.34+y*.0014});let id=1000;for(let y=0;y<9;y++)for(let x=0;x<8;x++)elements.push({type:'way',id:id++,nodes:[y*9+x+1,y*9+x+2],tags:{highway:y<4?'residential':'track',surface:y%3===0?'asphalt':y%3===1?'gravel':'grass'}});for(let x=0;x<9;x++)for(let y=0;y<8;y++)elements.push({type:'way',id:id++,nodes:[y*9+x+1,(y+1)*9+x+1],tags:{highway:x<4?'residential':'path',surface:x%2?'grass':'asphalt'}});return {elements};}
test('intelligent generator returns distinct open routes close to requested distance on real connected edges',()=>{
 assert.equal(typeof api.generateSmartTracks,'function');const result=api.generateSmartTracks(network(),{commune,distanceKm:1.2,terrain:'mixed',transitions:'several'});assert.equal(result.length,3);
 for(const p of result){assert.ok(Math.abs(p.distanceM-1200)<=180);assert.notDeepEqual(p.coordinates[0],p.coordinates.at(-1));assert.equal(new Set(p.nodeIds).size,p.nodeIds.length);assert.ok(p.transitions>=2);assert.ok(p.knownSurfaceRatio>0.9);}
 assert.equal(new Set(result.map(p=>JSON.stringify(p.coordinates))).size,3);
});
test('unknown surfaces are never inferred as asphalt or counted as confirmed transitions',()=>{
 assert.equal(typeof api.generateSmartTracks,'function');const n=network();for(const e of n.elements)if(e.type==='way')delete e.tags.surface;
 const results=api.generateSmartTracks(n,{commune,distanceKm:1,terrain:'urban',transitions:'several'});assert.ok(results.length);for(const p of results){assert.equal(p.transitions,0);assert.equal(p.knownSurfaceRatio,0);assert.equal(p.transitionsSatisfied,false);}
});
test('private roads and disconnected geometry cannot create a proposed route',()=>{
 assert.equal(typeof api.generateSmartTracks,'function');const n=network();for(const e of n.elements)if(e.type==='way')e.tags.access='private';assert.deepEqual(api.generateSmartTracks(n,{commune,distanceKm:1,terrain:'mixed',transitions:'any'}),[]);
 assert.deepEqual(api.generateSmartTracks({elements:[{type:'node',id:1,lat:48,lon:7}]},{commune,distanceKm:1,terrain:'mixed',transitions:'any'}),[]);
});
test('generated route stays editable, saves and restores exact OSM geometry with Premium provenance',()=>{
 assert.equal(typeof api.smartTrackDraft,'function');const proposal=api.generateSmartTracks(network(),{commune,distanceKm:1,terrain:'mixed',transitions:'few'})[0],d=api.smartTrackDraft(proposal,commune);assert.equal(d.provenance,'smart-osm');assert.equal(d.points[0].kind,'start');assert.equal(d.points.at(-1).kind,'arrival');assert.ok(Math.abs(trackDraftMetrics(d).distanceEstimateMeters-proposal.distanceM)<1);
 const saved=new Map(),storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},lib=createTrackLibrary({storage,ownerId:'u'});const item=lib.createPrepared({name:d.name,notes:d.notes,provenance:d.provenance,geometry:{points:d.points}});const reloaded=createTrackLibrary({storage,ownerId:'u'}).get(item.id);assert.deepEqual(reloaded.geometry.points,item.geometry.points);assert.equal(reloaded.provenance,'smart-osm');assert.ok(createTrackDraft({track:reloaded}).points.length>1);
 const moved=moveTrackPoint(d,d.points.at(-1).id,{x:d.points.at(-1).x+.001,y:d.points.at(-1).y});assert.notEqual(moved.points.at(-1).x,d.points.at(-1).x);
});
test('distance and options are validated instead of silently clamped',()=>{assert.equal(typeof api.generateSmartTracks,'function');for(const distanceKm of [0,-1,NaN,11])assert.throws(()=>api.generateSmartTracks(network(),{commune,distanceKm,terrain:'mixed',transitions:'any'}));});
test('generic paved labels never imply a confirmed asphalt to paved transition',()=>{const n=network();for(const [i,e] of n.elements.entries())if(e.type==='way')e.tags.surface=i%2?'paved':'asphalt';const rows=api.generateSmartTracks(n,{commune,distanceKm:1,terrain:'mixed',transitions:'several'});assert.ok(rows.length);for(const r of rows)assert.equal(r.transitions,0);});
test('Corsican INSEE commune codes are accepted',()=>{assert.doesNotThrow(()=>api.generateSmartTracks(network(),{commune:{...commune,code:'2A004'},distanceKm:1,terrain:'mixed',transitions:'any'}));});
test('reversing the same corridor does not produce a second distinct proposal',()=>{const elements=[];for(let i=0;i<=10;i++)elements.push({type:'node',id:i+1,lon:7+i*.0014,lat:48});elements.push({type:'way',id:101,nodes:Array.from({length:11},(_,i)=>i+1),tags:{highway:'residential',surface:'asphalt'}});const rows=api.generateSmartTracks({elements},{commune,distanceKm:.9,terrain:'urban',transitions:'any'});assert.equal(rows.length,1);});
