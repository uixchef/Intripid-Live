import type { Metadata } from "next";

import { Dashboard } from "@/features/dashboard/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Your trips, your travel persona and the people you plan with, in one place.",
};

/**
 * The returning traveller's home.
 *
 * `/` stays the logged-out door; this is the signed-in one. It is directly
 * visitable because the session is a deterministic local mock that defaults to
 * the seeded user — see `src/stores/session-store.tsx` for why, and for the
 * guest state this page falls back to after signing out.
 */
export default function DashboardPage() {
  return <Dashboard />;
}
