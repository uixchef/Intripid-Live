"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { Segmented } from "@/components/ui/controls";
import { X } from "lucide-react";

import { Button, IconButton } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlay";
import { site } from "@/config/site";
import type { AccountUser, TravelPersona, VisitedLocation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSessionApi } from "@/stores/session-store";

import styles from "./travel-pole.module.css";

const SIGN_CAP = 9;

const SIGNS = [
  {
    src: "/travel-pole/sign-1.png",
    signClass: styles.sign1,
    crop: styles.crop1,
    ink: "light" as const,
    rotate: "3.2deg",
    typeClass: styles.type1,
    maxWidth: 220,
  },
  {
    src: "/travel-pole/sign-2.png",
    signClass: styles.sign2,
    crop: styles.crop2,
    ink: "light" as const,
    rotate: "-3.07deg",
    typeClass: styles.type2,
    maxWidth: 200,
  },
  {
    src: "/travel-pole/sign-3.png",
    signClass: styles.sign3,
    crop: styles.crop3,
    ink: "dark" as const,
    rotate: "-4.03deg",
    typeClass: styles.type3,
    maxWidth: 186,
  },
  {
    src: "/travel-pole/sign-4.png",
    signClass: styles.sign4,
    crop: styles.crop4,
    ink: "dark" as const,
    rotate: "2.94deg",
    typeClass: styles.type4,
    maxWidth: 186,
  },
  {
    src: "/travel-pole/sign-5.png",
    signClass: styles.sign5,
    crop: styles.crop5,
    ink: "light" as const,
    rotate: "3.89deg",
    typeClass: styles.type5,
    maxWidth: 210,
  },
  {
    src: "/travel-pole/sign-6.png",
    signClass: styles.sign6,
    crop: styles.crop6,
    ink: "light" as const,
    rotate: "-4.47deg",
    typeClass: styles.type6,
    maxWidth: 186,
  },
  {
    src: "/travel-pole/sign-7.png",
    signClass: styles.sign7,
    crop: styles.crop7,
    ink: "dark" as const,
    rotate: "-2.7deg",
    typeClass: styles.type7,
    maxWidth: 168,
  },
  {
    src: "/travel-pole/sign-8.png",
    signClass: styles.sign8,
    crop: styles.crop8,
    ink: "light" as const,
    rotate: "6.4deg",
    typeClass: styles.type8,
    maxWidth: 176,
  },
  {
    src: "/travel-pole/sign-9.png",
    signClass: styles.sign9,
    crop: styles.crop9,
    ink: "light" as const,
    rotate: "0.71deg",
    typeClass: styles.type9,
    maxWidth: 210,
  },
] as const;

export function visitedPlacesForPole(visited: VisitedLocation[]) {
  return visited.filter((place) => place.kind === "visited");
}

export function wandererTitle(persona: TravelPersona) {
  if (persona.pace === "packed") return "The City Sprinter";
  if (persona.pace === "loose") return "The Drifter";
  return "The Zen Wanderer";
}

const FORMATS = [
  {
    id: "story",
    label: "Story",
    hint: "Instagram Stories · 9:16",
  },
  {
    id: "post",
    label: "Post",
    hint: "Instagram feed · 1:1",
  },
  {
    id: "portrait",
    label: "Portrait",
    hint: "Instagram feed · 4:5",
  },
] as const;

type ShareFormat = (typeof FORMATS)[number]["id"];

type ShareChannel = {
  id: string;
  label: string;
  icon: ReactNode;
} & (
  | { action: "copy"; href: string }
  | { action: "url"; build: (caption: string, url: string) => string }
);

