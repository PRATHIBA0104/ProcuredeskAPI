"use client";

import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";

const link = "rounded-md px-2 py-1 text-sm text-slate-600 hover:text-slate-900";

// Shows "Open dashboard" to people who are already signed in, and the sign-in / register pair to everyone else.
export function LandingHeader() {
  const { status } = useAuth();

  return (
    <header className="border-b border-[#d5dce4] bg-[#f6f8fa]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label={`${APP_NAME} home`}>
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-700 text-sm font-bold text-white">P</span>
          <span className="text-base font-semibold tracking-tight text-[#0e1726]">{APP_NAME}</span>
        </Link>

        <nav aria-label="Page sections" className="hidden items-center gap-2 md:flex">
          <a href="#onboarding" className={link}>
            How onboarding works
          </a>
          <a href="#included" className={link}>
            What is included
          </a>
          <a href="#roles" className={link}>
            Roles
          </a>
          <a href="#faq" className={link}>
            Questions
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {status === "authed" ? (
            <Link href="/dashboard" className="inline-flex h-10 items-center whitespace-nowrap rounded-lg bg-teal-700 px-3 sm:px-4 text-sm font-medium text-white hover:bg-teal-800">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="inline-flex h-10 items-center whitespace-nowrap rounded-lg px-2 sm:px-3 text-sm font-medium text-slate-700 hover:text-slate-900">
                Sign in
              </Link>
              <Link href="/register" className="inline-flex h-10 items-center whitespace-nowrap rounded-lg bg-teal-700 px-3 sm:px-4 text-sm font-medium text-white hover:bg-teal-800">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
