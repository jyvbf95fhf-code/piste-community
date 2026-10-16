// Three isolated browser contexts, synthetic identities, all HTTP intercepted.
import {chromium} from '@playwright/test';import chromiumBundle from '@sparticuz/chromium';
import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
import {createOpsPublication,reduceOpsPublication,readOpsPublication} from '../src/ops-live-publication.mjs';
import {at} from './helpers/ops-live-fixture.mjs';
let state=createOpsPublication({missionId:'mission',ownerId:'owner'}),commands=0;const errors=[],unexpected=[];
const browser=await chromium.launch({executablePath:process.env.PISTE_CHROMIUM_PATH||await chromiumBundle.executablePath(),args:process.env.PISTE_CHROMIUM_PATH?['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']:chromiumBundle.args,headless:true});
try{
 const pages={};
 for(const userId of ['owner','observer','stranger']){
  const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();pages[userId]=page;page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.origin!=='https://ops3a.test'){unexpected.push(url.href);return route.abort();}
   if(url.pathname==='/api'){
    try{const body=route.request().postDataJSON();let result;
     if(body.operation==='read')result=readOpsPublication(state,userId);
     else if(body.operation==='command'){state=reduceOpsPublication(state,{...body.command,actorId:userId},at+5000);commands++;result=state.sharing?readOpsPublication(state,userId):{version:state.version};}
     else throw Error('Unsupported simulated operation');
     return route.fulfill({json:result});
    }catch(e){return route.fulfill({status:e.status||400,json:{error:e.message}});}
   }
   if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width"><title>OPS 3A isolated QA</title><main>Composants OPS · serveur simulé</main>'});
   if(!/^\/(src|tests)\/[a-zA-Z0-9/_.-]+\.mjs$/.test(url.pathname)||url.pathname.includes('..'))return route.abort();
   try{return route.fulfill({contentType:'text/javascript',body:await readFile(new URL('..'+url.pathname,import.meta.url))});}catch{return route.fulfill({status:404,body:''});}
  });
  await page.goto('https://ops3a.test/');
  await page.evaluate(async user=>{
   const {createOpsLiveQueue,createOpsLiveClient}=await import('/src/ops-live-sync.mjs');
   const {projectOpsGpsLive}=await import('/src/ops-live-contract.mjs');const f=await import('/tests/helpers/ops-live-fixture.mjs');
   window.localMission=f.mission();window.policy=f.policy;window.project=()=>projectOpsGpsLive(window.localMission,window.policy);
   window.rpc=async body=>{if(window.simulateOffline)throw Error('Simulated offline');const r=await fetch('/api',{method:'POST',body:JSON.stringify(body)});const value=await r.json();if(!r.ok)throw Object.assign(Error(value.error),{status:r.status});return value;};
   window.queue=user==='owner'?createOpsLiveQueue({storage:localStorage,ownerId:user,missionId:'mission'}):null;
   window.client=createOpsLiveClient({request:window.rpc,queue:window.queue,clock:()=>f.at+5000});
  },userId);
 }
 const {owner,observer,stranger}=pages;
 const send=async(page,type,payload={})=>page.evaluate(async ({type,payload,version})=>rpc({operation:'command',command:{id:crypto.randomUUID(),expectedVersion:version,type,payload}}),{type,payload,version:state.version});
 const denied=page=>page.evaluate(async()=>{try{await client.refresh();return false;}catch(e){return e.status===403&&client.view().projection===null;}});
 assert.equal(await denied(observer),true);assert.equal(await denied(stranger),true);
 const frame=await owner.evaluate(()=>project());
 await send(owner,'publish',{frame,options:{showDog:true,showEvents:true}});
 await send(owner,'invite',{invitationId:'observer-invite',userId:'observer',expiresAt:at+10000});
 await assert.rejects(send(stranger,'join',{invitationId:'observer-invite'}),/Invitation/);
 await send(observer,'join',{invitationId:'observer-invite'});
 await observer.evaluate(()=>client.refresh());
 const p=await observer.evaluate(()=>client.view().projection);assert.equal(p.gpsTrack.segments.length,2);assert.equal(p.handlerName,null);assert.doesNotMatch(JSON.stringify(p),/SECRET/);
 await assert.rejects(send(observer,'close'),/Accès/);
 await owner.evaluate(()=>{simulateOffline=true;queue.append({generation:1,sequence:1,frame:project()});});
 await assert.rejects(owner.evaluate(()=>client.flush()),/offline/);assert.equal(await owner.evaluate(()=>queue.list().length),1);
 await owner.evaluate(()=>{simulateOffline=false;return client.flush();});assert.equal(await owner.evaluate(()=>queue.list().length),0);
 await send(owner,'revoke',{userId:'observer'});assert.equal(await denied(observer),true);
 await send(owner,'invite',{invitationId:'observer-again',userId:'observer',expiresAt:at+10000});await send(observer,'join',{invitationId:'observer-again'});
 await owner.evaluate(()=>queue.append({generation:1,sequence:2,frame:project()}));
 await send(owner,'close');await observer.evaluate(()=>client.refresh());assert.equal(await observer.evaluate(()=>client.view().projection.state),'Fin de piste');
 await assert.rejects(owner.evaluate(()=>client.flush()),/clôturée/);assert.equal(await owner.evaluate(()=>queue.list().length),1);
 await observer.evaluate(()=>client.disconnect());assert.equal(await observer.evaluate(()=>client.view().projection),null);
 await send(owner,'stop-sharing');assert.equal(await denied(stranger),true);
 assert.equal(await owner.evaluate(()=>localMission.gpsTrack.segments.flat().length),3);
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
 console.log(JSON.stringify({status:'PASS',contexts:3,viewport:'390x844',simulatedCommands:commands,scenarios:['sharing-off','recipient-bound-invite','read-only','gps-segments','private-fields','offline-retry','revocation','closure','late-update-rejected','disconnect','local-gps-preserved'],externalRequests:unexpected.length}));
}finally{await browser.close();}
