import {mkdir,rm,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'.v1-maintenance');
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const file of ['index.html','sw.js','icon.svg'])await copyFile(path.join(root,'maintenance',file),path.join(output,file));
console.log('V1 maintenance ready: 3 static files; no V1 application/backend included.');
