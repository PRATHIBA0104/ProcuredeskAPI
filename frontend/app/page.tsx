"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { FullPageSpinner } from "@/components/ui/Spinner";

// "/" has no content of its own: send people to the dashboard, or to sign-in if they are not signed in.
export default function Home() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authed") router.replace("/dashboard");
    else if (status === "anon") router.replace("/login");
  }, [status, router]);

  return <FullPageSpinner />;
}
