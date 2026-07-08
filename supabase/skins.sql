-- Dodge Run – Skins / badges (kjør i Supabase SQL Editor etter schema.sql + stats.sql)
--
-- Badges regnes ut på klienten fra eksisterende stats (scores.score,
-- player_stats.best_level / total_play_seconds / games_played), så vi trenger
-- ingen egen badge-tabell. Vi lagrer kun hvilken farge spilleren har utstyrt.

alter table public.profiles
    add column if not exists equipped_skin text;

-- profiles har allerede "profiles_update_own"-policy (se schema.sql), så en
-- innlogget bruker kan oppdatere sin egen equipped_skin direkte fra klienten.
