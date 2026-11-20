import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { DeadlineTimeline } from "@/components/landing/DeadlineTimeline";

export const metadata: Metadata = {
  title: { absolute: `${APP_NAME}: vendor and contract records with renewal deadlines` },
  description: "Keep vendors, contracts and signed documents in one place, and see the last day to give notice on every contract.",
};

const display = "font-[family-name:var(--font-display)]";
const primaryBtn = "inline-flex h-12 items-center justify-center rounded-lg bg-teal-700 px-6 text-base font-medium text-white hover:bg-teal-800";
const secondaryBtn = "inline-flex h-12 items-center justify-center rounded-lg border border-[#b9c3cf] bg-white px-6 text-base font-medium text-[#0e1726] hover:bg-slate-50";

const READY = [
  "Your company name",
  "The vendors you buy from",
  "For each contract: start and end dates, the notice period and the value",
  "The signed PDF or Word file, if you want it kept with the contract",
];

const PATH = [
  {
    when: "2 minutes",
    title: "Create your organization",
    text: "Register with your company name, your name, an email and a password. You become the administrator and land on an empty dashboard.",
    link: { href: "/register", label: "Create your organization" },
  },
  {
    when: "First hour",
    title: "Add your vendors",
    text: "Enter each supplier with a category and the people you deal with. Mark one contact as primary.",
  },
  {
    when: "First hour",
    title: "Record your contracts",
    text: "Pick the vendor, enter the dates, notice period and value in rupees, then attach the signed document. Leave the yearly value empty and it is worked out for you.",
  },
  {
    when: "Right away",
    title: "See what is coming up",
    text: "The dashboard lists contracts ending in the next 90 days with their notice deadlines, amber when they are within 30 days and red once they have passed.",
  },
];

const INCLUDED = [
  ["Vendor register", "Category, status and contacts for every supplier, with search, filters and a page per vendor that lists its contracts."],
  ["Contracts", "Dates, value in rupees, pricing model and payment terms. Draft, active and terminated are recorded; expiring and expired are worked out from the dates, so they are never out of date."],
  ["Notice deadlines", "The last day to give notice is the end date minus the notice period. It is calculated for every contract and shown on the contract page, the list and the dashboard."],
  ["Signed documents", "Upload a PDF, DOC or DOCX of up to 10 MB and download it later under its original name."],
  ["Dashboard", "Active vendors, contracts in force, yearly commitment, renewals due, spend by vendor category and recent activity."],
  ["Separate by organization", "Everything belongs to your organization. Another company's records never appear, even if someone guesses a link."],
];

type Cell = "yes" | "no";
const ROLES: { action: string; cells: Cell[] }[] = [
  { action: "View vendors, contracts, documents and the dashboard", cells: ["yes", "yes", "yes", "yes"] },
  { action: "Add and edit vendors and contracts, upload documents", cells: ["no", "yes", "yes", "yes"] },
  { action: "Deactivate vendors, activate or terminate contracts, delete documents", cells: ["no", "no", "yes", "yes"] },
];
const ROLE_NAMES = ["Viewer", "Analyst", "Manager", "Admin"];

const CONFIDENTIAL = [
  "Passwords are stored hashed and are never shown.",
  "Sign-in sessions expire after 8 hours.",
  "Uploaded files are checked by their real content, not only their name, and are stored under random names.",
  "A document can be downloaded only by a signed-in member of the same organization.",
  "Every action is checked on the server against your role. Hiding a button is never the only protection.",
];

