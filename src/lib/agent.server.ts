import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool, hasToolCall, isStepCount, APICallError } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Admin = SupabaseClient<Database>;
const MODEL = "openai/gpt-6-astra";

export type AgentResult = { ok: true } | { ok: false; error: string; status?: number | undefined };

function summarize(v: unknown, max = 400) {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export function friendlyAiError(err: unknown): { error: string; status?: number | undefined } {
  const status = APICallError.isInstance(err) ? err.statusCode : (err as { statusCode?: number })?.statusCode;
  if (status === 429) return { status, error: "The AI is rate limited right now. Please wait a moment and try again." };
  if (status === 402) return { status, error: "AI credits are exhausted for this workspace. Add credits in Settings → Plans & credits." };
  if (status === 403) return { status, error: "AI access is blocked for this workspace (policy or credit limit)." };
  const msg = err instanceof Error ? err.message : String(err);
  if (/timeout|timed out|aborted/i.test(msg)) return { error: "The AI request timed out. Please try again." };
  return { status, error: "The agent could not finish this message. Please try again." };
}

export async function runAgent(admin: Admin, messageId: string): Promise<AgentResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false, error: "AI is not configured (missing key)." };

  const { data: msg, error } = await admin.from("messages").select("*").eq("id", messageId).single();
  if (error || !msg) return { ok: false, error: "Message not found." };

  const log = (actor: string, event: string, details: Record<string, unknown>) =>
    admin.from("audit_log").insert({ message_id: msg.id, message_subject: msg.subject, actor, event, details: details as never });

  await log("agent", "run_started", { model: MODEL });

  const { data: kb } = await admin.from("knowledge_base").select("id,title,content").order("sort");
  const kbEntries = kb ?? [];
  const proposals: { action_type: string; params: Record<string, unknown> }[] = [];
  let final: Record<string, unknown> | null = null;
  const today = new Date().toISOString().slice(0, 10);

  const tools = {
    search_knowledge_base: tool({
      description: "Search the business knowledge base. Returns matching entries (title + content). Always ground replies in these.",
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
        const scored = kbEntries
          .map((e) => ({ e, s: words.filter((w) => (e.title + " " + e.content).toLowerCase().includes(w)).length }))
          .sort((a, b) => b.s - a.s);
        const hits = scored.filter((x) => x.s > 0).slice(0, 3).map((x) => x.e);
        const out = (hits.length ? hits : kbEntries).map((e) => ({ title: e.title, content: e.content }));
        await log("agent", "tool_call:search_knowledge_base", { input: { query }, output: summarize(out.map((o) => o.title)) });
        return out;
      },
    }),
    check_availability: tool({
      description: "List open table-booking slots for a date (YYYY-MM-DD). Only these slots may be offered.",
      inputSchema: z.object({ date: z.string() }),
      execute: async ({ date }) => {
        const { data } = await admin.from("availability").select("slot_date,slot_time,is_taken").eq("slot_date", date).order("slot_time");
        const out = {
          date,
          open_slots: (data ?? []).filter((s) => !s.is_taken).map((s) => s.slot_time),
          taken_slots: (data ?? []).filter((s) => s.is_taken).map((s) => s.slot_time),
          note: data?.length ? undefined : "No slots exist for this date (outside the 14-day booking window).",
        };
        await log("agent", "tool_call:check_availability", { input: { date }, output: summarize(out) });
        return out;
      },
    }),
    propose_booking: tool({
      description: "Propose a table booking (pending human approval). Only for an open slot, party size <= 20, >= 24h notice.",
      inputSchema: z.object({ date: z.string(), time: z.string(), name: z.string(), party_size: z.number() }),
      execute: async (p) => {
        const { data: slot } = await admin.from("availability").select("is_taken").eq("slot_date", p.date).eq("slot_time", p.time).maybeSingle();
        let rejected: string | null = null;
        if (p.party_size > 20) rejected = "Party size exceeds the 20-person limit.";
        else if (!slot) rejected = "No such slot in the availability table.";
        else if (slot.is_taken) rejected = "Slot is already taken.";
        else if (new Date(`${p.date}T${p.time}:00+08:00`).getTime() - Date.now() < 24 * 3600 * 1000) rejected = "Less than 24 hours notice.";
        if (!rejected) proposals.push({ action_type: "create_booking", params: p });
        await log("agent", "tool_call:propose_booking", { input: p, output: rejected ? `refused: ${rejected}` : "proposal recorded (pending approval)" });
        return rejected ? { ok: false, reason: rejected } : { ok: true, status: "pending human approval" };
      },
    }),
    propose_ticket: tool({
      description: "Propose a support ticket (pending human approval).",
      inputSchema: z.object({ title: z.string(), priority: z.enum(["low", "medium", "high"]) }),
      execute: async (p) => {
        proposals.push({ action_type: "create_ticket", params: p });
        await log("agent", "tool_call:propose_ticket", { input: p, output: "proposal recorded (pending approval)" });
        return { ok: true, status: "pending human approval" };
      },
    }),
    flag_spam: tool({
      description: "Propose flagging this message as spam (pending human approval). Spam gets no reply.",
      inputSchema: z.object({ reason: z.string() }),
      execute: async (p) => {
        proposals.push({ action_type: "flag_spam", params: p });
        await log("agent", "tool_call:flag_spam", { input: p, output: "proposal recorded (pending approval)" });
        return { ok: true };
      },
    }),
    submit_triage: tool({
      description: "Submit the final triage. Call exactly once, last.",
      inputSchema: z.object({
        intent: z.enum(["sales inquiry", "support issue", "booking request", "refund request", "spam", "other"]),
        priority: z.enum(["low", "medium", "high"]),
        sentiment: z.enum(["positive", "neutral", "negative"]),
        confidence: z.number().describe("0 to 1"),
        reasoning: z.string().describe("One line"),
        reply_draft: z.string().describe("Empty string for spam"),
        sources_used: z.array(z.string()).describe("Knowledge base entry titles the reply relied on"),
      }),
      execute: async (p) => {
        final = p;
        return { ok: true };
      },
    }),
  };

  const system = `You are InboxPilot, the triage agent for "Kape Kultura Café & Catering, Makati" (a fictional business). Today is ${today} (Asia/Manila).
For each customer message:
1. Use search_knowledge_base for any facts (hours, prices, delivery, refunds, booking rules, contact). Use check_availability before offering or booking any table slot.
2. Propose actions only via propose_booking / propose_ticket / flag_spam. These are pending until a human approves.
   - Valid table booking (<=20 people, >=24h notice, open slot): propose_booking with the exact date (YYYY-MM-DD), time (HH:MM), name and party size.
   - Party > 20: do NOT propose a booking; politely decline citing the 20-person table limit and suggest catering/private event inquiry.
   - Support issues (late delivery, wrong/damaged item): propose_ticket.
   - Spam/scams/SEO offers: call flag_spam only, reply_draft must be "".
3. Guardrails: never promise refunds, discounts, or availability not in the knowledge base / availability table. If unsure or a decision needs a manager (refunds, discounts), say a team member will follow up. Refunds outside policy: explain the policy kindly, no promise.
4. Write a warm, concise reply (sign as "The Kape Kultura Team"). Only state facts from tool results.
5. Finish by calling submit_triage once with sources_used = titles of knowledge base entries you relied on.`;

  const prompt = `Channel: ${msg.channel}\nFrom: ${msg.sender_name} <${msg.sender_email}>\nReceived: ${msg.received_at}\nSubject: ${msg.subject}\n\n${msg.body}`;

  try {
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    let streamErr: unknown = null;
    const result = streamText({
      model: provider.responses(MODEL),
      system,
      prompt,
      tools,
      toolChoice: "required",
      maxRetries: 0,
      stopWhen: [hasToolCall("submit_triage"), isStepCount(10)],
      onError: ({ error }) => {
        streamErr = error;
      },
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    await result.consumeStream();
    if (streamErr) throw streamErr;
  } catch (err) {
    console.error("agent error", err);
    const f = friendlyAiError(err);
    await log("agent", "run_failed", { error: f.error, status: f.status });
    return { ok: false, ...f };
  }

  if (!final) {
    await log("agent", "run_failed", { error: "Agent did not submit a triage" });
    return { ok: false, error: "The agent did not return a result. Please re-run." };
  }
  const f = final as {
    intent: string; priority: string; sentiment: string; confidence: number; reasoning: string; reply_draft: string; sources_used: string[];
  };
  const isSpam = f.intent === "spam";
  if (isSpam && !proposals.some((p) => p.action_type === "flag_spam")) proposals.push({ action_type: "flag_spam", params: { reason: f.reasoning } });
  const finalProposals = isSpam ? proposals.filter((p) => p.action_type === "flag_spam") : proposals;
  const reply = isSpam ? null : f.reply_draft;

  await admin.from("proposed_actions").delete().eq("message_id", msg.id).eq("status", "pending");
  if (finalProposals.length)
    await admin.from("proposed_actions").insert(finalProposals.map((p) => ({ message_id: msg.id, action_type: p.action_type, params: p.params as never })));

  await admin.from("messages").update({
    intent: f.intent,
    priority: f.priority,
    sentiment: f.sentiment,
    confidence: Math.max(0, Math.min(1, f.confidence)),
    reasoning: f.reasoning,
    reply_draft: reply,
    original_draft: reply,
    sources: (isSpam ? [] : f.sources_used) as never,
    edited: false,
    status: "Awaiting approval",
    triaged_at: new Date().toISOString(),
    reject_reason: null,
  }).eq("id", msg.id);

  await log("agent", "run_completed", {
    intent: f.intent, priority: f.priority, confidence: f.confidence, reasoning: f.reasoning,
    proposed_actions: finalProposals.map((p) => p.action_type), sources: f.sources_used,
  });
  return { ok: true };
}
