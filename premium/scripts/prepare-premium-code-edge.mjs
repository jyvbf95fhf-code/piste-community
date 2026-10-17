// Offline packaging only. Never contacts or deploys to Supabase.
import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node prepare-premium-code-edge.mjs current-edge.json output.json');
let live=JSON.parse(await readFile(input,'utf8'));if(live.content)live=JSON.parse(live.content.find(c=>c.type==='text').text);
if(live.slug!=='coaching'||!Array.isArray(live.files))throw Error('Expected the current coaching Edge response, not another function.');
const expected=JSON.parse(await readFile(new URL('../docs/real-gift-codes/edge-base-hashes.json',import.meta.url),'utf8'));
const files=new Map(live.files.map(f=>[f.name,{name:f.name,content:f.content}]));
for(const [name,hash] of Object.entries(expected)){const previous=files.get(name);if(!previous||createHash('sha256').update(previous.content.trimEnd()).digest('hex')!==hash)throw Error(`Remote ${name} changed: stop and reconcile before packaging.`);const source=name==='index.ts'?new URL('../supabase/functions/coaching/index.ts',import.meta.url):new URL('../'+name,import.meta.url);files.set(name,{name,content:await readFile(source,'utf8')});}
const name='src/server/premium-code-service.mjs';files.set(name,{name,content:await readFile(new URL('../'+name,import.meta.url),'utf8')});
await writeFile(output,JSON.stringify({project_id:'shnwqdkiapgcftbnhilh',function_slug:'coaching',entrypoint_path:'index.ts',verify_jwt:live.verify_jwt,files:[...files.values()]},null,2));
console.log('Prepared offline Edge package; no deployment performed.');