const FAQ = [
  ["How is the notice deadline worked out?", "It is the end date minus the notice period you enter, in days. A contract ending on 31 March with a 45 day notice period has a deadline of 14 February."],
  ["Can I invite my team?", "Not yet. The person who registers becomes the administrator. Inviting colleagues and assigning their roles from a screen is planned. The four roles above already exist in the system."],
  ["Can I import my contracts from a spreadsheet?", "Not yet. Contracts are added one at a time, which is why the first hour goes to setup."],
  ["Which currency does it use?", "Indian rupees (INR) only, shown in the lakh and crore grouping."],
  ["Does it help me negotiate?", "It keeps the record that negotiation depends on: terms, values and dates in one place. Negotiation workflows, such as offers and savings tracking, are planned and are not part of this release."],
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f6f8fa] text-[#0e1726]">
      <LandingHeader />

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:py-24">
          <div>
            <h1 className={`${display} max-w-xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl`}>
              Find out about a renewal before the notice window closes.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">
              {APP_NAME} keeps your vendors, contracts and signed documents in one place, and works out the last day you can give notice on every contract.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/register" className={primaryBtn}>
                Create your organization
              </Link>
              <a href="#onboarding" className={secondaryBtn}>
                See how onboarding works
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-500">Your workspace is ready the moment you register. No setup call is needed.</p>
          </div>
          <DeadlineTimeline />
        </section>

        {/* Onboarding path */}
        <section id="onboarding" className="scroll-mt-4 border-t border-[#d5dce4] bg-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:py-20">
            <div>
              <h2 className={`${display} max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl`}>From sign-up to your first renewal alert</h2>
              <p className="mt-4 max-w-xl text-slate-600">Most of the work is entering what you already have. Here is the path, with how long each part usually takes.</p>

              <ol className="mt-10 space-y-0">
                {PATH.map((step, i) => (
                  <li key={step.title} className="relative grid grid-cols-[5.5rem_1fr] gap-x-5 sm:grid-cols-[7rem_1fr]">
                    <p className="pt-0.5 text-right text-sm font-medium tabular-nums text-teal-800">{step.when}</p>
                    <div className={`relative border-l-2 border-[#d5dce4] pl-7 ${i === PATH.length - 1 ? "pb-0" : "pb-10"}`}>
                      <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-teal-700 ring-4 ring-white" aria-hidden="true" />
                      <h3 className="text-lg font-semibold leading-snug">{step.title}</h3>
                      <p className="mt-1.5 max-w-lg leading-relaxed text-slate-600">{step.text}</p>
                      {step.link && (
                        <Link href={step.link.href} className="mt-3 inline-block text-sm font-medium text-teal-800 underline underline-offset-4 hover:text-teal-900">
                          {step.link.label}
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <aside className="self-start rounded-xl border border-[#d5dce4] bg-[#f6f8fa] p-6 sm:p-7">
              <h3 className={`${display} text-xl font-semibold`}>Have these ready</h3>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
                {READY.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-700" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-[#d5dce4] pt-4 text-sm text-slate-500">Start with the contracts that end soonest. They are the ones with a deadline to catch.</p>
            </aside>
          </div>
        </section>

        {/* What is included */}
        <section id="included" className="scroll-mt-4 border-t border-[#d5dce4]">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
            <h2 className={`${display} max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl`}>What is included</h2>
            <dl className="mt-10 border-t border-[#b9c3cf]">
              {INCLUDED.map(([term, text]) => (
                <div key={term} className="grid gap-1 border-b border-[#d5dce4] py-5 md:grid-cols-[14rem_1fr] md:gap-10">
                  <dt className={`${display} text-lg font-semibold`}>{term}</dt>
                  <dd className="max-w-2xl leading-relaxed text-slate-600">{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Roles and confidentiality */}
        <section id="roles" className="scroll-mt-4 border-t border-[#d5dce4] bg-white">
          <div className="mx-auto grid max-w-6xl gap-14 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:py-20">
            <div className="min-w-0">
              <h2 className={`${display} text-3xl font-semibold leading-tight tracking-tight`}>Who can do what</h2>
              <div className="mt-8 overflow-x-auto">
                <table className="w-full min-w-[460px] text-left text-sm">
                  <caption className="sr-only">Permissions by role</caption>
                  <thead>
                    <tr className="border-b border-[#b9c3cf]">
                      <th scope="col" className="py-3 pr-4 font-medium text-slate-500">
                        Action
                      </th>
                      {ROLE_NAMES.map((r) => (
                        <th key={r} scope="col" className="px-2 py-3 text-center font-medium text-slate-500">
                          {r}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ROLES.map((row) => (
                      <tr key={row.action} className="border-b border-[#d5dce4] align-top">
                        <th scope="row" className="py-4 pr-4 font-normal leading-snug text-[#0e1726]">
                          {row.action}
                        </th>
                        {row.cells.map((c, i) => (
                          <td key={ROLE_NAMES[i]} className="px-2 py-4 text-center">
                            {c === "yes" ? (
                              <span className="font-semibold text-teal-800">Yes</span>
                            ) : (
                              <span className="text-slate-400" aria-label="No">
                                –
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className={`${display} text-3xl font-semibold leading-tight tracking-tight`}>Handling confidential contracts</h2>
              <ul className="mt-8 space-y-4 leading-relaxed text-slate-700">
                {CONFIDENTIAL.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-700" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-4 border-t border-[#d5dce4]">
          <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 lg:py-20">
            <h2 className={`${display} text-3xl font-semibold leading-tight tracking-tight sm:text-4xl`}>Questions before you start</h2>
            <div className="mt-8 border-t border-[#b9c3cf]">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group border-b border-[#d5dce4] py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-medium [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="shrink-0 text-xl leading-none text-teal-700 transition-transform group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="max-w-2xl pb-5 leading-relaxed text-slate-600">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="bg-[#0e1726] text-white">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-14 sm:px-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className={`${display} max-w-xl text-3xl font-semibold leading-tight tracking-tight`}>Set up your organization before the next deadline arrives.</h2>
              <p className="mt-3 text-slate-300">It takes a few minutes to register, and the first vendor can be added straight away.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-6 text-base font-medium text-[#0e1726] hover:bg-slate-100">
                Create your organization
              </Link>
              <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-500 px-6 text-base font-medium text-white hover:bg-white/10">
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#d5dce4] bg-[#f6f8fa]">
        <div className="mx-auto max-w-6xl px-5 py-6 text-sm text-slate-500 sm:px-8">{APP_NAME}: vendor and contract records for procurement teams.</div>
      </footer>
    </div>
  );
}
