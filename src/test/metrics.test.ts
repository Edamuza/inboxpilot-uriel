import { describe, expect, it } from "vitest";
import { computeMetrics } from "@/lib/metrics";

const t = "2026-01-01";
describe("metrics", () => {
  it("edit rate = approved after edits ÷ approved", () => {
    const m = computeMetrics([
      { status: "Sent", intent: "other", confidence: 0.8, edited: true, triaged_at: t },
      { status: "Sent", intent: "other", confidence: 0.6, edited: false, triaged_at: t },
      { status: "Rejected", intent: "spam", confidence: 0.9, edited: false, triaged_at: t },
      { status: "New", intent: null, confidence: null, edited: false, triaged_at: null },
    ]);
    expect(m.editRate).toBe(0.5);
    expect(m.triaged).toBe(3);
    expect(m.rejectionRate).toBeCloseTo(1 / 3);
    expect(m.avgConfidence).toBeCloseTo(0.7667, 3);
  });
});
