import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommunityLiveService,projectCommunityLive} from '../src/server/community-live-service.mjs';
import {createCommunityFriendshipService} from '../src/server/community-friendship-service.mjs';
import {createCoachingHandler} from '../src/server/coaching-http.mjs';
const actor='11111111-1111-4111-8111-111111111111',owner='22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333';
const row=mode=>({id,owner_id:owner,version:4,state:{ownerId:owner,session:{mode,roles:{traceur:'secret',driver:owner},participants:[{id:'secret',name:'Secret tracer'}],preparation:{secret:true}},search:{phase:'SEARCH_RUNNING',gpsSearch:{actorId:'secret',segments:[[{latitude:1,longitude:2,accuracy:3,timestamp:4,private:'secret'}]]}},tracer:{gpsPose:{actorId:'secret',segments:[[{latitude:5,longitude:6}]]}},briefing:'secret',messages:['secret'],referenceProposal:'secret'}});
test('Live projection exposes permitted geometry and strips private fields',()=>{for(const mode of ['normal','simple_blind','full_blind']){const p=projectCommunityLive(row(mode),actor);assert.equal(p.readOnly,true);assert.equal(JSON.stringify(p).includes('secret'),false);assert.ok(p.pose);assert.ok(p.search);assert.equal('team' in p,false);}});
test('authenticated live handler rechecks authority on every read and rejects withdrawn read',async()=>{let allowed=true,calls=0;const admin={from(){const q={select(){return q;},eq(){return q;},async maybeSingle(){return {data:{id:actor,display_name:'Test',enabled:true}};}};return q;},async rpc(name,args){assert.equal(name,'community_live_sessions');assert.equal(args.p_actor,actor);calls++;return {data:allowed?[row('full_blind')]:[]};}};const handler=createCoachingHandler({admin,authClient:{auth:{async getUser(){return {data:{user:{id:actor}}};}}},socialLiveEnabled:true});const request=operation=>new Request('http://localhost',{method:'POST',headers:{authorization:'Bearer token'},body:JSON.stringify({operation,sessionId:id})});let response=await handler(request('community-live-read'));assert.equal(response.status,200);assert.ok((await response.json()).projection.pose);allowed=false;response=await handler(request('community-live-read'));assert.equal(response.status,403);assert.equal(calls,2);response=await handler(request('community-live-list'));assert.deepEqual(await response.json(),{version:1,sessions:[]});});
test('follow uses persisted RPC snapshot across new service instances',async()=>{let following=[];const admin={async rpc(name,args){if(name==='community_social_command'){following=args.p_action==='follow'?[args.p_peer]:[];return {data:{peerId:args.p_peer}};}assert.equal(name,'community_social_snapshot');return {data:{socialVersion:1,following,livePermissions:[],contacts:[],received:[],sent:[],relations:[]}};}};const command=action=>({action,peerId:owner,commandId:id,expectedVersion:-1});await createCommunityFriendshipService(admin,{socialLiveEnabled:true}).command(actor,command('follow'));assert.deepEqual((await createCommunityFriendshipService(admin,{socialLiveEnabled:true}).snapshot(actor)).following,[owner]);await createCommunityFriendshipService(admin,{socialLiveEnabled:true}).command(actor,command('unfollow'));assert.deepEqual((await createCommunityFriendshipService(admin,{socialLiveEnabled:true}).snapshot(actor)).following,[]);});
test('closed sessions return only an ended projection',async()=>{const closed=row('normal');closed.state.search.phase='DEBRIEF';const service=createCommunityLiveService({async rpc(){return {data:[closed]};}});assert.deepEqual(await service.list(actor),{version:1,sessions:[]});assert.deepEqual((await service.read(actor,id)).projection,{id,status:'ended',ended:true,readOnly:true,role:'observer',title:'Live terminé',ownerId:owner});});

