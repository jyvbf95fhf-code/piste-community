import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCommunityPublication} from '../src/community-publication.mjs';
import {accountCommunitySourceOptions} from '../src/community-sources.mjs';
const polygon=[{x:7.1,y:48.1},{x:7.2,y:48.1},{x:7.2,y:48.2}];
const map={coordinateSpace:'wgs84',segments:[[{x:7.1,y:48.1},{x:7.2,y:48.2}]],corridor:{provenance:'estimated',polygons:[polygon]}};
test('shared corridor geometry is preserved by publication validation',()=>{const result=normalizeCommunityPublication({attachment:{type:'session',sourceId:'s1',fields:{map}}});assert.deepEqual(result.attachment.fields.map.corridor,map.corridor);});
test('malformed corridor is rejected',()=>{const broken=structuredClone(map);broken.corridor.polygons[0][0].x=999;assert.throws(()=>normalizeCommunityPublication({attachment:{type:'session',sourceId:'s1',fields:{map:broken}}}));});
test('no corridor is invented when source has no stored polygons',()=>{const src=accountCommunitySourceOptions({operational:[{kind:'operational',id:'s1',status:'Terminée',trace:[{space:'wgs84',x:7.1,y:48.1},{space:'wgs84',x:7.2,y:48.2}],olfactoryCorridor:{enabled:true}}]});assert.equal(src[0]?.data.map?.corridor,undefined);});
