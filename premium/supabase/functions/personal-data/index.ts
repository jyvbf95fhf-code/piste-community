import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {createPersonalDataHandler,createPersonalDataRepository} from './handler.mjs';
const url=Deno.env.get('SUPABASE_URL')!;
if(new URL(url).hostname!=='shnwqdkiapgcftbnhilh.supabase.co')throw Error('Projet V2 développement requis.');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,options);
const auth=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,options);
Deno.serve(createPersonalDataHandler({
 authenticate:async token=>{const r=await auth.auth.getUser(token);return r.error?null:r.data.user;},
 enabled:async id=>{const r=await admin.from('coaching_remote_users').select('id').eq('id',id).eq('enabled',true).maybeSingle();if(r.error)throw Error('Accès indisponible.');return !!r.data;},
 repositoryFor:id=>createPersonalDataRepository(admin,id)
}));
