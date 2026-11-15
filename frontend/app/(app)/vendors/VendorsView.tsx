"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/vendorMeta";
import { useDebounced } from "@/hooks/useDebounced";
import type { Pagination as PageInfo, Vendor } from "@/types";
import { Alert } from "@/components/ui/Alert";
import { Badge, vendorStatusTone } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Card, EmptyState, PageHeader } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { Spinner } from "@/components/ui/Spinner";
import { Icon } from "@/components/icons";

interface ListResponse {
  data: Vendor[];
  pagination: PageInfo;
}

const SORTS = [
  { value: "-createdAt", label: "Newest first" },
  { value: "name", label: "Name A to Z" },
  { value: "-name", label: "Name Z to A" },
  { value: "category", label: "Category" },
  { value: "status", label: "Status" },
];

const control = "h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-teal-600";

export function VendorsView() {
  const { canWrite } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("-createdAt");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search);

  const [result, setResult] = useState<ListResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    api
      .get<ListResponse>("/vendors", { search: debouncedSearch, category, status, sort, page, limit: 10 }, controller.signal)
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
  }, [debouncedSearch, category, status, sort, page]);

  // Any filter change goes back to page 1 and shows the loading state.
  const change = (fn: () => void) => {
    fn();
    setPage(1);
    setLoading(true);
  };
  const filtered = Boolean(search || category || status);

  return (
    <>
      <PageHeader
        title="Vendors"
        description="Every supplier your organization buys from."
        actions={
          canWrite && (
            <LinkButton href="/vendors/new">
              <Icon name="plus" className="h-4 w-4" /> Add vendor
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
              placeholder="Search by vendor or contact"
              aria-label="Search vendors"
              className={`${control} w-full pl-9`}
            />
          </div>
          <select aria-label="Filter by category" value={category} onChange={(e) => change(() => setCategory(e.target.value))} className={control}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
          <select aria-label="Filter by status" value={status} onChange={(e) => change(() => setStatus(e.target.value))} className={control}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="prospect">Prospect</option>
            <option value="inactive">Inactive</option>
          </select>
          <select aria-label="Sort vendors" value={sort} onChange={(e) => change(() => setSort(e.target.value))} className={control}>
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
            icon={<Icon name="building" />}
            title={filtered ? "No vendors match your filters" : "No vendors yet"}
            description={filtered ? "Try a different search or clear the filters." : "Add your first vendor to start tracking contracts."}
            action={!filtered && canWrite ? <LinkButton href="/vendors/new">Add vendor</LinkButton> : undefined}
          />
        ) : (
          result && (
            <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={loading}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-medium">Vendor</th>
                      <th scope="col" className="px-5 py-3 font-medium">Category</th>
                      <th scope="col" className="px-5 py-3 font-medium">Status</th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">Active contracts</th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">Annual value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.data.map((v) => (
                      <tr key={v._id} className="hover:bg-slate-50">
                        <td className="px-5 py-3.5">
                          <Link href={`/vendors/${v._id}`} className="font-medium text-slate-900 hover:text-teal-700 hover:underline">
                            {v.name}
                          </Link>
                          {v.contacts[0] && <p className="text-xs text-slate-500">{v.contacts[0].name}</p>}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{CATEGORY_LABEL[v.category]}</td>
                        <td className="px-5 py-3.5">
                          <Badge tone={vendorStatusTone(v.status)}>{v.status}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-slate-700">{v.activeContracts ?? 0}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-slate-700">{formatINR(v.activeAnnualValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination info={result.pagination} onPage={(p) => { setPage(p); setLoading(true); }} noun="vendors" />
            </div>
          )
        )}
      </Card>
    </>
  );
}
