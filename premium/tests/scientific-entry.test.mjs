import test from 'node:test';
import assert from 'node:assert/strict';
import {HomeScreen} from '../src/screens.mjs';
import {canonicalScientificPath} from '../src/scientific-routes.mjs';
import {ScientificShell} from '../src/scientific-shell.mjs';
import {createScientificController} from '../src/scientific-controller.mjs';
import {generateJumolfSyntheticDataset} from '../src/jumolf-synthetic-dataset.mjs';

test('Home research entry opens the canonical scientific dashboard and legacy links are redirected',()=>{
 const home=HomeScreen({name:'Sébastien',initials:'SL',permissions:{research:true,admin:true}});
 const entry=home.match(/<a class="list-item" href="([^"]+)"[^>]*>[\s\S]*?<strong>Recherche scientifique<\/strong>/);
 assert.ok(entry,'authorized Home profile has a Recherche scientifique entry');
 assert.equal(entry[1],'/scientific');
 assert.equal(canonicalScientificPath('/research'),'/scientific');
 assert.equal(canonicalScientificPath('/scientific'),'/scientific');
 const dataset=generateJumolfSyntheticDataset();
 const authorized=[
  {name:'Sébastien',permissions:{research:true}},
  {id:'ethologist-demo'}
 ];
 for(const actor of authorized){
  const controller=createScientificController({actor,dataset});
  const html=ScientificShell('/scientific',controller.screen('/scientific'),actor);
  assert.match(html,/class="scientific-shell"/);
  assert.match(html,/Espace scientifique privé/);
  assert.doesNotMatch(html,/Prototype Premium · aperçu de l’espace|Observer\. Comprendre\. Progresser\./);
 }
 const actor={name:'Camille',permissions:{research:false}},controller=createScientificController({actor,dataset});
 const denied=ScientificShell('/scientific',controller.screen('/scientific'),actor);
 assert.match(denied,/class="scientific-gate"/);
 assert.match(denied,/Accès restreint aux membres autorisés/);
 assert.doesNotMatch(denied,/Prototype Premium · aperçu de l’espace|Observer\. Comprendre\. Progresser\./);
});
