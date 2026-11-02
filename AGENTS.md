<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## InboxPilot architecture
- All writes go through server functions in `src/lib/inbox.functions.ts` using the admin client; tables are anon read-only via RLS. Why: public no-login demo must pass security scan.
- The AI agent lives in `src/lib/agent.server.ts` (AI SDK Responses + tool loop ending with a `submit_triage` tool); `propose_*` tools only record pending rows, execution happens in `approveMessage`. Why: human approval before any side effect.
- Seed/reset is the SQL function `public.reset_demo()` (service_role only); availability dates are relative to `current_date`. Why: demo always starts fresh with 12 New messages.
- Public intake webhook is `src/routes/api/public/inbound-message.ts` (TanStack server route, not a Supabase edge function).