const SHARE_CHANNELS: ShareChannel[] = [
  {
    id: "instagram",
    label: "Instagram",
    action: "copy",
    href: "https://www.instagram.com/",
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <rect
          x="2.6"
          y="2.6"
          width="18.8"
          height="18.8"
          rx="5.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <circle
          cx="12"
          cy="12"
          r="4.1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <circle cx="17.3" cy="6.7" r="1.15" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    action: "url",
    build: (caption, url) =>
      `https://wa.me/?text=${encodeURIComponent(`${caption}\n${url}`)}`,
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <path
          fill="currentColor"
          d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.15 6.41 2.15 11.85c0 1.74.46 3.45 1.32 4.95L2 22l5.35-1.4a10 10 0 0 0 4.69 1.19h.01c5.46 0 9.89-4.41 9.89-9.86 0-2.63-1.03-5.1-2.89-6.02Zm-7.01 15.18h-.01a8.3 8.3 0 0 1-4.22-1.15l-.3-.18-3.17.83.85-3.09-.2-.32a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.72-8.24 8.3-8.24 2.22 0 4.3.86 5.86 2.42a8.18 8.18 0 0 1 2.43 5.83c0 4.54-3.73 8.26-8.28 8.26Zm4.55-6.18c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.17.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.24-.02-.37.11-.49.11-.11.25-.29.37-.43.12-.14.16-.24.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.41-.56-.42h-.48c-.16 0-.43.06-.65.31-.23.24-.86.84-.86 2.05 0 1.21.88 2.37 1 2.54.12.16 1.73 2.63 4.19 3.69.59.25 1.04.41 1.4.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.10-.23-.16-.48-.28Z"
        />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    action: "url",
    build: (_caption, url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <path
          fill="currentColor"
          d="M14.5 8.5V6.7c0-.7.5-1.2 1.2-1.2h1.3V3h-2.2C12.3 3 11 4.5 11 6.8v1.7H9v2.6h2V21h3.2v-9.9h2.2l.3-2.6h-2.2Z"
        />
      </svg>
    ),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    action: "url",
    build: (_caption, url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    icon: (
      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
        <path
          fill="currentColor"
          d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3.1 9.5h3.76v11H3.1v-11Zm6.14 0h3.6v1.5h.05c.5-.95 1.73-1.95 3.56-1.95 3.8 0 4.5 2.5 4.5 5.76v5.69h-3.76v-5.04c0-1.2-.02-2.75-1.67-2.75-1.68 0-1.94 1.31-1.94 2.66v5.13H9.24v-11Z"
        />
      </svg>
    ),
  },
  {
    id: "x",
    label: "X",
    action: "url",
    build: (caption, url) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(url)}`,
    icon: (
      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
        <path
          fill="currentColor"
          d="M17.53 3h3.08l-6.73 7.69L21.5 21h-6.1l-4.2-5.5L6.3 21H3.2l7.02-8.02L2.5 3h6.24l3.9 5.15L17.53 3Zm-1.08 16.1h1.7L7.3 4.82H5.5l10.95 14.28Z"
        />
      </svg>
    ),
  },
  {
    id: "telegram",
    label: "Telegram",
    action: "url",
    build: (caption, url) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(caption)}`,
    icon: (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <path
          fill="currentColor"
          d="M9.7 15.4 9.5 19c.4 0 .6-.2.8-.4l2-1.9 4.1 3c.8.4 1.3.2 1.5-.7l2.7-12.7c.2-.9-.3-1.3-1.1-1L3.9 10.2c-.9.3-.9.8-.2 1l4.1 1.3 9.5-6c.4-.3.8-.1.5.2L9.7 15.4Z"
        />
      </svg>
    ),
  },
];

