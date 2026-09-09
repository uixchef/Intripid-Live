import Link from "next/link";

/**
 * Renders for `notFound()` calls and for every unmatched URL app-wide.
 * Accepts no props.
 */
export default function NotFound() {
  return (
    <main style={{ padding: "2rem", maxWidth: "40rem" }}>
      <h1>Not found</h1>
      <p>That page does not exist.</p>
      <Link href="/">Back to start</Link>
    </main>
  );
}
