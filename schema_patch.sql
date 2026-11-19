-- BASECAMP: kleine vervolg-migratie voor de reeds ingerichte database.
-- De oorspronkelijke database- en RLS-patches zijn al uitgevoerd.
-- Voeg de aanmaakdatum toe die de beheerpagina gebruikt.

alter table public.profiles
  add column if not exists created_at timestamptz not null default now();
