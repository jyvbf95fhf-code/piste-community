import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {isV2CiBranch} from '../scripts/v2-ci-policy.mjs';
test('current V2 branches and legacy consolidation branches can run CI; V1 and unrelated branches cannot',()=>{
 for(const branch of ['develop/v2-premium','release/v2-production','fix/v2-audit-offline-ci-20261111','feature/v2-premium-stabilisation-20261025'])assert.equal(isV2CiBranch(branch),true,branch);
 for(const branch of ['main','develop','release/v1-production','fix/v1-bug','','fix/v2-','feature/unrelated'])assert.equal(isV2CiBranch(branch),false,branch);
});
test('both CI triggers include current V2 branches and all Premium assets',()=>{
 const workflow=readFileSync(new URL('../../.github/workflows/v2-stabilisation.yml',import.meta.url),'utf8');
 for(const branch of ['develop/v2-premium','release/v2-production','fix/v2-*'])assert.equal(workflow.split("'"+branch+"'").length-1,2,branch);
 assert.equal(workflow.split("'premium/**'").length-1,2);assert.doesNotMatch(workflow,/branches:.*['"]main['"]/);
});
