import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGpsTouchGuard,bindGpsTouchUnlock} from '../src/coaching-gps-touch-guard.mjs';
import {mountGpsMaps,destroyGpsMaps} from '../src/coaching-gps-screen.mjs';
const fixture=()=>{
 const handlers={},pending=new Map();let sequence=0,unlocks=0,capture=null;
 const button={dataset:{},addEventListener:(name,fn)=>handlers[name]=fn,setPointerCapture:id=>capture=id,hasPointerCapture:id=>capture===id,releasePointerCapture:()=>capture=null,getBoundingClientRect:()=>({left:0,right:200,top:0,bottom:60})};
 const guard=createGpsTouchGuard({onUnlock:()=>unlocks++,setTimeout:(fn,ms)=>{assert.equal(ms,2000);pending.set(++sequence,fn);return sequence;},clearTimeout:id=>pending.delete(id)});
 bindGpsTouchUnlock(button,guard);guard.lock();
 const send=(name,props={})=>{let prevented=false;handlers[name]({pointerId:1,button:0,isPrimary:true,clientX:30,clientY:30,preventDefault:()=>prevented=true,...props});return prevented;};
 return {send,button,pending,unlocks:()=>unlocks,capture:()=>capture};
};
test('a primary touch suppresses native gestures and holds capture for two seconds',()=>{
 const f=fixture();assert.equal(f.send('pointerdown'),true);assert.equal(f.capture(),1);assert.equal(f.pending.size,1);
 f.send('pointerdown',{pointerId:2,isPrimary:false});assert.equal(f.pending.size,1);
 [...f.pending.values()][0]();assert.equal(f.unlocks(),1);f.send('pointerup');assert.equal(f.capture(),null);
});
test('short release, cancellation and leaving the button never unlock',()=>{
 for(const end of ['pointerup','pointercancel','lostpointercapture','pointermove']){
  const f=fixture();f.send('pointerdown');f.send(end,{clientX:250});assert.equal(f.pending.size,0);assert.equal(f.unlocks(),0);
 }
});
test('Safari context menu is suppressed without cancelling the held touch',()=>{
 const f=fixture();f.send('pointerdown');assert.equal(f.send('contextmenu'),true);assert.equal(f.pending.size,1);
 [...f.pending.values()][0]();assert.equal(f.unlocks(),1);
});
test('mounted GPS cockpit unlocks after two seconds and restores controls without GPS mutation',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const listeners={},panel={hidden:true},child={inert:false},keyboard={addEventListener(){}};
 const button={addEventListener:(name,fn)=>listeners[name]=fn,focus(){},setPointerCapture(){},hasPointerCapture:()=>false};
 let click;
 const root={children:[child,panel],dataset:{},querySelector:selector=>selector==='.gps-touch-lock-panel'?panel:selector==='[data-gps-touch-unlock]'?button:selector==='[data-gps-touch-keyboard]'?keyboard:null,querySelectorAll:()=>[],addEventListener:(name,fn)=>{if(name==='click')click=fn;}};
 const gps={segments:[],distanceM:0,elapsedMs:0},before=JSON.stringify(gps);
 const element={dataset:{gpsPose:JSON.stringify(gps)},closest:()=>root};
 try{
  mountGpsMaps({document:{querySelectorAll:()=>[element]},L:null,livePose:gps});
  click({target:{closest:selector=>selector==='[data-gps="touch-lock"]'?{}:null}});
  assert.equal(panel.hidden,false);assert.equal(child.inert,true);
  listeners.pointerdown({pointerId:1,button:0,isPrimary:true,preventDefault(){}});
  t.mock.timers.tick(1999);assert.equal(panel.hidden,false);
  t.mock.timers.tick(1);assert.equal(panel.hidden,true);assert.equal(child.inert,false);
  assert.equal(JSON.stringify(gps),before);
 }finally{destroyGpsMaps();t.mock.timers.reset();}
});
