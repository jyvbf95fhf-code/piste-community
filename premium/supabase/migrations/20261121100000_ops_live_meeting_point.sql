create or replace function public.ops_live_validate_metadata(p jsonb)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare e jsonb; q jsonb;
begin
 if p is null or jsonb_typeof(p)<>'object' or p-array['state','dogName','handlerName','trackingSeconds','trackAge','events','meetingPoint']<>'{}'::jsonb
 or octet_length(p::text)>65536 then return false; end if;
 if p ? 'state' and p->>'state' not in ('Prêt','En cours','Pause','Fin de piste') then return false; end if;
 if p ? 'trackingSeconds' and p->'trackingSeconds'<>'null'::jsonb and
 (jsonb_typeof(p->'trackingSeconds')<>'number' or (p->>'trackingSeconds')::numeric<0 or trunc((p->>'trackingSeconds')::numeric)<>(p->>'trackingSeconds')::numeric) then return false; end if;
 foreach q in array array[p->'dogName',p->'handlerName',p->'trackAge'] loop
 if q is not null and q<>'null'::jsonb and (jsonb_typeof(q)<>'string' or length(q#>>'{}')>160) then return false; end if; end loop;
 if p ? 'meetingPoint' and (jsonb_typeof(p->'meetingPoint')<>'string'
   or length(p->>'meetingPoint') not between 1 and 160
   or btrim(p->>'meetingPoint')='' or p->>'meetingPoint' ~ '[[:cntrl:]]') then return false; end if;
 if p ? 'events' then
  if jsonb_typeof(p->'events')<>'array' or jsonb_array_length(p->'events')>500 then return false; end if;
  for e in select value from jsonb_array_elements(p->'events') loop
   if jsonb_typeof(e)<>'object' or e-array['id','type','elapsedMs','point']<>'{}'::jsonb
    or e->>'type' is null or e->>'type' not in ('Départ','Rupture','Reprise','Indice','Objet trouvé','Zone particulière','Changement notable','Fin de piste') then return false; end if;
   if e ? 'id' and (jsonb_typeof(e->'id')<>'string' or length(e->>'id')>160) then return false; end if;
   if e ? 'elapsedMs' and (jsonb_typeof(e->'elapsedMs')<>'number' or (e->>'elapsedMs')::numeric<0) then return false; end if;
   if e ? 'point' then q=e->'point';
    if jsonb_typeof(q)<>'object' or q-array['latitude','longitude','space']<>'{}'::jsonb
      or jsonb_typeof(q->'latitude') is distinct from 'number' or jsonb_typeof(q->'longitude') is distinct from 'number'
      or (q->>'latitude')::numeric not between -90 and 90 or (q->>'longitude')::numeric not between -180 and 180
      or q->>'space' is distinct from 'wgs84' then return false; end if;
   end if;
  end loop;
 end if;
 return true;
exception when others then return false;
end $$;

alter table public.ops_live_publications
 drop constraint ops_live_publications_projection_metadata_check,
 add constraint ops_live_publications_projection_metadata_check
 check (public.ops_live_validate_metadata(projection_metadata));
