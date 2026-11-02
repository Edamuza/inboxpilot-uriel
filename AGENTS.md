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
- All reads (`src/lib/reads.functions.ts`) and writes (`src/lib/inbox.functions.ts`) go through server functions with the admin client; tables have RLS on with no anon/authenticated grants. Why: public no-login demo must pass the security scan.
- The AI agent lives in `src/lib/agent.server.ts` (AI SDK Responses + tool loop ending with a `submit_triage` tool); `propose_*` tools only record pending rows, execution happens in `approveMessage`. Why: human approval before any side effect.
- Seed/reset is `public.reset_demo()` (advisory-locked wrapper over `reset_demo_unlocked`); `ensure_fresh_demo()` runs on shell mount to re-seed after 24h idle or top up the 14-day availability. Why: demo dates stay valid weeks later and concurrent visitors never double-seed.
- Public intake webhook is `src/routes/api/public/inbound-message.ts` (TanStack server route, not a Supabase edge function).
