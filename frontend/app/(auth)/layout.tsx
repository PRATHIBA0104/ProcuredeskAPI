import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/config";
import { Icon } from "@/components/icons";
import type { IconName } from "@/components/icons";

const POINTS: { icon: IconName; title: string; text: string }[] = [
  { icon: "building", title: "Every vendor in one register", text: "Categories, contacts and status, with each vendor's contracts alongside." },
  { icon: "file", title: "Contracts with their paperwork", text: "Terms, values, payment terms and the signed document, kept together." },
  { icon: "calendar", title: "Renewals you see coming", text: "Notice deadlines are calculated, so a renewal window never slips past unnoticed." },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-slate-900 px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 font-bold">P</span>
          <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        </div>

        <div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">Run procurement like an outsourced team would.</h1>
          <ul className="mt-10 space-y-6">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-teal-300">
                  <Icon name={p.icon} />
                </span>
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="mt-0.5 text-sm text-slate-400">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-500">Your organization&apos;s vendors and contracts are visible only to your organization.</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 font-bold text-white">P</span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">{APP_NAME}</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
