import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { triageMessage } from "@/lib/inbox.functions";

export function useTriage() {
  const fn = useServerFn(triageMessage);
  const qc = useQueryClient();
  const [running, setRunning] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const mark = (id: string, on: boolean) =>
    setRunning((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  async function one(id: string, quiet = false): Promise<{ ok: boolean; status?: number }> {
    mark(id, true);
    try {
      const r = await fn({ data: { id } });
      if (!r.ok) {
        toast.error(r.error);
        return { ok: false, status: r.status };
      }
      if (!quiet) toast.success("Agent finished — ready for approval");
      return { ok: true };
    } catch {
      toast.error("Agent request failed or timed out. Please try again.");
      return { ok: false };
    } finally {
      mark(id, false);
      qc.invalidateQueries();
    }
  }

  async function all(ids: string[]) {
    if (!ids.length) return toast.info("No new messages to triage");
    setProgress({ done: 0, total: ids.length });
    let ok = 0;
    for (let i = 0; i < ids.length; i++) {
      const r = await one(ids[i], true);
      if (r.ok) ok++;
      else if (r.status === 402 || r.status === 403 || r.status === 429) break; // stop the batch on account/rate errors
      setProgress({ done: i + 1, total: ids.length });
    }
    setProgress(null);
    toast.success(`Triaged ${ok} of ${ids.length} messages`);
  }

  return { one, all, running, progress };
}
