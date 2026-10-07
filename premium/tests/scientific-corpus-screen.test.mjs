import test from 'node:test';
import assert from 'node:assert/strict';
import { renderScientificCorpusDogScreen, renderScientificCorpusScreen } from '../src/scientific-corpus-screen.mjs';

test('corpus screen labels the simulation, exposes safe summaries and supported filters',()=>{
 const html=renderScientificCorpusScreen({access:{authorized:true,role:'researcher'},corpusView:{displayable:true,rows:[{sessionId:'SCI-SESSION-00012',contributorId:'HANDLER-104',dogId:'DOG-115',type:'training',period:'2026-03',environment:'forest',quality:'high',fields:{weather:{value:{band:'cool_humid'},consentCategory:'weather'}}}],aggregateAtoms:[],summary:{sessionCount:12,dogCount:4,training:12,operational:null,quality:{high:8},caveat:'Différence observée dans cet échantillon'}},filters:{}});
 assert.match(html,/Simulation de corpus scientifique/);assert.match(html,/Données synthétiques \/ Démonstration/);
 assert.match(html,/HANDLER-104/);assert.match(html,/DOG-115/);assert.match(html,/SCI-SESSION-00012/);
 assert.match(html,/Environnement/);assert.match(html,/Qualité/);assert.match(html,/Différence observée dans cet échantillon/);
 assert.match(html,/\/scientific\/corpus\/dog\/DOG-115/);
 assert.doesNotMatch(html,/Contributeur fictif|mockUserId|synthetic-contributor-/);
});

test('pseudonymous dog profile suppresses small samples and only renders thresholded rows',()=>{
 const suppressed=renderScientificCorpusDogScreen({dogId:'DOG-115',corpusView:{displayable:false,rows:[],suppressionReason:'Échantillon insuffisant pour afficher ce résultat.'}});
 assert.match(suppressed,/Profil longitudinal · DOG-115/);assert.match(suppressed,/Échantillon insuffisant/);assert.doesNotMatch(suppressed,/HANDLER-|SCI-SESSION-/);
 const shown=renderScientificCorpusDogScreen({dogId:'DOG-115',corpusView:{displayable:true,rows:[{sessionId:'SCI-SESSION-00012',contributorId:'HANDLER-104',dogId:'DOG-115',type:'training',period:'2026-03',environment:'forest',quality:'high',fields:{}}]}});
 assert.match(shown,/Sessions affichables/);assert.match(shown,/HANDLER-104/);assert.match(shown,/Données synthétiques/);
});

test('suppressed groups show policy wording and no detailed values',()=>{
 const html=renderScientificCorpusScreen({access:{authorized:true,role:'scientific_reader'},corpusView:{displayable:false,rows:[],aggregateAtoms:[],summary:null,suppressionReason:'Résultat masqué : groupe trop petit'},filters:{environment:'rare'}});
 assert.match(html,/Résultat masqué : groupe trop petit/);assert.doesNotMatch(html,/HANDLER-|SCI-SESSION-|DOG-/);
});
