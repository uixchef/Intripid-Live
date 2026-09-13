import type { Connection, Traveller } from "./types";

/**
 * Shared collaboration vocabulary.
 *
 * These records used to be module-private inside the planner's
 * `collaborators.tsx`. The dashboard needs the same words — a person who is
 * an "Advisor" in the planner cannot be a "Helper" on the home screen — and
 * the only way two surfaces stay honest about that is to read from one place.
 * Promoting them changes no rendering; it just removes the opportunity to
 * paraphrase.
 */

export const ROLE_LABELS: Record<Traveller["role"], string> = {
  owner: "Organizer",
  "co-owner": "Co-organizer",
  editor: "Traveler (can edit)",
  advisor: "Travel advisor",
  viewer: "Traveler (view only)",
};

export const ROLE_NOTES: Record<Traveller["role"], string> = {
  owner: "Created the trip, can change anything",
  "co-owner": "Helps run the trip, can change almost anything",
  editor: "Going on the trip, can edit the plan",
  advisor: "Helping plan, not travelling",
  viewer: "Can follow along, cannot edit",
};

export const ASSIGNABLE_ROLES: Traveller["role"][] = [
  "co-owner",
  "editor",
  "advisor",
  "viewer",
];

export function canManageRoles(role: Traveller["role"]): boolean {
  return role === "owner" || role === "co-owner";
}

/** Organizer is always first — guest lists and party chips, not the dock. */
export function withOrganizerFirst(travellers: Traveller[]): Traveller[] {
  const organizer = travellers.find((person) => person.role === "owner");
  if (!organizer) return travellers;
  return [organizer, ...travellers.filter((person) => person.id !== organizer.id)];
}

/** Advisors help plan. They are not in the party on the ground. */
export function isPartyMember(person: Traveller): boolean {
  return person.role !== "advisor";
}

export function partyTravellers(travellers: Traveller[]): Traveller[] {
  return travellers.filter(isPartyMember);
}

/**
 * Faces on the 48px dock.
 *
 * The account chip in the top bar is already "you", so the session user is
 * omitted here. A travel advisor sits first — immediately under that chip —
 * with the organizer next unless the organizer is you. Shared-view pins and
 * the rest of the party follow. Overflow collapses into +N.
 */
export function dockVisibleTravellers(
  travellers: Traveller[],
  pinIds: string[] = [],
  cap = 4,
  meId: string | null = null,
): { shown: Traveller[]; hidden: Traveller[] } {
  const pool = travellers.filter((person) => person.id !== meId);
  const advisors = pool.filter((person) => person.role === "advisor");
  const advisorIds = new Set(advisors.map((person) => person.id));
  const organizer = pool.find((person) => person.role === "owner") ?? null;
  const rest = pool.filter(
    (person) =>
      !advisorIds.has(person.id) && person.id !== organizer?.id,
  );
  const pin = new Set(pinIds);
  const promoted = rest.filter((person) => pin.has(person.id));
  const others = rest.filter((person) => !pin.has(person.id));
  const ordered = [
    ...advisors,
    ...(organizer ? [organizer] : []),
    ...promoted,
    ...others,
  ];
  if (ordered.length <= cap) return { shown: ordered, hidden: [] };
  return {
    shown: ordered.slice(0, cap),
    hidden: ordered.slice(cap),
  };
}

/**
 * A `Connection` in the shape `Avatar` needs.
 *
 * `Avatar` is typed against `Traveller` because in the planner every avatar IS
 * a traveller on the open trip. A connection is a weaker thing — someone you
 * have travelled with, who may not be on any current trip — so it carries no
 * role and no presence. Rather than widen the shared primitive (and invite
 * every caller to pass half an object), the two fields the avatar contract
 * requires are supplied here, once, with the reason stated:
 *
 *  - `role: "editor"` is the neutral choice; nothing renders it in this path.
 *  - `online: false` because connection presence is not modelled. Showing a
 *    live dot we cannot substantiate would be the one dishonest pixel on the
 *    screen.
 */
export function isPendingRequest(person: Connection) {
  return person.invite === "sent" || person.invite === "received";
}

export function isConfirmedConnection(person: Connection) {
  return !isPendingRequest(person);
}

export function connectionAsTraveller(connection: Connection): Traveller {
  return {
    id: connection.id,
    name: connection.name,
    initials: connection.initials,
    photoUrl: connection.photoUrl,
    colorIndex: connection.colorIndex,
    role: "editor",
    online: false,
  };
}
