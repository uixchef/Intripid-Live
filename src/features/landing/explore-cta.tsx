import Link from "next/link";

import { cn } from "@/lib/utils";

import styles from "./explore-cta.module.css";

/**
 * The Discovery door — same control on the landing sky and the dashboard.
 */
export function ExploreCta({ className }: { className?: string }) {
  return (
    <Link href="/discover" className={cn(styles.explore, className)}>
      <span className={styles.label}>Help me explore!</span>
    </Link>
  );
}
