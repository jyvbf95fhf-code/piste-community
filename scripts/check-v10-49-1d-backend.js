const fs=require('fs');const assert=require('assert/strict');
const sql=fs.readFileSync('PISTE_V10.49.1D_COACHING_SOLO_DIRECT_RUN.sql','utf8');
const verify=fs.readFileSync('PISTE_V10.49.1D_COACHING_SOLO_DIRECT_RUN_VERIFY.sql','utf8');
const ok=(condition,message)=>assert(condition,message);
for(const name of ['start_solo_run','finish_solo_run']){
 ok(new RegExp(`create or replace function public\\.${name}\\(p_session_id uuid\\)`).test(sql),`${name}: replacement missing`);
 ok(new RegExp(`create or replace function public\\.${name}[\\s\\S]*?security definer set search_path=''`).test(sql),`${name}: SECURITY DEFINER/search_path missing`);
 ok(new RegExp(`revoke all on function public\\.${name}\\(uuid\\) from public,anon,authenticated[\\s\\S]*?grant execute on function public\\.${name}\\(uuid\\) to authenticated`).test(sql),`${name}: authenticated-only ACL missing`);
}
ok(/active_count<>1/.test(sql)&&/m\.role='solo'/.test(sql)&&/m\.user_id=uid/.test(sql),'Solo identity and exactly-one-active-member guard missing');
ok(/set_config\('piste\.v1040_transition','on',true\)/.test(sql),'existing phase transition guard not used');
ok(/set_config\('piste\.v1049_origin_transition','on',true\)/.test(sql),'track origin guard not used');
ok(/phase='driver_running'/.test(sql)&&/driver_started_at=coalesce\(driver_started_at,started_at\)/.test(sql),'direct Solo run state/timestamp missing');
ok(/track_started_at=coalesce\(track_started_at,started_at\)/.test(sql)&&/track_started_source=coalesce\(track_started_source,'live'\)/.test(sql),'direct Solo track origin missing');
ok(/finish_coaching_track_v1049\(p_session_id\)/.test(sql),'Solo finish must reuse atomic debrief transition');
ok(/r\.phase<>'driver_running'/.test(sql),'Solo finish must require the active direct-run phase');
ok(!/drop\s+(table|function|policy|trigger)|cascade/i.test(sql),'destructive SQL present');
ok(!/create\s+(table|policy|trigger)|alter\s+table|delete\s+from|truncate\s+/i.test(sql),'unexpected schema/policy mutation present');
ok(!/execute_sql|supabase\s+db\s+(query|push)|psql\s/i.test(sql+verify),'SQL execution command present');
ok(/^select\b|^--/m.test(verify)&&!(/\b(insert|update|delete|create|alter|drop|grant|revoke)\b|\bdo\s+\$/i.test(verify)),'VERIFY must remain read-only');
console.log('V10.49.1D backend static checks: PASS');
