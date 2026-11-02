do $$ declare t text; begin
  foreach t in array array['knowledge_base','availability','messages','proposed_actions','bookings','tickets','audit_log'] loop
    execute format('drop policy if exists "Public demo read" on public.%I', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;