-- Dodge Run – Player stats (kjør i Supabase SQL Editor etter schema.sql)

create table if not exists public.player_stats (
    user_id uuid primary key references public.profiles (id) on delete cascade,
    games_played integer not null default 0 check (games_played >= 0),
    total_score bigint not null default 0 check (total_score >= 0),
    best_level integer not null default 1 check (best_level >= 1),
    total_play_seconds integer not null default 0 check (total_play_seconds >= 0),
    last_played_at timestamptz,
    updated_at timestamptz not null default now()
);

alter table public.player_stats enable row level security;

drop policy if exists "player_stats_select_own" on public.player_stats;

create policy "player_stats_select_own"
    on public.player_stats
    for select
    to authenticated
    using (auth.uid() = user_id);

-- Atomisk: oppdater leaderboard-rekord + aggregert statistikk per runde
create or replace function public.finish_game_run(
    p_score integer,
    p_level integer,
    p_duration_sec integer
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

    if p_score < 0 or p_level < 1 or p_duration_sec < 0 or p_duration_sec > 86400 then
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
        last_played_at,
        updated_at
    )
    values (auth.uid(), 1, p_score, p_level, p_duration_sec, now(), now())
    on conflict (user_id) do update
        set
            games_played = public.player_stats.games_played + 1,
            total_score = public.player_stats.total_score + p_score,
            best_level = greatest(public.player_stats.best_level, p_level),
            total_play_seconds = public.player_stats.total_play_seconds + p_duration_sec,
            last_played_at = now(),
            updated_at = now();
end;
$$;

grant execute on function public.finish_game_run(integer, integer, integer) to authenticated;

-- Opprett tom stats-rad for innlogget bruker (f.eks. konto fra før stats fantes)
create or replace function public.ensure_player_stats()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    insert into public.player_stats (user_id)
    values (auth.uid())
    on conflict (user_id) do nothing;
end;
$$;

grant execute on function public.ensure_player_stats() to authenticated;

-- Backfill: alle eksisterende profiler får stats-rad
insert into public.player_stats (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- Opprett player_stats-rad for nye brukere
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, display_name)
    values (
        new.id,
        coalesce(
            nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
            split_part(new.email, '@', 1)
        )
    );

    insert into public.player_stats (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

    return new;
end;
$$;
