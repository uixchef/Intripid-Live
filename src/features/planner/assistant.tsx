"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Send } from "lucide-react";

import { AiMark } from "@/components/brand/ai-mark";
import { CardMedia } from "@/components/card-media";
import { Button, IconButton } from "@/components/ui/button";
import { photosForPlaces } from "@/data/place-photos";
import { CATEGORY_META } from "@/lib/categories";
import { walkMinutes } from "@/lib/geo";
import { cn } from "@/lib/utils";
import {
  appliedAskAi,
  choicesIntro,
  noResultAskAi,
  openingAskAi,
  replyToAskAi,
  workingLabel,
  type AskAiMessage,
  type AskAiOption,
  type AskAiReading,
} from "@/lib/trip/ai-chat";
import {
  dayLabel,
  dayLabelLong,
  durationLabel,
  durationMinutes,
  timeLabel,
} from "@/lib/trip/time";
import type { AssistantOffer } from "@/lib/trip/assistant";
import type {
  AssistantAppliedNote,
  AssistantChange,
  AssistantChoiceSet,
  AssistantPlan,
  ItemCategory,
  ItineraryItem,
  Trip,
} from "@/lib/types";

import styles from "./assistant.module.css";

export interface AskAiPanelProps {
  offers: AssistantOffer[];
  reading: AskAiReading;
  trip: Trip;
  plan: AssistantPlan | null;
  choices: AssistantChoiceSet | null;
  applied: string[];
  appliedNote: AssistantAppliedNote | null;
  canUndo?: boolean;
  onRequest: (intent: AssistantPlan["intent"]) => void;
  onInterpret: (text: string) => "plan" | "choices" | false;
  onChoose: (ideaId: string) => boolean;
  onApplyAll: () => void;
  onApplyOne: (changeId: string) => void;
  onDismissPlan: () => void;
  onUndo?: () => void;
  onHoverChange: (itemId: string | null) => void;
}

