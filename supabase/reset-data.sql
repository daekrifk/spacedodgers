-- Dodge Run – Nullstill spilldata (kjør i Supabase SQL Editor)
--
-- Dette sletter ALLE scores, statistikk og chat-meldinger.
-- Brukerkontoer (e-post / innlogging) beholdes – se nederst for full reset.

delete from public.chat_messages;
delete from public.scores;
delete from public.player_stats;

-- Valgfritt: nullstill statistikk-rader for eksisterende brukere (tomme tall)
-- insert into public.player_stats (user_id)
-- select id from public.profiles
-- on conflict (user_id) do update set
--     games_played = 0,
--     total_score = 0,
--     best_level = 1,
--     total_play_seconds = 0,
--     last_played_at = null,
--     updated_at = now();

-- ─────────────────────────────────────────────────────────────────────────────
-- FULL RESET (alle brukere også)
-- ─────────────────────────────────────────────────────────────────────────────
-- SQL alene kan ikke slette auth-brukere trygt herfra.
-- Gjør dette i Supabase Dashboard:
--
--   1. Authentication → Users
--   2. Velg alle brukere → Delete users
--
-- Da slettes også profiles, scores, player_stats og chat (cascade).
-- Deretter kan alle registrere seg på nytt.
--
-- Etter full reset: kjør på nytt i rekkefølge:
--   schema.sql → chat.sql → stats.sql
