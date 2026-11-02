create table public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  slot_date date not null,
  slot_time text not null,
  is_taken boolean not null default false,
  unique (slot_date, slot_time)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null,
  sender_email text not null,
  channel text not null default 'Email',
  subject text not null,
  body text not null,
  received_at timestamptz not null default now(),
  status text not null default 'New',
  intent text, priority text, sentiment text, confidence numeric, reasoning text,
  reply_draft text, original_draft text,
  sources jsonb not null default '[]'::jsonb,
  edited boolean not null default false,
  triaged_at timestamptz, sent_at timestamptz, decided_at timestamptz,
  reject_reason text
);
create table public.proposed_actions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  action_type text not null,
  params jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete set null,
  customer_name text not null,
  booking_date date not null,
  booking_time text not null,
  party_size int not null,
  status text not null default 'Confirmed',
  created_at timestamptz not null default now()
);
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete set null,
  title text not null,
  priority text not null default 'medium',
  status text not null default 'Open',
  created_at timestamptz not null default now()
);
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  message_id uuid references public.messages(id) on delete set null,
  message_subject text,
  actor text not null,
  event text not null,
  details jsonb not null default '{}'::jsonb
);

do $$ declare t text; begin
  foreach t in array array['knowledge_base','availability','messages','proposed_actions','bookings','tickets','audit_log'] loop
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Public demo read" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

