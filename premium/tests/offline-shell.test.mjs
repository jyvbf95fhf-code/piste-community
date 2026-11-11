import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
test('offline shell ignores APIs, mutations, tokens and external endpoints',async()=>{const events={},self={location:{origin:'https://app.test'},addEventListener:(name,fn)=>events[name]=fn};vm.runInNewContext(readFileSync(new URL('../sw.js',import.meta.url),'utf8'),{self,URL,Response});for(const request of [{method:'GET',mode:'navigate',url:'https://app.test/shared-track.html'},{method:'POST',url:'https://app.test/src/x.mjs'},{method:'GET',url:'https://app.test/api/route'},{method:'GET',url:'https://other.test/x'},{method:'GET',url:'https://app.test/?access_token=x'}]){let handled=false;events.fetch({request,respondWith(){handled=true}});assert.equal(handled,false);}assert.equal(events.message,undefined);});

test('precached photographs remain readable without network while API responses stay excluded',async()=>{
 const events={},origin='https://app.test',self={location:{origin},addEventListener:(name,fn)=>events[name]=fn};
 const source=readFileSync(new URL('../sw.js',import.meta.url),'utf8'),manifest=JSON.parse(readFileSync(new URL('../offline-assets.json',import.meta.url),'utf8'));
 const photos=manifest.files.filter(url=>/\.(webp|jpe?g)$/.test(url));assert.ok(photos.length>0);
 const cache={match:async request=>new Response('cached photograph')};
 vm.runInNewContext(source,{self,URL,Response,caches:{open:async()=>cache},fetch:async()=>{throw Error('offline');}});
 for(const pathname of [...photos,'/src/assets/test.jpeg']){let response;events.fetch({request:{method:'GET',mode:'cors',url:origin+pathname},respondWith(value){response=value;}});assert.ok(response,'must serve static photo '+pathname);assert.equal(await (await response).text(),'cached photograph');}
});