test('full blind never exposes owner UUID, and safely identifies own session',async()=>{for(const viewer of [actor,owner]){const p=projectCommunityLive(row('full_blind'),viewer);assert.equal(p.ownerId,null);assert.equal(p.isOwner,viewer===owner);assert.equal(JSON.stringify(p).includes(owner),false);const service=createCommunityLiveService({async rpc(){return {data:[row('full_blind')]};}});const list=await service.list(viewer),read=await service.read(viewer,id);assert.equal(list.sessions.length,viewer===owner?0:1);if(viewer!==owner)assert.equal(list.sessions[0].isOwner,false);assert.equal(read.projection.isOwner,viewer===owner);assert.equal(JSON.stringify({list,read}).includes(owner),false);}});

test('all terminal phases and explicit owner departure end broadcast without leaking session state',async()=>{for(const phase of ['DEBRIEF','ARCHIVED','CANCELLED','INTERRUPTED','SEARCH_RUNNING']){const r=row('full_blind');r.state.search.phase=phase;if(phase==='SEARCH_RUNNING')r.state.session.control={departures:[{participantId:owner}]};const service=createCommunityLiveService({async rpc(){return {data:[r]};}});assert.deepEqual((await service.read(actor,id)).projection,{id,status:'ended',ended:true,readOnly:true,role:'observer',title:'Live terminé',ownerId:null});assert.deepEqual((await service.list(actor)).sessions,[]);}});
test('non-owner departure and ordinary active state keep live available; sanitized SQL tombstones stay minimal',async()=>{const r=row('normal');r.state.session.control={departures:[{participantId:actor}]};const service=createCommunityLiveService({async rpc(){return {data:[r]};}});assert.equal((await service.read(actor,id)).projection.search.segments.length,1);assert.equal((await service.list(actor)).sessions.length,1);const tombstone=createCommunityLiveService({async rpc(){return {data:[{id,status:'ended',ended:true,owner_id:null}]};}});assert.deepEqual((await tombstone.read(actor,id)).projection,{id,status:'ended',ended:true,readOnly:true,role:'observer',title:'Live terminé',ownerId:null});});

test('explicit broadcast marker returns geometry-free tombstone in every mode',async()=>{for(const mode of ['normal','simple_blind','full_blind']){const r=row(mode);r.state.liveEndedAt=Date.now();const service=createCommunityLiveService({async rpc(){return {data:[r]};}});assert.deepEqual((await service.read(actor,id)).projection,{id,status:'ended',ended:true,readOnly:true,role:'observer',title:'Live terminé',ownerId:mode==='full_blind'?null:owner});assert.deepEqual((await service.list(actor)).sessions,[]);}});

for(const mode of ['simple_blind','full_blind'])test(`${mode}: Live shares terrain from handoff with the Coach and permitted spectators`,()=>{
 const r=row(mode);
 r.state.members=[{id:actor,role:'coach'},{id:owner,role:'driver'}];
 r.state.search.phase='LAYING';
 assert.equal(projectCommunityLive(r,actor).map.gpsPose,null);
 r.state.search.phase='SEARCH_READY';
 r.state.search.gpsSearch=null;
 assert.ok(projectCommunityLive(r,actor).map.gpsPose);
 assert.equal(projectCommunityLive(r,actor).map.gpsSearch,null);
 r.state.search.phase='SEARCH_RUNNING';
 r.state.search.gpsSearch={segments:[[{latitude:1,longitude:2}]]};
 const coach=projectCommunityLive(r,actor);
 assert.ok(coach.map.showTracerMarker);
 assert.ok(coach.map.gpsSearch);
 assert.doesNotMatch(JSON.stringify(coach),/secret/);
 assert.equal(projectCommunityLive(r,owner).map.gpsPose,null);
 assert.equal(Boolean(projectCommunityLive(r,owner).map.gpsSearch),mode==='simple_blind');
 assert.ok(projectCommunityLive(r,'spectator').map.gpsPose);
 assert.ok(projectCommunityLive(r,'spectator').map.gpsSearch);
 assert.equal(projectCommunityLive(r,null).map.gpsPose,null);
 r.state.session.control={departures:[{participantId:actor}]};
 assert.equal(projectCommunityLive(r,actor).map.gpsPose,null);
});