create or replace function public.reset_demo()
returns void language plpgsql security definer set search_path = public as $$
declare d int; tm text; i int; book_date date := current_date + 3;
begin
  delete from public.audit_log; delete from public.bookings; delete from public.tickets;
  delete from public.proposed_actions; delete from public.messages;
  delete from public.availability; delete from public.knowledge_base;

  insert into public.knowledge_base (title, content, sort) values
  ('Business hours', 'Kape Kultura Café & Catering (fictional), Makati. Open Monday to Saturday 7:00–20:00, Sunday 8:00–18:00. Closed on major public holidays.', 1),
  ('Menu & catering pricing', 'Café: brewed coffee PHP 120, latte PHP 160, ensaymada PHP 85, all-day silog meals PHP 220–280. Catering packages: Basic PHP 350/head (2 mains, rice, 1 dessert, iced tea); Premium PHP 550/head (3 mains, pasta, salad, 2 desserts, coffee bar). Minimum order 20 heads for catering. Catering orders need at least 3 days notice. Prices are fixed; no discounts unless approved by the manager.', 2),
  ('Delivery areas & fees', 'Delivery within Makati: PHP 80. Delivery to BGC (Taguig): PHP 120. Delivery outside Makati and BGC (e.g., Quezon City, Pasig, Manila): not available. Customers outside the area may pick up in store.', 3),
  ('Refund policy', 'Refunds or replacements only for wrong or damaged orders reported within 2 hours of delivery, with a photo of the item. Requests outside the 2-hour window or without a photo are not eligible for a refund; a team member may review case-by-case. Staff must never promise a refund before the manager verifies it.', 4),
  ('Booking rules', 'Table bookings for up to 20 people. Groups larger than 20 cannot be booked as a table reservation (suggest catering or a private event inquiry instead). Bookings need at least 24 hours notice. Only slots listed as open in the availability table can be booked (10:00, 13:00, 16:00 daily).', 5),
  ('Contact details', 'Phone: +63 2 8000 0000 (fictional). Email: hello@kapekultura.example. Address: 123 Fictional St., Legazpi Village, Makati. Instagram: @kapekultura.example', 6);

  for d in 1..14 loop
    i := 0;
    foreach tm in array array['10:00','13:00','16:00'] loop
      i := i + 1;
      insert into public.availability (slot_date, slot_time, is_taken)
      values (current_date + d, tm, ((d + i) % 3 = 0) and not (d = 3 and tm = '13:00'));
    end loop;
  end loop;

  insert into public.messages (sender_name, sender_email, channel, subject, body, received_at) values
  ('Andrea Santos', 'andrea.santos@example.com', 'Email', 'Catering for 50 pax company event', 'Hi! We are planning our company anniversary for 50 people next month. We are interested in your Premium package. How much would that cost in total, and what is included? Thanks, Andrea (Fictional Corp)', now() - interval '6 hours'),
  ('Miguel Reyes', 'miguel.r@example.com', 'Website form', 'Basic catering for a birthday', 'Hello, do you offer catering for a 25-person birthday party? Looking for something budget friendly. What is the minimum order?', now() - interval '5 hours 40 minutes'),
  ('Liza Cruz', 'liza.cruz@example.com', 'Facebook', 'Office breakfast catering?', 'Hi Kape Kultura! Do you do breakfast catering for offices? Around 30 people, every Friday. Can we get a discount for a regular order?', now() - interval '5 hours 10 minutes'),
  ('Paolo Garcia', 'paolo.garcia@example.com', 'Email', 'Table for 4 on ' || to_char(book_date, 'Dy, Mon DD'), 'Hi, I would like to book a table for 4 people on ' || to_char(book_date, 'FMDay, FMMonth DD, YYYY') || ' at 1:00 PM. Name is Paolo Garcia. Thank you!', now() - interval '4 hours 30 minutes'),
  ('Bea Villanueva', 'bea.v@example.com', 'Website form', 'Reservation for 30 people', 'Good day! Can I reserve tables for a group of 30 people on ' || to_char(current_date + 5, 'FMMonth DD') || ' at 4:00 PM for a reunion? Name: Bea Villanueva.', now() - interval '4 hours'),
  ('Carlo Mendoza', 'carlo.m@example.com', 'Facebook', 'Delivery is very late', 'My order was supposed to arrive at 12:00 and it is now 1:15 and still nothing. Order #KK-2041. This is really frustrating, I am hungry and on a lunch break.', now() - interval '3 hours 20 minutes'),
  ('Joy Navarro', 'joy.navarro@example.com', 'Email', 'Wrong item delivered', 'Hi, I ordered a Spanish latte but received an americano instead (order #KK-2055, delivered 20 minutes ago). I attached a photo of the cup and receipt. Can you help?', now() - interval '2 hours 50 minutes'),
  ('Ramon Dela Cruz', 'ramon.dc@example.com', 'Email', 'Refund for yesterday''s order', 'I want a full refund for my order yesterday (#KK-1988). The pasta was cold. I did not take a photo. Please process the refund today.', now() - interval '2 hours 20 minutes'),
  ('Trisha Lim', 'trisha.lim@example.com', 'Website form', 'Do you deliver to Quezon City?', 'Hello! I live in Quezon City (Cubao area). Do you deliver there and how much is the fee?', now() - interval '1 hour 50 minutes'),
  ('Nina Torres', 'nina.torres@example.com', 'Facebook', 'Thank you!', 'Just wanted to say your ube ensaymada and the staff at the Legazpi branch made my morning. Keep it up!', now() - interval '1 hour 20 minutes'),
  ('CryptoMax Team', 'profits@cryptomax-fictional.biz', 'Email', 'URGENT: 10x your café profits with crypto!!!', 'Dear business owner, invest $500 today in our exclusive CryptoMax coin and get guaranteed 10x returns in 7 days! Click here now: http://cryptomax-fictional.biz/invest', now() - interval '50 minutes'),
  ('SEO Rank Pro', 'outreach@seorankpro-fictional.net', 'Website form', 'Cheap backlinks for kapekultura', 'Hello webmaster, we sell 5000 high DA backlinks for only $49. Guaranteed first page on Google. Reply YES to order.', now() - interval '20 minutes');

  insert into public.audit_log (actor, event, details) values ('human', 'demo_reset', jsonb_build_object('note','Demo data restored to seed state'));
end $$;

revoke all on function public.reset_demo() from public, anon, authenticated;
grant execute on function public.reset_demo() to service_role;

select public.reset_demo();