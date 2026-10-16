import {build} from 'esbuild';
await build({stdin:{contents:"export {createOpsLiveProposedHandler} from './src/server/ops-live-http.mjs';",resolveDir:new URL('..',import.meta.url).pathname},bundle:true,format:'esm',platform:'neutral',outfile:new URL('../supabase/functions/ops-live/handler.mjs',import.meta.url).pathname});
