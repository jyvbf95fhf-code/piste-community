import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCommunityPublication} from '../src/community-publication.mjs';
import {accountCommunitySourceOptions,recordedCommunityCorridor} from '../src/community-sources.mjs';
const polygon=[{x:7.1,y:48.1},{x:7.2,y:48.1},{x:7.2,y:48.2}];
const map={coordinateSpace:'wgs84',segments:[[{x:7.1,y:48.1},{x:7.2,y:48.2}]],corridor:{provenance:'estimated',polygons:[polygon]}};
test('shared corridor geometry is preserved by publication validation',()=>{const result=normalizeCommunityPublication({attachment:{type:'session',sourceId:'s1',fields:{map}}});assert.deepEqual(result.attachment.fields.map.corridor,map.corridor);});
test('malformed corridor is rejected',()=>{const broken=structuredClone(map);broken.corridor.polygons[0][0].x=999;assert.throws(()=>normalizeCommunityPublication({attachment:{type:'session',sourceId:'s1',fields:{map:broken}}}));});
test('no corridor is invented when source has no stored polygons',()=>{const src=accountCommunitySourceOptions({operational:[{kind:'operational',id:'s1',status:'Terminée',trace:[{space:'wgs84',x:7.1,y:48.1},{space:'wgs84',x:7.2,y:48.2}],olfactoryCorridor:{enabled:true}}]});assert.equal(src[0]?.data.map?.corridor,undefined);});

test('recorded OPS weather and GPS generate the same estimated corridor boundaries',()=>{
 const t=Date.parse('2026-11-22T09:00:00Z');
 const source={olfactoryCorridor:{enabled:true},gpsTrack:{segments:[[{latitude:48.1,longitude:7.1,timestamp:t},{latitude:48.1005,longitude:7.1005,timestamp:t+60000}]]},weatherSnapshot:{wind_speed_kmh:12,wind_direction_deg:270,observedAt:t,source:'Open-Meteo'}};
 const result=recordedCommunityCorridor(source);
 assert.ok(result?.polygons?.length>0);
 assert.equal(result.provenance,'estimated');
});
test('missing recorded wind never creates a corridor',()=>{
 const t=Date.parse('2026-11-22T09:00:00Z');
 const source={olfactoryCorridor:{enabled:true},gpsTrack:{segments:[[{latitude:48.1,longitude:7.1,timestamp:t},{latitude:48.1005,longitude:7.1005,timestamp:t+60000}]]}};
 assert.equal(recordedCommunityCorridor(source),null);
});

test('completed OPS publication uses actual GPS segments instead of missing trace',()=>{
 const t=Date.parse('2026-11-22T09:00:00Z');
 const sources=accountCommunitySourceOptions({operational:[{id:'ops-gps',kind:'operational',status:'Archivée',gpsTrack:{segments:[[{latitude:48.1,longitude:7.1,timestamp:t},{latitude:48.2,longitude:7.2,timestamp:t+60000}]]}}]});
 assert.deepEqual(sources[0].data.map.segments,[[{x:7.1,y:48.1},{x:7.2,y:48.2}]]);
});
