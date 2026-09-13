import Image from "next/image";

import { cn } from "@/lib/utils";

import lockupOnDark from "./lockup-on-dark.png";
import lockup from "./lockup.png";
import mascot from "./mascot.png";
import styles from "./mark.module.css";

const LOCKUP_ASPECT = lockup.width / lockup.height;

/**
 * The Intripid mascot — the bird mark from the current lockup, without the
 * word. Used where chrome is tight (the planner top bar) and the bird has
 * to sit next to a trip name rather than repeat "Intripid".
 */
export function Mark({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src={mascot}
      alt="Intripid"
      width={size}
      height={size}
      className={cn(styles.mark, className)}
      quality={90}
    />
  );
}

/** Full lockup: mascot plus the Intripid wordmark. */
export function Logo({
  size = 24,
  className,
  showWord = true,
  onDark = false,
  priority = false,
}: {
  size?: number;
  className?: string;
  showWord?: boolean;
  /** White wordmark for dark / environment surfaces. */
  onDark?: boolean;
  priority?: boolean;
}) {
  if (!showWord) {
    return <Mark size={size} className={className} />;
  }

  const width = Math.round(LOCKUP_ASPECT * size);

  return (
    <span className={cn(styles.logo, className)}>
      <Image
        src={onDark ? lockupOnDark : lockup}
        alt="Intripid"
        width={width}
        height={size}
        className={styles.lockup}
        quality={90}
        priority={priority}
      />
    </span>
  );
}
