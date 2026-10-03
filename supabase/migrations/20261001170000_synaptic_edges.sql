-- GafCoreAI · Red neuronal entre agentes (Fase 2)
-- Pesos aprendidos de enrutamiento: task_type -> agent, agent -> agent (handoff), agent -> tool.
-- Solo se sincronizan aristas cuyo origen es agent:* o task_type:*; los facts/decisiones de cada
-- conversacion NO salen del equipo local.

create schema if not exists gafcoreai;

create table if not exists gafcoreai.synaptic_edges (
  source      text             not null check (source ~ '^(agent|task_type):[A-Za-z0-9_.\-]{1,60}$'),
  target      text             not null check (char_length(target) between 3 and 120),
  relation    text             not null default 'related_to' check (char_length(relation) <= 40),
  weight      double precision not null default 1.0 check (weight >= 0 and weight <= 10),
  successes   integer          not null default 0 check (successes >= 0),
  failures    integer          not null default 0 check (failures >= 0),
  updated_at  timestamptz      not null default now(),
  primary key (source, target)
);

create index if not exists synaptic_edges_updated_at_idx on gafcoreai.synaptic_edges (updated_at desc);

alter table gafcoreai.synaptic_edges enable row level security;

grant usage on schema gafcoreai to anon, authenticated, service_role;
-- Los default privileges del stack dan ALL a anon; TRUNCATE ignora RLS, asi que se revoca explicito.
revoke all on gafcoreai.synaptic_edges from anon, authenticated;
grant select, insert, update on gafcoreai.synaptic_edges to anon, authenticated;
grant all on gafcoreai.synaptic_edges to service_role;

drop policy if exists synaptic_edges_read on gafcoreai.synaptic_edges;
create policy synaptic_edges_read on gafcoreai.synaptic_edges
  for select to anon, authenticated using (true);

drop policy if exists synaptic_edges_insert on gafcoreai.synaptic_edges;
create policy synaptic_edges_insert on gafcoreai.synaptic_edges
  for insert to anon, authenticated with check (true);

drop policy if exists synaptic_edges_update on gafcoreai.synaptic_edges;
create policy synaptic_edges_update on gafcoreai.synaptic_edges
  for update to anon, authenticated using (true) with check (true);

notify pgrst, 'reload schema';