export function AskAiPanel({
  offers,
  reading,
  trip,
  plan,
  choices,
  applied,
  appliedNote,
  canUndo,
  onRequest,
  onInterpret,
  onChoose,
  onApplyAll,
  onApplyOne,
  onDismissPlan,
  onUndo,
  onHoverChange,
}: AskAiPanelProps) {
  const dayKey = reading.label;
  const reduceMotion = useReducedMotion();
  const [messages, setMessages] = useState<AskAiMessage[]>(() => [
    openingAskAi(reading, offers),
  ]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const thinkTimer = useRef(0);
  const noteSeen = useRef<string | null>(null);

  useEffect(() => {
    setMessages([openingAskAi(reading, offers)]);
    setDraft("");
    setThinking(false);
  }, [dayKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (plan || choices) return;
    inputRef.current?.focus();
  }, [dayKey, plan, choices]);

  useEffect(() => {
    const node = threadRef.current;
    if (!node || plan) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, thinking, plan, choices]);

  useEffect(() => () => window.clearTimeout(thinkTimer.current), []);

  useEffect(() => {
    if (!appliedNote || noteSeen.current === appliedNote.id) return;
    noteSeen.current = appliedNote.id;
    setMessages((current) => [...current, appliedAskAi(appliedNote)]);
  }, [appliedNote]);

  function resizeInput() {
    const node = inputRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 132)}px`;
  }

  function pushYou(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking || plan) return;
    if (trimmed === "__undo__") {
      onUndo?.();
      return;
    }
    const yours: AskAiMessage = {
      id: `you-${Date.now()}`,
      from: "you",
      text: trimmed,
    };
    setDraft("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setMessages((current) => [...current, yours]);
    setThinking(true);
    thinkTimer.current = window.setTimeout(
      () => {
        setMessages((current) => {
          const built = onInterpret(trimmed);
          if (built) return current;
          return [...current, replyToAskAi(trimmed, offers, current)];
        });
        setThinking(false);
      },
      reduceMotion ? 0 : 420,
    );
  }

  useEffect(() => {
    if (!choices) return;
    setMessages((current) => {
      const last = current[current.length - 1];
      if (last?.text.startsWith(choices.heading)) return current;
      return [...current, choicesIntro(choices)];
    });
  }, [choices]);

  function pickOption(option: AskAiOption) {
    if (thinking || plan) return;
    if (option.prompt === "__undo__") {
      onUndo?.();
      return;
    }
    if (option.intent) {
      onRequest(option.intent);
      return;
    }
    if (option.prompt) pushYou(option.prompt);
  }

  const canSend = draft.trim().length > 0 && !thinking && !plan;

  return (
    <div className={styles.canvas}>
      {plan ? (
        <AssistantPlanPanel
          plan={plan}
          trip={trip}
          applied={applied}
          onApplyAll={onApplyAll}
          onApplyOne={onApplyOne}
          onDismiss={onDismissPlan}
          onHoverChange={onHoverChange}
          canUndo={canUndo}
          onUndo={onUndo}
        />
      ) : (
        <>
          <div className={styles.thread} ref={threadRef} role="log" aria-live="polite">
            {messages.map((message) => (
              <article
                key={message.id}
                className={cn(
                  styles.turn,
                  message.from === "you" ? styles.turnYou : styles.turnAi,
                )}
              >
                {message.from === "ai" ? (
                  <span className={styles.turnMark} aria-hidden>
                    <AiMark size={16} />
                  </span>
                ) : null}
                <div className={styles.turnBody}>
                  {message.text.split("\n\n").map((para) => (
                    <p key={para}>{para}</p>
                  ))}
                  {message.options && message.options.length > 0 ? (
                    <div className={styles.prompts}>
                      {message.options.map((option) => (
                        <button
                          key={`${message.id}-${option.id}`}
                          type="button"
                          className={styles.prompt}
                          onClick={() => pickOption(option)}
                        >
                          <span className={styles.promptLabel}>{option.label}</span>
                          {option.detail ? (
                            <span className={styles.promptDetail}>{option.detail}</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
            {choices ? (
              <ChoiceCards
                set={choices}
                onChoose={(ideaId) => {
                  const ok = onChoose(ideaId);
                  if (!ok) {
                    setMessages((current) => [
                      ...current,
                      noResultAskAi("choose", offers),
                    ]);
                  }
                }}
              />
            ) : null}
            {thinking ? (
              <div className={cn(styles.turn, styles.turnAi)} aria-label="Working">
                <span className={styles.turnMark} aria-hidden>
                  <AiMark size={16} />
                </span>
                <div className={styles.turnBody}>
                  <p>{workingLabel(draft || messages.at(-1)?.text || "")}</p>
                </div>
              </div>
            ) : null}
          </div>

          <form
            className={styles.compose}
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              pushYou(draft);
            }}
          >
            {canUndo && onUndo && !choices && !appliedNote ? (
              <button type="button" className={styles.prompt} onClick={onUndo}>
                <span className={styles.promptLabel}>Undo last AI apply</span>
                <span className={styles.promptDetail}>Restore the previous trip</span>
              </button>
            ) : null}
            <div className={styles.composer}>
              <textarea
                ref={inputRef}
                className={styles.input}
                rows={1}
                value={draft}
                placeholder="Ask to move, replace, add or rebalance anything…"
                aria-label="Message Ask AI"
                disabled={thinking}
                onChange={(event) => {
                  setDraft(event.target.value);
                  resizeInput();
                }}
                onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    pushYou(draft);
                  }
                }}
              />
              <IconButton
                type="submit"
                label="Send"
                size="sm"
                variant="primary"
                disabled={!canSend}
                className={canSend ? styles.send : undefined}
              >
                <Send size={15} strokeWidth={2.2} />
              </IconButton>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function ChoiceCards({
  set,
  onChoose,
}: {
  set: AssistantChoiceSet;
  onChoose: (ideaId: string) => void;
}) {
  return (
    <div className={styles.choices}>
      {set.currentTitle ? (
        <p className={styles.choiceCurrent}>
          Current
          <strong>{set.currentTitle}</strong>
          {set.currentWhen ? <span>{set.currentWhen}</span> : null}
        </p>
      ) : null}
      <div className={styles.choiceList}>
        {set.ideas.map((idea) => (
          <PlaceCard
            key={idea.ideaId}
            mode="option"
            photo={idea.photo}
            category={idea.category}
            area={idea.area}
            title={idea.title}
            durationMin={idea.durationMin}
            travelMin={idea.travelMin}
            why={idea.why}
            onSelect={() => onChoose(idea.ideaId)}
          />
        ))}
      </div>
    </div>
  );
}

function PlaceCard({
  mode,
  photo,
  category,
  area,
  title,
  durationMin,
  travelMin,
  why,
  consequence,
  onSelect,
}: {
  mode: "option" | "proposal";
  photo: string | null;
  category: ItemCategory;
  area: string | null;
  title: string;
  durationMin: number;
  travelMin: number | null;
  why?: string;
  consequence?: { label: string; when: string };
  onSelect?: () => void;
}) {
  const meta = CATEGORY_META[category];
  const kickerArea =
    area && area.trim().toLowerCase() !== title.trim().toLowerCase()
      ? area
      : null;
  const inner = (
    <>
      <CardMedia
        photo={photo}
        variant="utility"
        className={styles.optionCardMedia}
      />
      <span className={styles.optionCardBody}>
        <span className={styles.optionCardKicker}>
          {meta.label}
          {kickerArea ? ` · ${kickerArea}` : ""}
        </span>
        <span className={styles.optionCardTitle}>{title}</span>
        <span className={styles.optionCardMeta}>
          {durationLabel(durationMin)}
          {travelMin != null ? ` · ${travelMin} min from context` : ""}
        </span>
        {mode === "option" && why ? (
          <span className={styles.optionCardWhy}>{why}</span>
        ) : null}
        {mode === "proposal" && consequence ? (
          <span className={styles.proposalWhen}>
            <span className={styles.proposalWhenLabel}>{consequence.label}</span>
            <span className={styles.proposalWhenTime}>{consequence.when}</span>
          </span>
        ) : null}
      </span>
    </>
  );

  if (mode === "option") {
    return (
      <button type="button" className={styles.optionCard} onClick={onSelect}>
        {inner}
      </button>
    );
  }

  return (
    <div className={cn(styles.optionCard, styles.proposalCard)}>{inner}</div>
  );
}

export interface AssistantPlanPanelProps {
  plan: AssistantPlan;
  trip: Trip;
  applied: string[];
  onApplyAll: () => void;
  onApplyOne: (changeId: string) => void;
  onDismiss: () => void;
  onHoverChange: (itemId: string | null) => void;
  canUndo?: boolean;
  onUndo?: () => void;
}

export function AssistantPlanPanel({
  plan,
  trip,
  applied,
  onApplyAll,
  onApplyOne,
  onDismiss,
  onHoverChange,
  canUndo,
  onUndo,
}: AssistantPlanPanelProps) {
  const reduceMotion = useReducedMotion();
  const allApplied = plan.changes.every((change) => applied.includes(change.id));

  return (
    <motion.div
      className={styles.panel}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.26, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <header className={styles.panelHead}>
        <span className={styles.panelBadge}>
          <AiMark size={12} />
          Proposal
        </span>
        <h3 className={styles.panelTitle}>{plan.title}</h3>
      </header>

      <div className={styles.panelBody}>
        <PlanChanges
          plan={plan}
          trip={trip}
          applied={applied}
          onApplyOne={onApplyOne}
          onHoverChange={onHoverChange}
        />

        <div className={styles.reasoning}>
          <p className="eyebrow">Why</p>
          <ol className={styles.rationale}>
            {plan.rationale.map((line, index) => (
              <li key={line}>
                <span className={styles.rationaleNum}>{index + 1}</span>
                <span>{line}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <footer className={styles.panelFoot}>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          {allApplied ? "Close" : "Not now"}
        </Button>
        {!allApplied ? (
          <Button
            variant="ai"
            size="sm"
            iconLeft={<AiMark size={13} />}
            onClick={onApplyAll}
          >
            Apply {plan.changes.length > 1 ? "changes" : "change"}
          </Button>
        ) : canUndo && onUndo ? (
          <Button variant="secondary" size="sm" onClick={onUndo}>
            Undo
          </Button>
        ) : null}
      </footer>
    </motion.div>
  );
}

function PlanChanges({
  plan,
  trip,
  applied,
  onApplyOne,
  onHoverChange,
}: {
  plan: AssistantPlan;
  trip: Trip;
  applied: string[];
  onApplyOne: (changeId: string) => void;
  onHoverChange: (itemId: string | null) => void;
}) {
  const addChange = plan.changes.find((change) => change.kind === "add" && change.create);
  const removeChange = plan.changes.find((change) => change.kind === "remove");
  const replacePair = plan.intent === "replace" && Boolean(addChange && removeChange);
  const rest = plan.changes.filter((change) => {
    if (change === addChange) return false;
    if (replacePair && change === removeChange) return false;
    return true;
  });
  const showCount =
    rest.length > 0 || (!addChange && plan.changes.length > 1);

  return (
    <div className={styles.changes}>
      {showCount ? (
        <p className="eyebrow">
          {plan.changes.length}{" "}
          {plan.changes.length === 1 ? "change" : "changes"}
        </p>
      ) : null}

      {replacePair && removeChange ? (
        <CurrentActivityRef
          change={removeChange}
          plan={plan}
          trip={trip}
          slot={addChange?.create ?? null}
          applied={applied.includes(removeChange.id)}
          showApply={plan.changes.length > 1}
          onApply={() => onApplyOne(removeChange.id)}
          onHoverChange={onHoverChange}
        />
      ) : null}

      <ul className={styles.changeList}>
        {addChange?.create ? (
          <ChangeRow
            key={addChange.id}
            change={addChange}
            applied={applied.includes(addChange.id)}
            showApply={plan.changes.length > 1}
            onApply={() => onApplyOne(addChange.id)}
            onHoverChange={onHoverChange}
            place
          >
            <ProposedPlaceCard
              plan={plan}
              change={addChange}
              trip={trip}
              current={
                removeChange
                  ? (trip.items.find((item) => item.id === removeChange.itemId) ??
                    null)
                  : null
              }
            />
          </ChangeRow>
        ) : null}
        {rest.map((change) => (
          <ChangeRow
            key={change.id}
            change={change}
            applied={applied.includes(change.id)}
            showApply={plan.changes.length > 1}
            onApply={() => onApplyOne(change.id)}
            onHoverChange={onHoverChange}
          >
            <ChangeVisual change={change} trip={trip} />
          </ChangeRow>
        ))}
      </ul>
    </div>
  );
}

function ChangeRow({
  change,
  applied,
  showApply,
  onApply,
  onHoverChange,
  place,
  children,
}: {
  change: AssistantChange;
  applied: boolean;
  showApply: boolean;
  onApply: () => void;
  onHoverChange: (itemId: string | null) => void;
  place?: boolean;
  children: ReactNode;
}) {
  return (
    <li
      className={cn(
        styles.change,
        place && styles.changePlace,
        applied && styles.changeApplied,
      )}
      onPointerEnter={() =>
        onHoverChange(change.itemId ?? change.create?.id ?? null)
      }
      onPointerLeave={() => onHoverChange(null)}
    >
      {children}
      {showApply && !applied ? (
        <Button variant="ghost" size="xs" onClick={onApply}>
          Apply
        </Button>
      ) : applied ? (
        <span className={styles.changeDone}>
          <Check size={12} strokeWidth={2.8} />
          Done
        </span>
      ) : null}
    </li>
  );
}

function CurrentActivityRef({
  change,
  plan,
  trip,
  slot,
  applied,
  showApply,
  onApply,
  onHoverChange,
}: {
  change: AssistantChange;
  plan: AssistantPlan;
  trip: Trip;
  slot: ItineraryItem | null;
  applied: boolean;
  showApply: boolean;
  onApply: () => void;
  onHoverChange: (itemId: string | null) => void;
}) {
  const item = trip.items.find((entry) => entry.id === change.itemId);
  const title =
    item?.title ??
    (plan.intent === "replace" && plan.title.startsWith("Replace ")
      ? plan.title.slice("Replace ".length)
      : change.summary);
  const start = item?.start ?? slot?.start ?? null;
  const end = item?.end ?? slot?.end ?? null;
  const when =
    start && end
      ? `${dayLabel(start.slice(0, 10))} · ${timeLabel(start)}–${timeLabel(end)}`
      : null;

  return (
    <div
      className={cn(styles.changeCurrent, applied && styles.changeCurrentDone)}
      onPointerEnter={() => onHoverChange(change.itemId ?? null)}
      onPointerLeave={() => onHoverChange(null)}
    >
      <span className={styles.changeCurrentBody}>
        <span className={styles.changeCurrentLabel}>Current</span>
        <strong className={styles.changeCurrentTitle}>{title}</strong>
        {when ? <span className={styles.changeCurrentWhen}>{when}</span> : null}
      </span>
      {showApply && !applied ? (
        <Button variant="ghost" size="xs" onClick={onApply}>
          Apply
        </Button>
      ) : applied ? (
        <span className={styles.changeDone}>
          <Check size={12} strokeWidth={2.8} />
          Done
        </span>
      ) : null}
    </div>
  );
}

function ProposedPlaceCard({
  plan,
  change,
  trip,
  current,
}: {
  plan: AssistantPlan;
  change: AssistantChange;
  trip: Trip;
  current: ItineraryItem | null;
}) {
  const created = change.create;
  if (!created) return null;
  const durationMin =
    created.start && created.end
      ? durationMinutes(created.start, created.end)
      : 90;
  return (
    <PlaceCard
      mode="proposal"
      photo={photoForStop(created, trip.destinationId)}
      category={created.category}
      area={created.place?.neighbourhood ?? created.place?.name ?? null}
      title={created.title}
      durationMin={durationMin}
      travelMin={travelMinForCreate(created, trip, current)}
      consequence={consequenceForAdd(plan, created)}
    />
  );
}

function photoForStop(item: ItineraryItem, destinationId: string): string | null {
  if (!item.place) return null;
  return (
    photosForPlaces(
      [
        {
          id: item.id,
          name: item.place.name,
          title: item.title,
          coords: item.place.coords,
        },
      ],
      destinationId,
    )[item.id] ?? null
  );
}

function travelMinForCreate(
  created: ItineraryItem,
  trip: Trip,
  current: ItineraryItem | null,
): number | null {
  const fromComment = created.comments
    ?.map((entry) => entry.text)
    .join(" ")
    .match(/(\d+)\s*min from/);
  if (fromComment) return Number(fromComment[1]);
  if (!created.place) return null;
  if (current?.place) {
    return Math.max(8, walkMinutes(current.place.coords, created.place.coords));
  }
  const day = created.start?.slice(0, 10);
  const neighbors = trip.items.filter(
    (item) =>
      item.place &&
      item.kind === "activity" &&
      item.start?.slice(0, 10) === day,
  );
  if (neighbors.length === 0) return null;
  const hops = neighbors.map((item) =>
    walkMinutes(item.place!.coords, created.place!.coords),
  );
  return Math.max(8, Math.min(...hops));
}

function weekdayName(iso: string): string {
  return dayLabelLong(iso.slice(0, 10)).split(" ")[0] ?? dayLabel(iso.slice(0, 10));
}

function consequenceForAdd(
  plan: AssistantPlan,
  created: ItineraryItem,
): { label: string; when: string } {
  const day = created.start ? weekdayName(created.start) : weekdayName(plan.dayIso);
  const when =
    created.start && created.end
      ? `${timeLabel(created.start)}–${timeLabel(created.end)}`
      : created.start
        ? timeLabel(created.start)
        : "";
  if (plan.intent === "replace") {
    return { label: `Replace on ${day}`, when };
  }
  if (plan.intent === "nearby-dinner") {
    return { label: `Dinner · ${day}`, when };
  }
  return { label: `Add to ${day}`, when };
}

function ChangeVisual({ change, trip }: { change: AssistantChange; trip: Trip }) {
  const item = trip.items.find((entry) => entry.id === change.itemId) ?? null;
  if (change.kind === "move" && item?.start && change.patch?.start) {
    return (
      <span className={styles.changeVisual}>
        <span className={styles.changeSummary}>{change.summary}</span>
        <span className={styles.changeShift}>
          <span>
            {dayLabel(item.start.slice(0, 10))} · {timeLabel(item.start)}
          </span>
          <ArrowRight size={12} strokeWidth={2.2} aria-hidden />
          <span>
            {dayLabel(change.patch.start.slice(0, 10))} · {timeLabel(change.patch.start)}
          </span>
        </span>
      </span>
    );
  }
  if (change.kind === "remove" && item) {
    return (
      <span className={styles.changeVisual}>
        <span className={styles.changeSummary}>{change.summary}</span>
        <span className={styles.changeShift}>Leaves the calendar · stays in Ideas</span>
      </span>
    );
  }
  return <span className={styles.changeSummary}>{change.summary}</span>;
}
