-- Fix search_path security warnings for functions

-- Fix notify_user function
create or replace function public.notify_user(p_user_id uuid, p_filing_id uuid, p_subject text, p_body text)
returns void
language plpgsql security definer
set search_path = public
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

-- Fix pending_deadlines_window function
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
set search_path = public
as $$
  select d.id, f.user_id, d.filing_id, d.due_on as due_at, coalesce(d.label, f.title) as title, p.email
  from public.deadlines d
  join public.filings f on f.id = d.filing_id
  join public.profiles p on p.user_id = f.user_id
  where d.done = false
    and d.due_on >= now()
    and d.due_on < (now() + (p_days_ahead || ' days')::interval);
$$;