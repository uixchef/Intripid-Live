"use client";

/**
 * Catches errors thrown by the root layout. It replaces the whole document, so
 * it must render its own <html> and <body>, and it does NOT inherit
 * `globals.css`, fonts, or any app-level theming.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
          margin: 0,
        }}
      >
        <h1>Something went wrong</h1>
        <p>{error.message || "An unexpected error occurred."}</p>
        {error.digest ? <p><small>Digest: {error.digest}</small></p> : null}
        <button type="button" onClick={retry}>
          Try again
        </button>
      </body>
    </html>
  );
}
