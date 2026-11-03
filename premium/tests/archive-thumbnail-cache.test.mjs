import {test} from 'node:test';import assert from 'node:assert/strict';
const api=await import('../src/archive-thumbnail-cache.mjs').catch(()=>({}));
const segments=[[{latitude:48,longitude:7},{latitude:48.01,longitude:7.01}],[{latitude:49,longitude:8}]];
test('snapshot key includes rendered geometry, segment gaps and dimensions',async()=>{
 assert.equal(typeof api.thumbnailCacheKey,'function');const key=await api.thumbnailCacheKey(segments,74,84);assert.match(key,/^[a-f0-9]{64}$/);assert.equal(await api.thumbnailCacheKey(structuredClone(segments),74,84),key);
 for(const [points,w,h] of [[[segments.flat()],74,84],[segments,60,80],[[[{latitude:48,longitude:7.02}]],74,84]])assert.notEqual(await api.thumbnailCacheKey(points,w,h),key);
 assert.equal(await api.thumbnailCacheKey([[{latitude:900,longitude:7}]],74,84),null);
});
test('unavailable or denied local storage is a harmless cache miss',async()=>{
 assert.equal(typeof api.createArchiveThumbnailCache,'function');
 for(const indexedDB of [null,{open(){throw Error('storage blocked');}}]){
  const cache=api.createArchiveThumbnailCache({indexedDB});assert.equal(await cache.get('a','key'),null);assert.equal(await cache.put('a','key',new Blob(['x'],{type:'image/jpeg'})),false);
 }
});

test('cancelled cached-image decoding never evicts a valid snapshot',async()=>{
 const {mountArchiveMaps,destroyArchiveMaps}=await import('../src/archive-thumbnails.mjs');let owner='a',removed=0,ready;const waiting=new Promise(resolve=>ready=resolve);
 const el={dataset:{archiveMap:JSON.stringify(segments)},clientWidth:76,clientHeight:86,isConnected:true};
 const document={querySelectorAll:()=>[el],createElement:()=>({dataset:{},setAttribute(){},set src(value){ready(this);}})};
 const cache={get:async()=>new Blob(['valid raster'],{type:'image/jpeg'}),remove:async()=>removed++};
 mountArchiveMaps({document,L:null,IntersectionObserver:null,getOwnerId:()=>owner,cache});const img=await waiting;owner='b';img.onload();await new Promise(setImmediate);assert.equal(removed,0);destroyArchiveMaps();
});
