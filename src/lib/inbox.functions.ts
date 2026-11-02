import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

export const messageInput = z.object({
  sender_name: z.string().trim().min(1).max(200),
  sender_email: z.string().trim().email().max(320),
  channel: z.enum(["Email", "Facebook", "Website form"]),
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(5000),
});

export const triageMessage = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { runAgent } = await import("./agent.server");
    return runAgent(db, data.id);
  });

export const simulateMessage = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof messageInput>) => messageInput.parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: row, error } = await db.from("messages").insert({ ...data, status: "New" }).select("id").single();
    if (error) throw new Error("Could not add message");
    await db.from("audit_log").insert({ message_id: row.id, message_subject: data.subject, actor: "human", event: "message_simulated", details: { channel: data.channel } });
    return { id: row.id };
  });

export const saveDraft = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; reply: string }) => z.object({ id: z.string().uuid(), reply: z.string().max(10000) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: m } = await db.from("messages").select("subject,original_draft").eq("id", data.id).single();
    const edited = (m?.original_draft ?? "") !== data.reply;
    await db.from("messages").update({ reply_draft: data.reply, edited }).eq("id", data.id);
    await db.from("audit_log").insert({ message_id: data.id, message_subject: m?.subject ?? null, actor: "human", event: "draft_edited", details: { edited_vs_agent: edited, length: data.reply.length } });
    return { ok: true };
  });

export const rejectMessage = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; reason: string }) => z.object({ id: z.string().uuid(), reason: z.string().trim().min(1).max(1000) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: m } = await db.from("messages").select("subject").eq("id", data.id).single();
    await db.from("messages").update({ status: "Rejected", reject_reason: data.reason, decided_at: new Date().toISOString() }).eq("id", data.id);
    await db.from("proposed_actions").update({ status: "rejected" }).eq("message_id", data.id).eq("status", "pending");
    await db.from("audit_log").insert({ message_id: data.id, message_subject: m?.subject ?? null, actor: "human", event: "rejected", details: { reason: data.reason } });
    return { ok: true };
  });

export const approveMessage = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; reply: string | null; approvedActionIds: string[] }) =>
    z.object({ id: z.string().uuid(), reply: z.string().max(10000).nullable(), approvedActionIds: z.array(z.string().uuid()) }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: m } = await db.from("messages").select("*").eq("id", data.id).single();
    if (!m) throw new Error("Message not found");
    if (m.status !== "Awaiting approval") return { ok: false as const, error: `Message is ${m.status}, not awaiting approval.` };
    const log = (event: string, details: Record<string, unknown>) =>
      db.from("audit_log").insert({ message_id: m.id, message_subject: m.subject, actor: "human", event, details: details as never });

    const { data: actions } = await db.from("proposed_actions").select("*").eq("message_id", m.id).eq("status", "pending");
    let spam = false;
    const results: string[] = [];
    for (const a of actions ?? []) {
      if (!data.approvedActionIds.includes(a.id)) {
        await db.from("proposed_actions").update({ status: "rejected" }).eq("id", a.id);
        await log("action_declined", { action: a.action_type, params: a.params });
        continue;
      }
      const p = a.params as Record<string, string | number>;
      if (a.action_type === "create_booking") {
        const { data: slot } = await db.from("availability").select("id,is_taken").eq("slot_date", String(p["date"])).eq("slot_time", String(p["time"])).maybeSingle();
        if (!slot || slot.is_taken) {
          await db.from("proposed_actions").update({ status: "failed" }).eq("id", a.id);
          await log("action_failed", { action: a.action_type, reason: "Slot no longer open", params: p });
          results.push("booking failed: slot taken");
          continue;
        }
        await db.from("availability").update({ is_taken: true }).eq("id", slot.id);
        await db.from("bookings").insert({ message_id: m.id, customer_name: String(p["name"]), booking_date: String(p["date"]), booking_time: String(p["time"]), party_size: Number(p["party_size"]) });
      } else if (a.action_type === "create_ticket") {
        await db.from("tickets").insert({ message_id: m.id, title: String(p["title"]), priority: String(p["priority"] ?? "medium") });
      } else if (a.action_type === "flag_spam") {
        spam = true;
      }
      await db.from("proposed_actions").update({ status: "executed" }).eq("id", a.id);
      await log("action_executed", { action: a.action_type, params: p });
      results.push(a.action_type);
    }

    const now = new Date().toISOString();
    if (spam) {
      await db.from("messages").update({ status: "Spam", decided_at: now }).eq("id", m.id);
      await log("approved", { outcome: "marked spam", actions: results });
    } else {
      const reply = data.reply ?? m.reply_draft ?? "";
      const edited = reply !== (m.original_draft ?? "");
      await db.from("messages").update({ status: "Sent", reply_draft: reply, edited, sent_at: now, decided_at: now }).eq("id", m.id);
      await log("approved", { edited, actions: results });
      await log("reply_sent_simulated", { to: m.sender_email, channel: m.channel, note: "Simulated — no real email sent", chars: reply.length });
    }
    return { ok: true as const };
  });

export const resetDemo = createServerFn({ method: "POST" }).handler(async () => {
  const db = await admin();
  const { error } = await db.rpc("reset_demo");
  if (error) throw new Error("Reset failed");
  return { ok: true };
});

const kbInput = z.object({ id: z.string().uuid().nullable(), title: z.string().trim().min(1).max(200), content: z.string().trim().min(1).max(5000) });
export const upsertKb = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof kbInput>) => kbInput.parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    if (data.id) await db.from("knowledge_base").update({ title: data.title, content: data.content, updated_at: new Date().toISOString() }).eq("id", data.id);
    else await db.from("knowledge_base").insert({ title: data.title, content: data.content, sort: 100 });
    await db.from("audit_log").insert({ actor: "human", event: data.id ? "kb_updated" : "kb_created", details: { title: data.title } });
    return { ok: true };
  });

export const deleteKb = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: e } = await db.from("knowledge_base").select("title").eq("id", data.id).single();
    await db.from("knowledge_base").delete().eq("id", data.id);
    await db.from("audit_log").insert({ actor: "human", event: "kb_deleted", details: { title: e?.title } });
    return { ok: true };
  });
