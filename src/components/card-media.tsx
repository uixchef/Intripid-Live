"use client";

import {
  cardPlaceholderSrc,
  resolveCardImage,
  type CardPlaceholderVariant,
} from "@/data/card-placeholders";

export function CardMedia({
  photo,
  variant,
  className,
  width,
  height,
}: {
  photo?: string | null;
  variant: CardPlaceholderVariant;
  className?: string;
  width?: number;
  height?: number;
}) {
  const resolved = resolveCardImage(photo, variant);
  const fallback = cardPlaceholderSrc(variant);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- catalog and pattern assets
    <img
      className={className}
      src={resolved.src}
      alt=""
      width={width}
      height={height}
      data-card-placeholder={resolved.placeholder ? "" : undefined}
      data-placeholder-variant={resolved.placeholder ? variant : undefined}
      onError={(event) => {
        const img = event.currentTarget;
        if (img.getAttribute("data-placeholder-applied") === "true") {
          img.style.display = "none";
          return;
        }
        img.setAttribute("data-placeholder-applied", "true");
        img.setAttribute("data-card-placeholder", "");
        img.setAttribute("data-placeholder-variant", variant);
        img.src = fallback;
      }}
    />
  );
}
