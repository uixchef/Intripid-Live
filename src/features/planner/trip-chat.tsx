"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { Camera, ChevronDown, ChevronLeft, FileText, Image as ImageIcon, Lightbulb, MapPin, MapPinned, Plus, Reply, Search, Send, Smile, X } from "lucide-react";

import { Hummingbird } from "@/components/brand/hummingbird";
import { ACCOUNT_USER, ACCOUNT_USER_ID } from "@/data/account";
import { getDestination } from "@/data/destinations";
import { coverPhotoSrc } from "@/data/place-photos";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/button";
import { Popover } from "@/components/ui/overlay";
import { travellerColor } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { useSession } from "@/stores/session-store";
import { useTrip, useTripApi } from "@/stores/trip-store";
import type { ItineraryItem, Traveller, Trip } from "@/lib/types";

import styles from "./trip-chat.module.css";

const REACTIONS = ["👍", "👀", "✅", "❤️"] as const;

type StopAttachment = {
  kind: "stop";
  itemId: string;
  title: string;
  place: string | null;
};

type IdeaAttachment = {
  kind: "idea";
  ideaId: string;
  title: string;
  place: string | null;
};

type Attachment =
  | StopAttachment
  | IdeaAttachment
  | { kind: "photo"; title: string; src: string }
  | { kind: "file"; title: string; size: string }
  | { kind: "location"; title: string; place: string | null; src: string | null };

type AttachView = "menu" | "stop";

type ChatMessage = {
  id: string;
  from: string;
  text: string;
  at: string;
  replyTo?: string;
  reactions: { emoji: string; from: string[] }[];
  attachment?: Attachment;
};

