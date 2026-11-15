import type { Pagination as PageInfo } from "@/types";
import { Icon } from "@/components/icons";

export function Pagination({ info, onPage, noun }: { info: PageInfo; onPage: (page: number) => void; noun: string }) {
  if (info.total === 0) return null;
  const from = (info.page - 1) * info.limit + 1;
  const to = Math.min(info.page * info.limit, info.total);
  const btn = "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
      <p>
        Showing {from}–{to} of {info.total} {noun}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} disabled={info.page <= 1} onClick={() => onPage(info.page - 1)} aria-label="Previous page">
          <Icon name="chevronLeft" className="h-4 w-4" />
        </button>
        <span className="min-w-16 text-center">
          {info.page} / {info.pages}
        </span>
        <button type="button" className={btn} disabled={info.page >= info.pages} onClick={() => onPage(info.page + 1)} aria-label="Next page">
          <Icon name="chevronRight" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
