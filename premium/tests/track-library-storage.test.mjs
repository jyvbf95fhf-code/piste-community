import {test} from 'node:test';import assert from 'node:assert/strict';
import {createTrackLibrary} from '../src/track-library.mjs';
const storage=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),values};};
const route={name:'Parcours sauvegardé',description:'Test',geometry:{points:[{id:'d',x:7,y:48,space:'wgs84',kind:'start'},{id:'a',x:7.01,y:48.01,space:'wgs84',kind:'arrival'}]}};
test('saved tracks survive reload with metadata and geometry; profiles stay separate',()=>{
 const s=storage(),a=createTrackLibrary({storage:s,ownerId:'alice'}),t=a.createPrepared(route),reload=createTrackLibrary({storage:s,ownerId:'alice'});
 assert.deepEqual(reload.get(t.id),t);assert.throws(()=>createTrackLibrary({storage:s,ownerId:'bob'}).get(t.id));
 const duplicate=reload.duplicatePrepared(t.id);assert.notEqual(duplicate.id,t.id);reload.rename(t.id,'Modifié');reload.remove(duplicate.id);
 const final=createTrackLibrary({storage:s,ownerId:'alice'});assert.equal(final.get(t.id).name,'Modifié');assert.throws(()=>final.get(duplicate.id));
});
test('storage failure keeps draft library unchanged and never reports persisted success',()=>{
 const s=storage(),l=createTrackLibrary({storage:s,ownerId:'alice'}),t=l.createPrepared(route);s.setItem=()=>{throw Error('Quota');};
 assert.throws(()=>l.rename(t.id,'Perdu'),/enregistr|sauvegard/i);assert.equal(l.get(t.id).name,t.name);assert.throws(()=>l.remove(t.id));assert.deepEqual(l.get(t.id),t);
});
test('corrupted or mismatched snapshots are ignored without overwriting stored data',()=>{
 const s=storage(),l=createTrackLibrary({storage:s,ownerId:'alice'});l.createPrepared(route);const key=[...s.values.keys()][0];const payload=JSON.parse(s.values.get(key));payload.ownerId='bob';s.values.set(key,JSON.stringify(payload));
 const restored=createTrackLibrary({storage:s,ownerId:'alice'});assert.equal(restored.list().filter(x=>x.ownerId==='self').length,0);assert.match(restored.persistenceWarning(),/sauvegarde|restaur/i);
 assert.equal(JSON.parse(s.values.get(key)).ownerId,'bob');
});
test('edited geometry survives reload and failed creation does not consume an identifier',()=>{
 const s=storage(),l=createTrackLibrary({storage:s,ownerId:'alice'}),t=l.createPrepared(route);
 const updated=l.updatePrepared(t.id,{notes:'Repère',geometry:{points:[route.geometry.points[0],{...route.geometry.points[1],x:7.02}]}});
 assert.deepEqual(createTrackLibrary({storage:s,ownerId:'alice'}).get(t.id),updated);
 const write=s.setItem;s.setItem=()=>{throw Error('Quota');};assert.throws(()=>l.createPrepared(route));s.setItem=write;
 const retry=l.createPrepared(route);assert.equal(retry.id,'track-local-2');
});
test('unavailable or malformed storage never silently replaces saved data',()=>{
 assert.throws(()=>createTrackLibrary({ownerId:'alice'}).createPrepared(route),/non enregistré/);
 const s=storage();s.values.set('piste-v2-prepared-tracks:alice','{invalid');const l=createTrackLibrary({storage:s,ownerId:'alice'});
 assert.match(l.persistenceWarning(),/non restaurée/);assert.throws(()=>l.createPrepared(route));assert.equal(s.values.get('piste-v2-prepared-tracks:alice'),'{invalid');
});