const SEED: ChatMessage[] = [
  {
    id: "c-maya-kickoff",
    from: "t-maya",
    at: "2026-09-04T09:12:00",
    text: "Channel is live. Five nights in New York, 14–18 April. Drop questions here instead of the group text — it was eating the plan.",
    reactions: [
      { emoji: "👍", from: ["t-danny", "t-priya", "t-elena", "t-aisha", ACCOUNT_USER_ID] },
    ],
  },
  {
    id: "c-sarthak-in",
    from: ACCOUNT_USER_ID,
    at: "2026-09-04T10:04:00",
    replyTo: "c-maya-kickoff",
    text: "In. I'll keep questions here. Flying in from London Tuesday morning — don't hold breakfast.",
    reactions: [{ emoji: "👍", from: ["t-maya", "t-danny"] }],
  },
  {
    id: "c-priya-link",
    from: "t-priya",
    at: "2026-09-04T09:18:00",
    text: "Doc for the must-dos: https://intripid.example/trips/nyc-spring/notes — if the URL wraps, that's on purpose.",
    reactions: [],
  },
  {
    id: "c-tom-view",
    from: "t-tom",
    at: "2026-09-04T09:41:00",
    text: "I'm on view-only. I'll watch the calendar and stay out of the bookings.",
    reactions: [{ emoji: "✅", from: ["t-maya"] }],
  },
  {
    id: "c-kenji-1",
    from: "t-kenji",
    at: "2026-09-04T11:05:00",
    text: "🛬",
    reactions: [{ emoji: "❤️", from: ["t-aisha"] }],
  },
  {
    id: "c-kenji-2",
    from: "t-kenji",
    at: "2026-09-04T11:06:00",
    text: "Landing Tuesday 13:40. Don't wait lunch on me.",
    reactions: [],
  },
  {
    id: "c-kenji-3",
    from: "t-kenji",
    at: "2026-09-04T11:06:40",
    text: "Will go straight to the Beekman.",
    reactions: [],
  },
  {
    id: "c-elena-stay",
    from: "t-elena",
    at: "2026-09-04T14:22:00",
    text: "",
    reactions: [{ emoji: "👍", from: ["t-maya", "t-priya"] }],
    attachment: {
      kind: "stop",
      itemId: "i-beekman-stay",
      title: "The Beekman",
      place: "Financial District",
    },
  },
  {
    id: "c-maya-stay-reply",
    from: "t-maya",
    at: "2026-09-04T14:31:00",
    replyTo: "c-elena-stay",
    text: "Yes — that's the hotel. Check-in is 15:00 Tuesday. Don't book anything that needs a bag dump before then.",
    reactions: [],
  },
  {
    id: "c-danny-diet",
    from: "t-danny",
    at: "2026-09-08T08:04:00",
    text: "Allergies recap so nobody books the wrong table:\n• Priya — shellfish\n• Jonas — none, but skip the tasting menus if we're splitting\n• Me — no cilantro if they can\n\nI Sodi already knows.",
    reactions: [{ emoji: "👀", from: ["t-priya", "t-jonas"] }],
  },
  {
    id: "c-priya-1",
    from: "t-priya",
    at: "2026-09-09T16:40:00",
    text: "Wednesday still has that hole after DUMBO. I dropped three ideas on the board — pick one before we land.",
    reactions: [{ emoji: "👍", from: ["t-maya", "t-danny"] }],
  },
  {
    id: "c-maya-1",
    from: "t-maya",
    at: "2026-09-09T16:52:00",
    replyTo: "c-priya-1",
    text: "I'll take the gap after the Met. Don't book anything that starts before 16:00.",
    reactions: [],
  },
  {
    id: "c-aisha-gap",
    from: "t-aisha",
    at: "2026-09-09T17:10:00",
    text: "If the hole is just a walk, Time Out Market is right there. Not precious. We can sit.",
    reactions: [],
    attachment: {
      kind: "stop",
      itemId: "i-time-out-market",
      title: "Time Out Market New York",
      place: "Dumbo",
    },
  },
  {
    id: "c-sarthak-gap",
    from: ACCOUNT_USER_ID,
    at: "2026-09-09T17:22:00",
    replyTo: "c-aisha-gap",
    text: "Time Out Market works for me. Easy on Wednesday if we need the extra 40 Jonas flagged.",
    reactions: [{ emoji: "✅", from: ["t-jonas", "t-maya"] }],
  },
  {
    id: "c-jonas-board",
    from: "t-jonas",
    at: "2026-09-09T18:44:00",
    text: "Advisor note: the Wednesday walk + market + LES dinner is tight if anyone photographs the bridge. Budget 40 extra minutes or drop Attaboy.",
    reactions: [
      { emoji: "👀", from: ["t-maya"] },
      { emoji: "✅", from: ["t-priya"] },
    ],
  },
  {
    id: "c-maya-2",
    from: "t-maya",
    at: "2026-09-10T20:48:00",
    text: "Whitney and I Sodi still overlap. If nobody moves it, I'll bump dinner.",
    reactions: [{ emoji: "👀", from: ["t-jonas"] }],
  },
  {
    id: "c-danny-1",
    from: "t-danny",
    at: "2026-09-10T22:44:00",
    text: "I'm at Vanguard — set's running long. Don't wait on me for dinner.",
    reactions: [],
    attachment: {
      kind: "stop",
      itemId: "i-vanguard",
      title: "Village Vanguard",
      place: "Greenwich Village",
    },
  },
  {
    id: "c-jonas-1",
    from: "t-jonas",
    at: "2026-09-10T22:51:00",
    text: "If dinner slips I can hold I Sodi until 18:15. Say the word.",
    reactions: [],
  },
  {
    id: "c-maya-hold",
    from: "t-maya",
    at: "2026-09-10T22:54:00",
    replyTo: "c-jonas-1",
    text: "Hold it. Thank you.",
    reactions: [{ emoji: "✅", from: ["t-jonas"] }],
  },
  {
    id: "c-priya-ok",
    from: "t-priya",
    at: "2026-09-10T23:01:00",
    text: "ok",
    reactions: [],
  },
  {
    id: "c-priya-ok2",
    from: "t-priya",
    at: "2026-09-10T23:01:20",
    text: "I'll tell the table it's 18:15.",
    reactions: [],
  },
  {
    id: "c-tom-late",
    from: "t-tom",
    at: "2026-09-10T23:18:00",
    text: "Muted — catching up in the morning. Looks like dinner moved; I'll read the calendar, not this thread.",
    reactions: [],
  },
  {
    id: "c-elena-today",
    from: "t-elena",
    at: "2026-09-11T07:42:00",
    text: "Morning. Museum Mile tickets are in the confirmation field on the Met stop. Screenshot if anyone's offline.",
    reactions: [{ emoji: "👍", from: ["t-kenji", "t-aisha"] }],
    attachment: {
      kind: "stop",
      itemId: "i-met",
      title: "The Metropolitan Museum of Art",
      place: null,
    },
  },
  {
    id: "c-maya-self",
    from: "t-maya",
    at: "2026-09-11T08:05:00",
    replyTo: "c-maya-1",
    text: "Leaving this here so I don't re-book the gap: nothing before 16:00 after the Met. Including coffee.",
    reactions: [{ emoji: "❤️", from: ["t-danny"] }],
  },
  {
    id: "c-danny-url",
    from: "t-danny",
    at: "2026-09-11T08:16:00",
    text: "Setlist rabbit hole, ignore me: https://villagevanguard.com/calendar/2026-04-17-late-set-running-long-dont-wait",
    reactions: [],
  },
  {
    id: "c-aisha-long",
    from: "t-aisha",
    at: "2026-09-11T09:28:00",
    text: "For anyone joining mid-thread: Tuesday is FiDi and a slow landing. Wednesday is the bridge and Dumbo, then LES at night. Thursday is Museum Mile and a proper dinner. Friday is MoMA and tacos and the Whitney, and Saturday morning is the park if we still like each other. If a stop is purple on the grid it is locked; don't drag the stay.",
    reactions: [
      { emoji: "👍", from: ["t-maya", "t-danny", "t-priya"] },
      { emoji: "👀", from: ["t-tom"] },
      { emoji: "✅", from: ["t-elena"] },
      { emoji: "❤️", from: ["t-kenji"] },
    ],
  },
  {
    id: "c-jonas-today",
    from: "t-jonas",
    at: "2026-09-11T10:02:00",
    text: "I'll be in the advisor seat, not on the trip. Ping me if Whitney/I Sodi collide again — I can see the clash from here.",
    reactions: [{ emoji: "👍", from: ["t-maya"] }],
  },
  {
    id: "c-maya-now",
    from: "t-maya",
    at: "2026-09-11T10:11:00",
    text: "Reading this now. Calendar is source of truth; chat is for the messy bits.",
    reactions: [{ emoji: "👍", from: [ACCOUNT_USER_ID] }],
  },
  {
    id: "c-sarthak-today",
    from: ACCOUNT_USER_ID,
    at: "2026-09-11T10:24:00",
    replyTo: "c-maya-now",
    text: "Same — I'll follow the calendar. Pinging here if something's off.",
    reactions: [],
  },
];

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function dayLabel(iso: string, now: Date) {
  const date = parseISO(iso);
  if (isSameDay(date, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Yesterday";
  return format(date, "EEEE, d MMMM");
}

function clock(iso: string) {
  return format(parseISO(iso), "h:mm a");
}

const LINK = /https?:\/\/[^\s<]+/gi;
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\s)+$/u;

function isEmojiOnly(text: string) {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 16) return false;
  return EMOJI_ONLY.test(trimmed);
}

