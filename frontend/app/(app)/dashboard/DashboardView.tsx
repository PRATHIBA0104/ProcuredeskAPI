"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatDaysLeft, formatINR, formatINRCompact } from "@/lib/format";
import { CONTRACT_STATUS_LABEL } from "@/lib/contractMeta";
import { CATEGORY_LABEL } from "@/lib/vendorMeta";
import type { ContractStatus, DashboardSummary } from "@/types";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/Card";
import { Icon } from "@/components/icons";
import type { IconName } from "@/components/icons";
import { Spinner } from "@/components/ui/Spinner";

function Kpi({ icon, label, value, note, href }: { icon: IconName; label: string; value: ReactNode; note: string; href?: string }) {
  const body = (
    <Card className={`p-5 ${href ? "transition-shadow hover:shadow-md" : ""}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <Icon name={icon} />
        </span>
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

interface GuideStep {
  title: string;
  text: string;
  done: boolean;
  href: string;
  action: string;
}

// A short checklist for a new organization. Each tick comes from real data, so it cannot get out of step.
function GettingStarted({ steps }: { steps: GuideStep[] }) {
  const next = steps.findIndex((s) => !s.done);
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <Card>
      <CardHeader title="Get started" description={`${doneCount} of ${steps.length} done. Add your first records and this page fills in.`} />
      <ol className="divide-y divide-slate-100">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-start gap-4 px-5 py-4">
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${s.done ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white"}`}
              aria-hidden="true"
            >
              {s.done && (
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${s.done ? "text-slate-500 line-through" : "text-slate-900"}`}>
                {s.title}
                <span className="sr-only">{s.done ? " (done)" : " (not done yet)"}</span>
              </p>
              <p className="mt-0.5 text-sm text-slate-500">{s.text}</p>
            </div>
            {!s.done && (
              <Link
                href={s.href}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${i === next ? "bg-teal-700 text-white hover:bg-teal-800" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
              >
                {s.action}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

const STATUS_ORDER: ContractStatus[] = ["active", "expiring", "draft", "expired", "terminated"];
const STATUS_BAR: Record<ContractStatus, string> = {
  active: "bg-emerald-500",
  expiring: "bg-amber-500",
  draft: "bg-slate-400",
  expired: "bg-red-400",
  terminated: "bg-red-700",
};

function deadlineText(days: number) {
  return days < 0 ? `passed ${formatDaysLeft(days)}` : formatDaysLeft(days);
}

export function DashboardView() {
  const { user, organization, canWrite } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api
      .get<DashboardSummary>("/dashboard/summary", undefined, controller.signal)
      .then(setSummary)
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err));
      });
    return () => controller.abort();
  }, []);

  const totalContracts = summary ? Object.values(summary.statusCounts).reduce((a, b) => a + b, 0) : 0;
  const guide: GuideStep[] = summary
    ? [
        { title: "Create your organization", text: "Done when you registered.", done: true, href: "/dashboard", action: "" },
        { title: "Add your first vendor", text: "A supplier you buy from, with a category and a contact.", done: summary.kpis.totalVendors > 0, href: "/vendors/new", action: "Add vendor" },
        { title: "Record a contract", text: "Dates, notice period and value. Attach the signed document if you have it.", done: totalContracts > 0, href: "/contracts/new", action: "Add contract" },
      ]
    : [];
  const showGuide = canWrite && summary !== null && guide.some((g) => !g.done);
  const maxSpend = summary ? Math.max(1, ...summary.spendByCategory.map((s) => s.annualValue)) : 1;

  return (
    <>
      <PageHeader title={`Welcome, ${user?.name.split(" ")[0] ?? ""}`} description={`Here is where ${organization?.name ?? "your organization"} stands today.`} />

      {error && <Alert>{error}</Alert>}
      {!error && !summary && (
        <div className="flex justify-center py-16 text-teal-700">
          <Spinner className="h-7 w-7" />
        </div>
      )}

      {summary && (
        <div className="space-y-6">
          {showGuide && <GettingStarted steps={guide} />}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi icon="building" label="Active vendors" value={summary.kpis.activeVendors} note={`${summary.kpis.totalVendors} vendors in total`} href="/vendors" />
            <Kpi icon="file" label="Contracts in force" value={summary.kpis.activeContracts} note="Active, including those expiring soon" href="/contracts" />
            <Kpi
              icon="rupee"
              label="Annual commitment"
              value={<span title={formatINR(summary.kpis.annualCommitment)}>{formatINRCompact(summary.kpis.annualCommitment)}</span>}
              note="Yearly value of contracts in force"
            />
            <Kpi
              icon="clock"
              label="Expiring in 90 days"
              value={summary.kpis.expiringContracts}
              note={summary.kpis.noticeAlerts > 0 ? `${summary.kpis.noticeAlerts} need notice within 30 days` : "No notice deadlines close"}
              href="/contracts"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Upcoming renewals" description="Contracts ending in the next 90 days, soonest first." />
              {summary.upcomingRenewals.length === 0 ? (
                <EmptyState icon={<Icon name="calendar" />} title="No renewals in the next 90 days" description="When a contract is due to end soon, it will appear here." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="px-5 py-3 font-medium">Contract</th>
                        <th scope="col" className="px-5 py-3 font-medium">Ends</th>
                        <th scope="col" className="px-5 py-3 font-medium">Notice deadline</th>
                        <th scope="col" className="px-5 py-3 text-right font-medium">Annual value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.upcomingRenewals.map((r) => (
                        <tr key={r._id} className="hover:bg-slate-50">
                          <td className="px-5 py-3.5">
                            <Link href={`/contracts/${r._id}`} className="font-medium text-slate-900 hover:text-teal-700 hover:underline">
                              {r.title}
                            </Link>
                            <p className="text-xs text-slate-500">
                              {r.vendorName} {r.autoRenew && <Badge tone="blue">auto-renews</Badge>}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {formatDate(r.endDate)}
                            <p className="text-xs text-slate-400">{formatDaysLeft(r.daysToExpiry)}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={r.daysToNoticeDeadline < 0 ? "font-medium text-red-600" : r.daysToNoticeDeadline <= 30 ? "font-medium text-amber-700" : "text-slate-600"}>
                              {formatDate(r.noticeDeadline)}
                            </span>
                            <p className="text-xs text-slate-400">{deadlineText(r.daysToNoticeDeadline)}</p>
                          </td>
                          <td className="px-5 py-3.5 text-right tabular-nums text-slate-700">{formatINR(r.annualValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Contracts by status" />
              {totalContracts === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">No contracts yet.</p>
              ) : (
                <div className="space-y-3 px-5 py-4">
                  <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Contracts by status">
                    {STATUS_ORDER.filter((s) => summary.statusCounts[s] > 0).map((s) => (
                      <div key={s} className={STATUS_BAR[s]} style={{ width: `${(summary.statusCounts[s] / totalContracts) * 100}%` }} />
                    ))}
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {STATUS_ORDER.map((s) => (
                      <li key={s} className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-600">
                          <span className={`h-2.5 w-2.5 rounded-full ${STATUS_BAR[s]}`} />
                          {CONTRACT_STATUS_LABEL[s]}
                        </span>
                        <span className="tabular-nums font-medium text-slate-900">{summary.statusCounts[s]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Annual spend by category" description="Contracts in force, grouped by vendor category." />
              {summary.spendByCategory.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">No contracts in force yet.</p>
              ) : (
                <ul className="space-y-4 px-5 py-4">
                  {summary.spendByCategory.map((s) => (
                    <li key={s.category}>
                      <div className="mb-1 flex items-baseline justify-between text-sm">
                        <span className="text-slate-700">
                          {CATEGORY_LABEL[s.category]} <span className="text-xs text-slate-400">({s.contracts})</span>
                        </span>
                        <span className="tabular-nums font-medium text-slate-900">{formatINR(s.annualValue)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-teal-600" style={{ width: `${Math.max(2, (s.annualValue / maxSpend) * 100)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title="Recent activity" />
              {summary.recentActivity.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">Nothing has happened yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {summary.recentActivity.map((a) => (
                    <li key={a._id} className="px-5 py-3 text-sm">
                      <p className="text-slate-800">{a.summary}</p>
                      <p className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
