import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Card, Empty, Loading, ErrorBox } from "@/components/app-ui";
import { kbQuery } from "@/lib/queries";
import { upsertKb, deleteKb } from "@/lib/inbox.functions";

export const Route = createFileRoute("/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge base — InboxPilot" },
      { name: "description", content: "The business facts the agent must ground every reply in: hours, pricing, delivery, refunds, bookings." },
      { property: "og:title", content: "Knowledge base — InboxPilot" },
      { property: "og:description", content: "Editable grounding facts for the AI triage agent." },
    ],
  }),
  component: KbPage,
});

type Entry = { id: string | null; title: string; content: string };

function KbPage() {
  const { data, isLoading, error } = useQuery(kbQuery);
  const [draft, setDraft] = useState<Entry | null>(null);
  return (
    <>
      <PageHeader title="Knowledge base" subtitle="The agent may only state facts found here or in the availability table" actions={<Button onClick={() => setDraft({ id: null, title: "", content: "" })}><Plus className="h-4 w-4" />Add entry</Button>} />
      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {draft && !draft.id && <EntryCard entry={draft} onDone={() => setDraft(null)} />}
          {data!.length === 0 && !draft && <Empty title="No entries" hint="Add facts for the agent to rely on." />}
          {data!.map((e) => <EntryCard key={e.id} entry={e} />)}
        </div>
      )}
    </>
  );
}

function EntryCard({ entry, onDone }: { entry: Entry; onDone?: () => void }) {
  const [t, setT] = useState(entry.title);
  const [c, setC] = useState(entry.content);
  const [busy, setBusy] = useState(false);
  const up = useServerFn(upsertKb);
  const del = useServerFn(deleteKb);
  const qc = useQueryClient();
  const dirty = t !== entry.title || c !== entry.content;
  async function go(f: () => Promise<unknown>, msg: string) {
    setBusy(true);
    try { await f(); toast.success(msg); await qc.invalidateQueries({ queryKey: ["kb"] }); onDone?.(); }
    catch { toast.error("Could not save. Title and content are required."); }
    finally { setBusy(false); }
  }
  return (
    <Card className="p-4">
      <Input value={t} onChange={(e) => setT(e.target.value)} placeholder="Title" className="font-display text-base font-semibold" />
      <Textarea value={c} onChange={(e) => setC(e.target.value)} rows={6} placeholder="Content" className="mt-2 text-sm" />
      <div className="mt-3 flex justify-end gap-2">
        {entry.id ? (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => confirm("Delete this entry?") && go(() => del({ data: { id: entry.id! } }), "Entry deleted")}><Trash2 className="h-4 w-4" /></Button>
        ) : <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>}
        <Button size="sm" disabled={busy || !dirty || !t.trim() || !c.trim()} onClick={() => go(() => up({ data: { id: entry.id, title: t, content: c } }), "Saved")}>
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save
        </Button>
      </div>
    </Card>
  );
}
