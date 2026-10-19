// Offline only: preserve every unrelated file from the verified deployed v17.
import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node prepare-coaching-invitations-edge.mjs edge-v17.json output.json');
let live=JSON.parse(await readFile(input,'utf8'));if(live.content)live=JSON.parse(live.content.find(c=>c.type==='text').text);
const expected=JSON.parse(await readFile(new URL('../docs/coaching-invitations/edge-v17-hashes.json',import.meta.url),'utf8'));
if(live.slug!=='coaching'||live.version!==expected.version||live.ezbr_sha256!==expected.ezbr_sha256||live.files?.length!==Object.keys(expected.files).length)throw Error('Edge de base divergente : réconciliation requise.');
const files=new Map();for(const file of live.files){if(files.has(file.name)||createHash('sha256').update(file.content).digest('hex')!==expected.files[file.name])throw Error('Fichier Edge divergent : '+file.name);files.set(file.name,{name:file.name,content:file.content});}
for(const name of ['index.ts','src/server/coaching-http.mjs','src/server/coaching-inbox-service.mjs'])files.set(name,{name,content:await readFile(name==='index.ts'?new URL('../supabase/functions/coaching/index.ts',import.meta.url):new URL('../'+name,import.meta.url),'utf8')});
await writeFile(output,JSON.stringify({project_id:'shnwqdkiapgcftbnhilh',function_slug:'coaching',entrypoint_path:'index.ts',verify_jwt:live.verify_jwt,files:[...files.values()]},null,2));
console.log('Paquet préparé hors ligne depuis v17 ; aucun déploiement.');
