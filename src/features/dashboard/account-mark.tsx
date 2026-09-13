"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import type { AccountUser } from "@/lib/types";

/**
 * The account holder's mark.
 *
 * Photo when one is attached and loads; initials on a solid brand fill
 * otherwise. Identity, the header chip and the account menu all use this so
 * a missing portrait cannot disagree with itself across the chrome.
 */
export function AccountMark({
  user,
  className,
  fallbackClassName,
}: {
  user: AccountUser;
  className?: string;
  /** Applied only when rendering initials. */
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [user.photoUrl]);
  const showPhoto = Boolean(user.photoUrl) && !failed;

  return (
    <span
      className={cn(className, !showPhoto && fallbackClassName)}
      aria-hidden
    >
      {showPhoto ? (
        <img
          src={user.photoUrl}
          alt=""
          onError={() => setFailed(true)}
        />
      ) : (
        user.initials
      )}
    </span>
  );
}
