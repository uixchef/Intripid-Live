import { StackCheck } from "@/components/foundation/stack-check";
import { site } from "@/config/site";

import styles from "./page.module.css";

/**
 * Server Component. This is a foundation placeholder, not the Intripid home
 * page — it exists so the app runs and so every installed dependency is proven
 * to work end to end.
 */
export default function Home() {
  return (
    <main className={styles.page}>
      <div>
        <h1 className={styles.title}>{site.name} — foundation</h1>
        <p className={styles.lede}>
          Project scaffold only. No product surfaces have been built yet.
        </p>
      </div>

      <hr className={styles.divider} />

      <StackCheck />

      <hr className={styles.divider} />

      <p className={styles.note}>
        Replace this page when the Intripid build begins, and delete{" "}
        <code>src/components/foundation/</code> with it.
      </p>
    </main>
  );
}
