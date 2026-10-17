import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {createCoachingHandler} from './src/server/coaching-http.mjs';
const url=Deno.env.get('SUPABASE_URL')!;
if(new URL(url).hostname!=='shnwqdkiapgcftbnhilh.supabase.co')throw Error('Projet V2 isolé requis.');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,options);
const authClient=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,options);
Deno.serve(createCoachingHandler({admin,authClient,giftCodesEnabled:true}));
