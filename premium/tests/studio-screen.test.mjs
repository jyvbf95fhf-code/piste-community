import test from 'node:test';
import assert from 'node:assert/strict';
import {JumolfStudioScreen} from '../src/jumolf-studio-screen.mjs';
const dog={id:'dog:1',name:'Bobby <test>'};
const rows=['a','b'].map(id=>({id,kind:'coaching',title:'Séance <test>',metrics:{ruptures:{value:1}}}));
const rec={id:'account:dog:1:interruptions',key:'interruptions',personalized:true,title:'Observer les reprises',objective:'Observer la remise en recherche.',evidence:rows.map(r=>({sessionId:r.id})),protocol:{steps:['Une étape'],preparation:[],criteria:[]}};
const options={dogs:[dog],dog,report:{history:rows,recommendations:[rec]},consents:{dog_history:true},canPrepare:true};
test('all five real screens render without fixture claims or duplicate navigation',()=>{
 for(const route of ['entry','prepare','train','analyze','progress']){
  const html=JumolfStudioScreen({...options,route});assert.match(html,new RegExp('data-studio-route="'+route+'"'));assert.match(html,/Bobby &lt;test&gt;/);assert.ok(!html.includes('24 séances'));assert.ok(!html.includes('<nav'));
 }
});
test('prepare and train retain verified controller actions and dog identity',()=>{
 for(const route of ['prepare','train']){const html=JumolfStudioScreen({...options,route});assert.match(html,/data-jumolf-action="prepare-real-training"/);assert.match(html,/data-jumolf-dog-id="dog:1"/);assert.match(html,/data-jumolf-recommendation="account:dog:1:interruptions"/);}
 assert.ok(!JumolfStudioScreen({...options,route:'prepare',canPrepare:false}).includes('data-jumolf-action="prepare-real-training"'));
});
test('analysis has escaped source evidence and encoded map/bilan access',()=>{
 const html=JumolfStudioScreen({...options,route:'analyze'});assert.match(html,/Séance &lt;test&gt;/);assert.match(html,/\/jumolf\/session\/a/);
});
test('missing dog, revoked history and empty report have explicit recovery',()=>{
 assert.match(JumolfStudioScreen(),/Autoriser l’historique/);
 assert.match(JumolfStudioScreen({dogs:[dog],consents:{dog_history:true}}),/Choisissez votre chien/);
 assert.match(JumolfStudioScreen({...options,report:{history:[],recommendations:[]}}),/premiers repères restent à construire/);
});
test('progress counts only completed memories for the current dog and proposed axis',()=>{
 const html=JumolfStudioScreen({...options,route:'progress',memories:[{dogId:dog.id,completed:true,recommendationId:rec.id},{dogId:dog.id,completed:false,recommendationId:rec.id},{dogId:'other',completed:true,recommendationId:rec.id}]});assert.match(html,/1 séances clôturées/);
});
