import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader, Card, Chip, Empty, Loading, ErrorBox, fmt } from "@/components/app-ui";
import { auditQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit log — InboxPilot" },
      { name: "description", content: "Every agent step, tool call and human decision, newest first." },
      { property: "og:title", content: "Audit log — InboxPilot" },
      { property: "og:description", content: "Full traceability of AI agent runs and human approvals." },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { data, isLoading, error } = useQuery(auditQuery);
  const [actor, setActor] = useState<"all" | "agent" | "human" | "system">("all");
  const rows = (data ?? []).filter((r) => actor === "all" || r.actor === actor);
  return (
    <>
      <PageHeader title="Audit log" subtitle="Newest first" actions={
        <div className="flex rounded-md border border-border p-0.5">
          {(["all", "agent", "human", "system"] as const).map((a) => (
            <button key={a} onClick={() => setActor(a)} className={cn("rounded px-3 py-1 text-xs capitalize", actor === a ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{a}</button>
          ))}
        </div>
      } />
      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : rows.length === 0 ? <Empty title="No entries yet" /> : (
        <Card className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="grid gap-1 p-3 text-sm sm:grid-cols-[150px_70px_1fr]">
              <span className="text-xs text-muted-foreground">{fmt(r.created_at)}</span>
              <span><Chip>{r.actor}</Chip></span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-xs font-medium">{r.event}</span>
                  {r.message_id && <Link to="/messages/$id" params={{ id: r.message_id }} className="truncate text-xs text-primary hover:underline">{r.message_subject}</Link>}
                </div>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] text-muted-foreground">{JSON.stringify(r.details)}</pre>
              </div>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
