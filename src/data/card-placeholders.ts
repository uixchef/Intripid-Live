export type CardPlaceholderVariant = "editorial" | "utility";

export const CARD_PLACEHOLDER = {
  editorial: "/placeholders/card-editorial.png",
  utility: "/placeholders/card-utility.png",
} as const satisfies Record<CardPlaceholderVariant, string>;

export function cardPlaceholderSrc(variant: CardPlaceholderVariant): string {
  return CARD_PLACEHOLDER[variant];
}

/** Real photograph wins; otherwise the surface-owned placeholder. */
export function resolveCardImage(
  photo: string | null | undefined,
  variant: CardPlaceholderVariant,
): { src: string; placeholder: boolean } {
  if (photo) return { src: photo, placeholder: false };
  return { src: cardPlaceholderSrc(variant), placeholder: true };
}
