begin;

create or replace function private.social_notification_count(since_at timestamptz)
returns bigint
language sql
stable
security definer
set search_path = ''
as $function$
  with reactions as (
    select l.activity_type, l.activity_id, l.user_id, l.created_at from public.activity_likes l
    union all
    select c.activity_type, c.activity_id, c.user_id, c.created_at from public.activity_comments c
  )
  select count(*) from reactions r
  where auth.uid() is not null
    and r.user_id <> auth.uid()
    and r.created_at > coalesce(since_at, 'epoch'::timestamptz)
    and (
      (r.activity_type='operational' and exists (
        select 1 from public.pistes p where p.id=r.activity_id and p.owner_id=auth.uid()
      ))
      or
      (r.activity_type='training' and exists (
        select 1 from public.entrainements e where e.id=r.activity_id and e.owner_id=auth.uid()
      ))
    );
$function$;

create or replace function public.get_social_notification_count(since_at timestamptz default null)
returns bigint language sql stable set search_path = ''
as $function$ select private.social_notification_count(since_at); $function$;

revoke execute on function public.get_social_notification_count(timestamptz) from public, anon;
grant execute on function public.get_social_notification_count(timestamptz) to authenticated;
revoke execute on function private.social_notification_count(timestamptz) from public, anon;
grant execute on function private.social_notification_count(timestamptz) to authenticated;

commit;
