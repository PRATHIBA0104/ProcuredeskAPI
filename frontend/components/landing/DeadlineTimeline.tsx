// The hero visual: one example contract laid out in time, showing the day a renewal can still be stopped.
// All numbers are an illustration, not live data. Positions are percentages of the 12-month term
// (1 Apr 2026 to 31 Mar 2027; "today" is 20 Jan 2027, the notice deadline is 14 Feb 2027).
const TODAY = 80.8;
const DEADLINE = 87.6;

const months = ["Apr", "Jun", "Aug", "Oct", "Dec", "Feb"];

export function DeadlineTimeline() {
  return (
    <figure className="w-full">
      <div className="rounded-xl border border-[#d5dce4] bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div>
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[#0e1726]">CRM licences</p>
            <p className="text-sm text-slate-500">Salesforce · renews automatically</p>
          </div>
          <p className="text-right text-sm tabular-nums text-slate-600">
            <span className="font-medium text-[#0e1726]">₹48,00,000</span> a year
          </p>
        </div>

        <div
          className="relative mt-14 mb-16"
          role="img"
          aria-label="Timeline of an example contract running April 2026 to March 2027. Today is 20 January. The notice deadline is 14 February, 25 days away. After it, the contract renews automatically on 31 March."
        >
          {/* Today marker, labelled above the bar */}
          <div className="absolute bottom-full mb-2 -translate-x-1/2 text-center" style={{ left: `${TODAY}%` }}>
            <p className="whitespace-nowrap text-xs font-medium text-[#0e1726]">Today</p>
            <p className="whitespace-nowrap text-xs tabular-nums text-slate-500">20 Jan</p>
          </div>
          <div className="absolute -top-2 h-8 w-px bg-[#0e1726]" style={{ left: `${TODAY}%` }} />

          <div className="relative h-4 overflow-hidden rounded-full bg-[#d5dce4]">
            <div className="absolute inset-y-0 left-0 bg-teal-700" style={{ width: `${DEADLINE}%` }} />
            <div
              className="absolute inset-y-0 right-0 origin-left bg-amber-600 motion-safe:animate-[window-draw_1.1s_0.35s_ease-out_both]"
              style={{ width: `${100 - DEADLINE}%` }}
            />
          </div>

          {/* Notice deadline marker, labelled below the bar */}
          <div className="absolute top-full mt-2 -translate-x-1/2 text-center" style={{ left: `${DEADLINE}%` }}>
            <p className="whitespace-nowrap text-xs font-semibold text-amber-700">Notice deadline</p>
            <p className="whitespace-nowrap text-xs tabular-nums text-slate-500">14 Feb</p>
          </div>
          <div className="absolute -bottom-2 h-8 w-px bg-amber-700" style={{ left: `${DEADLINE}%` }} />
        </div>

        <div className="mb-1 flex justify-between text-xs tabular-nums text-slate-400" aria-hidden="true">
          {months.map((m) => (
            <span key={m}>{m}</span>
          ))}
          <span>Mar</span>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-[#d5dce4] pt-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="flex items-center gap-2 text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-700" aria-hidden="true" />
              Until the notice deadline
            </dt>
            <dd className="mt-1 text-[#0e1726]">You can still negotiate, change or cancel.</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-600" aria-hidden="true" />
              After it
            </dt>
            <dd className="mt-1 text-[#0e1726]">The contract renews for another term.</dd>
          </div>
        </dl>
      </div>
      <figcaption className="mt-3 text-xs text-slate-500">An example contract. In ProcureDesk this date is calculated for every contract you record.</figcaption>
    </figure>
  );
}
