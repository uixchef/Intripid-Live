"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

import { backLabel, backScreen, previousPath } from "@/lib/nav";

export function useBackTarget(fallback: Route) {
  const pathname = usePathname();
  const [href, setHref] = useState<Route>(fallback);

  useEffect(() => {
    setHref((previousPath(pathname) as Route | null) ?? fallback);
  }, [fallback, pathname]);

  const screen = backScreen(href);
  return {
    href,
    screen,
    label: backLabel(href),
  };
}

export function BackLink({
  fallback,
  className,
  children,
}: {
  fallback: Route;
  className?: string;
  children: ReactNode;
}) {
  const { href, label } = useBackTarget(fallback);

  return (
    <Link href={href} className={className} aria-label={label} title={label}>
      {children}
    </Link>
  );
}
