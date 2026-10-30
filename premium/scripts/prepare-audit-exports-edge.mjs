// Offline only: refresh the export dependency closure, preserving the live entry
// and every unrelated service. Does not call Supabase or modify SQL/Auth.
import {readFile,writeFile} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node prepare-audit-exports-edge.mjs current-edge.json output.json');
const live=JSON.parse(await readFile(input,'utf8'));
if(live.slug!=='coaching'||!Array.isArray(live.files)||typeof live.verify_jwt!=='boolean')throw Error('Fonction Coaching de référence requise.');
const files=new Map();for(const f of live.files){if(files.has(f.name)||typeof f.content!=='string')throw Error('Paquet ambigu.');files.set(f.name,{name:f.name,content:f.content});}if(!files.has('index.ts'))throw Error('Entrée déployée absente.');
const root=fileURLToPath(new URL('..',import.meta.url)),seen=new Set();
async function include(name){if(seen.has(name))return;if(!name.startsWith('src/')||!name.endsWith('.mjs'))throw Error('Dépendance hors périmètre : '+name);seen.add(name);const content=await readFile(path.join(root,name),'utf8');files.set(name,{name,content});for(const m of content.matchAll(/\b(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"](\.[^'"]+)['"]/g))await include(path.posix.normalize(path.posix.join(path.posix.dirname(name),m[1])));}
await include('src/server/data-exports-service.mjs');
await writeFile(output,JSON.stringify({project_id:'shnwqdkiapgcftbnhilh',name:'coaching',entrypoint_path:'index.ts',verify_jwt:live.verify_jwt,files:[...files.values()]},null,2));
console.log(JSON.stringify({prepared:true,refreshed:seen.size,total:files.size,deployed:false}));
