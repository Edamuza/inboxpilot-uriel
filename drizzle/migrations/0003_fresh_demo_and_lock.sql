alter function public.reset_demo() rename to reset_demo_unlocked;
revoke all on function public.reset_demo_unlocked() from public, anon, authenticated;

create or replace function public.reset_demo()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(424242);
  perform public.reset_demo_unlocked();
end $$;
revoke all on function public.reset_demo() from public, anon, authenticated;
grant execute on function public.reset_demo() to service_role;

create or replace function public.ensure_fresh_demo()
returns text language plpgsql security definer set search_path = public as $$
declare newest timestamptz; d int; tm text; i int;
begin
  perform pg_advisory_xact_lock(424242);
  select max(created_at) into newest from public.audit_log;
  if newest is null or newest < now() - interval '24 hours' then
    perform public.reset_demo_unlocked();
    return 'reset';
  end if;
  for d in 1..14 loop
    i := 0;
    foreach tm in array array['10:00','13:00','16:00'] loop
      i := i + 1;
      insert into public.availability (slot_date, slot_time, is_taken)
      values (current_date + d, tm, ((d + i) % 3 = 0))
      on conflict (slot_date, slot_time) do nothing;
    end loop;
  end loop;
  delete from public.availability a
  where a.slot_date <= current_date
    and not exists (select 1 from public.bookings b where b.booking_date = a.slot_date and b.booking_time = a.slot_time);
  return 'topped_up';
end $$;
revoke all on function public.ensure_fresh_demo() from public, anon, authenticated;
grant execute on function public.ensure_fresh_demo() to service_role;