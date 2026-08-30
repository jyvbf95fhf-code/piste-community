-- PISTE Community V10.34 — Mes pistes, archivage et partage unifié
-- À examiner puis exécuter manuellement dans le SQL Editor Supabase.
-- Ce fichier n'est jamais exécuté automatiquement par l'application.

begin;

alter table public.pistes
  add column if not exists archived_at timestamptz,
  add column if not exists share_token uuid,
  alter column visibility set default 'private';
alter table public.entrainements
  add column if not exists archived_at timestamptz,
  add column if not exists share_token uuid,
  alter column visibility set default 'private';

alter table public.pistes drop constraint if exists pistes_visibility_check;
alter table public.pistes add constraint pistes_visibility_check
  check (visibility in ('private','friends','community','public'));
alter table public.entrainements drop constraint if exists entrainements_visibility_check;
alter table public.entrainements add constraint entrainements_visibility_check
  check (visibility in ('private','friends','community','public'));

alter table public.training_routes
  add column if not exists archived_at timestamptz,
  add column if not exists visibility text not null default 'private',
  add column if not exists share_token uuid,
  add column if not exists is_favorite boolean not null default false,
  add column if not exists tags text[] not null default '{}'::text[];
alter table public.training_routes drop constraint if exists training_routes_visibility_check;
alter table public.training_routes add constraint training_routes_visibility_check
  check (visibility in ('private','community','public'));

alter table public.coaching_sessions
  add column if not exists archived_at timestamptz,
  add column if not exists visibility_scope text not null default 'private',
  add column if not exists share_token uuid,
  add column if not exists is_favorite boolean not null default false,
  add column if not exists tags text[] not null default '{}'::text[];
alter table public.coaching_sessions drop constraint if exists coaching_sessions_visibility_scope_check;
alter table public.coaching_sessions add constraint coaching_sessions_visibility_scope_check
  check (visibility_scope in ('private','community','public'));

create unique index if not exists pistes_share_token_uidx on public.pistes(share_token) where share_token is not null;
create unique index if not exists entrainements_share_token_uidx on public.entrainements(share_token) where share_token is not null;
create unique index if not exists training_routes_share_token_uidx on public.training_routes(share_token) where share_token is not null;
create unique index if not exists coaching_sessions_share_token_uidx on public.coaching_sessions(share_token) where share_token is not null;
create index if not exists pistes_owner_archive_idx on public.pistes(owner_id,archived_at);
create index if not exists entrainements_owner_archive_idx on public.entrainements(owner_id,archived_at);
create index if not exists training_routes_owner_archive_idx on public.training_routes(owner_id,archived_at);
create index if not exists coaching_sessions_owner_archive_idx on public.coaching_sessions(owner_id,archived_at);

-- Une piste OPS partagée ne révèle pas ses extrémités et ses coordonnées sont
-- arrondies à environ 100 m. Les autres tracés sont arrondis plus finement.
create or replace function private.safe_public_track(p_track jsonb,p_operational boolean default false)
returns jsonb
language sql
immutable
set search_path=''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'lat',round((point->>'lat')::numeric,case when p_operational then 3 else 5 end),
    'lon',round((point->>'lon')::numeric,case when p_operational then 3 else 5 end)
  ) order by ord),'[]'::jsonb)
  from jsonb_array_elements(case when jsonb_typeof(p_track)='array' then p_track else '[]'::jsonb end) with ordinality as e(point,ord)
  where not p_operational
     or ord between greatest(1,ceil(jsonb_array_length(p_track)*0.10)::integer)
                and greatest(1,floor(jsonb_array_length(p_track)*0.90)::integer)
$$;

