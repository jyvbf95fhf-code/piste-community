import {test} from 'node:test';import assert from 'node:assert/strict';
const api=await import('../src/track-smart-service.mjs').catch(()=>({}));
const commune={code:'67125',name:'Epfig',center:[7.4675,48.3485]};
test('commune search encodes the name and validates real centers without sending identity',async()=>{
 assert.equal(typeof api.createSmartTrackService,'function');let url,options;const service=api.createSmartTrackService({fetch:async(u,o)=>{url=u;options=o;return {ok:true,json:async()=>[{nom:'Épfig',code:'67125',centre:{type:'Point',coordinates:commune.center}},{nom:'Bad',code:'00000',centre:{coordinates:[NaN,7]}}]};}});const rows=await service.searchCommunes('Épfig');assert.equal(rows.length,1);assert.deepEqual(rows[0].center,commune.center);assert.equal(new URL(url).searchParams.get('nom'),'Épfig');assert.equal(options.credentials,'omit');
});
test('network request is bounded to pedestrian ways, carries no account and reuses a local cache',async()=>{
 assert.equal(typeof api.createSmartTrackService,'function');let calls=0,url,options;const service=api.createSmartTrackService({fetch:async(u,o)=>{calls++;url=u;options=o;return {ok:true,json:async()=>({elements:[{type:'node',id:1,lat:48,lon:7}]})};}});await service.loadNetwork(commune,1);await service.loadNetwork(commune,1);assert.equal(calls,1);assert.equal(options.credentials,'same-origin');const params=new URL(url,'https://piste.test').searchParams;assert.equal(new URL(url,'https://piste.test').pathname,'/api/track-network');assert.equal(params.get('lat'),'48.3485');assert.equal(params.get('lon'),'7.4675');assert.equal(params.get('distanceKm'),'1');assert.doesNotMatch(url,/user|account|token|password/);
});
test('API failure and partial network data remain errors instead of fictitious proposals',async()=>{
 assert.equal(typeof api.createSmartTrackService,'function');await assert.rejects(api.createSmartTrackService({fetch:async()=>({ok:false,status:429})}).loadNetwork(commune,1),/indisponible/);await assert.rejects(api.createSmartTrackService({fetch:async()=>({ok:true,json:async()=>({remark:'timeout',elements:[]})})}).loadNetwork(commune,1),/incomplètes/);
});
