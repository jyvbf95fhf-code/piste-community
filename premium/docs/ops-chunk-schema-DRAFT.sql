-- DRAFT ONLY. Do not apply to production before API/client integration and tests.
-- All rows are scoped to the authenticated owner's UUID.
create table if not exists public.v2_ops_backup_chunks (
 owner_id uuid not null,
 mission_id uuid not null,
 generation_id uuid not null,
 chunk_index integer not null check (chunk_index >= 0 and chunk_index < 2000),
 chunk_total integer not null check (chunk_total between 1 and 2000),
 total_bytes integer not null check (total_bytes between 1 and 192000000),
 payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
 data_base64 text not null check (octet_length(data_base64) <= 130000),
 created_at timestamptz not null default now(),
 primary key (owner_id, mission_id, generation_id, chunk_index),
 check (chunk_index < chunk_total)
);
create index if not exists v2_ops_backup_chunks_generation
 on public.v2_ops_backup_chunks(owner_id, mission_id, generation_id);
alter table public.v2_ops_backup_chunks enable row level security;
revoke all on public.v2_ops_backup_chunks from public, anon;
grant select, insert, delete on public.v2_ops_backup_chunks to authenticated;
create policy v2_ops_chunks_select_owner on public.v2_ops_backup_chunks
 for select to authenticated using (owner_id = (select auth.uid()));
create policy v2_ops_chunks_insert_owner on public.v2_ops_backup_chunks
 for insert to authenticated with check (owner_id = (select auth.uid()));
create policy v2_ops_chunks_delete_owner on public.v2_ops_backup_chunks
 for delete to authenticated using (owner_id = (select auth.uid()));

-- A generation must only be published after every chunk is present and
-- the entire reconstructed byte stream has passed SHA-256 validation.
-- Never delete the prior generation or acknowledge a local OPS command
-- before the new generation and metadata record are committed atomically.
-- The server API must validate authenticated ownership and bound total
-- sizes; do not expose service-role credentials to the browser.