-- Lecture d'un lien public : seules les données expressément préparées pour
-- le partage sont renvoyées. Aucune ligne brute n'est ouverte au rôle anon.
create or replace function public.get_public_activity(p_type text,p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare v_result jsonb;
begin
  if p_type='operational' then
    select jsonb_build_object('type','operational','name','Piste OPS partagée','date',date,
      'distance_km',distance_km,'duree_h',duree_h,'resultat',resultat,'commune_depart','Secteur protégé',
      'track',private.safe_public_track(track,true)) into v_result
    from public.pistes where share_token=p_token and visibility='public';
  elsif p_type='training' then
    select jsonb_build_object('type','training','name',coalesce(activity_name,'Entraînement'),'date',date,
      'distance_km',distance_km,'duree_h',duree_h,'resultat',resultat,'commune_depart',commune_depart,
      'track',private.safe_public_track(track,false)) into v_result
    from public.entrainements where share_token=p_token and visibility='public';
  elsif p_type='prepared' then
    select jsonb_build_object('type','prepared','name',name,'date',created_at,'distance_km',planned_distance_km,
      'duree_h',null,'resultat','Tracé préparé','commune_depart',null,
      'track',private.safe_public_track(route,false)) into v_result
    from public.training_routes where share_token=p_token and visibility='public';
  elsif p_type='coaching' then
    select jsonb_build_object('type','coaching','name',s.name,'date',s.ended_at,'distance_km',null,
      'duree_h',extract(epoch from (s.ended_at-s.started_at))/3600,'resultat','Débrief Coaching publié',
      'commune_depart',null,'track',private.safe_public_track(s.planned_route,false)) into v_result
    from public.coaching_sessions s
    where s.share_token=p_token and s.visibility_scope='public' and s.status='ended'
      and exists(select 1 from public.coaching_debriefs d where d.session_id=s.id and d.publication_status='published');
  end if;
  return v_result;
end
$$;

-- Fil communautaire nettoyé. Les sessions Coaching n'apparaissent qu'une
-- fois terminées et après publication de leur débrief.
create or replace function public.get_community_activity_feed()
returns jsonb
language sql
stable
security definer
set search_path=''
as $$
  select coalesce(jsonb_agg(to_jsonb(feed) order by feed.created_at desc),'[]'::jsonb)
  from (
    select p.id,p.owner_id,p.dog_id,p.date,p.distance_km,p.duree_h,p.delai_h,
      case when p.visibility='public' then 'Secteur protégé' else null end as commune_depart,
      p.age,p.milieu,p.resultat,p.created_at,private.safe_public_track(p.track,true) as track,
      'operational'::text as activity_type,p.visibility
    from public.pistes p where p.visibility in ('community','public') and p.archived_at is null
    union all
    select e.id,e.owner_id,e.dog_id,e.date,e.distance_km,e.duree_h,e.delai_h,e.commune_depart,
      e.age,e.milieu,e.resultat,e.created_at,private.safe_public_track(e.track,false),
      'training'::text,e.visibility
    from public.entrainements e where e.visibility in ('community','public') and e.archived_at is null
    union all
    select s.id,s.owner_id,s.dog_id,s.ended_at::date,null::numeric,
      extract(epoch from (s.ended_at-s.started_at))/3600,null::numeric,null::text,null::text,null::text,
      'Débrief Coaching publié'::text,s.ended_at,private.safe_public_track(s.planned_route,false),
      'coaching'::text,s.visibility_scope
    from public.coaching_sessions s
    where s.visibility_scope in ('community','public') and s.status='ended' and s.archived_at is null
      and exists(select 1 from public.coaching_debriefs d where d.session_id=s.id and d.publication_status='published')
  ) feed
$$;

revoke all on function public.get_public_activity(text,uuid) from public;
grant execute on function public.get_public_activity(text,uuid) to anon,authenticated;
revoke all on function public.get_community_activity_feed() from public,anon;
grant execute on function public.get_community_activity_feed() to authenticated;

commit;

-- Vérification en lecture seule : quatre familles doivent apparaître.
select table_name,column_name,data_type
from information_schema.columns
where table_schema='public'
  and table_name in ('pistes','entrainements','training_routes','coaching_sessions')
  and column_name in ('archived_at','visibility','visibility_scope','share_token','is_favorite','tags')
order by table_name,column_name;
