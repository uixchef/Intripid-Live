import { Globe } from "lucide-react";

import { cn } from "@/lib/utils";

import styles from "./country-flag.module.css";

export interface CountryFlagProps {
  /** ISO 3166-1 alpha-2. Empty or invalid codes fall back to a globe. */
  code?: string;
  label?: string;
  size?: number;
  className?: string;
}

/** CSS zoom that fills the circle; source pixels must cover this too. */
const FILL = 1.45;
const CDN_WIDTHS = [80, 160, 320, 640] as const;

function cdnWidth(cssPx: number): (typeof CDN_WIDTHS)[number] {
  const need = Math.ceil(cssPx * FILL * 2);
  return CDN_WIDTHS.find((width) => width >= need) ?? 640;
}

function flagSrc(iso: string, width: (typeof CDN_WIDTHS)[number]) {
  return `https://flagcdn.com/w${width}/${iso}.png`;
}

/**
 * Country flag cropped to a circle.
 *
 * Emoji flags are rectangles that look broken in a 32px well. Flagcdn's
 * PNGs crop cleanly, and the 1.45 scale fills the circle so you read the
 * field, not the 4:3 letterbox. Sources are 2× the painted size so the
 * zoom stays sharp on retina.
 */
export function CountryFlag({
  code,
  label,
  size = 32,
  className,
}: CountryFlagProps) {
  const iso = code?.trim().toLowerCase();
  const valid = iso && /^[a-z]{2}$/.test(iso);
  const width = valid ? cdnWidth(size) : 80;

  return (
    <span
      className={cn(styles.flag, className)}
      style={{ width: size, height: size }}
      title={label}
      aria-hidden
    >
      {valid ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote flag asset, clipped by CSS
        <img
          src={flagSrc(iso, width)}
          srcSet={CDN_WIDTHS.map(
            (w) => `${flagSrc(iso, w)} ${w}w`,
          ).join(", ")}
          sizes={`${Math.ceil(size * FILL)}px`}
          alt=""
          width={width}
          height={Math.round((width * 3) / 4)}
          decoding="async"
          className={styles.image}
        />
      ) : (
        <Globe size={Math.round(size * 0.46)} strokeWidth={2} />
      )}
    </span>
  );
}
