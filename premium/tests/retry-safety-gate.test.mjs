import test from 'node:test';
import assert from 'node:assert/strict';
import {findUnsafeRaises,checkSqlFile} from '../scripts/check-retry-safety.mjs';
test('rejects retryable SQLSTATE in new or edited SQL',()=>{
 for(const sql of ["raise exception 'conflict' using errcode='40001';","RAISE SQLSTATE '40P01' USING MESSAGE='conflict';","raise exception using errcode = '40001', message='bad';"])
 assert.equal(findUnsafeRaises(sql).length,1,sql);
 assert.equal(checkSqlFile('new.sql',"raise exception 'conflict' using errcode='40001';",{}).length,1);
});
test('accepts controlled conflicts and ignores commented examples',()=>{
 assert.deepEqual(findUnsafeRaises("raise exception 'conflict' using errcode='PT409'; -- raise sqlstate '40001';\n/* raise sqlstate '40P01'; */"),[]);
});
test('legacy exemption requires the exact immutable Git blob',()=>{
 const sql="raise exception 'conflict' using errcode='40001';";
 assert.equal(checkSqlFile('legacy.sql',sql,{'legacy.sql':'wrong-hash'}).length,1);
});

