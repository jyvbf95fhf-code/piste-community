import {build} from 'esbuild';
await build({stdin:{contents:"export {createClient} from '@supabase/supabase-js';",resolveDir:process.cwd(),sourcefile:'remote-client-entry.mjs'},bundle:true,format:'esm',platform:'browser',minify:true,legalComments:'eof',outfile:'src/vendor/supabase-client.mjs'});
import {readFile,writeFile,readdir} from 'node:fs/promises';
const lock=JSON.parse(await readFile('package-lock.json','utf8')),notices=[];
for(const [path,pkg] of Object.entries(lock.packages)){if(!path||pkg.dev)continue;const files=await readdir(path),license=files.find(f=>/^licen[sc]e(?:\.txt|\.md)?$/i.test(f));if(!license)throw Error('License missing: '+path);notices.push(path.replace('node_modules/','')+'\n'+await readFile(path+'/'+license,'utf8'));}
await writeFile('src/vendor/supabase-licenses.txt',notices.join('\n\n---\n\n'));
