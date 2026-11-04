// Offline packaging, preserving every unrelated live module and live entrypoint.
import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node package-community-edge.mjs current-edge.json output.json');
const live=JSON.parse(await readFile(input,'utf8')),expected=JSON.parse(await readFile(new URL('../docs/community-feed/edge-base-hashes.json',import.meta.url),'utf8'));
const hash=s=>createHash('sha256').update(s).digest('hex');
if(live.slug!=='coaching'||live.version!==expected.version||live.ezbr_sha256!==expected.ezbr_sha256||live.files.length!==Object.keys(expected.files).length)throw Error('Production modifiée : réconciliation requise.');
const files=new Map();for(const f of live.files){if(files.has(f.name)||expected.files[f.name]!==hash(f.content))throw Error('Source de production modifiée : '+f.name);files.set(f.name,f);}
for(const name of ['src/server/coaching-http.mjs','src/server/community-feed-service.mjs','src/community-publication.mjs'])files.set(name,{name,content:await readFile(new URL('../'+name,import.meta.url),'utf8')});
const bundle={project_id:'shnwqdkiapgcftbnhilh',name:'coaching',entrypoint_path:'index.ts',verify_jwt:live.verify_jwt,files:[...files.values()]};
await writeFile(output,JSON.stringify(bundle));console.log(JSON.stringify({files:bundle.files.length,entrypointPreserved:true,project_id:bundle.project_id}));
