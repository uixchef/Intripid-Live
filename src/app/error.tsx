"use client";

/**
 * Route-level error boundary.
 *
 * Error boundaries must be Client Components. Note this boundary does NOT
 * catch errors thrown by `layout.tsx` in its own segment — only
 * `global-error.tsx` catches root layout failures.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main style={{ padding: "2rem", maxWidth: "40rem" }}>
      <h1>Something went wrong</h1>
      <p>{error.message || "An unexpected error occurred."}</p>
      {error.digest ? <p><small>Digest: {error.digest}</small></p> : null}
      {/* `retry()` re-fetches and re-renders the boundary's children; prefer it
          over `reset()`, which only clears error state. */}
      <button type="button" onClick={retry}>
        Try again
      </button>
    </main>
  );
}
