import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { PageHeader, Card, Chip, Empty, Loading, ErrorBox, timeAgo } from "@/components/app-ui";
import { messagesQuery } from "@/lib/queries";

export const Route = createFileRoute("/queue")({
  head: () => ({
    meta: [
      { title: "Approval queue — InboxPilot" },
      { name: "description", content: "Every AI-drafted reply and action waiting for a human decision, oldest first." },
      { property: "og:title", content: "Approval queue — InboxPilot" },
      { property: "og:description", content: "Human approval queue for AI-triaged customer messages." },
    ],
  }),
  component: QueuePage,
});

function QueuePage() {
  const { data, isLoading, error } = useQuery(messagesQuery);
  const rows = (data ?? []).filter((m) => m.status === "Awaiting approval").sort((a, b) => a.received_at.localeCompare(b.received_at));
  return (
    <>
      <PageHeader title="Approval queue" subtitle={`${rows.length} awaiting a human decision · oldest first`} />
      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : rows.length === 0 ? (
        <Empty title="Queue is clear" hint="Triage new messages from the Inbox to fill the queue." />
      ) : (
        <Card className="divide-y divide-border">
          {rows.map((m) => (
            <Link key={m.id} to="/messages/$id" params={{ id: m.id }} className="flex items-center gap-3 p-4 hover:bg-muted/50">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone={m.priority ?? undefined}>{m.priority}</Chip>
                  <Chip>{m.intent}</Chip>
                  <span className="font-mono text-xs text-muted-foreground">conf {Number(m.confidence ?? 0).toFixed(2)}</span>
                </div>
                <p className="mt-1 truncate font-medium">{m.subject}</p>
                <p className="truncate text-xs text-muted-foreground">{m.sender_name} · {m.channel} · {timeAgo(m.received_at)} — {m.reasoning}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
