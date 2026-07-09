-- Dodge Run – Near-miss combo (kjør i Supabase SQL Editor etter stats.sql)
--
-- Lagrer spillerens beste combo (flest near-misses på rad i én runde).

alter table public.player_stats
    add column if not exists best_combo integer not null default 0 check (best_combo >= 0);

-- Fjern den gamle 3-arg-signaturen og erstatt med versjon som tar best_combo.
drop function if exists public.finish_game_run(integer, integer, integer);

create or replace function public.finish_game_run(
    p_score integer,
    p_level integer,
    p_duration_sec integer,
    p_best_combo integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    if p_score < 0 or p_level < 1 or p_duration_sec < 0 or p_duration_sec > 86400
        or p_best_combo < 0 then
        raise exception 'Invalid game run data';
    end if;

    insert into public.scores (user_id, score, level, updated_at)
    values (auth.uid(), p_score, p_level, now())
    on conflict (user_id) do update
        set
            score = greatest(public.scores.score, excluded.score),
            level = case
                when excluded.score > public.scores.score then excluded.level
                else public.scores.level
            end,
            updated_at = case
                when excluded.score > public.scores.score then now()
                else public.scores.updated_at
            end;

    insert into public.player_stats (
        user_id,
        games_played,
        total_score,
        best_level,
        total_play_seconds,
        best_combo,
        last_played_at,
        updated_at
    )
    values (auth.uid(), 1, p_score, p_level, p_duration_sec, p_best_combo, now(), now())
    on conflict (user_id) do update
        set
            games_played = public.player_stats.games_played + 1,
            total_score = public.player_stats.total_score + p_score,
            best_level = greatest(public.player_stats.best_level, p_level),
            total_play_seconds = public.player_stats.total_play_seconds + p_duration_sec,
            best_combo = greatest(public.player_stats.best_combo, p_best_combo),
            last_played_at = now(),
            updated_at = now();
end;
$$;

grant execute on function public.finish_game_run(integer, integer, integer, integer) to authenticated;
