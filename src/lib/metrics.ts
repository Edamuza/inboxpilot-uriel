export type MetricRow = { status: string; intent: string | null; confidence: number | null; edited: boolean; triaged_at: string | null };

export function computeMetrics(rows: MetricRow[]) {
  const triaged = rows.filter((r) => r.triaged_at);
  const approved = rows.filter((r) => r.status === "Sent" || r.status === "Spam");
  const rejected = rows.filter((r) => r.status === "Rejected");
  const decided = approved.length + rejected.length;
  const editedApproved = approved.filter((r) => r.status === "Sent" && r.edited).length;
  const confs = triaged.map((r) => Number(r.confidence)).filter((n) => !Number.isNaN(n));
  const byIntent: Record<string, number> = {};
  for (const r of triaged) if (r.intent) byIntent[r.intent] = (byIntent[r.intent] ?? 0) + 1;
  return {
    triaged: triaged.length,
    approved: approved.length,
    rejected: rejected.length,
    approvalRate: decided ? approved.length / decided : 0,
    rejectionRate: decided ? rejected.length / decided : 0,
    editRate: approved.length ? editedApproved / approved.length : 0,
    avgConfidence: confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 0,
    byIntent: Object.entries(byIntent).map(([intent, count]) => ({ intent, count })).sort((a, b) => b.count - a.count),
  };
}
