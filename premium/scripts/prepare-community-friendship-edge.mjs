// Offline packaging only. Never contacts or deploys to Supabase.
import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';
const digest=content=>createHash('sha256').update(content).digest('hex');
const replacements=['index.ts','src/server/coaching-http.mjs','src/server/coaching-service.mjs','src/coaching-team.mjs','src/server/community-friendship-service.mjs'];
export async function prepareCommunityFriendshipEdge(live,{expected,readSource}={}){
 expected??=JSON.parse(await readFile(new URL('../docs/community-friendships/edge-v14-base-hashes.json',import.meta.url),'utf8'));
 readSource??=name=>readFile(name==='index.ts'?new URL('../supabase/functions/coaching/index.ts',import.meta.url):new URL('../'+name,import.meta.url),'utf8');
 if(live.slug!=='coaching'||live.version!==expected.version||live.ezbr_sha256!==expected.ezbr_sha256||!Array.isArray(live.files)||live.files.length!==Object.keys(expected.files).length)throw Error('Edge de base divergente : réconciliation requise.');
 const files=new Map();for(const f of live.files){if(!expected.files[f.name]||digest(f.content)!==expected.files[f.name]||files.has(f.name))throw Error('Contenu Edge divergent : '+f.name);files.set(f.name,{name:f.name,content:f.content});}
 for(const name of replacements)files.set(name,{name,content:await readSource(name)});
 return {project_id:'shnwqdkiapgcftbnhilh',function_slug:'coaching',entrypoint_path:'index.ts',verify_jwt:live.verify_jwt,files:[...files.values()]};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node prepare-community-friendship-edge.mjs current-edge.json output.json');let live=JSON.parse(await readFile(input,'utf8'));if(live.content)live=JSON.parse(live.content.find(c=>c.type==='text').text);const bundle=await prepareCommunityFriendshipEdge(live);await writeFile(output,JSON.stringify(bundle,null,2));console.log('Paquet préparé hors ligne ; aucun déploiement. Activation explicite requise séparément.');}
