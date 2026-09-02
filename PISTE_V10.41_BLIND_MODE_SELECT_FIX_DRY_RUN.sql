-- V10.41 : dry-run du privilège de lecture ciblé blind_mode.
begin;

grant select (blind_mode)
on table public.coaching_sessions
to authenticated;

-- Vérifications pendant la transaction.
select has_column_privilege('authenticated','public.coaching_sessions','blind_mode','SELECT') as blind_mode_select;
select has_table_privilege('authenticated','public.coaching_sessions','SELECT') as table_select;
select has_column_privilege('authenticated','public.coaching_sessions','planned_route','SELECT') as planned_route_select,
       has_column_privilege('authenticated','public.coaching_sessions','planned_markers','SELECT') as planned_markers_select,
       has_column_privilege('authenticated','public.coaching_sessions','odor_model','SELECT') as odor_model_select;
select count(*)::int as policy_count
from pg_policies
where schemaname='public' and tablename='coaching_sessions';

rollback;
