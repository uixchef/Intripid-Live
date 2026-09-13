import { cn } from "@/lib/utils";

import styles from "./ai-mark.module.css";

/** Sparkles silhouette used on Ask AI — gradient lives in the glyph. */
export function AiMark({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(styles.mark, className)}
      style={{ width: size, height: size }}
      data-ai-mark=""
      aria-hidden
    />
  );
}
