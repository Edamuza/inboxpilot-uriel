import { Link, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Inbox, ListChecks, CalendarDays, BookOpen, ScrollText, BarChart3, Info, RotateCcw, Loader2, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { resetDemo } from "@/lib/inbox.functions";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const NAV = [
  { to: "/", label: "Inbox", icon: Inbox },
  { to: "/queue", label: "Approval queue", icon: ListChecks },
  { to: "/records", label: "Bookings & tickets", icon: CalendarDays },
  { to: "/knowledge", label: "Knowledge base", icon: BookOpen },
  { to: "/audit", label: "Audit log", icon: ScrollText },
  { to: "/metrics", label: "Metrics", icon: BarChart3 },
  { to: "/about", label: "About", icon: Info },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-accent px-4 py-1.5 text-center text-xs font-medium text-accent-foreground">
        Demo app — all sample data is fictional. Replies are simulated; nothing is emailed.
      </div>
      <div className="lg:flex">
        <aside className="bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:flex lg:flex-col">
          <div className="flex items-center justify-between gap-2 px-4 py-3 lg:py-6">
            <Link to="/" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"><Plane className="h-4 w-4" /></span>
              <span className="font-display text-lg font-semibold">InboxPilot</span>
            </Link>
            <div className="lg:hidden"><ResetButton compact /></div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:px-3 lg:pb-0">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeProps={{ className: "bg-sidebar-accent text-sidebar-primary font-medium" }}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto hidden p-4 lg:block">
            <ResetButton />
            <p className="mt-3 text-xs text-sidebar-foreground/60">Kape Kultura Café & Catering, Makati (fictional)</p>
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function ResetButton({ compact }: { compact?: boolean }) {
  const reset = useServerFn(resetDemo);
  const qc = useQueryClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className={cn("inline-flex items-center gap-2 rounded-md border border-sidebar-border px-3 py-2 text-xs text-sidebar-foreground hover:bg-sidebar-accent", !compact && "w-full justify-center")}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          {compact ? "Reset" : "Reset demo data"}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
          <AlertDialogDescription>
            This restores the 12 seed messages (all New), the knowledge base and availability, and clears bookings, tickets and the audit log.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              setBusy(true);
              try {
                await reset();
                await qc.invalidateQueries();
                toast.success("Demo data restored");
                router.navigate({ to: "/" });
              } catch {
                toast.error("Reset failed. Please try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Reset
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  New: "bg-info/15 text-info",
  Triaged: "bg-secondary text-secondary-foreground",
  "Awaiting approval": "bg-warning/25 text-accent-foreground",
  Sent: "bg-success/15 text-success",
  Rejected: "bg-destructive/15 text-destructive",
  Spam: "bg-muted text-muted-foreground line-through",
};
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[status] ?? "bg-muted")}>
      {status === "Sent" ? "Sent (simulated)" : status}
    </span>
  );
}

const PRIORITY_STYLE: Record<string, string> = {
  high: "border-destructive/40 text-destructive",
  medium: "border-warning text-accent-foreground",
  low: "border-border text-muted-foreground",
};
export function Chip({ children, tone }: { children: ReactNode; tone?: string }) {
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-md border px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide", tone ? PRIORITY_STYLE[tone] : "border-border text-muted-foreground")}>
      {children}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-lg border border-border bg-card shadow-card", className)}>{children}</div>;
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <p className="font-display text-lg text-foreground">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
      Couldn't load data: {error instanceof Error ? error.message : "unknown error"}
    </div>
  );
}

export function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}
export function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
}
