-- webhook_events table for idempotency
create table if not exists public.webhook_events (
  id text primary key,
  provider text not null,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.webhook_events enable row level security;

drop policy if exists wh_insert on public.webhook_events;
create policy wh_insert on public.webhook_events for insert to public with check (false);
drop policy if exists wh_select on public.webhook_events;
create policy wh_select on public.webhook_events for select to public using (false);

-- notify_user function
create or replace function public.notify_user(p_user_id uuid, p_filing_id uuid, p_subject text, p_body text)
returns void
language plpgsql security definer
as $$
declare
  v_user uuid;
begin
  if p_user_id is null then
    select user_id into v_user from public.filings where id = p_filing_id limit 1;
  else
    v_user := p_user_id;
  end if;

  if v_user is null then
    return;
  end if;

  insert into public.notifications (user_id, filing_id, title, message, type, read)
  values (v_user, p_filing_id, p_subject, p_body, 'info', false);
end$$;

revoke all on function public.notify_user(uuid, uuid, text, text) from public;
grant execute on function public.notify_user(uuid, uuid, text, text) to service_role;

-- pending_deadlines_window function for deadline reminders
create or replace function public.pending_deadlines_window(p_days_ahead int)
returns table (
  id uuid,
  user_id uuid,
  filing_id uuid,
  due_at timestamptz,
  title text,
  email text
)
language sql security definer
as $$
  select d.id, f.user_id, d.filing_id, d.due_on as due_at, coalesce(d.label, f.title) as title, p.email
  from public.deadlines d
  join public.filings f on f.id = d.filing_id
  join public.profiles p on p.user_id = f.user_id
  where d.done = false
    and d.due_on >= now()
    and d.due_on < (now() + (p_days_ahead || ' days')::interval);
$$;

revoke all on function public.pending_deadlines_window(int) from public;
grant execute on function public.pending_deadlines_window(int) to service_role;