function MessageText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const re = new RegExp(LINK.source, "gi");
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const href = match[0];
    let host = href;
    try {
      host = new URL(href).hostname.replace(/^www\./, "");
    } catch {
      /* keep raw */
    }
    nodes.push(
      <a
        key={`${href}-${index}`}
        className={styles.link}
        href={href}
        target="_blank"
        rel="noreferrer noopener"
      >
        {host}
      </a>,
    );
    last = match.index + href.length;
    index += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length ? <>{nodes}</> : <>{text}</>;
}

function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}

/** Session user matches the account chip — brand purple, not the who-4 blue. */
const YOU_COLOR = "var(--purple-600)";

function namesFor(
  ids: string[],
  byId: Map<string, Traveller>,
  meId: string,
) {
  return ids
    .map((id) => {
      if (id === meId) return "You";
      const name = byId.get(id)?.name;
      return name ? firstName(name) : null;
    })
    .filter(Boolean)
    .join(", ");
}

function stopPhoto(destinationId: string, title: string): string | null {
  const dest = getDestination(destinationId);
  if (!dest) return null;
  const needle = title.toLowerCase();
  const hit = dest.attractions.find((attraction) => {
    const name = attraction.name.toLowerCase();
    return needle.includes(name) || name.includes(needle.replace(/^the /, ""));
  });
  return hit?.photo ?? null;
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readImageFile(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) return Promise.resolve(null);
  if (file.size > 8 * 1024 * 1024) return Promise.resolve(null);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => resolve(String(reader.result ?? "") || null);
    reader.readAsDataURL(file);
  });
}

