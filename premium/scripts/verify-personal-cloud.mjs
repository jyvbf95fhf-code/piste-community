// Explicit live QA for the isolated development project. Credentials are never logged.
import {readFile} from 'node:fs/promises';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';import {COACHING_REMOTE as config} from '../src/coaching-remote-config.mjs';
if(!process.env.PISTE_QA_FILE)throw Error('PISTE_QA_FILE required');
const accounts=JSON.parse(await readFile(process.env.PISTE_QA_FILE,'utf8')).accounts;
const proxy=process.env.HTTPS_PROXY||process.env.https_proxy;
async function call(path,body,token){return new Promise((resolve,reject)=>{const lines=['url = '+JSON.stringify(config.url+path),'request = "POST"','header = '+JSON.stringify('apikey: '+config.publishableKey),'header = "Content-Type: application/json"',...(token?['header = '+JSON.stringify('Authorization: Bearer '+token)]:[]),'data = '+JSON.stringify(JSON.stringify(body))];const child=spawn('curl',['--silent','--show-error','--max-time','25','--config','-','--write-out','\n%{http_code}'],{stdio:['pipe','pipe','pipe']});let out='',err='';child.stdout.on('data',c=>out+=c);child.stderr.on('data',c=>err+=c);child.on('error',reject);child.on('close',code=>{if(code)return reject(Error('Network request failed '+code));const split=out.lastIndexOf('\n');let value;try{value=JSON.parse(out.slice(0,split));}catch{return reject(Error('Invalid response'));}resolve({status:Number(out.slice(split+1)),value});});child.stdin.end(lines.join('\n'));});}
async function login(account){const r=await call('/auth/v1/token?grant_type=password',{email:account.email,password:account.password});assert.equal(r.status,200,'QA sign-in failed');return r.value.access_token;}
const a=await login(accounts[0]),b=await login(accounts[1]);const endpoint='/functions/v1/personal-data';
const id=crypto.randomUUID(),commandId=crypto.randomUUID(),body={operation:'put',kind:'dog',id,expectedRevision:0,commandId,payload:{name:'Cloud QA synthetic',status:'active',notes:'Isolated persistence contract verification'}};
const first=await call(endpoint,body,a);assert.equal(first.status,200,JSON.stringify({stage:'first write',status:first.status,error:first.value.error}));assert.equal(first.value.record.revision,1);
const replay=await call(endpoint,body,a);assert.deepEqual(replay,first);
assert.equal((await call(endpoint,{...body,commandId:crypto.randomUUID()},a)).status,409);
assert.equal((await call(endpoint,{operation:'read',kind:'dog',id},b)).status,404);
assert.equal((await call(endpoint,{operation:'read',kind:'dog',id},a)).value.record.payload.name,'Cloud QA synthetic');
assert.equal((await call(endpoint,{operation:'list',kind:'dog',ownerId:'other'},a)).status,400);
const removed=await call(endpoint,{operation:'remove',kind:'dog',id,expectedRevision:1,commandId:crypto.randomUUID()},a);assert.equal(removed.status,200);assert.ok(removed.value.record.deletedAt);
assert.deepEqual(await call(endpoint,body,a),first);
console.log('PASS LIVE V2: existing QA accounts, private write/read, exact replay, 409, cross-account 404, owner injection denied, tombstone retained. No Auth mutation.');
