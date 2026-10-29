import test from 'node:test';import assert from 'node:assert/strict';
import {createNotificationReadSync} from '../src/notification-read-sync.mjs';
import {createNotificationReceipts} from '../src/notification-receipts.mjs';
test('only locally opened OPS notifications reach existing server read command; retries and account isolation',async()=>{
 const receipts=createNotificationReceipts(),rows=[{id:'n',session_id:'s',read:false}];let owner='a',fail=true,calls=0;
 const remote={view:()=>({notifications:rows}),markRead:async id=>{assert.equal(id,'s');calls++;if(fail)throw Error('offline');}};
 const sync=createNotificationReadSync({ownerId:'a',getOwnerId:()=>owner,receipts,remote});
 await sync.flush();assert.equal(calls,0);
 receipts.open('a',[{source:'ops',items:rows}]);await sync.flush();assert.equal(calls,1);
 fail=false;await Promise.all([sync.flush(),sync.flush()]);assert.equal(calls,2);
 await sync.flush();assert.equal(calls,2);
 owner='b';receipts.open('b',[{source:'ops',items:[{id:'m',session_id:'x'}]}]);await sync.flush();assert.equal(calls,2);
});
