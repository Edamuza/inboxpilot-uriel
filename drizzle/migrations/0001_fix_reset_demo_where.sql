create or replace function public.reset_demo()
returns void language plpgsql security definer set search_path = public as $$
declare d int; tm text; i int; book_date date := current_date + 3;
begin
  delete from public.audit_log where true; delete from public.bookings where true; delete from public.tickets where true;
  delete from public.proposed_actions where true; delete from public.messages where true;
  delete from public.availability where true; delete from public.knowledge_base where true;

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