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
  owner: "Organiser",
  editor: "Traveller",
  advisor: "Advisor",
  viewer: "Observer",
};

export const ROLE_NOTES: Record<Traveller["role"], string> = {
  owner: "Created the trip, can change anything",
  editor: "Going on the trip, can edit the plan",
  advisor: "Helping plan, not travelling",
  viewer: "Can follow along, cannot edit",
};

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
export function connectionAsTraveller(connection: Connection): Traveller {
  return {
    id: connection.id,
    name: connection.name,
    initials: connection.initials,
    colorIndex: connection.colorIndex,
    role: "editor",
    online: false,
  };
}
