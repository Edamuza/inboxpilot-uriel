import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, Card, Chip, Empty, Loading, ErrorBox, fmt } from "@/components/app-ui";
import { availabilityQuery, recordsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/records")({
  head: () => ({
    meta: [
      { title: "Bookings & tickets — InboxPilot" },
      { name: "description", content: "Table bookings and support tickets created from human-approved agent actions." },
      { property: "og:title", content: "Bookings & tickets — InboxPilot" },
      { property: "og:description", content: "Records created only after human approval." },
    ],
  }),
  component: RecordsPage,
});

function RecordsPage() {
  const { data, isLoading, error } = useQuery(recordsQuery);
  const av = useQuery(availabilityQuery);
  const days = Object.entries(
    (av.data ?? []).reduce<Record<string, { t: string; taken: boolean }[]>>((acc, s) => {
      (acc[s.slot_date] ??= []).push({ t: s.slot_time, taken: s.is_taken });
      return acc;
    }, {}),
  );
  return (
    <>
      <PageHeader title="Bookings & tickets" subtitle="Created only when a human approves the agent's proposal" />
      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-xl font-semibold">Bookings <span className="font-mono text-sm text-muted-foreground">{data!.bookings.length}</span></h2>
            {data!.bookings.length === 0 ? <Empty title="No bookings yet" hint="Approve a create_booking proposal to add one." /> : (
              <Card className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground"><tr><th className="p-3">Name</th><th className="p-3">Date</th><th className="p-3">Time</th><th className="p-3">Party</th><th className="p-3">Status</th><th className="p-3">Created</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {data!.bookings.map((b) => (
                      <tr key={b.id}>
                        <td className="p-3">{b.message_id ? <Link to="/messages/$id" params={{ id: b.message_id }} className="underline-offset-2 hover:underline">{b.customer_name}</Link> : b.customer_name}</td>
                        <td className="p-3 font-mono">{b.booking_date}</td><td className="p-3 font-mono">{b.booking_time}</td><td className="p-3">{b.party_size}</td>
                        <td className="p-3"><Chip>{b.status}</Chip></td><td className="p-3 text-muted-foreground">{fmt(b.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </section>
          <section>
            <h2 className="mb-3 text-xl font-semibold">Tickets <span className="font-mono text-sm text-muted-foreground">{data!.tickets.length}</span></h2>
            {data!.tickets.length === 0 ? <Empty title="No tickets yet" hint="Approve a create_ticket proposal to add one." /> : (
              <Card className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground"><tr><th className="p-3">Title</th><th className="p-3">Priority</th><th className="p-3">Status</th><th className="p-3">Created</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {data!.tickets.map((t) => (
                      <tr key={t.id}>
                        <td className="p-3">{t.message_id ? <Link to="/messages/$id" params={{ id: t.message_id }} className="hover:underline">{t.title}</Link> : t.title}</td>
                        <td className="p-3"><Chip tone={t.priority}>{t.priority}</Chip></td><td className="p-3"><Chip>{t.status}</Chip></td><td className="p-3 text-muted-foreground">{fmt(t.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </section>
          <section>
            <h2 className="mb-3 text-xl font-semibold">Availability (next 14 days)</h2>
            {av.isLoading ? <Loading /> : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {days.map(([d, slots]) => (
                  <Card key={d} className="p-3">
                    <p className="text-xs font-medium">{new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {slots.map((s) => <span key={s.t} className={cn("rounded px-1.5 py-0.5 font-mono text-[11px]", s.taken ? "bg-muted text-muted-foreground line-through" : "bg-success/15 text-success")}>{s.t}</span>)}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
