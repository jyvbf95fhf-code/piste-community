import test from 'node:test';
import assert from 'node:assert/strict';
import {HomeScreen,PlaceholderScreen} from '../src/screens.mjs';
import {JUMOLF_ACCESS_PROFILES,JUMOLF_DEMO_CODES} from '../src/jumolf-fixtures.mjs';
import {resolveJumolfAccess} from '../src/jumolf-entitlement.mjs';
import {scientificAccessFor} from '../src/scientific-access.mjs';
import {createScientificConsentStore} from '../src/scientific-consent-store.mjs';

test('Home JUMOLF tile reflects locked, eligible inactive, and active access states',()=>{
 const user={name:'Démo',permissions:{}};
 const locked=HomeScreen(user,[],resolveJumolfAccess({entitlement:'none'}));
 assert.match(locked,/data-jumolf-home-access="locked"/);assert.match(locked,/JUMOLF Premium/);
 const eligible=HomeScreen(user,[],resolveJumolfAccess({entitlement:'premium',jumolf_enabled:false}));
 assert.match(eligible,/data-jumolf-home-access="eligible"/);assert.match(eligible,/Activer JUMOLF/);
 const active=HomeScreen(user,[],resolveJumolfAccess({entitlement:'premium',jumolf_enabled:true,jumolf_onboarding_completed:true}));
 assert.match(active,/data-jumolf-home-access="active"/);assert.match(active,/Explorer JUMOLF/);
});

test('profile summary shows entitlement source separately from JUMOLF activation',()=>{
 const user={name:'Sébastien',initials:'SL',permissions:{}};
 const access=resolveJumolfAccess({entitlement:'access_code',entitlement_record:{entitlement:'access_code',source:'access_code',expires_at:'2026-11-06T00:00:00.000Z'},jumolf_enabled:false});
 const html=PlaceholderScreen('/profile',user,access);
 assert.match(html,/Premium &amp; JUMOLF/);assert.match(html,/Non actif/);assert.match(html,/Accès via code/);assert.match(html,/Non activé/);
 assert.match(html,/Contribuer à la recherche scientifique/);
});

test('mock scenarios and access-code fixtures cover required states without backend integrations',()=>{
 assert.deepEqual(Object.keys(JUMOLF_ACCESS_PROFILES),['FREE','PREMIUM','CODE','ADMIN','PREMIUM_NON_ACTIVE','EXPIRED']);
 assert.deepEqual(JUMOLF_DEMO_CODES.map(item=>item.code),['PISTE-DEMO-2026','JUMOLF-30DAYS','JUMOLF-EXPIRED','JUMOLF-REVOKED','JUMOLF-LIMIT']);
 assert.equal(JUMOLF_ACCESS_PROFILES.FREE.entitlement,'none');
 assert.equal(JUMOLF_ACCESS_PROFILES.PREMIUM.jumolf_enabled,true);
 assert.equal(JUMOLF_ACCESS_PROFILES.CODE.entitlement,'access_code');
 assert.equal(JUMOLF_ACCESS_PROFILES.ADMIN.entitlement,'admin_grant');
 assert.equal(JUMOLF_ACCESS_PROFILES.PREMIUM_NON_ACTIVE.jumolf_enabled,false);
 assert.equal(resolveJumolfAccess(JUMOLF_ACCESS_PROFILES.EXPIRED,'2026-10-07T00:00:00.000Z').locked_reason,'expired');
});

test('scientific access and research contribution remain independent from Premium entitlement',()=>{
 const premiumActor={name:'Camille',permissions:{research:false}};
 assert.equal(resolveJumolfAccess({entitlement:'premium'}).entitlement_valid,true);
 assert.equal(scientificAccessFor(premiumActor).authorized,false);
 const scientist={name:'Sébastien',permissions:{research:true}};
 assert.equal(resolveJumolfAccess({entitlement:'none'}).entitlement_valid,false);
 assert.equal(scientificAccessFor(scientist).authorized,true);
 const consent=createScientificConsentStore({mockUserId:'contributor-03'});
 assert.equal(consent.snapshot().status,'disabled');
});
