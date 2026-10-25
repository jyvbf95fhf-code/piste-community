import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {createHistoryHandler} from './handler.mjs';
const url=Deno.env.get('SUPABASE_URL')!;
if(new URL(url).hostname!=='shnwqdkiapgcftbnhilh.supabase.co')throw Error('Projet V2 isolé requis.');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,options);
const authClient=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,options);
Deno.serve(createHistoryHandler({admin,authenticate:async token=>{const r=await authClient.auth.getUser(token);return r.error?null:r.data.user;}}));
