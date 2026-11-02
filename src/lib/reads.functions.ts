import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Demo reads go through the server so the database tables stay closed to direct public access.
const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

function must<T>(r: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (r.error) throw new Error(r.error.message);
  return r.data as NonNullable<T>;
}

export const getMessages = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  return must(await db.from("messages").select("*").order("received_at", { ascending: false }));
});

export const getMessage = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const [m, a, log] = await Promise.all([
      db.from("messages").select("*").eq("id", data.id).maybeSingle(),
      db.from("proposed_actions").select("*").eq("message_id", data.id).order("created_at"),
      db.from("audit_log").select("*").eq("message_id", data.id).order("created_at", { ascending: false }),
    ]);
    if (m.error) throw new Error(m.error.message);
    return { message: m.data, actions: must(a), log: must(log) };
  });

export const getKb = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  return must(await db.from("knowledge_base").select("*").order("sort").order("title"));
});

export const getAvailability = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  return must(await db.from("availability").select("*").order("slot_date").order("slot_time"));
});

export const getRecords = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const [b, t] = await Promise.all([
    db.from("bookings").select("*").order("created_at", { ascending: false }),
    db.from("tickets").select("*").order("created_at", { ascending: false }),
  ]);
  return { bookings: must(b), tickets: must(t) };
});

export const getAudit = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  return must(await db.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500));
});
