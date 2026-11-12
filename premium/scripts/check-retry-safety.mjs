import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('..',import.meta.url));
const blobHash=text=>createHash('sha1').update('blob '+Buffer.byteLength(text)+'\0').update(text).digest('hex');
export function findUnsafeRaises(sql){
 const clean=sql.replace(/\/\*[\s\S]*?\*\//g,'').replace(/--[^\n]*/g,'');
 return [...clean.matchAll(/\braise\b[^;]*?\b(?:errcode\s*(?::=|=)|sqlstate)\s*'(40001|40P01)'/gi)].map(m=>m[0]);
}
export function checkSqlFile(name,sql,legacy={}){
 if(!findUnsafeRaises(sql).length)return [];
 return legacy[name]===blobHash(sql)?[]:[name+': use PT409 for business conflicts, never 40001/40P01'];
}
function walk(directory){return readdirSync(directory,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(directory,e.name)):e.name.endsWith('.sql')?[path.join(directory,e.name)]:[]);}
export function checkRetrySafety(){
 const policy=JSON.parse(readFileSync(path.join(root,'scripts/retry-safety-policy.json'),'utf8')),errors=[];
 for(const folder of ['supabase/migrations','docs'])for(const file of walk(path.join(root,folder))){
  const name=path.relative(root,file).split(path.sep).join('/');errors.push(...checkSqlFile(name,readFileSync(file,'utf8'),policy.historicalSql));
 }
 for(const [name,functions] of Object.entries(policy.requiredCorrections)){
  let sql;try{sql=readFileSync(path.join(root,name),'utf8');}catch{errors.push(name+': required correction missing');continue;}
  for(const fn of functions)if(!sql.includes('FUNCTION '+fn+'('))errors.push(name+': required function '+fn+' missing');
  if(findUnsafeRaises(sql).length||!sql.includes('PT409'))errors.push(name+': correction must use PT409');
 }
 if(errors.length)throw Error(errors.join('\n'));
 console.log('Retry safety gate passed: no new retryable business errors; corrective SQL present.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))checkRetrySafety();

