-- Dodge Run – Fiks statistikk (kjør hvis kun personlig rekord oppdateres)
-- Supabase SQL Editor → New query → Run
--
-- Hvis finish_game_run mangler helt: kjør hele stats.sql først.

insert into public.player_stats (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

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
