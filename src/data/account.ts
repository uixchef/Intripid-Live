import type {
  AccountUser,
  AppNotification,
  Connection,
  EditorialFeature,
  SavedDestination,
} from "@/lib/types";

/**
 * The seeded account.
 *
 * Deterministic in content AND in time: nothing here is computed from today's
 * date, so the dashboard means the same thing whenever it is opened. Ages on
 * notifications are stored as text for the same reason.
 *
 * Coherence with the rest of the product:
 *  - London is the home city because Discovery's origin list already marks
 *    London as "Home", and the seeded New York recommendation was computed
 *    from London. One traveller, one origin, across all three surfaces.
 *  - The persona's interests, styles and budget are the same values the NYC
 *    trip records in `fromDiscovery`, so the dashboard is describing the
 *    person who would have produced that trip.
 *  - Connection ids match the planner's traveller ids, so the same four
 *    people are the same four people in both places.
 */

export const ACCOUNT_USER_ID = "u-sarthak";

export const ACCOUNT_USER: AccountUser = {
  id: ACCOUNT_USER_ID,
  name: "Sarthak Goyal",
  handle: "uixchef",
  initials: "SG",
  /* 4 keeps him off the four colours the planner's travellers already own. */
  colorIndex: 4,
  homeCity: "London",
  homeCountry: "United Kingdom",
  memberSinceIso: "2023-11-02",
  stats: {
    wishlist: 32,
    visited: 24,
    /*
     * Places ruled out. The original dashboard showed this alongside wishlist
     * and visited, and it is the most distinctive of the three: a recommender
     * that knows where you will not go is more useful than one that only
     * knows where you might.
     */
    avoid: 9,
  },
  persona: {
    summary:
      "Walks first, books second. Sarthak plans a spine for each day — one thing that has to happen — and leaves the rest open enough to follow a street that looks interesting. Prefers early mornings in a neighbourhood before it fills up, eats where the queue is local, and would rather see one museum properly than three badly.",
    pace: "moderate",
    interests: ["museums", "architecture", "coffee", "fine-dining", "markets"],
    styles: ["city", "culture", "food"],
    budget: "premium",
    updatedIso: "2026-08-21",
    /*
     * Read as product rather than decoration, the original dashboard's four
     * badge-like circles sit where the standing inputs to every
     * recommendation belong. So these are not achievements: each one states
     * what it causes Intripid to do differently, which is the only reason a
     * traveller should care that it is on their profile.
     */
    traits: [
      {
        id: "early-riser",
        label: "Early riser",
        effect: "Days start at 8, and mornings get the busiest sights",
        channel: "orange",
      },
      {
        id: "walkable",
        label: "Prefers walking",
        effect: "Ranks cities you can cross on foot, and keeps stops close",
        channel: "teal",
      },
      {
        id: "one-anchor",
        label: "One anchor a day",
        effect: "Schedules a single fixed commitment, then leaves room",
        channel: "purple",
      },
      {
        id: "no-resorts",
        label: "Rules out resorts",
        effect: "Filters out anywhere that only works as a package",
        channel: "pink",
      },
    ],
  },
};

/* -------------------------------------------------------------------------- */
/* Connections                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The dashboard end of the planner's collaboration model.
 *
 * The ids are the planner's traveller ids on purpose: opening the New York
 * trip shows the same four people, with the same avatar colours. The history
 * line is what makes the list worth having — it is the answer to "why is this
 * person being suggested", which a bare avatar grid never gives you.
 */
