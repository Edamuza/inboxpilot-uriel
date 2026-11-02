import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Card } from "@/components/app-ui";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About this project — InboxPilot" },
      { name: "description", content: "Problem, approach, architecture and next steps for InboxPilot, by Uriel Papa." },
      { property: "og:title", content: "About InboxPilot — by Uriel Papa" },
      { property: "og:description", content: "An AI inbox triage agent with tool calling, grounding and a human approval queue." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const [origin, setOrigin] = useState("https://your-app.lovable.app");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/api/public/inbound-message`;
  const curl = `curl -X POST ${url} \\
  -H "Content-Type: application/json" \\
  -d '{"sender_name":"Jamie Test","sender_email":"jamie@example.com","channel":"Website form","subject":"Catering for 40?","body":"Hi! Do you cater Premium for 40 people in BGC?"}'`;

  const curlRef = useRef<HTMLPreElement>(null);
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="About this project" subtitle="InboxPilot — portfolio project by Uriel Papa" />
      <Section title="The problem">
        Small businesses like a café-caterer get a steady stream of messages across email, Facebook and web forms: catering quotes, bookings, complaints, refund demands and spam. The owner answers them between shifts, so replies are slow, inconsistent and occasionally promise things (refunds, discounts, full slots) the business can't deliver. Every slow or wrong reply costs a booking or a customer.
      </Section>
      <Section title="The approach">
        An AI agent triages each message: it classifies intent, priority and sentiment, then drafts a reply grounded only in the knowledge base and a live availability table. It uses tool calling (search_knowledge_base, check_availability, propose_booking, propose_ticket, flag_spam) and returns structured output. Actions are only <em>proposed</em> — a human approves, edits or rejects every reply and action in a queue, and every step is written to an audit log. Guardrails block refunds, discounts or slots not backed by data, and spam gets no reply.
      </Section>
      <Section title="Architecture">
        <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{`React (TanStack Start) UI
   │  server functions (run on the server, service role)
   ▼
Server functions ──► Lovable AI (model calls server-side only)
   │
   ▼
Lovable Cloud database
   RLS enabled on all 7 tables, no direct anon access:
   messages · proposed_actions · knowledge_base · availability
   bookings · tickets · audit_log`}</pre>
        <p className="mt-3 font-medium">Server functions</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 font-mono text-xs">
          <li>triageMessage → runAgent tool loop (search_knowledge_base, check_availability, propose_booking, propose_ticket, flag_spam, submit_triage)</li>
          <li>approveMessage · rejectMessage · saveDraft · simulateMessage</li>
          <li>resetDemo · ensureFreshDemo (re-seeds after 24h idle, tops up the 14-day availability)</li>
          <li>upsertKb / deleteKb</li>
          <li>read functions: getMessages, getMessage, getKb, getAvailability, getRecords, getAudit</li>
        </ul>
        <p className="mt-3">Public webhook route (the "inbound-message" edge-style function): <span className="font-mono text-xs">POST /api/public/inbound-message</span></p>
      </Section>
      <Section title="Inbound webhook">
        <p>New messages can be posted from any form or integration. Fields are validated; bodies over 5,000 characters are rejected.</p>
        <p className="mt-2 break-all font-mono text-xs">{url}</p>
        <div className="relative mt-3">
          <pre ref={curlRef} className="overflow-x-auto rounded-md bg-sidebar p-3 pt-12 sm:pt-3 sm:pr-24 font-mono text-xs text-sidebar-foreground">{curl}</pre>
          <CopyButton text={curl} targetRef={curlRef} label="Copy curl example" />
        </div>
      </Section>
      <Section title="What I'd do next in a real deployment">
        <ul className="list-disc space-y-1 pl-5">
          <li>Connect real channels (Gmail, Messenger, form provider) with signed webhooks and real sending after approval.</li>
          <li>Staff login with roles, SLAs and assignment; auto-approve only high-confidence, low-risk intents.</li>
          <li>Semantic search over a larger knowledge base, plus eval sets per intent to track accuracy and regressions.</li>
          <li>Booking system sync, PII redaction in logs, and rate limiting on the public webhook.</li>
        </ul>
      </Section>
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <p className="text-sm">Built by <strong>Uriel Papa</strong></p>
        <a className="inline-flex items-center gap-1 text-sm text-primary hover:underline" href="https://github.com/Edamuza" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />github.com/Edamuza</a>
        <a className="inline-flex items-center gap-1 text-sm text-primary hover:underline" href="https://linkedin.com/in/uriel-papa-vitese01" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />linkedin.com/in/uriel-papa-vitese01</a>
      </Card>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-foreground/90">{children}</div>
    </Card>
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to execCommand */
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "-1000px";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

function CopyButton({ text, targetRef, label }: { text: string; targetRef: React.RefObject<HTMLElement | null>; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  async function onClick() {
    if (await copyText(text)) {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
      return;
    }
    const el = targetRef.current;
    if (el) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    toast.error("Copy is blocked in this browser. The text is selected — press Cmd/Ctrl+C to copy.");
  }
  return (
    <Button size="sm" variant="secondary" className="absolute right-2 top-2" aria-label={label} onClick={onClick}>
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </Button>
  );
}
