"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatDaysLeft, formatINR } from "@/lib/format";
import { useDebounced } from "@/hooks/useDebounced";
import type { Contract, Pagination as PageInfo } from "@/types";
import { Alert } from "@/components/ui/Alert";
import { Badge, contractStatusTone } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Card, EmptyState, PageHeader } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { Icon } from "@/components/icons";

interface ListResponse {
  data: Contract[];
  pagination: PageInfo;
}

const SORTS = [
  { value: "endDate", label: "Ending soonest" },
  { value: "-endDate", label: "Ending latest" },
  { value: "-totalValue", label: "Highest value" },
  { value: "title", label: "Title A to Z" },
  { value: "-createdAt", label: "Newest first" },
];
const control = "h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-teal-600";

export function ContractsView() {
  const { canWrite } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("endDate");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search);
  const [result, setResult] = useState<ListResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    api
      .get<ListResponse>("/contracts", { search: debouncedSearch, status, sort, page, limit: 10 }, controller.signal)
      .then((r) => {
        setResult(r);
        setError("");
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(err));
        setLoading(false);
      });
    return () => controller.abort();
  }, [debouncedSearch, status, sort, page]);

  const change = (fn: () => void) => {
    fn();
    setPage(1);
    setLoading(true);
  };
  const filtered = Boolean(search || status);

  return (
    <>
      <PageHeader
        title="Contracts"
        description="Terms, values and renewal dates for every agreement."
        actions={
          canWrite && (
            <LinkButton href="/contracts/new">
              <Icon name="plus" className="h-4 w-4" /> Add contract
            </LinkButton>
          )
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row">
          <div className="relative flex-1">
            <Icon name="search" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => change(() => setSearch(e.target.value))}
              placeholder="Search by title, number or vendor"
              aria-label="Search contracts"
              className={`${control} w-full pl-9`}
            />
          </div>
          <select aria-label="Filter by status" value={status} onChange={(e) => change(() => setStatus(e.target.value))} className={control}>
            <option value="">All statuses</option>
            <option value="active">Active (in force)</option>
            <option value="expiring">Expiring in 90 days</option>
            <option value="draft">Draft</option>
            <option value="expired">Expired</option>
            <option value="terminated">Terminated</option>
          </select>
          <select aria-label="Sort contracts" value={sort} onChange={(e) => change(() => setSort(e.target.value))} className={control}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="p-4">
            <Alert>{error}</Alert>
          </div>
        )}

        {loading && !result ? (
          <div className="flex justify-center py-16 text-teal-700">
            <Spinner className="h-7 w-7" />
          </div>
        ) : result && result.data.length === 0 ? (
          <EmptyState
            icon={<Icon name="file" />}
            title={filtered ? "No contracts match your filters" : "No contracts yet"}
            description={filtered ? "Try a different search or clear the filters." : "Add a contract to start tracking its terms and renewal dates."}
            action={!filtered && canWrite ? <LinkButton href="/contracts/new">Add contract</LinkButton> : undefined}
          />
        ) : (
          result && (
            <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={loading}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-medium">Contract</th>
                      <th scope="col" className="px-5 py-3 font-medium">Vendor</th>
                      <th scope="col" className="px-5 py-3 font-medium">Ends</th>
                      <th scope="col" className="px-5 py-3 font-medium">Notice by</th>
                      <th scope="col" className="px-5 py-3 font-medium">Status</th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">Total value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.data.map((c) => {
                      const inForce = c.effectiveStatus === "active" || c.effectiveStatus === "expiring";
                      return (
                        <tr key={c._id} className="hover:bg-slate-50">
                          <td className="px-5 py-3.5">
                            <Link href={`/contracts/${c._id}`} className="font-medium text-slate-900 hover:text-teal-700 hover:underline">
                              {c.title}
                            </Link>
                            {c.contractNumber && <p className="text-xs text-slate-500">{c.contractNumber}</p>}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">{c.vendor?.name ?? "—"}</td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {formatDate(c.endDate)}
                            {inForce && <p className="text-xs text-slate-400">{formatDaysLeft(c.daysToExpiry)}</p>}
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {inForce ? (
                              <span className={c.daysToNoticeDeadline < 0 ? "text-red-600" : c.daysToNoticeDeadline <= 30 ? "text-amber-700" : ""}>
                                {formatDate(c.noticeDeadline)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge tone={contractStatusTone(c.effectiveStatus)}>{c.effectiveStatus}</Badge>
                          </td>
                          <td className="px-5 py-3.5 text-right tabular-nums text-slate-700">{formatINR(c.totalValue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination info={result.pagination} onPage={(p) => { setPage(p); setLoading(true); }} noun="contracts" />
            </div>
          )
        )}
      </Card>
    </>
  );
}
