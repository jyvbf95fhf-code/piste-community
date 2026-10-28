import test from 'node:test';
import assert from 'node:assert/strict';
import {createNotificationReceipts} from '../src/notification-receipts.mjs';
import {NotificationsScreen} from '../src/notifications-screen.mjs';
import {ScreenHeader} from '../src/components.mjs';

test('opening the center clears both badges and survives reload without removing notifications',()=>{
 const saved=new Map(),storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
 const rows=[{id:'one',read:false},{id:'two',read:false}];
 const receipts=createNotificationReceipts(storage);
 assert.equal(receipts.project('alice','ops',rows).filter(n=>!n.read).length,2);
 receipts.open('alice',[{source:'ops',items:rows}]);
 const reloaded=createNotificationReceipts(storage).project('alice','ops',rows);
 assert.equal(reloaded.length,2);
 assert.ok(reloaded.every(n=>n.read));
 assert.doesNotMatch(ScreenHeader('Alice','A',true,reloaded.filter(n=>!n.read).length),/notification-count/);
 assert.doesNotMatch(NotificationsScreen(reloaded,0),/NON LU/);
 assert.equal(rows[0].read,false);
 assert.equal(receipts.project('alice','ops',[...rows,{id:'new'}]).filter(n=>!n.read).length,1);
 assert.equal(receipts.project('bob','ops',rows).filter(n=>!n.read).length,2);
 assert.equal(receipts.project('alice','community',rows).filter(n=>!n.read).length,2);
});

test('pending invitations stay actionable and blocked storage does not break the bell',()=>{
 const receipts=createNotificationReceipts({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});
 const invites=[{id:'session:coach',sessionId:'session',role:'coach'}];
 receipts.open('alice',[{source:'invitation',items:invites}]);
 assert.deepEqual(receipts.project('alice','invitation',invites),[{...invites[0],read:true}]);
 assert.equal(receipts.project('bob','invitation',invites)[0].read,false);
});
