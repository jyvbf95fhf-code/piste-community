import test from 'node:test';
import assert from 'node:assert/strict';
import { SCIENTIFIC_CONSENT_VERSION, SCIENTIFIC_CONSENT_CATEGORIES, SCIENTIFIC_OPS_CATEGORIES, createInitialScientificConsent, deriveScientificConsent } from '../src/scientific-consent.mjs';

test('consent starts disabled with every independent category OFF',()=>{
 const consent=createInitialScientificConsent('user-demo');
 assert.equal(SCIENTIFIC_CONSENT_VERSION,'scientific-consent-v1');
 assert.equal(consent.participationEnabled,false);
 assert.equal(Object.values(consent.categories).every(value=>value===false),true);
 assert.equal(Object.values(consent.opsCategories).every(value=>value===false),true);
 assert.deepEqual(Object.keys(consent.categories),SCIENTIFIC_CONSENT_CATEGORIES);
 assert.deepEqual(Object.keys(consent.opsCategories),SCIENTIFIC_OPS_CATEGORIES);
});

test('consent is derived from immutable versioned events without inferring category grants',()=>{
 const events=[{eventId:'e1',consentId:'c1',mockUserId:'user-demo',type:'participation_enabled',version:SCIENTIFIC_CONSENT_VERSION,source:'user-settings',actor:{userId:'user-demo',role:'contributor'},occurredAt:'2026-10-07T09:00:00.000Z'}];
 const result=deriveScientificConsent(events,'user-demo');
 assert.equal(result.participationEnabled,true);
 assert.equal(result.status,'partial');
 assert.equal(Object.values(result.categories).some(Boolean),false);
 assert.equal(Object.values(result.opsCategories).some(Boolean),false);
 assert.equal(events.length,1);
});
