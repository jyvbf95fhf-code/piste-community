import {build} from 'esbuild';
await build({entryPoints:['src/server/piste-history-http.mjs'],bundle:true,format:'esm',platform:'neutral',outfile:'supabase/functions/piste-history/handler.mjs',legalComments:'none'});
