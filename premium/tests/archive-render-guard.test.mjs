import {test} from 'node:test';import assert from 'node:assert/strict';
import {createArchiveRenderGuard} from '../src/archive-render-guard.mjs';
test('unchanged archives retain mounted UI, while new content, owners, URLs and roots render',()=>{
 const check=createArchiveRenderGuard(),root={isConnected:true},base={route:'/tracks',ownerId:'a',html:'rows',root};
 assert.equal(check(base),false);assert.equal(check(base),true);
 for(const change of [{html:'new row'},{ownerId:'b'},{route:'/tracks?category=training'},{root:{isConnected:true}},{force:true}]){assert.equal(check({...base,...change}),false);check(base);}
 assert.equal(check({...base,root:{isConnected:false}}),false);
 assert.equal(check({...base,route:'/profile'}),false);assert.equal(check(base),false);
 assert.equal(check({...base,ownerId:null}),false);assert.equal(check(base),false);
});
