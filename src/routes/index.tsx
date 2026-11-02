import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader, StatusBadge, Chip, Empty, Loading, ErrorBox, timeAgo, Card } from "@/components/app-ui";
import { messagesQuery } from "@/lib/queries";
import { useTriage } from "@/lib/use-triage";
import { simulateMessage, messageInput } from "@/lib/inbox.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inbox — InboxPilot" },
      { name: "description", content: "Customer inbox for Kape Kultura (fictional): triage messages with an AI agent." },
      { property: "og:title", content: "Inbox — InboxPilot" },
      { property: "og:description", content: "AI triage agent for a small-business customer inbox, with human approval." },
    ],
  }),
  component: InboxPage,
});

const TABS = ["All", "New", "Awaiting approval", "Sent", "Rejected", "Spam"] as const;

function InboxPage() {
  const { data, isLoading, error } = useQuery(messagesQuery);
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [open, setOpen] = useState(false);
  const triage = useTriage();
  const rows = (data ?? []).filter((m) => tab === "All" || m.status === tab);
  const newIds = (data ?? []).filter((m) => m.status === "New").map((m) => m.id);
  const count = (s: string) => (data ?? []).filter((m) => s === "All" || m.status === s).length;

  return (
    <>
      <PageHeader
        title="Inbox"
        subtitle="Kape Kultura Café & Catering (fictional) — Email, Facebook and website form"
        actions={
          <>
            <Button variant="outline" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Simulate new message</Button>
            <Button onClick={() => triage.all(newIds)} disabled={!!triage.progress || newIds.length === 0}>
              {triage.progress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {triage.progress ? `Triaging ${triage.progress.done + 1}/${triage.progress.total}…` : `Triage all new (${newIds.length})`}
            </Button>
          </>
        }
      />
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("shrink-0 border-b-2 px-3 py-2 text-sm", tab === t ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t} <span className="ml-1 font-mono text-xs">{count(t)}</span>
          </button>
        ))}
      </div>
      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : rows.length === 0 ? (
        <Empty title="No messages here" hint="Try another tab, simulate a message, or reset the demo data." />
      ) : (
        <Card className="divide-y divide-border">
          {rows.map((m) => (
            <div key={m.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
              <Link to="/messages/$id" params={{ id: m.id }} className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{m.sender_name}</span>
                  <Chip>{m.channel}</Chip>
                  {m.intent && <Chip>{m.intent}</Chip>}
                  {m.priority && <Chip tone={m.priority}>{m.priority}</Chip>}
                </div>
                <p className="mt-1 truncate text-sm text-foreground">{m.subject}</p>
                <p className="truncate text-xs text-muted-foreground">{m.body}</p>
              </Link>
              <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                <StatusBadge status={m.status} />
                <span className="text-xs text-muted-foreground">{timeAgo(m.received_at)}</span>
                {m.status === "New" && (
                  <Button size="sm" variant="secondary" disabled={triage.running.has(m.id) || !!triage.progress} onClick={() => triage.one(m.id)}>
                    {triage.running.has(m.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Triage
                  </Button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}
      <SimulateDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function SimulateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const fn = useServerFn(simulateMessage);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ sender_name: "", sender_email: "", channel: "Email" as "Email" | "Facebook" | "Website form", subject: "", body: "" });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = messageInput.safeParse(f);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.path.join(".") + ": " + parsed.error.issues[0]?.message);
      return;
    }
    setBusy(true);
    try {
      await fn({ data: parsed.data });
      await qc.invalidateQueries();
      toast.success("New message added to the inbox");
      setF({ sender_name: "", sender_email: "", channel: "Email", subject: "", body: "" });
      onOpenChange(false);
    } catch {
      toast.error("Could not add the message");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Simulate new message</DialogTitle>
          <DialogDescription>Adds a New message as if it arrived from a customer.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Sender name</Label><Input value={f.sender_name} onChange={set("sender_name")} required /></div>
            <div><Label>Email</Label><Input type="email" value={f.sender_email} onChange={set("sender_email")} required /></div>
          </div>
          <div>
            <Label>Channel</Label>
            <select value={f.channel} onChange={set("channel")} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option>Email</option><option>Facebook</option><option>Website form</option>
            </select>
          </div>
          <div><Label>Subject</Label><Input value={f.subject} onChange={set("subject")} required /></div>
          <div><Label>Body</Label><Textarea rows={5} maxLength={5000} value={f.body} onChange={set("body")} required /><p className="mt-1 text-right text-xs text-muted-foreground">{f.body.length}/5000</p></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Add message</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