export const CONNECTIONS: Connection[] = [
  {
    id: "t-maya",
    name: "Maya Rasheed",
    initials: "MR",
    colorIndex: 0,
    history: ["Five days in New York", "Copenhagen weekend"],
    onCurrentTrip: true,
  },
  {
    id: "t-danny",
    name: "Danny Okonkwo",
    initials: "DO",
    colorIndex: 1,
    history: ["Five days in New York", "Marrakesh, off the grid"],
    onCurrentTrip: true,
  },
  {
    id: "t-priya",
    name: "Priya Venkatesan",
    initials: "PV",
    colorIndex: 2,
    history: ["Five days in New York", "Tokyo in blossom season"],
    onCurrentTrip: true,
  },
  {
    id: "t-jonas",
    name: "Jonas Lindqvist",
    initials: "JL",
    colorIndex: 3,
    history: ["Five days in New York", "Reykjavík in the dark"],
    onCurrentTrip: true,
  },
  {
    id: "c-nina",
    name: "Nina Okafor",
    initials: "NO",
    /* 4 and 5 match the planner's own connection list, so the same person is
       never two different colours across the two surfaces. */
    colorIndex: 4,
    history: ["Lisbon, 2024"],
    onCurrentTrip: false,
  },
  {
    id: "c-theo",
    name: "Theo Lindqvist",
    initials: "TL",
    colorIndex: 5,
    history: ["Tokyo in blossom season"],
    onCurrentTrip: false,
  },
];

/* -------------------------------------------------------------------------- */
/* Notifications                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Every notification resolves to somewhere in the product.
 *
 * That is the whole rule, and it is why there are four rather than twenty:
 * a dashboard notification that cannot be acted on is a badge that makes you
 * feel behind for no reason.
 */
export const NOTIFICATIONS: AppNotification[] = [
  {
    id: "n-clash",
    kind: "advisor",
    title: "Thursday has a clash",
    detail:
      "Klimt at the Neue Galerie overlaps Madison Avenue by 90 minutes. The advisor has a fix ready.",
    age: "2h",
    href: "/trip/nyc-spring",
    read: false,
  },
  {
    id: "n-danny",
    kind: "collaboration",
    title: "Danny added the Village Vanguard",
    detail: "Friday, 8:30pm. He has left the second set unbooked.",
    age: "5h",
    href: "/trip/nyc-spring",
    read: false,
  },
  {
    id: "n-blossom",
    kind: "season",
    title: "Tokyo's blossom window is closing",
    detail:
      "Peak is late March. If it matters this year, the decision needs making in the next few weeks.",
    age: "2d",
    href: "/discover",
    read: true,
  },
  {
    id: "n-priya",
    kind: "collaboration",
    title: "Priya is no longer on Saturday's dinner",
    detail: "She has flights that afternoon. The table is still for four.",
    age: "4d",
    href: "/trip/nyc-spring",
    read: true,
  },
];

/* -------------------------------------------------------------------------- */
/* Editorial                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * One feature, pointed back into the product.
 *
 * The original dashboard ran a Cherry Blossom news card. The idea is kept and
 * the framing is changed: this is not news, it is a window that is closing,
 * and the only reason to put it on someone's home screen is that Discovery
 * can act on it while it is still open.
 */
export const EDITORIAL: EditorialFeature = {
  id: "e-blossom",
  destinationId: "tokyo",
  eyebrow: "Worth travelling for",
  headline: "Tokyo, in the ten days the blossom holds",
  body:
    "Hanami is not a month, it is about ten days, and they move by up to two weeks a year. Go in that window and the parks stay open past dark with the trees lit; miss it by a week and you have an ordinary — still very good — trip to Tokyo.",
  window: "Late March into early April",
  because: "You rank cities on museums and food, and Tokyo leads on both",
};

/* -------------------------------------------------------------------------- */
/* Saved                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Kept for later.
 *
 * This is what the original dashboard's "Weekend Getaways — Coming Soon"
 * poster becomes. A locked panel advertising a feature that does not exist
 * costs a permanent slot on the busiest screen in the product and gives
 * nothing back; the same slot holding the places you have already shown
 * interest in is immediately useful and needs no new backend.
 */
export const SAVED_DESTINATIONS: SavedDestination[] = [
  {
    destinationId: "lisbon",
    reason: "Saved from Discovery — matched on food and walkability",
    window: "March to June",
  },
  {
    destinationId: "copenhagen",
    reason: "Maya suggested it after the last trip",
    window: "May to August",
  },
  {
    destinationId: "oaxaca",
    reason: "Saved for the markets",
    window: "October to April",
  },
];
