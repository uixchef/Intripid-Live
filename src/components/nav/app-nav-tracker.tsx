"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { syncNavStack } from "@/lib/nav";

/** Records in-app route visits so chrome back can return to the landing screen. */
export function AppNavTracker() {
  const pathname = usePathname();

  useEffect(() => {
    syncNavStack(pathname);
  }, [pathname]);

  return null;
}
