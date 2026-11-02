import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Github, Linkedin } from "lucide-react";
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
   │  server functions (triage, approve, reject, save, reset, KB edits)
   ▼
Server runtime ──► Lovable AI (tool-calling agent loop)
   │
   ▼
Lovable Cloud database (RLS: public read-only; writes via server)
   messages · proposed_actions · knowledge_base · availability
   bookings · tickets · audit_log
Public webhook: POST /api/public/inbound-message`}</pre>
      </Section>
      <Section title="Inbound webhook">
        <p>New messages can be posted from any form or integration. Fields are validated; bodies over 5,000 characters are rejected.</p>
        <p className="mt-2 break-all font-mono text-xs">{url}</p>
        <div className="relative mt-3">
          <pre className="overflow-x-auto rounded-md bg-sidebar p-3 pr-12 font-mono text-xs text-sidebar-foreground">{curl}</pre>
          <Button size="sm" variant="secondary" className="absolute right-2 top-2" onClick={() => navigator.clipboard.writeText(curl).then(() => toast.success("Copied"), () => toast.error("Copy failed"))}><Copy className="h-3.5 w-3.5" /></Button>
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
        <a className="inline-flex items-center gap-1 text-sm text-primary hover:underline" href="https://github.com/Edamuza" target="_blank" rel="noreferrer"><Github className="h-4 w-4" />github.com/Edamuza</a>
        <a className="inline-flex items-center gap-1 text-sm text-primary hover:underline" href="https://linkedin.com/in/uriel-papa-vitese01" target="_blank" rel="noreferrer"><Linkedin className="h-4 w-4" />linkedin.com/in/uriel-papa-vitese01</a>
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
