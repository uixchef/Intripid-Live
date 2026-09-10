import Image from "next/image";

import styles from "./vista.module.css";

/**
 * The vista, as supplied artwork.
 *
 * This is the exact-fidelity path. When a file exists at `public/vista.*` it
 * replaces the drawn scene in `vista.tsx` entirely — no vector layers render
 * at all, so what ships is the artwork and nothing else.
 *
 * DELIBERATELY BARE. There is no veil and no grain over the top, unlike the
 * drawn scene which needs both. Any wash added here would mean the background
 * is no longer the image that was handed over, and "exactly the same" is the
 * requirement. The reference this page follows already carries its own dark
 * upper sky and its own grain, which is what makes white type work on it.
 * If a future image ever lacks that, `.veil` from the drawn scene is one line
 * away — but it is opt-in, never automatic.
 *
 * `preload` rather than the `priority` prop: `priority` is deprecated as of
 * Next 16. This is the page's single LCP element and sits above the fold, so
 * it wants the `<link rel=preload>` in the head — which is exactly the case
 * the docs reserve `preload` for.
 */
export function VistaImage({ src }: { src: string }) {
  return (
    <div className={styles.vista} aria-hidden>
      <Image
        className={styles.photo}
        src={src}
        alt=""
        fill
        sizes="100vw"
        quality={90}
        preload
      />
    </div>
  );
}