function StopCard({
  attachment,
  item,
  photo,
  live,
  onOpen,
}: {
  attachment: StopAttachment;
  item?: ItineraryItem;
  photo: string | null;
  live: boolean;
  onOpen: () => void;
}) {
  const when = item?.start
    ? format(parseISO(item.start), "EEE d MMM · h:mm a")
    : null;
  const detail = [attachment.place, when].filter(Boolean).join(" · ");
  const inner = (
    <>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- local attraction still
        <img className={styles.stopPhoto} src={photo} alt="" />
      ) : (
        <span className={styles.stopGlyph} aria-hidden>
          <MapPin size={14} strokeWidth={2} />
        </span>
      )}
      <span className={styles.stopCopy}>
        <strong>{attachment.title}</strong>
        {detail ? <em>{detail}</em> : null}
      </span>
    </>
  );

  if (live) {
    return (
      <button
        type="button"
        className={cn(styles.stop, styles.stopLive)}
        onClick={onOpen}
      >
        {inner}
      </button>
    );
  }

  return <div className={styles.stop}>{inner}</div>;
}

function IdeaChatCard({ attachment }: { attachment: IdeaAttachment }) {
  return (
    <div className={styles.stop}>
      <span className={styles.stopGlyph} aria-hidden>
        <Lightbulb size={14} strokeWidth={2} />
      </span>
      <span className={styles.stopCopy}>
        <strong>{attachment.title}</strong>
        <em>{attachment.place ? attachment.place : "Idea board"}</em>
      </span>
    </div>
  );
}

function AttachCard({
  attachment,
}: {
  attachment: Exclude<Attachment, StopAttachment | IdeaAttachment>;
}) {
  if (attachment.kind === "photo") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user-picked still
      <img
        className={styles.photoAttach}
        src={attachment.src}
        alt={attachment.title}
      />
    );
  }

  if (attachment.kind === "file") {
    return (
      <div className={styles.fileAttach}>
        <span className={styles.stopGlyph} aria-hidden>
          <FileText size={14} strokeWidth={2} />
        </span>
        <span className={styles.stopCopy}>
          <strong>{attachment.title}</strong>
          <em>{attachment.size}</em>
        </span>
      </div>
    );
  }

  return (
    <div className={styles.stop}>
      {attachment.src ? (
        // eslint-disable-next-line @next/next/no-img-element -- destination still
        <img className={styles.stopPhoto} src={attachment.src} alt="" />
      ) : (
        <span className={styles.stopGlyph} aria-hidden>
          <MapPinned size={14} strokeWidth={2} />
        </span>
      )}
      <span className={styles.stopCopy}>
        <strong>{attachment.title}</strong>
        {attachment.place ? <em>{attachment.place}</em> : null}
      </span>
    </div>
  );
}

function selfTraveller(trip: Trip, sessionId: string | null): Traveller {
  const fromTrip = trip.travellers.find((person) => person.id === sessionId);
  if (fromTrip) {
    return { ...fromTrip, photoUrl: undefined };
  }
  return {
    id: ACCOUNT_USER.id,
    name: ACCOUNT_USER.name,
    initials: ACCOUNT_USER.initials,
    colorIndex: ACCOUNT_USER.colorIndex,
    role: "owner",
    online: true,
  };
}

