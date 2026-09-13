"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Send, X } from "lucide-react";

import { AiMark } from "@/components/brand/ai-mark";
import { Button, IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  openingAskAi,
  replyToAskAi,
  type AskAiMessage,
  type AskAiOption,
} from "@/lib/trip/ai-chat";
import type { AssistantOffer } from "@/lib/trip/assistant";
import type { AssistantPlan } from "@/lib/types";

import styles from "./assistant.module.css";

/**
 * Ask AI — the conversation is the product.
 *
 * Offers and day facts are folded into the first turn, not a competing
 * dashboard. The traveller describes or picks a prompt; a proposal still
 * lands as a reviewable plan. Not a blank chatbot, not a stats panel.
 */

export interface AssistantOffersProps {
  offers: AssistantOffer[];
  onRequest: (intent: AssistantPlan["intent"]) => void;
  /** The day the advisor is reading, so it can show its working. */
  reading?: {
    label: string;
    stops: number;
    errorCount: number;
    warningCount: number;
    freeMinutes: number;
    travelMinutes: number;
    costUsd: number;
  };
}

export function AssistantOffers({
  offers,
  onRequest,
  reading,
}: AssistantOffersProps) {
  const dayKey = reading?.label ?? "day";
  const reduceMotion = useReducedMotion();
  const [messages, setMessages] = useState<AskAiMessage[]>(() =>
    reading ? [openingAskAi(reading, offers)] : [],
  );
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const thinkTimer = useRef(0);

  useEffect(() => {
    setMessages(reading ? [openingAskAi(reading, offers)] : []);
    setDraft("");
    setThinking(false);
  }, [dayKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    inputRef.current?.focus();
  }, [dayKey]);

  useEffect(() => {
    const node = threadRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, thinking]);

  useEffect(
    () => () => window.clearTimeout(thinkTimer.current),
    [],
  );

  function resizeInput() {
    const node = inputRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 132)}px`;
  }

  function pushYou(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
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
          const reply = replyToAskAi(trimmed, offers, current);
          return [...current, reply];
        });
        setThinking(false);
      },
      reduceMotion ? 0 : 720,
    );
  }

  function pickOption(option: AskAiOption) {
    if (thinking) return;
    if (option.intent) {
      onRequest(option.intent);
      return;
    }
    if (option.prompt) pushYou(option.prompt);
  }

  const canSend = draft.trim().length > 0 && !thinking;

  return (
    <div className={styles.canvas}>
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
        {thinking ? (
          <div className={cn(styles.turn, styles.turnAi)} aria-label="Thinking">
            <span className={styles.turnMark} aria-hidden>
              <AiMark size={16} />
            </span>
            <div className={styles.typing} aria-hidden>
              <span />
              <span />
              <span />
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
        <div className={styles.composer}>
          <textarea
            ref={inputRef}
            className={styles.input}
            rows={1}
            value={draft}
            placeholder="Ask anything about this day…"
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
    </div>
  );
}

export interface AssistantPlanPanelProps {
  plan: AssistantPlan;
  applied: string[];
  onApplyAll: () => void;
  onApplyOne: (changeId: string) => void;
  onDismiss: () => void;
  onHoverChange: (itemId: string | null) => void;
}

export function AssistantPlanPanel({
  plan,
  applied,
  onApplyAll,
  onApplyOne,
  onDismiss,
  onHoverChange,
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
        <div className={styles.panelHeadTop}>
          <span className={styles.panelBadge}>
            <AiMark size={12} />
            Proposal
          </span>
          <IconButton
            label="Dismiss suggestion"
            size="xs"
            variant="ghost"
            onClick={onDismiss}
          >
            <X size={14} strokeWidth={2} />
          </IconButton>
        </div>
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
                  onPointerEnter={() => onHoverChange(change.itemId ?? null)}
                  onPointerLeave={() => onHoverChange(null)}
                >
                  <span className={styles.changeSummary}>{change.summary}</span>
                  {isApplied ? (
                    <span className={styles.changeDone}>
                      <Check size={12} strokeWidth={2.8} />
                      Done
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onApplyOne(change.id)}
                    >
                      Apply
                    </Button>
                  )}
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
            Apply {plan.changes.length > 1 ? "all" : "change"}
          </Button>
        ) : null}
      </footer>
    </motion.div>
  );
}