export function TravelPoleModal({
  open,
  onClose,
  user,
  visited,
}: {
  open: boolean;
  onClose: () => void;
  user: AccountUser;
  visited: VisitedLocation[];
}) {
  const [format, setFormat] = useState<ShareFormat>("story");
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const session = useSessionApi();
  const places = visitedPlacesForPole(visited);
  const shown = places.slice(0, SIGN_CAP);
  const extra = Math.max(0, places.length - SIGN_CAP);
  const title = wandererTitle(user.persona);
  const active = FORMATS.find((item) => item.id === format) ?? FORMATS[0];
  const shareUrl =
    typeof window !== "undefined" ? window.location.origin : site.url;
  const caption = shareCaption(user.name, title, places, shareUrl);

  function copyLink() {
    void navigator.clipboard.writeText(shareUrl).then(
      () => session.getState().showToast("Link copied", "success"),
      () => session.getState().showToast("Couldn’t copy the link", "warning"),
    );
  }

  function copyCaption() {
    void navigator.clipboard.writeText(caption).then(
      () => session.getState().showToast("Caption copied", "success"),
      () => session.getState().showToast("Couldn’t copy the caption", "warning"),
    );
  }

  function shareTo(channel: ShareChannel) {
    if (channel.action === "copy") {
      copyCaption();
      window.open(channel.href, "_blank", "noopener,noreferrer");
      return;
    }
    window.open(
      channel.build(caption, shareUrl),
      "_blank",
      "noopener,noreferrer",
    );
  }

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    function fit() {
      if (!stage) return;
      const { width, height } = stage.getBoundingClientRect();
      setScale(Math.min(width / 390, height / 851));
    }

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [format, open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      label="Share your travels"
      width={642}
      flush
      className={styles.dialog}
    >
      <header className={styles.head}>
        <h2 className={styles.title}>Share your travels</h2>
        <IconButton label="Close" size="sm" variant="ghost" onClick={onClose}>
          <X size={16} strokeWidth={2.1} />
        </IconButton>
      </header>
      <div className={styles.layout}>
        <div className={styles.chrome}>
          <div className={cn(styles.preview, styles[`preview_${format}`])}>
          <div className={styles.formats}>
            <Segmented
              size="sm"
              label="Share format"
              value={format}
              onChange={setFormat}
              options={FORMATS.map((item) => ({
                value: item.id,
                label: item.label,
              }))}
            />
          </div>
          <p className={styles.hint}>{active.hint}</p>
          <div
            ref={stageRef}
            className={cn(styles.stage, styles[`stage_${format}`])}
          >
            <div className={styles.sky} aria-hidden />
            <div className={styles.skyWash} aria-hidden />
            <div className={styles.skyGrain} aria-hidden />
            <TravelPoleCard
              name={user.name}
              title={title}
              places={shown.map((place) => place.name)}
              extra={extra}
              scale={scale}
            />
            <img
              className={styles.mascot}
              src="/brand/mascots/caring.png"
              alt=""
              width={84}
              height={84}
              aria-hidden
            />
          </div>
          </div>
        </div>
        <aside className={styles.sharePane} aria-label="Share destinations">
          <ul className={styles.shareList}>
            {SHARE_CHANNELS.map((channel) => (
              <li key={channel.id}>
                <button
                  type="button"
                  className={styles.shareRow}
                  onClick={() => shareTo(channel)}
                >
                  <span className={styles.shareMark} aria-hidden>
                    {channel.icon}
                  </span>
                  <span className={styles.shareName}>{channel.label}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className={styles.linkBlock}>
            <div className={styles.or} role="separator">
              <span className={styles.orLabel}>Or share with a link</span>
            </div>
            <Button variant="secondary" size="sm" block onClick={copyLink}>
              Copy link
            </Button>
          </div>
        </aside>
      </div>
    </Modal>
  );
}

function TravelPoleCard({
  name,
  title,
  places,
  extra,
  scale,
}: {
  name: string;
  title: string;
  places: string[];
  extra: number;
  scale: number;
}) {
  return (
    <div
      className={styles.frame}
      style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
    >
      <div className={styles.board}>
        <div className={styles.pole} aria-hidden>
          <img src="/travel-pole/pole.png" alt="" />
        </div>
        {SIGNS.map((sign, index) => {
          const label = places[index];
          if (!label) return null;
          return (
            <div key={sign.src} className={cn(styles.sign, sign.signClass)}>
              <div className={cn(styles.crop, sign.crop)} aria-hidden>
                <img src={sign.src} alt="" />
              </div>
              <SignLabel
                className={cn(
                  styles.label,
                  sign.typeClass,
                  sign.ink === "dark" ? styles.inkDark : styles.inkLight,
                )}
                rotate={sign.rotate}
                maxWidth={sign.maxWidth}
              >
                {label}
              </SignLabel>
            </div>
          );
        })}
        {extra > 0 ? (
          <div className={cn(styles.sign, styles.sign10)}>
            <div className={cn(styles.crop, styles.crop10)} aria-hidden>
              <img src="/travel-pole/sign-10.png" alt="" />
            </div>
            <SignLabel
              className={cn(
                styles.label,
                styles.label10,
                styles.type10,
                styles.inkLight,
              )}
              rotate="4.48deg"
              maxWidth={186}
            >
              {`+ ${extra} MORE!`}
            </SignLabel>
          </div>
        ) : null}
        <img
          className={styles.lockup}
          src="/travel-pole/lockup.svg"
          alt="Intripid"
          width={105}
          height={31}
        />
        <p className={styles.traveller}>{name}</p>
        <div className={styles.badge}>
          <p className={styles.badgeText}>{title}</p>
        </div>
      </div>
    </div>
  );
}

function SignLabel({
  className,
  rotate,
  maxWidth,
  children,
}: {
  className: string;
  rotate: string;
  maxWidth: number;
  children: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    function fit() {
      if (!el) return;
      el.style.transform = `translate(-50%, -50%) rotate(${rotate}) scale(1)`;
      const scale = Math.min(1, maxWidth / Math.max(1, el.scrollWidth));
      el.style.transform = `translate(-50%, -50%) rotate(${rotate}) scale(${scale})`;
    }

    fit();
    void document.fonts.ready.then(fit);
  }, [children, rotate, maxWidth]);

  return (
    <span ref={ref} className={className}>
      {children}
    </span>
  );
}

function shareCaption(
  name: string,
  title: string,
  places: VisitedLocation[],
  url: string,
) {
  const list = places.map((place) => place.name).join(", ");
  return `${name} · ${title}\n${list}\nPlanned on Intripid — ${url}`;
}
