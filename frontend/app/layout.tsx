import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { APP_NAME } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "B2B contract negotiation and procurement advisory: vendors, contracts and renewals in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">
        <ToastProvider>
          <AuthProvider>
            {/* Client components below read the URL (usePathname, useParams). With Cache Components
                these may suspend during prerendering, so they need a Suspense boundary above them. */}
            <Suspense fallback={<FullPageSpinner />}>{children}</Suspense>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
