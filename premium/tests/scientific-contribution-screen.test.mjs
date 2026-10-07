import test from 'node:test';
import assert from 'node:assert/strict';
import { renderScientificContributionScreen } from '../src/scientific-contribution-screen.mjs';
import { createInitialScientificConsent } from '../src/scientific-consent.mjs';
import { PlaceholderScreen } from '../src/screens.mjs';

test('first-use screen shows OFF defaults, equally visible choices, and separate OPS warning',()=>{
 const html=renderScientificContributionScreen({type:'settings'},{consent:createInitialScientificConsent('contributor-03'),history:[],eligibility:[],actor:{displayName:'Sébastien'}});
 assert.match(html,/Contribuer à la recherche scientifique/);
 assert.match(html,/Ne pas participer/);assert.match(html,/Participer/);
 assert.match(html,/Les missions opérationnelles peuvent contenir des informations sensibles/);
 assert.match(html,/data-scientific-category="weather"/);assert.doesNotMatch(html,/data-scientific-category="weather" checked/);
 assert.match(html,/OPS : Non partagé/);
});

test('data and transparency screens state scope, history, withdrawal and provisional pseudonymization model',()=>{
 const consent={...createInitialScientificConsent('contributor-03'),updatedAt:'2026-10-07T10:00:00.000Z'};
 const data=renderScientificContributionScreen({type:'data'},{consent,history:[{type:'participation_enabled',version:'scientific-consent-v1',occurredAt:'2026-10-07T10:00:00.000Z'}],eligibility:[{sessionId:'s1',state:'included',type:'training'}],actor:{displayName:'Sébastien'}});
 assert.match(data,/Mes données de recherche/);assert.match(data,/Retirer ma participation/);assert.match(data,/Historique/);
 const transparency=renderScientificContributionScreen({type:'transparency'},{consent,history:[],eligibility:[],actor:{displayName:'Sébastien'}});
 assert.match(transparency,/pseudonymisation/i);assert.match(transparency,/à valider juridiquement avant une mise en production réelle/i);
 assert.doesNotMatch(transparency,/conforme RGPD|anonymisation garantie/i);
});

test('Profile exposes a direct entry to contribution settings',()=>{
 const profile=PlaceholderScreen('/profile',{name:'Sébastien',initials:'SL',permissions:{research:false,admin:false}});
 assert.match(profile,/href="\/profile\/research"/);
 assert.match(profile,/Contribuer à la recherche scientifique/);
});
