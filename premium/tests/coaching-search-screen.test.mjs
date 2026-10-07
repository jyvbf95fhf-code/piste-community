import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDraft,updateDraft,createSession,setObservers} from '../src/coaching.mjs';
import {createPreparation,simulate} from '../src/coaching-preparation.mjs';
import {createSearch,advanceSearch} from '../src/coaching-search.mjs';
import {SearchScreen} from '../src/coaching-search-screen.mjs';

function fixture(tracking='active'){
 const p=simulate(createPreparation(createSession(setObservers(updateDraft(createDraft({name:'Vous'},[{id:'nox',name:'Nox'}]),{mode:'full_blind',traceType:'direct'}),['lea'])).session),{gps:'fresh'});
 let s=advanceSearch({...createSearch(),phase:'SEARCH_READY'},p,'start');
 if(tracking==='paused')s=advanceSearch(s,p,'pause',{now:1000});
 return {p,s};
}

test('terrain cockpit separates pause, resume, messages, finish and local lock actions',()=>{
 let {p,s}=fixture();let html=SearchScreen(s,p);
 assert.equal((html.match(/data-search="pause"/g)||[]).length,1);
 assert.match(html,/data-search="finish"/);assert.match(html,/data-search="messages"/);assert.match(html,/data-search="lock-screen"/);
 assert.doesNotMatch(html,/data-search="resume"/);
 ({p,s}=fixture('paused'));html=SearchScreen(s,p);
 const actions=html.match(/<div class="search-actions">([\s\S]*?)<\/div>/)?.[1]||'';
 assert.equal(s.phase,'SEARCH_RUNNING');assert.match(actions,/data-search="resume"/);assert.match(actions,/data-search="finish"/);assert.doesNotMatch(actions,/data-search="progress"/);
 const dev=SearchScreen(s,p,{devOpen:true});assert.match(dev,/data-search="progress" disabled/);
});

test('locked terrain hides map, identity and message contents while retaining an unread badge',()=>{
 const {p,s}=fixture('paused'),messages=[{id:1,sender:'Léa',role:'Coach',time:'09:12',text:'SECRET-MESSAGE-CONTENT',read:false,outgoing:false}];
 const before=structuredClone(s),html=SearchScreen(s,p,{locked:true,messages,unreadCount:1});
 assert.match(html,/Écran verrouillé/);assert.match(html,/Maintenir 2 secondes/);assert.match(html,/1 message non lu/);
 assert.doesNotMatch(html,/SECRET-MESSAGE-CONTENT|data-map-path|Nox|Léa|data-map-actor/);
 assert.deepEqual(s,before);
 const unlocked=SearchScreen(s,p,{locked:false,messages,messagesOpen:true,unreadCount:1});
 assert.match(unlocked,/SECRET-MESSAGE-CONTENT/);assert.match(unlocked,/data-search="close-messages"/);
 assert.deepEqual(s,before);
});
