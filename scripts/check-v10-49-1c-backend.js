const fs=require('fs');const assert=require('assert/strict');
const sql=fs.readFileSync('PISTE_V10.49.1C_COACHING_SOLO_TRANSITIONS.sql','utf8');
const verify=fs.readFileSync('PISTE_V10.49.1C_COACHING_SOLO_TRANSITIONS_VERIFY.sql','utf8');
const ok=(condition,message)=>assert(condition,message);
const names=['start_coaching_laying','mark_coaching_track_ready','start_driver_run','finish_driver_run'];
for(const name of names){
 ok(new RegExp(`create or replace function public\\.${name}\\(p_session_id uuid\\)`).test(sql),`${name}: replacement missing`);
 ok(new RegExp(`create or replace function public\\.${name}[\\s\\S]*?security definer set search_path=''`).test(sql),`${name}: SECURITY DEFINER/search_path missing`);
 ok(new RegExp(`public\\.${name}\\(uuid\\)[\\s\\S]*?grant execute on function public\\.${name}\\(uuid\\) to authenticated`).test(sql),`${name}: authenticated grant missing`);
}
ok((sql.match(/solo_mode boolean/g)||[]).length===4,'solo transition branches must be explicit in all four RPCs');
ok((sql.match(/role_name='solo'/g)||[]).length===4,'each RPC must require the solo role');
ok((sql.match(/count\(\*\).*invitation_status in/g)||[]).length>=4,'solo must require a single active member');
ok(/p_trace and m\.role in \('traceur','solo'\)/.test(sql),'solo trace GPS insert is authorized only during laying');
ok(/not p_trace and m\.role in \('driver','solo'\)/.test(sql),'solo live GPS insert is authorized only during driver run');
ok(/m\.role in \('coach','traceur','driver','solo'\)/.test(sql),'solo current-position ownership is explicit');
ok(/m\.role in \('coach','driver','traceur','solo'\)/.test(sql),'solo marker ownership is explicit');
ok(/me\.role='solo' and p_owner_id=uid and r\.phase in \('laying','waiting_ready','driver_running'\)/.test(sql),'solo reads only its own active trace');
ok(/me\.role='solo' and p_author_id=uid and r\.phase in \('laying','waiting_ready','driver_running'\)/.test(sql),'solo reads only its own active markers');
ok((sql.match(/not solo_mode and/g)||[]).length===4&&/role='driver'.*role='traceur'/.test(sql.replace(/\n/g,' ')),'classic driver/traceur cardinality remains guarded');
ok(!/\bdrop\s+(table|function|policy|trigger)|\bcascade\b/i.test(sql),'destructive SQL present');
ok(!/create\s+(policy|trigger)|alter\s+table|delete\s+from|truncate\s+/i.test(sql),'unexpected schema/policy mutation present');
ok(!/execute_sql|supabase\s+db\s+(query|push)|psql\s/i.test(sql+verify),'verification files must not execute SQL');
ok(/^select\b|^--/m.test(verify)&&!(/\b(insert|update|delete|create|alter|drop|grant|revoke)\b|\bdo\s+\$/i.test(verify)),'VERIFY must remain read-only');
ok(/begin_coaching_debrief_v1049|close_coaching_debrief_v1049/.test(fs.readFileSync('PISTE_V10.49_COACHING_ACTIVE_DEBRIEF.sql','utf8')),'V10.49 debrief RPCs remain present');
console.log('V10.49.1C backend static checks: PASS');
