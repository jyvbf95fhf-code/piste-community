import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMockAuth,resolveMockRoute} from '../src/mock-auth.mjs';
const store=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),data};};
test('anonymous routes redirect, login persists, logout clears session',()=>{
 const storage=store(),auth=createMockAuth(storage);
 assert.equal(auth.getSession().authenticated,false);
 assert.equal(resolveMockRoute('/',auth.getSession()),'/auth');
 auth.signIn();
 assert.equal(resolveMockRoute('/',auth.getSession()),'/');
 assert.equal(createMockAuth(storage).getSession().user.name,'Sébastien');
 assert.equal(auth.getSession().user.permissions.admin,true);
 auth.signOut();
 assert.equal(createMockAuth(storage).getSession().authenticated,false);
});
test('signup persists only a standard mock profile, no credentials',()=>{
 const storage=store(),auth=createMockAuth(storage);
 auth.signUp({firstName:'Camille',email:'private@example.test',password:'secret'});
 assert.equal(auth.getSession().user.name,'Camille');
 assert.equal(auth.getSession().user.permissions.research,false);
 const saved=[...storage.data.values()].join('');
 assert.doesNotMatch(saved,/secret|private@example/);
});
test('invalid storage and unavailable storage safely return anonymous',()=>{
 const storage=store();storage.setItem('piste.v2.mock-session','broken');
 assert.equal(createMockAuth(storage).getSession().authenticated,false);
 const auth=createMockAuth({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}});
 auth.signIn();assert.equal(auth.getSession().authenticated,true);
 auth.signOut();assert.equal(auth.getSession().authenticated,false);
});
