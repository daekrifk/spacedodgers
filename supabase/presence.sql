-- Dodge Run – Online-telling (kjør i Supabase SQL Editor etter schema.sql)

create table if not exists public.player_presence (
    user_id uuid primary key references public.profiles (id) on delete cascade,
    last_seen_at timestamptz not null default now(),
    is_playing boolean not null default false
);

create index if not exists player_presence_last_seen_idx
    on public.player_presence (last_seen_at desc);

create index if not exists player_presence_playing_idx
    on public.player_presence (is_playing, last_seen_at desc);

alter table public.player_presence enable row level security;

-- Kun RPC (security definer) – ingen direkte klient-tilgang

create or replace function public.heartbeat(p_is_playing boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    insert into public.player_presence (user_id, last_seen_at, is_playing)
    values (auth.uid(), now(), coalesce(p_is_playing, false))
    on conflict (user_id) do update
        set
            last_seen_at = now(),
            is_playing = coalesce(p_is_playing, false);
end;
$$;

grant execute on function public.heartbeat(boolean) to authenticated;

create or replace function public.get_community_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    v_total bigint;
    v_online bigint;
    v_playing bigint;
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    select count(*) into v_total from public.profiles;

    select count(*) into v_online
    from public.player_presence
    where last_seen_at > now() - interval '2 minutes';

    select count(*) into v_playing
    from public.player_presence
    where is_playing = true
        and last_seen_at > now() - interval '90 seconds';

    return json_build_object(
        'total_users', v_total,
        'online_now', v_online,
        'playing_now', v_playing
    );
end;
$$;

grant execute on function public.get_community_stats() to authenticated;

-- Rydd bort gamle presence-rader (valgfritt ved heartbeat-kall fra mange klienter)
create or replace function public.purge_stale_presence()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    delete from public.player_presence
    where last_seen_at < now() - interval '10 minutes';
end;
$$;

grant execute on function public.purge_stale_presence() to authenticated;
