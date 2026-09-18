"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Send } from "lucide-react";

import { AiMark } from "@/components/brand/ai-mark";
import { CardMedia } from "@/components/card-media";
import { Button, IconButton } from "@/components/ui/button";
import { CATEGORY_META } from "@/lib/categories";
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
import { dayLabel, durationLabel, timeLabel } from "@/lib/trip/time";
import type { AssistantOffer } from "@/lib/trip/assistant";
import type {
  AssistantAppliedNote,
  AssistantChange,
  AssistantChoice,
  AssistantChoiceSet,
  AssistantPlan,
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
          <PlaceOptionCard
            key={idea.ideaId}
            choice={idea}
            onSelect={() => onChoose(idea.ideaId)}
          />
        ))}
      </div>
    </div>
  );
}

function PlaceOptionCard({
  choice,
  onSelect,
}: {
  choice: AssistantChoice;
  onSelect: () => void;
}) {
  const meta = CATEGORY_META[choice.category];
  return (
    <button type="button" className={styles.optionCard} onClick={onSelect}>
      <CardMedia
        photo={choice.photo}
        variant="utility"
        className={styles.optionCardMedia}
      />
      <span className={styles.optionCardBody}>
        <span className={styles.optionCardKicker}>
          {meta.label}
          {choice.area ? ` · ${choice.area}` : ""}
        </span>
        <span className={styles.optionCardTitle}>{choice.title}</span>
        <span className={styles.optionCardMeta}>
          {durationLabel(choice.durationMin)}
          {choice.travelMin != null ? ` · ${choice.travelMin} min from context` : ""}
        </span>
        <span className={styles.optionCardWhy}>{choice.why}</span>
      </span>
    </button>
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
        <div className={styles.changes}>
          <p className="eyebrow">
            {plan.changes.length}{" "}
            {plan.changes.length === 1 ? "change" : "changes"}
          </p>
          <ul className={styles.changeList}>
            {plan.changes.map((change) => {
              const isApplied = applied.includes(change.id);
              return (
                <li
                  key={change.id}
                  className={cn(styles.change, isApplied && styles.changeApplied)}
                  onPointerEnter={() =>
                    onHoverChange(change.itemId ?? change.create?.id ?? null)
                  }
                  onPointerLeave={() => onHoverChange(null)}
                >
                  <ChangeVisual change={change} trip={trip} />
                  {plan.changes.length > 1 && !isApplied ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onApplyOne(change.id)}
                    >
                      Apply
                    </Button>
                  ) : isApplied ? (
                    <span className={styles.changeDone}>
                      <Check size={12} strokeWidth={2.8} />
                      Done
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>

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
  if (change.kind === "add" && change.create) {
    return (
      <span className={styles.changeVisual}>
        <span className={styles.changeSummary}>{change.summary}</span>
        {change.create.start ? (
          <span className={styles.changeShift}>
            Lands {dayLabel(change.create.start.slice(0, 10))} ·{" "}
            {timeLabel(change.create.start)}
          </span>
        ) : null}
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
