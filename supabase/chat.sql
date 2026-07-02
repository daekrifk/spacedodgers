-- Dodge Run – Chat (kjør i Supabase SQL Editor etter schema.sql)

create table if not exists public.chat_messages (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id) on delete cascade,
    display_name text not null,
    body text not null check (char_length(body) between 1 and 200),
    is_flame boolean not null default false,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists chat_messages_created_at_idx on public.chat_messages (created_at desc);
create index if not exists chat_messages_expires_at_idx on public.chat_messages (expires_at);

alter table public.chat_messages enable row level security;

create policy "chat_select_authenticated" on public.chat_messages for select to authenticated using (true);
create policy "chat_insert_own" on public.chat_messages for insert to authenticated with check (auth.uid() = user_id);

revoke delete on public.chat_messages from authenticated;
revoke update on public.chat_messages from authenticated;

create or replace function public.purge_expired_chat()
returns void language plpgsql security definer set search_path = public as $$
begin
    delete from public.chat_messages where expires_at < now();
end; $$;

grant execute on function public.purge_expired_chat() to authenticated;

create or replace function public.send_chat_message(p_body text, p_is_flame boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare
    v_body text;
    v_display_name text;
    v_id uuid;
    v_flames text[] := array['🔥 Nice try!','🔥 Too slow!','🔥 Git gud','🔥 Is that your best?','🔥 Dodge better!','🔥 L + ratio','🔥 Skill issue','🔥 Come back when you''re ready'];
begin
    if auth.uid() is null then raise exception 'Not authenticated'; end if;
    select display_name into v_display_name from public.profiles where id = auth.uid();
    if v_display_name is null then raise exception 'Profile not found'; end if;
    if p_is_flame then
        v_body := v_flames[1 + floor(random() * array_length(v_flames, 1))::int];
    else
        v_body := trim(coalesce(p_body, ''));
        if char_length(v_body) < 1 or char_length(v_body) > 200 then raise exception 'Message must be 1-200 characters'; end if;
        if v_body ~ '[<>]' then raise exception 'Message contains invalid characters'; end if;
    end if;
    insert into public.chat_messages (user_id, display_name, body, is_flame, expires_at)
    values (auth.uid(), v_display_name, v_body, coalesce(p_is_flame, false), now() + interval '24 hours')
    returning id into v_id;
    return v_id;
end; $$;

grant execute on function public.send_chat_message(text, boolean) to authenticated;
alter publication supabase_realtime add table chat_messages;
