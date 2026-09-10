import { existsSync } from "node:fs";
import { join } from "node:path";

import { Landing } from "@/features/landing/landing";

/**
 * The doorway's background is swappable by dropping in a file.
 *
 * Put artwork at `public/vista.jpg` (or .jpeg/.png/.webp/.avif) and the
 * landing page uses it as the hero, full-bleed, instead of the scene drawn in
 * `features/landing/vista.tsx`. Nothing else needs editing: no import, no
 * flag, no CSS. Remove the file and the drawn scene comes back.
 *
 * The check is a filesystem probe in a server component rather than a
 * hardcoded path so that a missing file degrades to the drawn scene instead
 * of to a broken image — the hero is the whole page here, and a 404 in it
 * would leave nothing behind. It resolves at build time for the static
 * render, so adding the file to a running dev server needs a refresh.
 */
const VISTA_BASENAME = "vista";
const VISTA_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif"] as const;

function findVistaArtwork(): string | null {
  for (const extension of VISTA_EXTENSIONS) {
    const file = `${VISTA_BASENAME}.${extension}`;
    if (existsSync(join(process.cwd(), "public", file))) {
      return `/${file}`;
    }
  }
  return null;
}

export default function HomePage() {
  return <Landing heroImage={findVistaArtwork()} />;
}
