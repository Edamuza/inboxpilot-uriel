import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function q<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as NonNullable<T>;
}

export const messagesQuery = queryOptions({
  queryKey: ["messages"],
  queryFn: () => q(supabase.from("messages").select("*").order("received_at", { ascending: false })),
});
export const messageQuery = (id: string) =>
  queryOptions({
    queryKey: ["message", id],
    queryFn: async () => {
      const [m, a, log] = await Promise.all([
        q(supabase.from("messages").select("*").eq("id", id).maybeSingle()),
        q(supabase.from("proposed_actions").select("*").eq("message_id", id).order("created_at")),
        q(supabase.from("audit_log").select("*").eq("message_id", id).order("created_at", { ascending: false })),
      ]);
      return { message: m, actions: a, log };
    },
  });
export const kbQuery = queryOptions({
  queryKey: ["kb"],
  queryFn: () => q(supabase.from("knowledge_base").select("*").order("sort").order("title")),
});
export const availabilityQuery = queryOptions({
  queryKey: ["availability"],
  queryFn: () => q(supabase.from("availability").select("*").order("slot_date").order("slot_time")),
});
export const recordsQuery = queryOptions({
  queryKey: ["records"],
  queryFn: async () => {
    const [b, t] = await Promise.all([
      q(supabase.from("bookings").select("*").order("created_at", { ascending: false })),
      q(supabase.from("tickets").select("*").order("created_at", { ascending: false })),
    ]);
    return { bookings: b, tickets: t };
  },
});
export const auditQuery = queryOptions({
  queryKey: ["audit"],
  queryFn: () => q(supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500)),
});
