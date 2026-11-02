# Inboxpilot Uriel

Build this complete app now, all screens and the backend, following the spec below. Use Lovable Cloud and Lovable AI; do not ask me for API keys.

# Project 3 — InboxPilot: customer-inbox triage agent with a human approval queue

Build "InboxPilot", an AI agent that reads incoming customer messages for a small business, classifies them, drafts grounded replies and proposes actions (book a meeting, open a ticket, flag spam). A human approves, edits or rejects every reply and action before anything happens. Nothing is sent to real email addresses: "sending" is simulated and logged.

## Screens
1. **Inbox** (home): list of messages (sender, subject, received time, channel: Email / Facebook / Website form, status: New, Triaged, Awaiting approval, Sent, Rejected, Spam). Filter tabs by status. "Triage all new" button and per-message "Triage" button. "Simulate new message" button opens a form (sender name, email, channel, subject, body) to add a message.
2. **Message detail / Approval**: the original message; the agent's analysis (intent: sales inquiry, support issue, booking request, refund request, spam, other; priority low/medium/high; sentiment; confidence 0–1; one-line reasoning); the drafted reply (editable textarea) with "Sources used" listing which knowledge-base entries it relied on; proposed actions as cards with their parameters (e.g., create_booking with date/time/name/party size; create_ticket with title/priority; flag_spam). Buttons: Approve & send, Save edits, Reject (with reason), Re-run agent. On approve: execute the approved actions (write the booking/ticket rows, mark spam), mark the reply as "Sent (simulated)" with timestamp, and write audit-log entries.
3. **Approval queue**: all messages awaiting approval, oldest first, with intent/priority chips — the main working screen.
4. **Bookings & tickets**: tables of bookings (from create_booking) and tickets (from create_ticket), with status.
5. **Knowledge base**: editable entries (title + content) the agent must ground replies in: business hours, menu/pricing, delivery areas and fees, refund policy, booking rules (max party size 20, bookings need 24 hours notice, open slots listed in an availability table), contact details.
6. **Audit log**: every agent step and human decision (timestamp, message, actor = agent/human, event, details), newest first.
7. **Metrics**: KPIs computed from data — messages triaged, approval rate, edit rate (approved after edits ÷ approved), rejection rate, average confidence, count by intent (bar chart).
8. **About this project** (common requirements).

## Agent (edge function)
- Uses Lovable AI with tool/function calling. Tools: `search_knowledge_base(query)`, `check_availability(date)` (reads an availability table of open slots for the next 14 days), `propose_booking(...)`, `propose_ticket(...)`, `flag_spam(reason)`. The agent can call search and availability freely; "propose_*" only creates pending proposals — execution happens on human approval.
- Output: intent, priority, sentiment, confidence, reasoning, reply draft, sources used, proposed actions. Use structured output.
- Guardrails: never promise refunds, discounts or availability not in the knowledge base / availability table; if unsure, say a team member will follow up. Spam gets no reply draft, only flag_spam.
- Each run is logged to the audit log (tool calls included, with inputs/outputs summarized).

## Inbound webhook
- Expose a public edge function `inbound-message` that accepts POST JSON {sender_name, sender_email, channel, subject, body} and inserts a New message (validate fields; reject >5,000 characters). Show the endpoint URL and a ready-to-copy curl example on the About page.

## Seed data (fictional business: "Kape Kultura Café & Catering, Makati (fictional)")
- Knowledge base: 6 entries as above with concrete values (hours Mon–Sat 7:00–20:00, Sun 8:00–18:00; catering packages Basic PHP 350/head, Premium PHP 550/head, minimum 20 heads; delivery within Makati PHP 80, BGC PHP 120, outside — not available; refunds only for wrong/damaged orders reported within 2 hours with a photo; bookings up to 20 people with 24-hour notice).
- Availability: generate open slots for the next 14 days relative to today (e.g., 10:00, 13:00, 16:00 daily, some marked taken).
- 12 messages: 3 catering/sales inquiries (one for 50 heads Premium), 2 table bookings (one valid, one for a party of 30 that should be declined politely per policy), 2 support issues (late delivery, wrong item with photo mentioned), 1 refund request outside the 2-hour window, 1 delivery-area question for Quezon City (not served), 1 compliment, 2 spam (crypto offer, SEO backlink spam).
- Leave all 12 as New on reset so the demo starts with triage.

## Acceptance checks
- C1 "Triage all new" processes all 12 messages; each gets an intent, priority and confidence; spam messages are flagged with no reply draft.
- C2 The valid table booking message gets a proposed create_booking that uses an actually-open slot; approving it creates a booking row, marks the slot taken, sets status Sent (simulated), and writes audit entries.
- C3 The party-of-30 booking gets a polite decline citing the 20-person limit and no booking proposal.
- C4 The Quezon City delivery question is answered as not available, citing the knowledge base.
- C5 Editing a draft, then approving, counts toward the edit rate on Metrics.
- C6 Rejecting with a reason sets status Rejected and logs it.
- C7 "Simulate new message" adds a New message that can be triaged.
- C8 Reset demo data, About page with webhook curl example, mobile layout, no console errors.

# Common requirements for all five portfolio apps (append to every Lovable spec)

These apps are portfolio pieces for Uriel Papa, who is applying for AI Solutions Engineer / Forward-Deployed Engineer roles. A hiring manager will open the published link and click around with no login and no setup. Everything must work on first visit.

## Stack and backend
- Use Lovable Cloud for the database, file storage and edge functions.
- Use Lovable AI (Lovable's built-in AI gateway) for every model call. Do not ask for, or depend on, any external API key (no OpenAI/Anthropic/OpenRouter keys).
- All model calls happen in edge functions, never in the browser.
- No login. This is a public demo. Keep Row Level Security enabled on every table, with policies that let the demo work (anonymous read of demo data; writes go through edge functions or narrowly scoped anon policies). The project must pass Lovable's security scan so it can be published.
- Handle AI errors visibly: show a friendly error toast/message on rate limits (429), credits (402) or timeouts, never a blank screen or a spinner that never ends.

## Demo data
- Seed realistic sample data on first load (or via a migration) so every screen has content immediately. All sample businesses, people and documents are fictional and labeled as such.
- Add a "Reset demo data" action (with confirm) that restores the seed state.
- Show a slim banner: "Demo app — all sample data is fictional."

## Portfolio framing
- Add an "About this project" page reachable from the nav with four short sections: The problem (who has it, what it costs), The approach (how the app solves it, the AI pattern used), Architecture (frontend → edge functions → Lovable AI → database; list tables and functions), What I'd do next in a real deployment. Author: Uriel Papa, with links to github.com/Edamuza and linkedin.com/in/uriel-papa-vitese01.
- Clean, professional, responsive UI (works at 375px phone width and on desktop). Consistent nav. Empty states, loading states and error states for every async action.

## Quality bar
- No console errors on load. No broken routes. Every button does something real.
- Numbers shown in tables/KPIs must be computed from stored data, not hard-coded.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://inboxpilot-uriel.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2f3949c2-f6e1-417f-9adf-7b939998cb04).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
