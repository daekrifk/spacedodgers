-- Dodge Run – Supabase schema
-- Kjør hele filen i Supabase SQL Editor (Dashboard → SQL → New query)

-- Profiles: visningsnavn per bruker
create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    display_name text not null,
    created_at timestamptz not null default now()
);

-- Scores: én rad per bruker (personlig rekord)
create table if not exists public.scores (
    user_id uuid primary key references public.profiles (id) on delete cascade,
    score integer not null default 0 check (score >= 0),
    level integer not null default 1 check (level >= 1),
    updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.scores enable row level security;

-- Profiles: alle innloggede kan lese
create policy "profiles_select_authenticated"
    on public.profiles
    for select
    to authenticated
    using (true);

create policy "profiles_update_own"
    on public.profiles
    for update
    to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- Scores: alle innloggede kan lese leaderboard
create policy "scores_select_authenticated"
    on public.scores
    for select
    to authenticated
    using (true);

create policy "scores_insert_own"
    on public.scores
    for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "scores_update_own"
    on public.scores
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Oppdater score kun hvis ny score er høyere
create or replace function public.submit_score(p_score integer, p_level integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
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
end;
$$;

grant execute on function public.submit_score(integer, integer) to authenticated;

-- Opprett profil når ny bruker registreres
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
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();
