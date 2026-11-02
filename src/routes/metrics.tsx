import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Card, Empty, Loading, ErrorBox } from "@/components/app-ui";
import { messagesQuery } from "@/lib/queries";
import { computeMetrics } from "@/lib/metrics";

export const Route = createFileRoute("/metrics")({
  head: () => ({
    meta: [
      { title: "Metrics — InboxPilot" },
      { name: "description", content: "Triage volume, approval, edit and rejection rates, and confidence — computed live from stored data." },
      { property: "og:title", content: "Metrics — InboxPilot" },
      { property: "og:description", content: "Live KPIs for the AI triage agent and its human reviewers." },
    ],
  }),
  component: MetricsPage,
});

const pct = (n: number) => `${Math.round(n * 100)}%`;

function MetricsPage() {
  const { data, isLoading, error } = useQuery(messagesQuery);
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const m = computeMetrics((data ?? []).map((r) => ({ ...r, confidence: r.confidence === null ? null : Number(r.confidence) })));
  const kpis = [
    { label: "Messages triaged", value: String(m.triaged), sub: `of ${data!.length} total` },
    { label: "Approval rate", value: pct(m.approvalRate), sub: `${m.approved} approved` },
    { label: "Edit rate", value: pct(m.editRate), sub: "approved after edits ÷ approved" },
    { label: "Rejection rate", value: pct(m.rejectionRate), sub: `${m.rejected} rejected` },
    { label: "Avg confidence", value: m.avgConfidence.toFixed(2), sub: "across triaged messages" },
  ];
  return (
    <>
      <PageHeader title="Metrics" subtitle="Computed live from stored messages" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 font-display text-3xl font-semibold">{k.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{k.sub}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-6 p-4">
        <h2 className="mb-3 text-lg font-semibold">Messages by intent</h2>
        {m.byIntent.length === 0 ? <Empty title="No triaged messages yet" hint="Run “Triage all new” from the Inbox." /> : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.byIntent} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="intent" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 12 }} />
                <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </>
  );
}
