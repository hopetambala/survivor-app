-- 0004_stronger_codes.sql
--
-- Widen leagues.code from char(4) (9,000 combinations) to a length-flexible
-- text column that can hold new 6-char Crockford Base32 codes (~1B combos)
-- alongside any legacy 4-digit codes already in the table.
--
-- No listings_tracker_* tables are touched.

-- char(4) pads values with trailing spaces. Convert to text while trimming
-- those pads so equality comparisons behave sanely.
alter table leagues
  alter column code type text using trim(trailing from code);

-- Re-assert uniqueness on the new type (Postgres keeps the index but the
-- constraint metadata is worth restating explicitly).
-- Note: the original `unique` on char(4) persisted through the type change,
-- so we only (re)add if it somehow isn't there.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leagues_code_key' and conrelid = 'leagues'::regclass
  ) then
    alter table leagues add constraint leagues_code_key unique (code);
  end if;
end $$;

-- Format: either legacy 4-digit numeric OR new 6-char Crockford Base32.
-- Crockford excludes I, L, O, U to avoid visual/phonetic ambiguity.
alter table leagues
  add constraint leagues_code_format
  check (
    code ~ '^[0-9]{4}$'
    or code ~ '^[0-9A-HJKMNP-TV-Z]{6}$'
  );
