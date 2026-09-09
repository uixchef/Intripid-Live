/**
 * Joins conditional class names. Dependency-free on purpose: swap for `clsx`
 * or `tailwind-merge` later if the styling approach calls for it.
 */
export function cn(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}
