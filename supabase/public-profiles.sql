-- Dodge Run – Offentlige profiler (kjør i Supabase SQL Editor etter stats.sql)
--
-- Lar innloggede spillere lese hverandres player_stats (badges/stats i profilvisning).
-- scores og profiles er allerede lesbare for authenticated.

create policy "player_stats_select_authenticated"
    on public.player_stats
    for select
    to authenticated
    using (true);
