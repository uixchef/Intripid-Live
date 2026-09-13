import type { AssistantPlan } from "@/lib/types";
import type { AssistantOffer } from "@/lib/trip/assistant";

export type AskAiOption = {
  id: string;
  label: string;
  detail?: string;
  /** Run a day plan if the traveller picks this. */
  intent?: AssistantPlan["intent"];
  /** Send this as the traveller's next line. */
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
};

function hasIntent(offers: AssistantOffer[], intent: AssistantPlan["intent"]) {
  return offers.some((offer) => offer.intent === intent);
}

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

/** First turn: the assistant asks, based on what it already sees. */
export function openingAskAi(
  reading: AskAiReading,
  offers: AssistantOffer[],
): AskAiMessage {
  const options = [
    optionFor(offers, "resolve-overlap"),
    optionFor(offers, "fill-gap"),
    optionFor(offers, "rebalance"),
  ].filter(Boolean) as AskAiOption[];

  const free =
    reading.freeMinutes >= 60
      ? `About ${Math.round(reading.freeMinutes / 60)}h still unscheduled.`
      : reading.freeMinutes > 0
        ? `${reading.freeMinutes} minutes still open.`
        : "The day is fully booked.";
  const pressure =
    reading.errorCount > 0
      ? `${reading.errorCount === 1 ? "One clash" : `${reading.errorCount} clashes`} to unstick.`
      : reading.warningCount > 0
        ? "A few hops are tighter than they should be."
        : "Nothing is actually breaking.";

  const text = `I've looked at ${reading.label} — ${reading.stops} ${reading.stops === 1 ? "stop" : "stops"}. ${pressure} ${free}\n\nTell me what you want the day to feel like, or pick a move and I'll show a proposal you can take or leave.`;

  return {
    id: "ai-open",
    from: "ai",
    text,
    options: [
      ...options,
      {
        id: "describe",
        label: "Something specific",
        detail: "A neighbourhood, a meal, a slower morning…",
        prompt: "I have something specific in mind.",
      },
    ].slice(0, 4),
  };
}

/**
 * Deterministic reply. Same day + same line → same next question or plan.
 * The chat exists to narrow, then hand off to a reviewable plan.
 */
export function replyToAskAi(
  text: string,
  offers: AssistantOffer[],
  prior: AskAiMessage[],
): AskAiMessage {
  const line = text.trim().toLowerCase();
  const asked = prior.filter((msg) => msg.from === "ai").length;

  const clash = hasIntent(offers, "resolve-overlap");
  const gap = hasIntent(offers, "fill-gap");
  const air = hasIntent(offers, "rebalance");

  const wantsFood = /food|eat|dinner|lunch|breakfast|restaurant|hungry|cuisine/.test(
    line,
  );
  const wantsNight = /night|bar|drink|cocktail|club|late/.test(line);
  const wantsSlow = /slow|air|tired|packed|pace|relax|quiet|breath|easier/.test(
    line,
  );
  const wantsWalk = /walk|commute|travel|too much moving|distance/.test(line);
  const wantsFix = /clash|overlap|conflict|stuck|double/.test(line);
  const wantsFill = /gap|free|empty|fill|nothing to do/.test(line);
  const affirms = /^(yes|yeah|yep|ok|okay|that|do it|go ahead|please)\b/.test(line);
  const specific = /i have something specific/.test(line);

  const lastIntent = [...prior]
    .reverse()
    .flatMap((msg) => msg.options ?? [])
    .find((opt) => opt.intent)?.intent;

  if (affirms && lastIntent && hasIntent(offers, lastIntent)) {
    return {
      id: `ai-${prior.length + 1}`,
      from: "ai",
      text: "I'll put that together as a proposal — nothing lands until you apply it, and you can take the changes one at a time.",
      options: [
        {
          id: lastIntent,
          label: "Show the proposal",
          intent: lastIntent,
        },
      ],
    };
  }

  if (specific) {
    return {
      id: `ai-${prior.length + 1}`,
      from: "ai",
      text: "Say it in a line. A neighbourhood, a kind of food, a slower morning, or a stop you'd drop — I'll aim the next move there.",
    };
  }

  if (wantsFix && clash) {
    return {
      id: `ai-${prior.length + 1}`,
      from: "ai",
      text: "I can unstick the overlap without deleting anything. The later stop moves so both still happen — you'll see the exact shift before it lands.",
      options: [optionFor(offers, "resolve-overlap")!],
    };
  }

  if ((wantsFill || wantsFood || wantsNight) && gap) {
    return {
      id: `ai-${prior.length + 1}`,
      from: "ai",
      text: wantsFood
        ? "There's a free stretch that can take a real meal, not a squeeze. Sit-down, or something you can walk between stops?"
        : "I can drop one of your saved ideas into that free stretch so it actually fits the day. Want to see the fit first?",
      options: [
        optionFor(offers, "fill-gap")!,
        {
          id: "sitdown",
          label: "Sit-down",
          prompt: "A proper sit-down meal, not a grab and go.",
        },
        {
          id: "quick",
          label: "Something quick",
          prompt: "Something quick between stops.",
        },
      ].filter(Boolean) as AskAiOption[],
    };
  }

  if ((wantsSlow || wantsWalk) && air) {
    return {
      id: `ai-${prior.length + 1}`,
      from: "ai",
      text: "I can give the day air — shorten a block or open a hop so you're not stacked. Nothing is dropped unless you apply it.",
      options: [optionFor(offers, "rebalance")!],
    };
  }

  if (wantsFood && !gap) {
    return {
      id: `ai-${prior.length + 1}`,
      from: "ai",
      text: "This day is already full, so a meal has to replace something or the pacing has to open up. I can make room — or you name the stop you'd swap.",
      options: [
        optionFor(offers, "rebalance"),
        {
          id: "swap",
          label: "I'd drop a stop",
          prompt: "I'd rather drop a stop to make room for dinner.",
        },
      ].filter(Boolean) as AskAiOption[],
    };
  }

  if (asked >= 3) {
    const fallback = offers[0];
    return {
      id: `ai-${prior.length + 1}`,
      from: "ai",
      text: fallback
        ? `From what you've said, the strongest move is ${fallback.label.toLowerCase()}. I'll show the proposal so you can check it against the calendar.`
        : "I don't have a structural change from that yet. Name a stop or a time of day and I'll aim there.",
      options: fallback
        ? [{ id: fallback.intent, label: fallback.label, intent: fallback.intent }]
        : undefined,
    };
  }

  return {
    id: `ai-${prior.length + 1}`,
    from: "ai",
    text: clash
      ? "Should I fix the clash first, or is there something you'd rather add instead?"
      : gap
        ? "Food, a quieter stretch, or keep the free time as breathing room?"
        : "Slower pace, a better meal, or less walking — which is the actual problem?",
    options: [
      optionFor(offers, "resolve-overlap"),
      optionFor(offers, "fill-gap"),
      optionFor(offers, "rebalance"),
      {
        id: "more",
        label: "Something else",
        prompt: "It's something else — I'll explain.",
      },
    ].filter(Boolean) as AskAiOption[],
  };
}
