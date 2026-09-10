const fs=require('fs'),assert=require('assert/strict'),vm=require('vm'),{execFileSync}=require('child_process');
const read=p=>fs.readFileSync(p,'utf8');
const baseline='0b9d1c9eff6c3b7414e0266627e05a4c53ed26a1';
assert.equal(execFileSync('git',['rev-parse','stable-v10.43^{commit}'],{encoding:'utf8'}).trim(),baseline);
execFileSync('git',['merge-base','--is-ancestor',baseline,'HEAD']);
const app=read('app.js'),html=read('index.html'),src=read('admin.js'),css=read('admin.css');
const apply=read('PISTE_V10.44_PATCH/PISTE_V10.44_APPLY.sql'),dry=read('PISTE_V10.44_PATCH/PISTE_V10.44_DRY_RUN.sql');
assert.equal(dry.replace(/rollback;\s*$/,'END'),apply.replace(/commit;\s*$/,'END'));
assert(/rollback;\s*$/.test(dry));assert(/commit;\s*$/.test(apply));
const functions=[...apply.matchAll(/create function public\.(\w+)\([\s\S]*?end \$\$;/g)].map(m=>m[0]);
assert.equal(functions.length,4);
for(const fn of functions){assert.match(fn,/security definer set search_path=''/);assert.match(fn,/auth\.uid\(\)/);assert(!/execute\s+['"]/i.test(fn),'No dynamic SQL');}
for(const name of ['piste_admin_query_v1044','piste_admin_feedback_status_v1044']){
 const fn=functions.find(f=>f.includes(`public.${name}(`));assert(fn.indexOf('not public.piste_admin_access_v1044()')<fn.indexOf("errcode='42501'"));assert.match(fn,/begin\s+if auth.uid\(\) is null or not public.piste_admin_access_v1044\(\)/);
}
assert.match(apply,/if auth.uid\(\) is null then return false/);
assert.match(apply,/where a.user_id=auth.uid\(\)/);
assert(!/insert into piste_admin_v1044.administrators/.test(apply),'No automatic admin promotion');
assert.match(apply,/revoke all on schema piste_admin_v1044 from public,anon,authenticated/);
for(const table of ['administrators','feedback'])assert(apply.includes(`alter table piste_admin_v1044.${table} enable row level security;`));
assert(!/create policy/i.test(apply),'No permissive policies');
assert.equal((apply.match(/grant execute on function .* to authenticated;/g)||[]).length,4);
assert(!/grant (?:all|select|insert|update|delete|truncate|references|trigger)/i.test(apply));
assert(!/alter table public\.|create or replace|coaching_live_points|coaching_debriefs|planned_route|driver_notes|coach_notes|\btrack\b/.test(apply));
assert(!/\bemail\b/.test(apply.replace(/--[^\n]*/g,'')),'No email projection');
assert(apply.includes('u.last_sign_in_at')&&apply.includes('s.latest_session_at,f.latest_feedback_at'));
assert(apply.includes("null::numeric,status from public.coaching_sessions"),'No invented Coaching distance');
assert(apply.includes('piste_admin_v1044.sessions')&&apply.includes('from auth.users'));
assert(apply.includes('order by x.created_at desc,x.user_id'));
assert(apply.includes('strpos(lower(coalesce(display_name'));
for(const filter of ['active','inactive','new','feedback','recent_session','ops','training','coaching'])assert(apply.includes(`when '${filter}'`));
assert(apply.includes('limit 50 offset p_offset')&&apply.includes('limit 20'));
assert(apply.includes('where id=p_id and revision=p_revision'));
assert(apply.includes('existing.user_id=uid')&&apply.includes('pg_advisory_xact_lock'));
assert(apply.includes('values(p_id,uid,btrim(p_subject),btrim(p_message),p_context)'));
assert(!src.includes('client.from(')&&!src.includes('localStorage')&&!src.includes('sessionStorage'));
assert.match(html,/<button id="openAdminCentre"[^>]* hidden>/);
assert(app.includes("if(id==='adminPage'&&!adminVerified)"));
assert(app.includes("location.hash==='#admin'"));assert(app.includes("if(event==='SIGNED_OUT'){adminCentre.reset()"));
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'No duplicate HTML ID');
assert(css.includes('overflow-x:auto')&&css.includes('minmax(0,1fr)')&&css.includes('min-height:44px'));
require('./verify-current-assets')();
const diff=execFileSync('git',['diff',baseline,'--name-only'],{encoding:'utf8'}).trim().split('\n');
assert(!diff.some(p=>p.startsWith('supabase/functions/')||p.endsWith('.sql')&&!['PISTE_V10.45_PATCH/PISTE_V10.45_CORRECTIF_DRY_RUN.sql','PISTE_V10.45_PATCH/PISTE_V10.45_CORRECTIF_APPLY.sql','PISTE_V10.45_PATCH/PISTE_V10.45_DRY_RUN.sql','PISTE_V10.45_PATCH/PISTE_V10.45_APPLY.sql'].includes(p)&&!/^PISTE_V10\.44_PATCH\/PISTE_V10\.44_(DRY_RUN|APPLY)\.sql$/.test(p)));
const ctx=vm.createContext({console,Date,Number,String,Object,Array,JSON});vm.runInContext(src.replace(/export /g,''),ctx);
for(const tab of ['dashboard','users','profile','activity','statistics','feedback'])assert.equal(typeof ctx.renderAdmin(tab,{}),'string');
const xss=ctx.adminUserCards([{user_id:'u',display_name:'<img src=x onerror=alert(1)>',sessions_count:12}]);assert(!xss.includes('<img'));assert(xss.includes('&lt;img'));assert(xss.includes('12 pistes'));
const detail=ctx.renderAdmin('profile',{user:{sessions_count:8,ops_count:2,training_count:3,coaching_count:3}});assert(detail.includes('>8</strong>'));
const stats=ctx.renderAdmin('statistics',{kpis:{ops:2,training:3,coaching:4}});assert(stats.includes('>2</strong>')&&stats.includes('>4</strong>'));
const feedback=ctx.adminFeedbackCards([{id:'f',status:'new',message:'<script>x</script>',subject:'test',revision:2}],true);assert(!feedback.includes('<script>'));for(const label of ['Nouveau','Lu','À traiter','Traité'])assert(feedback.includes(label));
function harness(){
 const nodes=new Map(),calls=[],routes=[];let uid='standard',reply=async name=>name==='piste_admin_access_v1044'?{data:false}:{error:{code:'42501'}};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:false,disabled:false,value:id==='adminPeriod'?'30':id==='adminSort'?'recent':id==='adminFilter'?'all':'',textContent:'',innerHTML:'',dataset:{},handlers:{},classList:{remove(){}},setAttribute(){},addEventListener(type,fn){this.handlers[type]=fn;},reset(){for(const id of ['ideaSubject','ideaText'])node(id).value='';},reportValidity:()=>true,querySelectorAll:()=>[]});return nodes.get(id);};
 const centre=ctx.createAdminCentre({client:{rpc:async(name,args)=>{calls.push({name,args});return reply(name,args);}},getUserId:()=>uid,navigate:(id)=>routes.push(id),document:{getElementById:node},crypto:{randomUUID:()=> 'a0000000-0000-4000-8000-000000000001'}});
 return{centre,node,calls,routes,setUser:value=>uid=value,setReply:fn=>reply=fn};
}
(async()=>{
 const h=harness();assert.equal(await h.centre.refreshAccess(),false);assert.equal(h.node('openAdminCentre').hidden,true);await h.centre.open();assert.equal(h.routes.at(-1),'profilePage');assert(!h.calls.some(c=>c.name==='piste_admin_query_v1044'));
 h.setReply(async()=>{throw new Error('offline');});await h.centre.open();assert.equal(h.routes.at(-1),'profilePage');assert.equal(h.node('openAdminCentre').hidden,true);
 h.setUser('admin');h.setReply(async name=>name==='piste_admin_access_v1044'?{data:true}:{data:{kpis:{users_total:42},items:[],total:0}});await h.centre.open();assert.equal(h.node('openAdminCentre').hidden,false);assert.equal(h.routes.at(-1),'adminPage');assert(h.node('adminContent').innerHTML.includes('42'));
 const tab=async key=>{h.node('adminTabs').handlers.click({target:{closest:()=>({dataset:{adminTab:key}})}});await new Promise(r=>setImmediate(r));};
 await tab('users');h.node('adminSearch').value='Ninja';h.node('adminFilter').value='active';h.node('adminSort').value='activity';h.node('adminControls').handlers.submit({preventDefault(){}});await new Promise(r=>setImmediate(r));
 const query=h.calls.at(-1);assert.equal(query.args.p_search,'Ninja');assert.equal(query.args.p_filter,'active');assert.equal(query.args.p_sort,'activity');
 await tab('feedback');assert.equal(h.calls.at(-1).args.p_section,'feedback');
 h.setReply(async()=>({error:{code:'42501'}}));h.node('adminRefresh').handlers.click();await new Promise(r=>setImmediate(r));assert.equal(h.node('openAdminCentre').hidden,true);assert.equal(h.node('adminContent').innerHTML,'');assert.equal(h.routes.at(-1),'profilePage');
 // A late data response cannot render after sign-out.
 let finish;h.setReply(async name=>name==='piste_admin_access_v1044'?{data:true}:new Promise(r=>finish=r));const pending=h.centre.open();await new Promise(r=>setImmediate(r));h.setUser(null);h.centre.reset();finish({data:{kpis:{users_total:9876}}});await pending;assert.equal(h.node('adminContent').innerHTML,'');
 // Navigation away while access check is pending cannot reopen Admin.
 h.setUser('admin');let access;h.setReply(()=>new Promise(r=>access=r));const opening=h.centre.open();h.centre.leave();const routeCount=h.routes.length;access({data:true});await opening;assert.equal(h.routes.length,routeCount);
 // Feedback: duplicate click suppressed, retry retains id, text preserved on failure.
 h.setUser('standard');h.node('ideaSubject').value='Une idée';h.node('ideaText').value='Amélioration utile';h.node('ideaContext').value='Général';let submit;h.setReply(()=>new Promise(r=>submit=r));const event={preventDefault(){}};
 const first=h.node('ideaForm').handlers.submit(event),before=h.calls.length;await h.node('ideaForm').handlers.submit(event);assert.equal(h.calls.length,before);const id=h.calls.at(-1).args.p_id;assert(!('p_user_id' in h.calls.at(-1).args));submit({error:{code:'503'}});await first;assert.equal(h.node('ideaText').value,'Amélioration utile');
 h.setReply(async()=>({data:id}));await h.node('ideaForm').handlers.submit(event);assert.equal(h.calls.at(-1).args.p_id,id);assert(h.node('ideaMessage').textContent.includes('envoyé'));assert.equal(h.node('ideaText').value,'');
 execFileSync(process.execPath,['scripts/check-postgres-sql.js','PISTE_V10.44_PATCH/PISTE_V10.44_DRY_RUN.sql','PISTE_V10.44_PATCH/PISTE_V10.44_APPLY.sql'],{stdio:'inherit'});
 console.log('V10.44 A–T OK : baseline, RPC contract, access denied/fail-closed, rendered KPIs, filters, profile, activity, statuses, XSS, auth/navigation races, submission retry, HTML IDs, responsive structure, cache.');
 console.log('SQL parsed/static security audit ONLY. Live SQL/permissions and real iPhone Safari require manual validation after APPLY; no SQL executed.');
})().catch(error=>{console.error(error);process.exitCode=1});
