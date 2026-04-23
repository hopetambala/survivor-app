-- 0008_reset_scoring_rules_rpc.sql
--
-- Atomic replacement of a league's scoring rules. The old admin flow deleted
-- the existing rules then inserted a new batch from the client — if the
-- insert failed after the delete, the league was left with zero rules and
-- scoring broke. This RPC wraps both in one transaction so a failure rolls
-- back to the original state.
--
-- Scoped to survivor-app tables; no listings_tracker_* changes.

create or replace function public.reset_scoring_rules(
  p_league_id uuid,
  p_rules     jsonb
)
returns void
language plpgsql security invoker set search_path = public
as $$
begin
  if jsonb_typeof(p_rules) <> 'array' then
    raise exception 'p_rules must be a JSON array' using errcode = 'P0001';
  end if;

  delete from scoring_rules where league_id = p_league_id;

  insert into scoring_rules (league_id, event_name, points, description, is_variable, sort_order)
  select
    p_league_id,
    elem->>'event_name',
    (elem->>'points')::numeric,
    nullif(elem->>'description', ''),
    coalesce((elem->>'is_variable')::boolean, false),
    coalesce((elem->>'sort_order')::int, 0)
  from jsonb_array_elements(p_rules) as elem;
end;
$$;

grant execute on function public.reset_scoring_rules(uuid, jsonb) to authenticated;
