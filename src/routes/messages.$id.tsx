import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, RefreshCw, Save, X, BookOpen, CalendarPlus, Ticket, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, Chip, StatusBadge, Loading, ErrorBox, Empty, fmt } from "@/components/app-ui";
import { messageQuery } from "@/lib/queries";
import { approveMessage, rejectMessage, saveDraft } from "@/lib/inbox.functions";
import { useTriage } from "@/lib/use-triage";

export const Route = createFileRoute("/messages/$id")({
  head: () => ({
    meta: [
      { title: "Message review — InboxPilot" },
      { name: "description", content: "Review the agent's analysis, edit the drafted reply and approve or reject proposed actions." },
      { property: "og:title", content: "Message review — InboxPilot" },
      { property: "og:description", content: "Human-in-the-loop approval of AI-drafted replies and actions." },
    ],
  }),
  component: DetailPage,
});

const ACTION_ICON = { create_booking: CalendarPlus, create_ticket: Ticket, flag_spam: ShieldAlert } as const;

function DetailPage() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useQuery(messageQuery(id));
  const qc = useQueryClient();
  const triage = useTriage();
  const approve = useServerFn(approveMessage);
  const reject = useServerFn(rejectMessage);
  const save = useServerFn(saveDraft);
  const [reply, setReply] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const m = data?.message;
  const pending = (data?.actions ?? []).filter((a) => a.status === "pending");
  useEffect(() => {
    setReply(m?.reply_draft ?? "");
  }, [m?.id, m?.reply_draft]);
  useEffect(() => {
    setSelected(new Set(pending.map((a) => a.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.actions]);

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!m) return <Empty title="Message not found" hint="It may have been removed by a demo reset." />;

  const awaiting = m.status === "Awaiting approval";
  const isSpam = m.intent === "spam";
  const refresh = () => qc.invalidateQueries();

  async function run(label: string, f: () => Promise<unknown>, okMsg: string) {
    setBusy(label);
    try {
      const r = (await f()) as { ok?: boolean; error?: string } | undefined;
      if (r && r.ok === false) toast.error(r.error ?? "Action failed");
      else toast.success(okMsg);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(null);
      refresh();
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/queue" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Approval queue</Link>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2"><StatusBadge status={m.status} /><Chip>{m.channel}</Chip></div>
            <h1 className="mt-3 text-2xl font-semibold">{m.subject}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{m.sender_name} · {m.sender_email} · {fmt(m.received_at)}</p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Agent analysis</h2>
              <Button size="sm" variant="outline" disabled={triage.running.has(m.id) || m.status === "Sent" || m.status === "Spam"} onClick={() => triage.one(m.id)}>
                {triage.running.has(m.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {m.triaged_at ? "Re-run agent" : "Run agent"}
              </Button>
            </div>
            {triage.running.has(m.id) ? <Loading label="Agent is reading the message, searching the knowledge base and checking availability…" /> : !m.triaged_at ? (
              <p className="mt-3 text-sm text-muted-foreground">Not triaged yet. Run the agent to classify this message and draft a reply.</p>
            ) : (
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div><dt className="text-xs text-muted-foreground">Intent</dt><dd className="font-medium capitalize">{m.intent}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Priority</dt><dd><Chip tone={m.priority ?? undefined}>{m.priority}</Chip></dd></div>
                <div><dt className="text-xs text-muted-foreground">Sentiment</dt><dd className="font-medium capitalize">{m.sentiment}</dd></div>
                <div>
                  <dt className="text-xs text-muted-foreground">Confidence</dt>
                  <dd className="font-mono font-medium">{Number(m.confidence ?? 0).toFixed(2)}</dd>
                  <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${Number(m.confidence ?? 0) * 100}%` }} /></div>
                </div>
                <div className="col-span-2 sm:col-span-4"><dt className="text-xs text-muted-foreground">Reasoning</dt><dd>{m.reasoning}</dd></div>
              </dl>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-lg font-semibold">Drafted reply</h2>
            {isSpam ? (
              <p className="mt-3 text-sm text-muted-foreground">Spam — no reply is drafted. Approve to flag it as spam.</p>
            ) : !m.triaged_at ? (
              <p className="mt-3 text-sm text-muted-foreground">No draft yet.</p>
            ) : (
              <>
                <Textarea className="mt-3 min-h-56 text-sm" value={reply} onChange={(e) => setReply(e.target.value)} disabled={!awaiting} />
                {m.status === "Sent" && <p className="mt-2 text-xs text-success">Sent (simulated) {fmt(m.sent_at)}{m.edited ? " · edited by human" : ""}</p>}
                {m.status === "Rejected" && <p className="mt-2 text-xs text-destructive">Rejected: {m.reject_reason}</p>}
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sources used</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {((m.sources as string[]) ?? []).length === 0 ? <span className="text-xs text-muted-foreground">None</span> :
                      (m.sources as string[]).map((s) => (
                        <Link key={s} to="/knowledge" className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground hover:bg-muted"><BookOpen className="h-3 w-3" />{s}</Link>
                      ))}
                  </div>
                </div>
              </>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-semibold">Proposed actions</h2>
            {(data?.actions ?? []).length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No actions proposed.</p> : (
              <div className="mt-3 space-y-3">
                {data!.actions.map((a) => {
                  const Icon = ACTION_ICON[a.action_type as keyof typeof ACTION_ICON] ?? Ticket;
                  return (
                    <div key={a.id} className="flex gap-3 rounded-md border border-border p-3">
                      {a.status === "pending" && awaiting ? (
                        <Checkbox checked={selected.has(a.id)} onCheckedChange={(c) => { const n = new Set(selected); if (c) n.add(a.id); else n.delete(a.id); setSelected(n); }} aria-label={`Approve ${a.action_type}`} />
                      ) : <span className="w-4" />}
                      <Icon className="h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><span className="font-mono text-sm">{a.action_type}</span><Chip>{a.status}</Chip></div>
                        <dl className="mt-1 grid grid-cols-2 gap-x-4 text-xs">
                          {Object.entries(a.params as Record<string, unknown>).map(([k, v]) => (
                            <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="break-words">{String(v)}</dd></div>
                          ))}
                        </dl>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {awaiting && (
            <div className="flex flex-wrap gap-2">
              <Button disabled={!!busy} onClick={() => run("approve", () => approve({ data: { id: m.id, reply: isSpam ? null : reply, approvedActionIds: [...selected] } }), isSpam ? "Flagged as spam" : "Approved — reply sent (simulated)")}>
                {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {isSpam ? "Approve (flag spam)" : "Approve & send"}
              </Button>
              {!isSpam && (
                <Button variant="outline" disabled={!!busy || reply === (m.reply_draft ?? "")} onClick={() => run("save", () => save({ data: { id: m.id, reply } }), "Edits saved")}>
                  {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save edits
                </Button>
              )}
              <Button variant="destructive" disabled={!!busy} onClick={() => setRejectOpen(true)}><X className="h-4 w-4" /> Reject</Button>
            </div>
          )}

          <Card className="p-5">
            <h2 className="text-lg font-semibold">Activity</h2>
            <ul className="mt-3 space-y-2 text-xs">
              {(data?.log ?? []).length === 0 && <li className="text-muted-foreground">No activity yet.</li>}
              {data?.log.map((l) => (
                <li key={l.id} className="flex gap-2">
                  <span className="w-28 shrink-0 text-muted-foreground">{fmt(l.created_at)}</span>
                  <Chip>{l.actor}</Chip>
                  <span className="font-mono">{l.event}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject this draft</DialogTitle></DialogHeader>
          <Textarea placeholder="Reason (required) — e.g. tone too casual, wrong price" value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!reason.trim() || !!busy} onClick={async () => { await run("reject", () => reject({ data: { id: m.id, reason } }), "Rejected and logged"); setRejectOpen(false); setReason(""); }}>
              {busy === "reject" && <Loader2 className="h-4 w-4 animate-spin" />} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