export function TripChat({ trip }: { trip: Trip }) {
  const api = useTripApi();
  const pendingShare = useTrip((s) => s.pendingChatShare);
  const sessionId = useSession((s) => s.user?.id ?? ACCOUNT_USER.id);
  const me = useMemo(() => selfTraveller(trip, sessionId), [trip, sessionId]);
  const byId = useMemo(() => {
    const map = new Map<string, Traveller>();
    for (const person of trip.travellers) map.set(person.id, person);
    map.set(me.id, me);
    return map;
  }, [trip.travellers, me]);
  const stops = useMemo(
    () => trip.items.filter((item) => item.kind !== "commute"),
    [trip.items],
  );

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    trip.destinationId === "nyc" ? SEED : [],
  );
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [reacting, setReacting] = useState<string | null>(null);
  const [reactAnchor, setReactAnchor] = useState<HTMLElement | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachAnchor, setAttachAnchor] = useState<HTMLElement | null>(null);
  const [attachView, setAttachView] = useState<AttachView>("menu");
  const [stopQuery, setStopQuery] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showJump, setShowJump] = useState(false);

  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pinnedAway = useRef(false);
  const now = useMemo(() => new Date(), []);

  const byMessage = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    for (const message of messages) map.set(message.id, message);
    return map;
  }, [messages]);

  const itemsById = useMemo(() => {
    const map = new Map<string, ItineraryItem>();
    for (const item of trip.items) map.set(item.id, item);
    return map;
  }, [trip.items]);

  const [flashId, setFlashId] = useState<string | null>(null);
  const flashTimer = useRef<number>(0);

  const visible = useMemo(
    () =>
      messages
        .filter((message) => byId.has(message.from))
        .sort((a, b) => a.at.localeCompare(b.at)),
    [messages, byId],
  );

  const shareStops = useMemo(() => {
    const q = stopQuery.trim().toLowerCase();
    const list = q
      ? stops.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.place?.name.toLowerCase().includes(q) ||
            item.place?.neighbourhood?.toLowerCase().includes(q),
        )
      : stops;
    return list.slice(0, 8);
  }, [stops, stopQuery]);

  function scrollToEnd() {
    const node = threadRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
    pinnedAway.current = false;
    setShowJump(false);
  }

  useEffect(() => {
    const last = visible[visible.length - 1];
    if (!last) return;
    if (!pinnedAway.current || last.from === me.id) scrollToEnd();
    else setShowJump(true);
    // Own sends should always pin to the latest line.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.length]);

  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 120)}px`;
  }, [draft]);

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  function sendText(text: string, attachment?: Attachment) {
    const body = text.trim();
    if ((!body && !attachment) || !me) return;
    setMessages((current) => [
      ...current,
      {
        id: `c-me-${Date.now()}`,
        from: me.id,
        text: body,
        at: new Date().toISOString(),
        replyTo: replyTo ?? undefined,
        reactions: [],
        attachment,
      },
    ]);
    setDraft("");
    setReplyTo(null);
    setAttachOpen(false);
    setAttachView("menu");
    setStopQuery("");
  }

  useEffect(() => {
    if (!pendingShare || !me) return;
    const canned = pendingShare.reason === "Added from the idea board.";
    setMessages((current) => [
      ...current,
      {
        id: `c-me-${Date.now()}`,
        from: me.id,
        text: canned ? "" : pendingShare.reason,
        at: new Date().toISOString(),
        reactions: [],
        attachment: {
          kind: "idea",
          ideaId: pendingShare.ideaId,
          title: pendingShare.title,
          place: pendingShare.place,
        },
      },
    ]);
    api.getState().clearChatShare();
  }, [pendingShare, me, api]);

  function toggleReaction(messageId: string, emoji: string) {
    if (!me) return;
    setMessages((current) =>
      current.map((entry) => {
        if (entry.id !== messageId) return entry;
        const existing = entry.reactions.find((item) => item.emoji === emoji);
        if (!existing) {
          return {
            ...entry,
            reactions: [...entry.reactions, { emoji, from: [me.id] }],
          };
        }
        const from = existing.from.includes(me.id)
          ? existing.from.filter((id) => id !== me.id)
          : [...existing.from, me.id];
        return {
          ...entry,
          reactions: from.length
            ? entry.reactions.map((item) =>
                item.emoji === emoji ? { ...item, from } : item,
              )
            : entry.reactions.filter((item) => item.emoji !== emoji),
        };
      }),
    );
    setReacting(null);
  }

  function shareStop(item: ItineraryItem) {
    sendText("", {
      kind: "stop",
      itemId: item.id,
      title: item.title,
      place: item.place?.neighbourhood ?? item.place?.name ?? null,
    });
  }

  function shareLocation() {
    const dest = getDestination(trip.destinationId);
    sendText("", {
      kind: "location",
      title: dest?.name ?? trip.name,
      place: dest ? `${dest.region}, ${dest.country}` : null,
      src: coverPhotoSrc(trip.destinationId),
    });
  }

  function sharePhoto(file: File) {
    void readImageFile(file).then((src) => {
      if (!src) return;
      sendText("", { kind: "photo", title: file.name, src });
    });
  }

  function shareFile(file: File) {
    sendText("", {
      kind: "file",
      title: file.name,
      size: fileSize(file.size),
    });
  }

  function jumpTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ block: "center" });
    window.clearTimeout(flashTimer.current);
    setFlashId(id);
    flashTimer.current = window.setTimeout(() => {
      setFlashId((current) => (current === id ? null : current));
    }, 1400);
  }

  function openStop(itemId: string) {
    const item = trip.items.find((entry) => entry.id === itemId);
    if (!item) return;
    if (item.start) api.getState().setActiveDay(item.start.slice(0, 10));
    api.getState().selectItem(item.id, "itinerary");
  }

  const replyTarget = replyTo ? byMessage.get(replyTo) : null;
  const replyPerson = replyTarget ? byId.get(replyTarget.from) : null;
  const canSend = draft.trim().length > 0;

  return (
    <div className={styles.root}>
      <div className={styles.threadWrap}>
        <div
          ref={threadRef}
          className={styles.thread}
          role="log"
          aria-label="Trip chat"
          aria-live="polite"
          onScroll={(event) => {
            const node = event.currentTarget;
            const away =
              node.scrollHeight - node.scrollTop - node.clientHeight > 96;
            pinnedAway.current = away;
            setShowJump(away);
          }}
        >
          {visible.length === 0 ? (
            <div className={styles.empty}>
              <Hummingbird mood="caring" size={88} className={styles.emptyBird} />
              <p>Start the thread</p>
              <span className={styles.emptyBody}>
                Share a stop from the itinerary, or write the group about{" "}
                {trip.name}.
              </span>
            </div>
          ) : null}

          {visible.map((message, index) => {
            const person = byId.get(message.from);
            if (!person) return null;
            const prev = visible[index - 1];
            const next = visible[index + 1];
            const showDay = !prev || dayKey(prev.at) !== dayKey(message.at);
            const grouped =
              Boolean(prev) &&
              !showDay &&
              prev.from === message.from &&
              !message.replyTo;
            const continues =
              Boolean(next) &&
              dayKey(next.at) === dayKey(message.at) &&
              next.from === message.from &&
              !next.replyTo;
            const lastInRun = !continues;
            const quoted = message.replyTo
              ? byMessage.get(message.replyTo)
              : undefined;
            const quotedPerson = quoted ? byId.get(quoted.from) : undefined;
            const mine = person.id === me.id;
            const emoji = isEmojiOnly(message.text);
            const stop =
              message.attachment?.kind === "stop" ? message.attachment : null;
            const ideaCard =
              message.attachment?.kind === "idea" ? message.attachment : null;
            const attached = stop ? itemsById.get(stop.itemId) : undefined;
            const liveStop = Boolean(attached);
            const photo = stop
              ? stopPhoto(trip.destinationId, stop.title)
              : null;

            return (
              <article
                key={message.id}
                id={message.id}
                className={cn(
                  styles.entry,
                  grouped && styles.entryGrouped,
                  mine && styles.entryMine,
                  person.role === "advisor" && styles.entryAdvisor,
                  flashId === message.id && styles.entryFlash,
                )}
                style={{
                  ["--who" as string]: mine
                    ? YOU_COLOR
                    : travellerColor(person.colorIndex),
                }}
              >
                {showDay ? (
                  <div className={styles.day} role="separator">
                    <span>{dayLabel(message.at, now)}</span>
                  </div>
                ) : null}

                <div className={cn(styles.row, lastInRun && styles.rowTail)}>
                  <div className={styles.gutter}>
                    {grouped ? (
                      <time className={styles.hoverTime} dateTime={message.at}>
                        {format(parseISO(message.at), "h:mm")}
                      </time>
                    ) : (
                    <Avatar
                      traveller={person}
                      size="sm"
                      hideName
                      showPresence
                      color={mine ? YOU_COLOR : undefined}
                    />
                    )}
                  </div>

                  <div className={styles.cluster}>
                    {!grouped && !mine ? (
                      <header className={styles.meta}>
                        <span className={styles.name}>
                          {firstName(person.name)}
                        </span>
                        {person.role === "advisor" ? (
                          <span className={styles.role}>Advisor</span>
                        ) : null}
                      </header>
                    ) : null}

                    {stop ? (
                      <StopCard
                        attachment={stop}
                        item={attached}
                        photo={photo}
                        live={liveStop}
                        onOpen={() => openStop(stop.itemId)}
                      />
                    ) : ideaCard ? (
                      <IdeaChatCard attachment={ideaCard} />
                    ) : message.attachment &&
                      message.attachment.kind !== "stop" &&
                      message.attachment.kind !== "idea" ? (
                      <AttachCard attachment={message.attachment} />
                    ) : null}

                    {message.text ? (
                      <div
                        className={cn(
                          styles.bubble,
                          mine && styles.bubbleMine,
                          grouped && styles.bubbleGrouped,
                          continues && styles.bubbleContinues,
                          emoji && styles.bubbleEmoji,
                        )}
                      >
                        {quoted && quotedPerson ? (
                          <button
                            type="button"
                            className={styles.quote}
                            onClick={() => jumpTo(quoted.id)}
                          >
                            <span>
                              {quoted.from === me.id
                                ? "You"
                                : firstName(quotedPerson.name)}
                            </span>
                            {quoted.text || quoted.attachment?.title}
                          </button>
                        ) : null}
                        <p>
                          <MessageText text={message.text} />
                        </p>
                      </div>
                    ) : quoted && quotedPerson ? (
                      <button
                        type="button"
                        className={styles.quoteSolo}
                        onClick={() => jumpTo(quoted.id)}
                      >
                        <span>
                          {quoted.from === me.id
                            ? "You"
                            : firstName(quotedPerson.name)}
                        </span>
                        {quoted.text || quoted.attachment?.title}
                      </button>
                    ) : null}

                    {message.reactions.length > 0 ? (
                      <div className={styles.reactions}>
                        {message.reactions.map((item) => {
                          const mineReact = item.from.includes(me.id);
                          const who = namesFor(item.from, byId, me.id);
                          return (
                            <button
                              key={item.emoji}
                              type="button"
                              className={cn(
                                styles.reaction,
                                mineReact && styles.reactionOn,
                              )}
                              title={who}
                              aria-pressed={mineReact}
                              aria-label={`${item.emoji}, ${who}`}
                              onClick={() =>
                                toggleReaction(message.id, item.emoji)
                              }
                            >
                              <span>{item.emoji}</span>
                              {item.from.length}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {lastInRun ? (
                      <time className={styles.stamp} dateTime={message.at}>
                        {clock(message.at)}
                      </time>
                    ) : null}
                  </div>

                  <div className={styles.hoverActions}>
                    <button
                      type="button"
                      className={styles.hoverBtn}
                      aria-label="Add a reaction"
                      onClick={(event) => {
                        setReacting(message.id);
                        setReactAnchor(event.currentTarget);
                      }}
                    >
                      <Smile size={14} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      className={styles.hoverBtn}
                      aria-label="Reply"
                      onClick={() => {
                        setReplyTo(message.id);
                        inputRef.current?.focus();
                      }}
                    >
                      <Reply size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {showJump ? (
          <button
            type="button"
            className={styles.jump}
            onClick={scrollToEnd}
          >
            <ChevronDown size={14} strokeWidth={2.2} />
            Latest
          </button>
        ) : null}
      </div>

      <Popover
        open={Boolean(reacting)}
        onClose={() => setReacting(null)}
        anchor={reactAnchor}
        placement="top"
        align="end"
        offset={6}
        width={176}
        label="React"
        className={styles.picker}
      >
        <div className={styles.reactGrid}>
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={styles.reactChoice}
              onClick={() => reacting && toggleReaction(reacting, emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </Popover>

      <form
        className={styles.compose}
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          sendText(draft);
        }}
      >
        {replyTarget && replyPerson ? (
          <div className={styles.replyBar}>
            <div className={styles.replyCopy}>
              <span>
                Replying to{" "}
                {replyTarget.from === me.id
                  ? "yourself"
                  : firstName(replyPerson.name)}
              </span>
              <em>{replyTarget.text || replyTarget.attachment?.title}</em>
            </div>
            <IconButton
              label="Cancel reply"
              size="xs"
              variant="ghost"
              onClick={() => setReplyTo(null)}
            >
              <X size={14} strokeWidth={2} />
            </IconButton>
          </div>
        ) : null}

        <div className={styles.composer}>
          <IconButton
            label="Attach"
            size="sm"
            variant="ghost"
            className={styles.composerBtn}
            aria-expanded={attachOpen}
            onClick={(event) => {
              setAttachView("menu");
              setAttachOpen((value) => !value);
              setAttachAnchor(event.currentTarget);
            }}
          >
            <Plus size={18} strokeWidth={2} />
          </IconButton>
          <textarea
            ref={inputRef}
            className={styles.input}
            rows={1}
            value={draft}
            placeholder="Message the group"
            aria-label="Message the trip"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
              if (event.key === "Escape") {
                if (replyTo) {
                  event.preventDefault();
                  setReplyTo(null);
                }
                return;
              }
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendText(draft);
              }
            }}
          />
          <IconButton
            type="submit"
            label="Send"
            size="sm"
            variant="primary"
            className={styles.composerBtn}
            disabled={!canSend}
          >
            <Send size={14} strokeWidth={2.2} />
          </IconButton>
        </div>
        <input
          ref={cameraRef}
          className={styles.fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          aria-hidden
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) sharePhoto(file);
          }}
        />
        <input
          ref={photoRef}
          className={styles.fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          aria-hidden
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) sharePhoto(file);
          }}
        />
        <input
          ref={fileRef}
          className={styles.fileInput}
          type="file"
          aria-hidden
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) {
              if (file.type.startsWith("image/")) sharePhoto(file);
              else shareFile(file);
            }
          }}
        />
      </form>

      <Popover
        open={attachOpen}
        onClose={() => {
          setAttachOpen(false);
          setAttachView("menu");
          setStopQuery("");
        }}
        anchor={attachAnchor}
        placement="top"
        align="start"
        offset={8}
        width={280}
        label={attachView === "stop" ? "Share a stop" : "Attach"}
        className={styles.picker}
      >
        {attachView === "menu" ? (
          <div className={styles.attachMenu} role="menu">
            <button
              type="button"
              role="menuitem"
              className={styles.shareItem}
              onClick={() => cameraRef.current?.click()}
            >
              <span className={styles.attachIcon}>
                <Camera size={16} strokeWidth={1.8} />
              </span>
              <span>
                <strong>Camera</strong>
                <em>Take a photo</em>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              className={styles.shareItem}
              onClick={() => photoRef.current?.click()}
            >
              <span className={styles.attachIcon}>
                <ImageIcon size={16} strokeWidth={1.8} />
              </span>
              <span>
                <strong>Photos</strong>
                <em>Choose from library</em>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              className={styles.shareItem}
              onClick={() => fileRef.current?.click()}
            >
              <span className={styles.attachIcon}>
                <FileText size={16} strokeWidth={1.8} />
              </span>
              <span>
                <strong>File</strong>
                <em>Document or PDF</em>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              className={styles.shareItem}
              onClick={shareLocation}
            >
              <span className={styles.attachIcon}>
                <MapPinned size={16} strokeWidth={1.8} />
              </span>
              <span>
                <strong>Location</strong>
                <em>{trip.name}</em>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              className={styles.shareItem}
              onClick={() => setAttachView("stop")}
            >
              <span className={styles.attachIcon}>
                <MapPin size={16} strokeWidth={1.8} />
              </span>
              <span>
                <strong>Stop</strong>
                <em>From this itinerary</em>
              </span>
            </button>
          </div>
        ) : (
          <div className={styles.shareList} role="menu">
            <div className={styles.shareHead}>
              <button
                type="button"
                className={styles.shareBack}
                aria-label="Back to attach"
                onClick={() => setAttachView("menu")}
              >
                <ChevronLeft size={16} strokeWidth={2} />
              </button>
              <p className={styles.shareLabel}>Share a stop</p>
            </div>
            <label className={styles.shareSearch}>
              <Search size={14} strokeWidth={2} />
              <input
                value={stopQuery}
                onChange={(event) => setStopQuery(event.target.value)}
                placeholder="Search the itinerary"
                aria-label="Search stops to share"
              />
            </label>
            {shareStops.length === 0 ? (
              <p className={styles.shareEmpty}>No matching stops</p>
            ) : (
              shareStops.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className={styles.shareItem}
                  onClick={() => shareStop(item)}
                >
                  <MapPin size={16} strokeWidth={1.8} />
                  <span>
                    <strong>{item.title}</strong>
                    {item.place?.name ? <em>{item.place.name}</em> : null}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </Popover>
    </div>
  );
}
