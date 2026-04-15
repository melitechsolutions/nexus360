/**
 * Shared client health score computation.
 * Used across both global CRM (Clients.tsx, ClientDetails.tsx)
 * and org-tenant CRM (OrgCRM.tsx, OrgClientDetail.tsx).
 *
 * Algorithm mirrors server-side multiTenancy.getClientsHealthScores so that
 * client-list scores (server-computed) and detail-page scores (client-computed)
 * remain identical.
 */

export interface HealthScoreResult {
  score: number;
  label: string;
  color: string;
  breakdown: Array<{ label: string; value: number; color: string }>;
}

export function computeHealthScore(invoices: any[], projects: any[]): HealthScoreResult {
  const totalInv = invoices.length;
  const paidInv = invoices.filter((i) => i.status === "paid").length;
  const overdueInv = invoices.filter((i) => i.status === "overdue").length;

  // Payment score (max 50 pts)
  const paymentScore = totalInv > 0 ? Math.round((paidInv / totalInv) * 50) : 25;

  // Overdue penalty (max 20 pts)
  const overduePenalty = totalInv > 0 ? Math.round((overdueInv / totalInv) * 20) : 0;

  // Engagement score (max 30 pts) — active or planning projects
  const activeProjects = projects.filter((p) => p.status === "active" || p.status === "planning").length;
  const engagementScore = activeProjects > 0 ? Math.min(30, activeProjects * 15) : 10;

  // Recency score (max 20 pts) — had an invoice in last 90 days
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const hasRecent = invoices.some((i) => {
    const d = i.issueDate || i.createdAt;
    return d && now - new Date(String(d)).getTime() < ninetyDaysMs;
  });
  const recencyScore = hasRecent ? 20 : 5;

  const raw = paymentScore - overduePenalty + engagementScore + recencyScore;
  const score = Math.max(0, Math.min(100, raw));

  let label = "Critical";
  let color = "#ef4444";
  if (score >= 80) { label = "Excellent"; color = "#22c55e"; }
  else if (score >= 60) { label = "Good"; color = "#3b82f6"; }
  else if (score >= 40) { label = "At Risk"; color = "#f59e0b"; }

  return {
    score,
    label,
    color,
    breakdown: [
      { label: "Payments",   value: Math.round((paymentScore   / 50) * 100), color: "#22c55e" },
      { label: "Engagement", value: Math.round((engagementScore / 30) * 100), color: "#3b82f6" },
      { label: "Recency",    value: Math.round((recencyScore    / 20) * 100), color: "#a855f7" },
    ],
  };
}

/** Convenience wrapper for client-list pages that batch-filter per clientId. */
export function computeHealthScoreForClient(
  clientId: string,
  allInvoices: any[],
  allProjects: any[],
): HealthScoreResult {
  return computeHealthScore(
    allInvoices.filter((i) => i.clientId === clientId),
    allProjects.filter((p) => p.clientId === clientId),
  );
}
