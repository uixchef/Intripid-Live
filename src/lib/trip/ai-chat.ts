import type { AssistantChoiceSet, AssistantPlan } from "@/lib/types";
import type { AssistantOffer } from "@/lib/trip/assistant";

export type AskAiOption = {
  id: string;
  label: string;
  detail?: string;
  intent?: AssistantPlan["intent"];
  prompt?: string;
};

export type AskAiMessage = {
  id: string;
  from: "ai" | "you";
  text: string;
  options?: AskAiOption[];
};

export type AskAiReading = {
  label: string;
  stops: number;
  errorCount: number;
  warningCount: number;
  freeMinutes: number;
  travelMinutes: number;
  largestGapMinutes: number;
  largestGapLabel: string | null;
  selectedTitle: string | null;
  selectedWhen: string | null;
  busiest: boolean;
  eveningOpen: boolean;
};

function optionFor(
  offers: AssistantOffer[],
  intent: AssistantPlan["intent"],
): AskAiOption | null {
  const offer = offers.find((item) => item.intent === intent);
  if (!offer) return null;
  return {
    id: intent,
    label: offer.label,
    detail: offer.detail,
    intent,
  };
}

export function openingAskAi(
  reading: AskAiReading,
  offers: AssistantOffer[],
): AskAiMessage {
  const options = offers
    .map((offer) => optionFor(offers, offer.intent))
    .filter((option): option is AskAiOption => Boolean(option))
    .slice(0, 4);

  const pressure =
    reading.errorCount > 0
      ? reading.errorCount === 1
        ? "One clash to unstick."
        : `${reading.errorCount} clashes to unstick.`
      : reading.warningCount > 0
        ? "A few hops are tighter than they should be."
        : null;

  const gap =
    reading.largestGapMinutes >= 90 && reading.largestGapLabel
      ? reading.largestGapLabel
      : reading.freeMinutes >= 60
        ? `About ${Math.round(reading.freeMinutes / 60)}h still unscheduled.`
        : reading.freeMinutes > 0
          ? `${reading.freeMinutes} minutes still open.`
          : "The day is fully booked.";

  const selected = reading.selectedTitle
    ? `Selected: ${reading.selectedTitle}${reading.selectedWhen ? ` · ${reading.selectedWhen}` : ""}.`
    : null;

  const travel =
    reading.travelMinutes >= 40
      ? `${reading.label} has about ${Math.round(reading.travelMinutes / 60) || 1}h of travel.`
      : null;

  const lead = reading.busiest
    ? `${reading.label} is your busiest day — ${reading.stops} ${reading.stops === 1 ? "stop" : "stops"}.`
    : `I've read ${reading.label} — ${reading.stops} ${reading.stops === 1 ? "stop" : "stops"}.`;

  const parts = [lead, pressure, travel, gap, selected].filter(Boolean);

  return {
    id: "ai-open",
    from: "ai",
    text: `${parts.join(" ")}\n\nPick a move, or ask to add, move, replace or rebalance anything.`,
    options,
  };
}

export function workingLabel(text: string): string {
  const line = text.toLowerCase();
  if (/dinner|eat|food|restaurant/.test(line)) return "Checking nearby dining options…";
  if (/travel|walk|backtrack/.test(line)) return "Comparing travel between stops…";
  if (/alternative|replace|outdoors/.test(line)) return "Looking through saved ideas…";
  if (/move|friday|thursday|later/.test(line)) return "Checking the calendar…";
  if (/rushed|easier|slow/.test(line)) return "Reading how dense the day is…";
  return "Reading this day…";
}

export function noResultAskAi(text: string, offers: AssistantOffer[]): AskAiMessage {
  const fallback = offers[0];
  return {
    id: `ai-empty-${Date.now()}`,
    from: "ai",
    text: "I couldn't find a suitable option in the current trip ideas. Broaden the ask, or keep the current plan.",
    options: fallback
      ? [
          { id: fallback.intent, label: fallback.label, intent: fallback.intent },
          { id: "keep", label: "Keep current plan", prompt: "Keep the current plan." },
        ]
      : [{ id: "keep", label: "Keep current plan", prompt: "Keep the current plan." }],
  };
}

export function appliedAskAi(note: { title: string; lines: string[] }): AskAiMessage {
  return {
    id: `ai-applied-${Date.now()}`,
    from: "ai",
    text: [note.title, ...note.lines].join("\n\n"),
    options: [
      { id: "undo", label: "Undo", prompt: "__undo__" },
      { id: "refine", label: "Continue refining", prompt: "Continue refining this day." },
    ],
  };
}

export function choicesIntro(set: AssistantChoiceSet): AskAiMessage {
  return {
    id: `ai-choices-${Date.now()}`,
    from: "ai",
    text: `${set.heading}\n\n${set.detail}`,
  };
}

/**
 * Deterministic reply when a plan or choice set was not produced.
 * Same day + same line → same next question.
 */
export function replyToAskAi(
  text: string,
  offers: AssistantOffer[],
  prior: AskAiMessage[],
): AskAiMessage {
  const line = text.trim().toLowerCase();
  if (/keep the current plan|continue refining/.test(line)) {
    return {
      id: `ai-${prior.length + 1}`,
      from: "ai",
      text: "Keeping this plan. Ask to move, replace, add or rebalance anything.",
      options: offers.slice(0, 3).map((offer) => ({
        id: offer.intent,
        label: offer.label,
        detail: offer.detail,
        intent: offer.intent,
      })),
    };
  }

  const clash = offers.some((offer) => offer.intent === "resolve-overlap");
  const gap = offers.some((offer) => offer.intent === "fill-gap");
  const air = offers.some((offer) => offer.intent === "rebalance");

  if (/clash|overlap|conflict/.test(line) && clash) {
    const option = optionFor(offers, "resolve-overlap");
    return {
      id: `ai-${prior.length + 1}`,
      from: "ai",
      text: "I can unstick the overlap without deleting anything. You'll see the exact shift before it lands.",
      options: option ? [option] : undefined,
    };
  }

  if ((/slow|rushed|easier|packed/.test(line) && air) || (/gap|fill|afternoon/.test(line) && gap)) {
    const intent = /slow|rushed|easier|packed/.test(line) ? "rebalance" : "fill-gap";
    const option = optionFor(offers, intent);
    return {
      id: `ai-${prior.length + 1}`,
      from: "ai",
      text:
        intent === "rebalance"
          ? "I can give the day air — move or drop one stop. Nothing lands until you apply it."
          : "There's a free stretch that can take a real stop from your ideas.",
      options: option ? [option] : undefined,
    };
  }

  return {
    id: `ai-${prior.length + 1}`,
    from: "ai",
    text: clash
      ? "Should I fix the clash first, or is there something you'd rather add?"
      : gap
        ? "Fill the free stretch, add dinner, or keep it as breathing room?"
        : "Move something, replace a stop, or make the day less rushed — which is the actual problem?",
    options: offers.slice(0, 3).map((offer) => ({
      id: offer.intent,
      label: offer.label,
      detail: offer.detail,
      intent: offer.intent,
    })),
  };
}
