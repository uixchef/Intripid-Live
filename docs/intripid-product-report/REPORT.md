# Intripid Live — Complete Product Report

> **Purpose:** Factual, end-to-end audit of the Intripid Live frontend as it exists today. Source material for a portfolio case study. Not a redesign, not a critique, not marketing. Every claim is verified against the running product at `http://localhost:3000` and the source code.

> **Date:** 13 September 2026  
> **Commit:** `05391df` — "Baseline: preserve current Intripid implementation"  
> **Branch:** `visual-refinement`  
> **Dev server:** `http://localhost:3000` (`npm run dev`)  
> **Screenshots:** 55 captured at 1440×900 (desktop) and 390×844 (mobile)

---

## Provenance Legend

| Label | Meaning |
|-------|---------|
| **A — Historical** | Originated from Sarthak's actual Intripid work |
| **B — Reconstructed** | Built in Intripid Live to recreate/demonstrate the original thinking |
| **C — Presentation** | Introduced so the experience works as a portfolio demo |
| **D — Simulated/Seeded** | Looks like live backend/AI but is locally generated, seeded, deterministic |
| **Needs confirmation** | Repository cannot establish truth; Sarthak must confirm |

---

## PART 1 — Executive Product Summary

### What is Intripid?

Intripid is a travel planning product combining AI-driven destination discovery with a collaborative, calendar-first trip planner. The core thesis: **you should not have to know where to go before the product helps you decide.** Destination is an output, not an input. (A)

### What problem does this demonstrate?

1. **Recommendation without a destination field.** The product asks "when, from where, how far, what's your budget, what must you have, what do you like to do?" and ranks destinations against those answers. (A)

2. **Planning as a timeline, not a list.** The planner is a calendar — days as columns, hours as rows, activities as draggable cards. The map sits beside it. The assistant reads the day and proposes concrete changes. (A, B)

### Major surfaces

| Surface | Route | Purpose |
|---------|-------|---------|
| Landing | `/` | Doorway: dates into planner, or discovery |
| Dashboard | `/dashboard` | Returning traveller's home: identity, trips, persona, leaderboard |
| Discovery | `/discover` | Full-screen map, 6 questions, 3 recommendations |
| Planner | `/trip/[tripId]` | Calendar + map + advisor + collaboration |

### Canonical journey

```
Landing → Discovery (6 questions) → Shortlist (3) → Brief → Planner
                                                          ↓
                                            Calendar + Map + Advisor + Travellers
```

### Interactive vs simulated

- **Fully interactive:** All discovery questions, map, recommendation generation, shortlist navigation, entire planner (calendar, drag/drop, editing, map, advisor, ideas, travellers, chat), dashboard, landing
- **Simulated:** All data is seeded (D). No backend, no database, no API server. The recommendation engine is deterministic frontend logic (`src/lib/discovery/scoring.ts`). The advisor is deterministic (`src/lib/trip/assistant.ts`, `src/lib/trip/ai-chat.ts`). The session is a local mock (`src/stores/session-store.tsx`). Collaboration is visual only — no real-time multi-user backend.

### Why this is interesting for product design

1. **Destination is an output** — the product never asks where you want to go (A)
2. **Three recommendations, not a catalogue** — deliberately capped at 3 (A)
3. **Recommendations explain themselves** — reasons are phrased against each other, not in isolation (B)
4. **Planner is a calendar** — activities positioned in time, conflicts and gaps are first-class (A)
5. **Assistant proposes, never executes** — every suggestion is reviewable with narrated reasoning (A)

---

## PART 2 — Information Architecture

### Routes

| Route | Screen | Goal | Key actions | Exits |
|-------|--------|------|-------------|-------|
| `/` | Landing | Start | Date entry, Build trip, Explore, Sign in | `/trip/draft`, `/discover`, `/dashboard` |
| `/dashboard` | Dashboard | See trips, persona | Edit persona, open trip, new trip, leaderboard, settings | `/trip/[id]`, `/discover` |
| `/discover` | Discovery | Find where to go | Answer 6 questions, view 3 recs, open brief | `/trip/[destId]` |
| `/trip/[tripId]` | Planner | Plan the trip | Drag/drop, edit, ask AI, invite, chat, map | `/dashboard` |

### State-driven surfaces

Planner view (`day`/`week`/`four`/`trip`/`itinerary`) lives in the trip store, persisted to localStorage. Discovery stage (`intro`/`questions`/`processing`/`results`) is managed by the discovery store. Neither is URL-driven. (B)

### Persistent navigation

- **Landing:** Logo (home), Sign in (dashboard)
- **Dashboard:** Logo (home), notifications bell, profile menu
- **Discovery:** Back link, Logo
- **Planner:** Back link, Logo, search, notifications, settings, view menu, account

### Desktop/mobile differences

- Dashboard: two-column → single column, sections reordered
- Discovery: map + side console → map + bottom sheet with toggle
- Planner: calendar + right rail → single column with segmented control (schedule/map/list), tools in sheets

---

## PART 3 — Canonical End-to-End Journey

### Step 1 — Landing

![Landing desktop](./screenshots/01-landing-desktop.png)

Full-viewport hero image. Intripid logo top-left, Sign in top-right. Centred: social-proof badge with collaborator avatars, headline "Discover, plan and *enjoy*", date range field (14–18 Apr 2026), "Build trip" button, and "Help me explore!" button.

Clicking "Help me explore" navigates to `/discover`.

**Component:** `src/features/landing/landing.tsx`  
**Provenance:** Two-doors pattern (A), hero image (C), avatars from seeded trip (D)

### Step 2 — Discovery: Dates

![Discovery dates desktop](./screenshots/03-discovery-01-dates-desktop.png)

Full-screen Mapbox globe (lavender-tinted). Frosted white console on the right. "Step 1 of 6" with progress bar. Question: "First, when do you want to travel?" Segmented control: Specific dates (selected), I'm flexible, This weekend. Dates pre-filled: 14–18 Apr 2026, "4 nights away."

![Discovery dates mobile](./screenshots/03-discovery-01-dates-mobile.png)

Mobile: console is a bottom sheet below the map. Toggle switches between map and questions.

**Flexible mode** shows month selector + nights stepper:

![Flexible dates](./screenshots/03b-discovery-01-dates-flexible-desktop.png)

**Weekend mode** asks "How do you define the weekend?" with Fri–Sun, Sat–Mon, Sat–Sun options:

![Weekend dates](./screenshots/03c-discovery-01-dates-weekend-desktop.png)

Any date change immediately recomputes the recommendation set. (D)

**Component:** `src/features/discovery/steps.tsx` → `DatesStep`

### Step 3 — Discovery: Scope

![Discovery scope desktop](./screenshots/04-discovery-02-scope-desktop.png)

"Next, where would you like to explore?" Three radio options: Stay in my home country, Go abroad, No preference. Each has icon, label, blurb. Selecting filters the destination pool immediately.

### Step 4 — Discovery: Origin

![Discovery origin desktop](./screenshots/05-discovery-03-origin-desktop.png)

"From where will you be leaving?" Grid of saved origin cities. London marked as default with a star. "Add a new address" button.

**Confirm loop:** After Continue, camera flies to origin, marker drops, card asks "Did we find you?":

![Origin confirm](./screenshots/05b-discovery-03-origin-confirm-desktop.png)

**Add origin form:** GPS or manual address entry with geocoding:

![Add origin](./screenshots/05c-discovery-03-origin-add-desktop.png)

Origin accuracy silently determines every recommendation, so it is never trusted untyped — the map confirmation is a gate, not decoration. (A)

### Step 5 — Discovery: Budget

![Discovery budget desktop](./screenshots/06-discovery-04-budget-desktop.png)

"Next, what's your budget for this trip?" Four tiers: Backpack, Budget, Premium, Luxury. Each shows a per-day rate for the current front-runner. After selecting, an optional income normaliser appears as a modal:

![Income prompt](./screenshots/06b-discovery-04-income-desktop.png)

"Help us understand what 'Premium' means to you" — optional, can skip. This tunes the cost ceiling. (A)

### Step 6 — Discovery: Experiences (Must-haves)

![Discovery experiences desktop](./screenshots/07-discovery-05-experiences-desktop.png)

"Are there any experiences you must have?" Grouped chips. Selecting chips drip-removes the weakest mismatches (2 per chip, never below 5 survivors). A readout shows "X places ruled out so far."

![Experiences selected](./screenshots/07b-discovery-05-experiences-selected-desktop.png)

### Step 7 — Discovery: Activities

![Discovery activities desktop](./screenshots/08-discovery-06-activities-desktop.png)

"Anything specific you'd like to do?" Grouped activity chips. Same drip-filter behaviour.

![Activities selected](./screenshots/08b-discovery-06-activities-selected-desktop.png)

### Step 8 — Processing

![Processing](./screenshots/09a-discovery-processing-desktop.png)

After "Find my matches", a narrated processing animation plays: "Found 50 · Checking nights against each place → Working out what you can reach → Filtering to what works on premium → Trimming cities that can't deliver..." Each stage reports how many it eliminated. This is real — the filter stages actually ran. (D)

### Step 9 — Shortlist

![Shortlist desktop](./screenshots/09-discovery-shortlist-desktop.png)

Three destinations, not a catalogue. The best match is a full card with score ring, reason, matched-interest chips, and estimated budget. Two runners-up are compact cards with score rings and distinct reasons. Below: "Ruled out" list showing which answer removed each eliminated place. "Adjust your answers" link at the bottom.

The reveal opens on the 3rd match (with confetti), then navigates 3rd → 2nd → 1st. This is a product decision: the set is a sequence, not a catalogue. (A)

### Step 10 — Destination Brief

![Destination brief](./screenshots/10-destination-detail-brief-desktop.png)

Opening a destination shows a full brief: hero image, place name with flag, blurb, tabbed sections (Why here, Scores, Famous attractions, Recommendations, Food & dining), seasonal weather card with trip-window highlight, estimated budget, and footer with prev/next navigation, Adjust, and "Build trip here."

![Brief scores](./screenshots/10b-destination-detail-scores-desktop.png)

The Scores tab shows experience/activity fit as horizontal bars with percentage scores. "View more" expands beyond the first 4.

![Brief attractions](./screenshots/10c-destination-detail-attractions-desktop.png)

Attractions are shown as photo cards with names.

### Step 11 — Trip Planner

![Planner overview](./screenshots/11-planner-overview-desktop.png)

"Build trip here" navigates to `/trip/[destinationId]`. The planner opens with a week view: day columns, hour rows, colour-coded activity cards, commute segments, free-time chips, stay bar at top, map in right rail, and a dock with traveller avatars and tool icons.

---

## PART 4 — Destination Discovery

### Question sequence (from source)

Defined in `src/stores/discovery-store.tsx`:

```
DISCOVERY_STEPS = ["dates", "scope", "origin", "budget", "experiences", "activities"]
```

Six questions, each labelled as "filter" (eliminates) or "rank" (orders):

| Step | Label | Kind | What it does |
|------|-------|------|-------------|
| dates | Dates | filter | Resolves trip window, seasons, duration |
| scope | How far | filter | Domestic, international, or open |
| origin | Origin | filter | Departure point, confirmed on map |
| budget | Budget | filter | Budget tier, optional income normaliser |
| experiences | Must-haves | filter | Drip-removes cities missing must-have styles |
| activities | Activities | filter | Drip-removes cities missing activities |

### Map behaviour

- Mapbox is the entire canvas. Chrome floats on top. (B)
- Initial view: world globe, lavender-tinted style
- As questions are answered, pins are culled in the order the reasoning happened
- Camera flies to origin on confirm, then to destination pins on results
- Map reserves space for the console on desktop (right inset); on mobile the console is below

### Progress model

6-segment progress bar. Each segment fills as the step is answered. The current step is highlighted. Back/forward navigates cleanly — every step reverses. (B)

### Defaults

- Dates: 14–18 Apr 2026 (specific mode), aligned with seeded NYC trip
- Origin: London (from session profile)
- Budget: none selected
- Experiences/activities: none selected

### Validation

- Dates: end must be after start; "Must be after you leave" error
- Origin: must be confirmed on map before proceeding
- Budget: must select a tier to proceed

### Back/forward behaviour

Back is never a lesser action — every step reverses cleanly, including sub-steps (weekend-shape, add-origin, confirm-origin, ports-hunt, dest-hunt, income). From results, Back returns to the activities step.

### How answers affect recommendations

Every answer change calls `recomputeFrom(prefs)` → `recommend(DESTINATIONS, prefs)`, which runs the full two-stage pipeline (filters → rank). The map pins update live, though the user only sees this at results. (D)

### Minimum-question behaviour

`MIN_STEPS_BEFORE_RESULTS = 2`. The user can reach results after answering at least 2 questions. "Find my matches" appears as the primary action on the last step, but the user can also trigger results earlier. (B)

### Loading/generating states

- Ports hunt: after confirming origin, a narrated animation searches for departure ports (5 beats)
- Dest hunt: after budget + income, a narrated animation places destination ports and cities
- Processing: after "Find my matches", a multi-stage narration reports each filter's eliminations

### Error/empty states

If all destinations are eliminated, the engine relaxes to pure ranking and labels results "Closest matches" with "Nothing cleared every must-have." If truly nothing fits, an empty state appears with "Nothing fits those constraints" and an "Adjust the answers" button.

### What was removed/simplified

The `populated` step (Scale preference) exists in the store but is NOT in the `DISCOVERY_STEPS` array — it was removed from the question sequence. (B — needs confirmation for the original reason)

---

## PART 5 — Recommendation Shortlist

### Number of recommendations

Exactly three. `result.top = ranked.slice(0, 3)`. The code comment: "the original concept was to make a recommendation, and handing back nine options is a way of declining to." (A)

### Ordering and ranking

Survivors are ranked by a weighted score over 7 factors:

| Factor | Weight |
|--------|--------|
| Activities | 0.35 |
| Experiences | 0.20 |
| Populated | 0.10 |
| Season | 0.15 |
| Budget | 0.10 |
| Reach | 0.05 |
| Duration | 0.05 |

Weights are normalised over the factors that actually apply. (D)

### Score display

Each card shows a `ScoreRing` with the numeric score (0–100, rounded to 1 decimal). The best match has a 52px ring; runners-up have 38px rings.

### Confidence

`preferenceCompleteness(prefs)` counts how many of 7 preference signals are filled. Mapped to "Low" (<50%), "Fair" (50–80%), "High" (≥80%). (D)

### Reasons

`distinctReasons(result.top)` ensures each card's reason differs. The leader gets its strongest claim (`leadReason`). Each subsequent card gets the factor where it most out-performs the others. This prevents three identical "great for museums" cards. (B)

### Budget/cost information

Each card shows `estimatedBudgetUsd` (nights × daily budget for the selected tier) as "~$X,XXX on the ground."

### Ruled-out destinations

Below the three cards, a "Ruled out" section lists up to 4 eliminated destinations with the reason each was removed: "wrong season for your dates", "outside the range you chose", "too far for the time you have", "over your budget", "missing a must-have", "missing something you want to do." This is the clearest thing the surface says about how it works. (A)

### Card interactions

- Click any card to open the destination brief
- Hover highlights the corresponding map pin
- "Adjust your answers" returns to the experiences step
- Prev/next arrows in the brief navigate 3rd → 2nd → 1st

### What is deterministic vs dynamic

All ranking is deterministic — same inputs always produce the same outputs. No randomness, no external API. (D)

---

## PART 6 — Destination Detail / Brief

### Hero / header

The brief opens with a full-width hero image of the destination. A rank badge (#1, #2, or #3) sits top-left. Below: place name with flag, region, country, and a blurb.

### Score

ScoreRing visible on the shortlist cards. The brief itself shows experience/activity scores as horizontal bars.

### Confidence

Not shown on the brief — only on the shortlist cards via the score ring.

### Cost/budget

Estimated budget shown as "About $X,XXX on the ground for N nights, per person."

### Recommendation reasoning

The "Why you'll love it" section lists 3 destination-specific reasons. These are authored content, not generated. (D — Seeded editorial content)

### Weighted reasons

The Scores section shows activity-level fit scores as bars: e.g., "Street art: 90, Neighborhoods: 90, Street food: 88, Walking tours: 88." These are computed from `destination.interestFit[interest]` × 100. (D)

### Seasonal weather

A weather card shows trip-window-specific high/low temperatures, a "pleasant" percentage, and a 12-month SeasonSpark chart with the trip months highlighted. (D)

### Actions

- Prev/next match navigation (arrows)
- "Adjust" — return to experiences step
- "Build trip here" — navigate to planner

### How the page communicates "Why this destination for this person?"

1. The reason on the card (from `distinctReasons`) is phrased against the other options
2. The "Why you'll love it" section gives authored reasons
3. The Scores section shows quantitative fit against the user's selected interests
4. The seasonal weather card shows whether the timing works
5. The estimated budget shows whether the cost works

### Scoring model

The scoring is deterministic frontend logic in `src/lib/discovery/scoring.ts`. It is NOT a production AI model. The weights are hardcoded. The factors are computed from seeded destination data. (D)

---

## PART 7 — Trip Creation Transition

### Trigger

"Build trip here" button in the destination brief navigates to `/trip/[destinationId]`.

### What persists

- The destination ID is in the URL
- Resolved dates are passed as query params (`?from=...&to=...`)
- The trip store initialises from the destination's attractions, creating a seeded itinerary

### Loading/transition

The planner page loads with a pre-filled itinerary generated from the destination's attractions via `planFromDestination()`. For NYC, the flagship NYC trip (`NYC_TRIP`) is used directly. For other destinations, a fixed plan is generated from the destination's attractions. (D)

### Resulting planner

The planner opens in week view, showing the first week of the trip with seeded activities, a stay bar, and the map in the right rail.

---

## PART 8 — Trip Planner

### Architecture of the screen

![Planner overview](./screenshots/11-planner-overview-desktop.png)

**Top bar:** Back link, trip cover thumbnail, trip name ("Five days in New York"), "This trip" button, month navigation arrows, month picker, search, notifications, settings, view menu, account avatar.

**Day rail:** Horizontal strip of day tabs (Sun 12 → Sat 18), with the active day highlighted. A "+" button creates a new activity.

**Stay bar:** A persistent horizontal bar below the day rail showing the hotel: "The Beekman, a Thompson Hotel · 123 Nassau Street" with check-in/out times.

**Calendar grid:** Days as columns, hours as rows (7 AM – 7 PM visible). Activity cards are positioned by time, colour-coded by category. Commute segments (walk, subway, taxi) appear between cards. Free-time chips show "2h 25m free". Conflict badges (red exclamation) appear on overlapping cards.

**Right rail:** Map by default. Can be swapped to Ask AI, Ideas, Travellers, Roles, or Trip chat via the dock.

**Dock:** Narrow vertical bar with traveller avatars and tool icons (map, AI, ideas, people, roles, chat).

### Views

The planner supports 5 views via the view menu:

1. **Week** (default): 7-day grid
2. **Day:** single full-width column
3. **4 days:** 4-column grid
4. **Trip:** all trip days side by side
5. **Itinerary:** list view, no time grid

![Day view](./screenshots/11b-planner-day-view-desktop.png)

![Itinerary view](./screenshots/11c-planner-itinerary-view-desktop.png)

### Visual system as implemented today

- Light cream background (`#faf8f4`)
- Hairline borders
- Category colour system: each category has a distinct colour (orange for food, purple for museums, teal for parks, pink for nightlife, etc.)
- Activity cards are rounded rectangles with category colour, title, time, and location
- Commute segments are dashed lines with mode icon and duration
- Free-time chips are subtle grey pills
- The stay bar is a light purple horizontal bar
- The map is a Mapbox canvas with photo pins for activities and a house icon for the stay
- Routes between stops are drawn as purple polylines

---

## PART 9 — Calendar Behaviour

### Number of days

Week view: 7 days (Sun–Sat). Day view: 1. Four-day view: 4. Trip view: all trip days (5 for NYC). Itinerary: all days as a list.

### Day headers

Day name + date (e.g., "Tue 14"), with today highlighted. Trip days are marked. A red badge appears on days with conflicts (Friday 17).

### Time format

12-hour format by default (7 AM, 8 AM, ...). Configurable to 24h in settings. Hour height: 56px desktop, 48px short, 36px compact week, 40px compact four-day.

### Seeded activities

The NYC trip has ~30+ activities across 5 days (14–18 April 2026), including:
- Breakfast at Frenchette (Wed 15, 9:15–10:15)
- The Metropolitan Museum of Art (Wed 15, 11:00–13:00)
- Dim sum at Nom Wah Tea Parlour (Wed 15, 13:30–14:30)
- Explore DUMBO (Wed 15, 15:00–17:00)
- Cocktails at Bemelmans (Wed 15, 19:30–21:00)
- The Whitney Museum (Fri 17, 16:00–18:00) — conflict with dinner at I Sodi (Fri 17, 17:45–19:45)

### Activity types/categories

Categories defined in `src/lib/categories.ts`: food, museums, nightlife, parks, walking-tours, shopping, entertainment, transit, stay. Each has a distinct colour.

### Duration and positioning

Activities are positioned by start time and duration. `hourHeight` determines pixels-per-hour. Cards are absolutely positioned within day columns.

### Overlapping activities

The calendar handles overlaps by laying out cards side-by-side within the same time slot. The `layOutDay` function in `src/lib/trip/schedule.ts` computes overlap columns.

### Free slots

Gaps between activities are shown as "Xh Ym free" chips. The "Fill gap" affordance in the advisor can suggest an idea for this slot.

### Selected state

Clicking an activity selects it (purple outline). On desktop, an EventPeek popover appears beside the card with details and edit/delete actions. On mobile, the editor opens as a sheet.

![Activity selected](./screenshots/12-planner-activity-selected-desktop.png)

### Drag behaviour

- `@dnd-kit/core` with PointerSensor (4px distance) and TouchSensor (190ms hold)
- Dragging an activity shows a DragOverlay preview
- Drop targets are day columns (`day:[date]`)
- Drop position is calculated from the translated rect against the column

### Drop behaviour

- Existing items move by delta (relative movement)
- Ideas dropped from the rail get absolute positioning (no existing time)
- Time snaps to 15-minute increments (`SNAP_MIN = 15`)
- Moved item is clamped to [0, 24*60 - duration]

### Conflict detection

Conflicts are computed by `conflictsForDay` in `src/lib/trip/schedule.ts`:
- **Overlap:** two items assigned to the same traveller share time
- **Tight-turnaround:** less travel time than needed between items
- **Impossible-commute:** cannot physically get between two places in time

Stay items are excluded from overlap detection. Pairs with no traveller in common are excluded (group splitting up).

### Conflict state

![Conflict state](./screenshots/13-planner-conflict-desktop.png)

Friday April 17 carries the seeded conflict: The Whitney runs to 18:00 and I Sodi dinner was booked for 17:45. Both are anchored, so "resolve overlap" must make a real choice. Red exclamation badges appear on both cards.

### Hours expansion

If an activity is dragged or created outside the current visible hours, a modal asks "Extend hours?" showing the current and proposed new range. The user can confirm or revert.

### Mobile behaviour

- Single column, swipe to navigate between date ranges
- Segmented control: Schedule / Map / List
- Activities are tappable; editor opens as a bottom sheet
- Week view uses compact 36px hour height (title-only chips)

---

## PART 10 — Activity Detail / Editing

### Opening the editor

- **Desktop:** Click an activity → EventPeek popover → "Edit" button → Popover anchored to the event card
- **Mobile:** Tap an activity → bottom sheet editor
- **Create:** "+" in day rail (desktop) or FAB (mobile) → empty editor

![Activity editor desktop](./screenshots/13-planner-activity-editor-desktop.png)

![Activity editor mobile](./screenshots/13-planner-activity-editor-mobile.png)

### Editable fields

From `src/features/planner/activity-editor.tsx` and the `EditorDraft` type:

| Field | Description |
|-------|-------------|
| Title | Activity name |
| Category | Category selector (food, museums, nightlife, etc.) |
| Kind | Activity, Stay, or Commute |
| Day | Which day of the trip |
| Start time | Time of day |
| Duration | In minutes (for activities) |
| End day | For stays (check-out day) |
| Location | Place name + address (geocoded) |
| Notes/Comment | Opening thought, stored as first comment |
| Booking | Booking/reservation reference |
| Assigned to | Which travellers are attending |
| Commute mode | Walk, subway, taxi, etc. (for commute kind) |

### Save/update

"Save" commits the draft via `commitDraft()`, which either updates the existing item or creates a new one. A toast confirms: "Updated 'X'" or "Added 'X'."

### Delete

Delete opens a confirmation modal ("Remove 'X'?") with a "Don't ask again" option. After deletion, dependent commutes are also removed. A toast confirms: "Removed 'X'."

### Validation

- Title defaults to "Untitled" if empty
- Duration clamped to 15min–12h
- Start time clamped to 0–24h
- Day must be within trip range

### Propagation

Changes propagate to:
- **Calendar:** Card position/size updates immediately
- **Map:** Pins and routes update (if the activity has a place)
- **Context panel:** If the activity is selected, the peek updates
- **Itinerary:** List view reflects the change

---

## PART 11 — Map Coupling

### Where maps appear

1. **Destination Discovery** (`/discover`): Full-screen Mapbox globe as the page canvas
2. **Planner** (`/trip/[id]`): Right rail, default dock panel
3. **Dashboard** (`/dashboard`): Identity map (travel footprint globe, expandable)

### Map style

All maps use Mapbox with a custom lavender-tinted style. The discovery map uses a globe projection; planner and dashboard maps use standard Mercator.

### Discovery map

- Full-screen, globe projection
- Initial bounds: world
- Pins: all destinations start visible, culled as filters run
- Selected marker: camera flies to destination, pin enlarges
- Origin marker: home icon, dropped on confirm
- Hunt animations: ports and cities placed with narrated beats
- Chrome-on-dark: logo and back link switch between white and black based on whether the map behind them is dark or light

### Planner map

![Planner map](./screenshots/15-planner-map-desktop.png)

- Right rail, ~33% width on desktop
- Shows activity pins (circular photos) for the active day
- Stay marked with a house icon
- Route drawn as purple polylines between stops
- Clicking a pin selects the activity in the calendar
- Selecting an activity in the calendar highlights its pin
- "Search places on this trip" search bar at top
- `fitBounds` automatically frames all pins for the day

### Dashboard map

- Identity map in the profile header
- Shows wishlist (blue), visited (green), and avoid (red) pins
- Expandable to full-screen
- Clicking a place opens a planner draft for that location

### Map → list coupling

In the planner, selecting a pin on the map selects the corresponding activity in the calendar and vice versa. The selection source is tracked (`"map"` vs `"calendar"`) so each surface can respond correctly.

### Calendar → map coupling

When the active day changes, the map updates to show that day's activities. When an activity is moved via drag/drop, the map route recalculates.

### Loading state

Mapbox loads asynchronously. The map area shows nothing until the tile load completes. No skeleton or spinner is shown — the map simply appears.

### No-token fallback

If `NEXT_PUBLIC_MAPBOX_TOKEN` is not set, the map components render a fallback (empty div). The rest of the UI continues to work. The token IS configured in `.env.local` and the maps DO work. (D — Token is present, redacted per policy)

### Mobile behaviour

- Discovery: map is the primary view; console is a bottom sheet; toggle switches between map and questions
- Planner: map is a separate tab in the segmented control (Schedule/Map/List); full-width when active
- Dashboard: identity map expands to full-screen

---

## PART 12 — Right-Side Context Rail

### Current tabs (verified from live build)

The planner's right-side dock provides access to these panels via a vertical icon rail:

| Dock action | Panel | Purpose |
|-------------|-------|---------|
| Map | Map | Default — shows the day's activities on Mapbox |
| Ask AI | Advisor | Conversational assistant with day reading and offers |
| Ideas | Idea board | Saved unscheduled ideas, ranked by proximity to route |
| Travellers | People | Trip collaborators, roles, invite |
| Roles | Roles | Role management (owner, co-owner, editor, advisor, viewer) |
| Chat | Trip chat | Comment thread for the trip |

### Map panel

- Default panel when planner opens
- Shows day's activities as pins, route as polylines
- Search bar, clickable pins, stay marker
- Can be closed (dock panel = null) or swapped

### Ask AI panel

![Advisor desktop](./screenshots/14-planner-advisor-desktop.png)

- Opens with a day reading: "I've looked at Tuesday — 6 stops. Nothing is actually breaking. About 4h still unscheduled."
- Offers based on day state: "Fill the gap", "Give the day air", "Something specific"
- Conversation interface with prompt chips and free-text input
- Selecting an offer generates a reviewable plan

### Ideas panel

![Ideas](./screenshots/17-planner-ideas-desktop.png)

- Shows saved ideas (unscheduled suggestions)
- Ranked by proximity to the day's route (`ideasNearRoute`)
- Each idea shows title, category colour, duration, reason
- Can be scheduled (added to calendar) or shared to chat
- Draggable onto the calendar

### Travellers panel

![Travellers](./screenshots/16-planner-travellers-desktop.png)

- Shows all trip travellers with avatars, names, roles, online status
- Invite button opens invite modal
- Click "Show plan" to jump to a traveller's first activity
- Role management: change role (except owner)
- Remove traveller (with confirmation)

### Roles panel

- Dedicated role management view
- Lists all travellers with role dropdowns
- Owner cannot be changed
- Invite button

### Chat panel

![Trip chat](./screenshots/20-planner-chat-desktop.png)

- Comment thread for the trip
- Messages from travellers and advisor
- Can share ideas to chat

### Mobile adaptation

- No persistent right rail on mobile
- Ask AI opens as a bottom sheet (64% height) with expand-to-fullscreen
- Chat opens as a full-screen overlay
- Map is a tab in the segmented control
- Ideas are not directly accessible on mobile (needs confirmation — may be accessible via a different path)

---

## PART 13 — Advisor / Assistant

### Entry

- Click "Ask AI" in the dock (desktop) or the AI FAB (mobile)
- Opens as a right-rail panel (desktop) or bottom sheet (mobile)

### Visual treatment

- AI mark (animated gradient orb) as branding
- Conversation thread with AI turns (left, with mark) and user turns (right)
- Prompt chips below AI messages
- Free-text input at the bottom with send button
- "Thinking" indicator (three dots) while processing

### Prompt/input

- Opening message reads the day: stops, clashes, free time
- Suggested prompts: "Fill the gap", "Give the day air", "Something specific"
- Free text: "Ask anything about this day…"

### Response behaviour

- **Deterministic.** Same trip + same day + same intent always produces the same plan. (D)
- No external AI API is called. The conversation logic is in `src/lib/trip/ai-chat.ts`.
- The reply matches keywords in the user's message to available offers (food, night, slow, walk, fix, fill, etc.)
- After 3 turns, it falls back to the strongest available offer

### What it can change

- **Resolve overlap:** moves the flexible item to a free slot (or another day, or to Ideas if nothing fits)
- **Fill gap:** adds the nearest saved idea to the biggest gap
- **Rebalance:** pushes flexible items later to restore buffers

### What it cannot change

- It cannot delete anything — "remove" means unschedule to Ideas (reversible)
- It cannot add arbitrary activities — only ideas already saved
- It cannot change bookings or anchored items
- It does not call any external API

### Plan panel

When an offer is selected, a plan panel appears:
- Title (e.g., "Resolve the clash")
- Number of changes
- Each change listed with summary and individual "Apply" button
- "Why" section with numbered rationale
- "Apply all" button
- "Not now" / "Close" button
- Applied changes show a "Done" checkmark

### Whether it is real AI

**No.** The assistant is fully deterministic frontend logic. No AI API is called. The conversation is keyword-matched. The plans are computed from the trip state. (D — Deterministic)

### Mobile behaviour

- Opens as a bottom sheet (64% height)
- Expand button opens full-screen
- Same functionality as desktop

---

## PART 14 — Ideas / Recommendations Inside Planner

### How suggestions appear

The Ideas panel in the right rail shows unscheduled ideas. These are seeded in the trip data and can also be created by:
- Unscheduling an activity (moves it to Ideas)
- The assistant's "remove" change (parks it in Ideas)
- Manual addition

### What data they contain

Each idea has: title, category, subtitle, place (name, address, coords), duration, reason, addedBy, costUsd.

### Filtering / ranking

Ideas are ranked by proximity to the day's actual route via `ideasNearRoute()` in `src/lib/trip/assistant.ts`. The closest idea appears first. Ideas without a place are listed last.

### Adding to itinerary

- Click "Schedule" to add the idea to the active day at 10:00 AM
- Drag the idea onto a specific day and time in the calendar
- The idea is removed from the Ideas list and becomes a calendar activity

### Map relation

Ideas with places appear on the map when the Ideas panel is active. Their proximity to the route is the ranking criterion.

### Feedback after adding

- Toast: "Added 'X'"
- The idea disappears from the Ideas list
- The activity appears on the calendar and map

---

## PART 15 — Travellers / Collaboration

### Traveller avatars

The NYC trip has 8 travellers:
1. **Sarthak Goyal** (owner, online) — the seeded user
2. **Maya Rasheed** (co-owner, online)
3. **Danny Okonkwo** (co-owner, online, viewing Village Vanguard)
4. **Priya Venkatesan** (editor, offline)
5. **Jonas Lindqvist** (advisor, online)
6. **Elena Varga** (editor, online)
7. **Tom Hughes** (viewer, offline)
8. **Aisha Rahman** (viewer, offline)

### Presence

Online/offline status is seeded and static. There is no real-time presence backend. (D — Simulated)

### Current user

The session defaults to Sarthak Goyal (authenticated). The user's avatar appears in the dock, top bar, and activity cards.

### Other travellers

Travellers appear on activity cards via `guestsForItem()` — showing who is attending each activity. The `assignedTo` array on each item determines this. Empty array means "everyone."

### Invite UI

- "Invite" button in the Travellers panel opens a modal
- Enter an email address
- A new traveller is created with a name derived from the email
- Toast: "Invited X"
- The new traveller appears in the list with role "editor" and offline status

### Roles

| Role | Can edit | Can manage | Notes |
|------|---------|------------|-------|
| Owner | Yes | Yes | Cannot be changed or removed |
| Co-owner | Yes | Yes | |
| Editor | Yes | No | |
| Advisor | Yes (advisory) | No | Marked with AI badge |
| Viewer | No | No | Read-only |

### Shared view

- "My calendar" shows only the current user's activities
- "Shared view" overlays selected travellers' activities
- Toggle travellers on/off in the shared view
- The dock shows avatar highlights for selected travellers

### Simulated presence

All presence is simulated. There is no WebSocket, no real-time sync, no actual multi-user backend. (D)

### Mobile handling

- Travellers accessible via the dock (not directly visible on mobile)
- Invite and role management work the same way

---

## PART 16 — Conflicts / Warnings / System Feedback

### State inventory

| State | Trigger | Visual | Message | Recovery | Severity | Persistence |
|-------|---------|--------|---------|----------|----------|-------------|
| **Overlap conflict** | Two activities share time for same traveller | Red exclamation badge on both cards | "Two things are booked at once" | Advisor "Resolve clash" | High | Until resolved |
| **Tight turnaround** | Not enough travel time between activities | Red badge | "Transition is tighter than travel allows" | Advisor "Give the day air" | Medium | Until resolved |
| **Impossible commute** | Cannot physically get between places | Red badge | — | Advisor | High | Until resolved |
| **Hours expansion** | Activity moved outside visible hours | Modal | "Extend hours? Current 7 AM – 7 PM → New 6 AM – 11 PM" | Confirm or revert | Medium | Modal |
| **Delete confirmation** | User clicks delete | Modal | "Remove 'X'?" | Confirm or cancel; "Don't ask again" | Medium | Modal |
| **Remove traveller** | User removes a traveller | Modal | "Remove X from trip?" | Confirm or cancel | High | Modal |
| **Empty results** | All destinations eliminated | Empty state | "Nothing fits those constraints" | "Adjust the answers" | High | Until adjusted |
| **Relaxed results** | Some must-haves eliminated all | "Closest matches" label | "We loosened the must-haves rather than show you an empty screen" | Adjust | Medium | Until adjusted |
| **Date invalid** | End before start | Inline error | "Must be after you leave" | Change dates | Medium | Inline |
| **Toast — success** | Action completed | Toast bottom | "Added 'X'" / "Saved" | Auto-dismiss | Info | 3s |
| **Toast — info** | Informational | Toast bottom | "'X' moved to Ideas" | Auto-dismiss | Info | 3s |
| **Toast — warning** | Problem | Toast bottom | — | Auto-dismiss | Warning | 3s |
| **Origin busy** | GPS/address lookup in flight | Spinner on button | "Finding you…" | Wait or manual entry | Info | During lookup |
| **Location error** | GPS denied/failed | Inline error | "Location access was declined" | Manual entry | Medium | Until resolved |
| **Thinking** | Advisor processing | Three-dot animation | — | Wait | Info | ~720ms |
| **Guest state** | Signed out | Full-screen gate | "You're signed out" | Sign in or explore | Info | Until sign-in |

---

## PART 17 — Authenticated Dashboard / Profile

### Full desktop screen

![Dashboard desktop](./screenshots/02-dashboard-desktop.png)

### App shell

- 52px header bar: Logo (left), people icon, notifications bell, profile avatar (right)
- No sidebar, no page frame — the dashboard IS the page
- Two-column layout: main content (left, ~70%) and support column (right, ~30%)

### Profile/banner

The identity block at the top contains:
- **Interactive Mapbox globe** showing travel footprint (wishlist, visited, avoid pins)
- **Avatar** (purple circle with initials "SG", level badge "3")
- **Name:** Sarthak Goyal
- **Handle:** @uixchef
- **Level:** Level 3
- **Buttons:** "Edit profile" (outlined), "Build your travel persona!" (outlined)
- **Badge row:** Achievement seals (4 earned, 3 locked)

### Travel stats

The globe shows: 8 Wishlist, 13 Visited, 9 Avoid. Expandable to full-screen.

### My Travels

![Dashboard travels](./screenshots/02b-dashboard-travels-desktop.png)

- Header: "Share my travels" + "+ New trip" button
- Tabs: All (11), Completed (9), Ongoing (0), Upcoming (2)
- Trip cards with cover image, name, status, dates, traveller avatars
- Upcoming first, then in-progress, then completed most-recent-first
- 5 seeded trips: NYC (upcoming), Lisbon (upcoming), Tokyo (completed), Marrakesh (completed), Copenhagen (completed)

### Build/create trip widget

![Quick trip](./screenshots/02c-dashboard-quicktrip-leaderboard-desktop.png)

- "Start a trip" card in the right column
- Date range field (18–22 Jun 2026)
- "Build trip" button → `/trip/draft`
- "Help me explore!" button → `/discover`

### Article/editorial card

- "Worth Travelling For" card with a featured editorial
- Tokyo cherry blossom article with image and excerpt
- Bookmark functionality (wishlist toggle)

### Weekend-getaway/discovery content

The editorial card serves as discovery content, linking to destination detail or discovery.

### CTAs

- "New trip" floating button (bottom-right)
- "Build trip" in quick-trip panel
- "Help me explore!" in quick-trip panel
- Trip card click → planner

### Role of this surface

This is **both home and profile** — a mixed dashboard/profile. It is the returning traveller's home after authentication, showing identity, travel history, and actions to start something new. (A)

---

## PART 18 — Entry States / Authentication Presentation

### Logged-out user

![Guest state](./screenshots/18-guest-state-desktop.png)

The guest state shows a centred card: "You're signed out" with an explanation that the dashboard is the returning-traveller view. Two actions: "Continue as Sarthak Goyal" (signs in) or "Find where to go instead" (goes to discovery). A note clarifies: "There is no real authentication in this build. The session is a local mock."

![Guest state mobile](./screenshots/18-guest-state-mobile.png)

### Logged-in user

The full dashboard (Part 17). Default state is authenticated as Sarthak Goyal.

### Landing state

The landing page (`/`) is always accessible, regardless of auth state. It has its own "Sign in" button that signs in and navigates to `/dashboard`.

### How the app determines which appears

The session store (`src/stores/session-store.tsx`) defaults to `state: "authenticated"` with `user: ACCOUNT_USER`. This is deliberate — `/dashboard` must be directly visitable for review. Signing out flips to `state: "guest"` and `user: null`, persisted to localStorage. The dashboard checks `sessionState === "guest"` and shows the gate. (D — Simulated auth)

### If auth is simulated

**Yes, auth is entirely simulated.** There is no provider, no token, no password, no server. The session is a local mock using zustand persist. (D)

---

## PART 19 — Responsive Behaviour

### Landing

| Desktop (1440px) | Mobile (390px) |
|------------------|-----------------|
| Full hero, centred content | Same composition, scaled down |
| Features band: side-by-side | Stacked |
| Footer: multi-column | Stacked |

### Dashboard

| Desktop (1440px) | Mobile (390px) |
|------------------|-----------------|
| Two-column layout | Single column |
| Identity → persona → travels (left), quick-trip → leaderboard → editorial (right) | Identity → quick-trip → travels → leaderboard → editorial (reordered) |
| Quick-trip panel in right column | Quick-trip opens as a sheet from FAB |
| Leaderboard visible | Leaderboard below trips |

![Dashboard mobile](./screenshots/02-dashboard-mobile.png)

![Dashboard travels mobile](./screenshots/02b-dashboard-travels-mobile.png)

### Discovery

| Desktop (1440px) | Mobile (390px) |
|------------------|-----------------|
| Map full-screen, console on right | Map full-screen, console as bottom sheet |
| Console width: 428px | Console: full width, bottom sheet |
| Map reserves space for console | Map uses full width |
| Toggle: Map/Questions | Same toggle |
| Results: wider console (up to 50% width) | Results: full-width sheet |

![Discovery mobile](./screenshots/03-discovery-01-dates-mobile.png)

### Planner

| Desktop (1440px) | Mobile (390px) |
|------------------|-----------------|
| Calendar + right rail + dock | Single column |
| Week view: 7 columns | Week view: 7 columns (very compact, 36px hour height) |
| Day view: full-width column | Day view: same |
| Activity editor: popover anchored to card | Activity editor: bottom sheet |
| Advisor: right rail panel | Advisor: bottom sheet (64% height, expandable) |
| Map: right rail | Map: segmented control tab |
| Travellers: dock panel | Travellers: dock panel (accessible via menu) |
| Chat: dock panel | Chat: full-screen overlay |
| Search: inline in top bar | Search: full-screen overlay |
| Settings: workspace overlay | Settings: full-screen |
| Notifications: popover | Notifications: bottom sheet |

![Planner mobile](./screenshots/11-planner-overview-mobile.png)

![Planner advisor mobile](./screenshots/14-planner-advisor-mobile.png)

![Planner map mobile](./screenshots/15-planner-map-mobile.png)

### Mobile decisions that are intentionally different from desktop

1. **Discovery console as bottom sheet** — on a phone the console sits below the map, not beside it. Feeding it the desktop width asked Mapbox to reserve 524px on a 390px map, collapsing the fit. (B)
2. **Planner segmented control** — Schedule/Map/List replaces the desktop's persistent rail. On phones the map was historically demoted behind a floating button, losing the map/schedule coupling. The segmented control fixes this. (B)
3. **Advisor as expandable sheet** — starts at 64% height, expands to full-screen. Desktop uses a persistent rail. (B)
4. **Activity editor as sheet** — desktop uses an anchored popover; mobile uses a full-page sheet. (B)
5. **Dashboard reordering** — quick-trip moves above travels on mobile, because a phone user came to start something, not browse records. (B)
6. **Chrome hiding on scroll** — top bar and FABs hide when scrolling down, reappear on scroll up. (B)
7. **Swipe navigation** — swipe left/right to navigate date ranges in the planner. (B)

---

## PART 20 — Visual Design System

### Typography

- **Primary font:** Inter (sans-serif, variable)
- **Display font:** Familjen Grotesk (with italic style for emphasis like "enjoy")
- **Decorative font:** Travel Pole (custom font for signage/branding elements)
- **Tabular figures:** Used for numbers (times, scores, costs) via `font-variant-numeric: tabular-nums`

### Color system

- **Background:** `#faf8f4` (warm cream)
- **Surface:** White with hairline borders (`rgba(0,0,0,0.08)`)
- **Primary accent:** Purple (`#7c3aed` family)
- **AI accent:** Animated gradient (purple to pink)
- **Category colours:** Each activity category has a distinct colour:
  - Food: warm orange
  - Museums: purple
  - Parks/gardens: teal/green
  - Nightlife: pink/magenta
  - Walking tours: blue
  - Shopping: amber
  - Entertainment: violet
  - Transit: grey
- **Map:** Lavender-tinted Mapbox style
- **Discovery globe:** Lavender gradient with warm edge glow

### Borders and radius

- **Border:** 1px hairline, `rgba(0,0,0,0.08)` or `rgba(255,255,255,0.12)` on dark
- **Card radius:** 12px
- **Button radius:** 8px (primary), 6px (secondary)
- **Chip radius:** 999px (pill)
- **Console radius:** 16px

### Elevation

- Minimal. Cards use hairline borders, not shadows.
- Popovers and sheets use subtle shadows.
- The only prominent elevation is the discovery console (frosted panel over the map).

### Spacing

- Based on 4px grid
- Page padding: 16px (mobile), 24px (desktop)
- Card padding: 16–20px
- Section gaps: 24–32px

### Card treatment

- White surface, hairline border, 12px radius
- No drop shadow by default
- Selected state: purple outline
- Hover state: subtle background tint

### Buttons

- **Primary:** Purple fill, white text, 8px radius
- **Secondary:** Outlined, 8px radius
- **Ghost:** No background, no border
- **AI:** Gradient fill (purple to pink)
- **Icon buttons:** Circular, ghost variant

### Controls

- **Segmented control:** Pill container with radio buttons
- **Select:** Outline field with dropdown
- **Stepper:** +/- with value display
- **Date range:** Two outline fields side by side
- **Chips:** Pill shape, soft variant for selection, multiple selection

### Calendar cells

- Hour rules: near-invisible horizontal lines
- Day boundaries: one step stronger
- Active hours: subtle shading
- Nothing else draws a line — the grid's job is to disappear

### Activity cards

- Rounded rectangles, category colour as left bar
- Title, time range, location
- Assigned traveller avatars (if not everyone)
- Conflict badge (red exclamation) if overlapping
- Comment indicator if comments exist

### Map styling

- Custom Mapbox style with lavender tint
- Activity pins: circular photos
- Stay pin: house icon
- Route: purple polylines
- Attribution: Mapbox logo (required)

### Iconography

- **Lucide React** icon set
- Consistent stroke width (1.5–2.2px)
- Sized 13–24px depending on context

### What gives THIS product its character

1. **Warm cream background** instead of pure white — gives the product a tactile, paper-like quality
2. **Map-first discovery** — the globe IS the page, not a widget
3. **Category colour system** — activities are immediately scannable by colour
4. **Calendar as the anchor** — the planner is a calendar, not a list with a calendar view
5. **AI mark** — the animated gradient orb gives the assistant a distinct identity
6. **Hairline borders, not shadows** — the product is calm, not flashy
7. **Three recommendations** — the deliberate scarcity communicates confidence

---

## PART 21 — Motion & Microinteractions

### Route transitions

- Page navigations use Next.js client navigation (instant)
- Discovery step transitions: slide x (14px, 0.38s, custom ease)
- Brief match transitions: fade + slide (0.4s, MATCH_EASE)

### Panel transitions

- Console content: AnimatePresence with mode="wait"
- Brief tabs: scroll-spy with smooth scroll
- Advisor plan panel: fade + slide y (0.26s)

### Map movement

- Camera flies to origin on confirm
- Camera flies to destination pins on results
- fitBounds on day change in planner
- Hunt animations: ports and cities placed with narrated beats

### Card selection

- Activity selection: purple outline appears
- Shortlist card hover: subtle background tint
- Map pin hover: corresponding card highlights

### Drag/drop

- DragOverlay shows a preview of the card
- Drop animation: null (instant snap)
- Touch sensor: 190ms hold delay

### Activity movement

- After drag, the card animates to its new position
- Toast confirms the move: "Moved to Thursday 2:00 PM"

### Rail/tab movement

- Dock panel swap: panel content changes
- Mobile segmented control: animated indicator

### Modal/editor transitions

- Popover: anchored, appears beside the event card
- Sheet: slides up from bottom
- Modal: fades in with scrim

### Loading behaviour

- Discovery processing: narrated multi-stage animation
- Ports hunt: sequential beat animation
- Advisor thinking: three-dot animation (720ms)
- Map: loads silently (no skeleton)

### Hover/focus states

- Buttons: background tint on hover
- Cards: subtle background tint on hover
- Inputs: border darkens on focus
- Chips: background fills on selection

### Reduced-motion support

- `MotionConfig reducedMotion="user"` — Motion honours the OS setting
- When reduced: transforms and layout animations drop, only opacity remains
- All animations have reduced-motion fallbacks with shorter durations

---

## PART 22 — Technical Implementation

### Framework and version

- **Next.js 16.3.4** (App Router, Turbopack)
- **React 19.2.8**
- **TypeScript 5**

### State management

- **Zustand 5** with persist middleware
- Three stores: `session-store`, `discovery-store`, `trip-store`
- Each store is instantiated per tree via `createStoreContext` (not module-scoped) to avoid SSR issues
- Persisted state: session (auth state, account settings), trip (itinerary, prefs), nothing for discovery (ephemeral)
- Hydration: `skipHydration: true` with manual rehydration after mount to prevent hydration mismatches

### Routing

- App Router: `/`, `/dashboard`, `/discover`, `/trip/[tripId]`
- `generateStaticParams` for trip pages
- State-driven views within routes (planner view, discovery stage)

### Mapbox integration

- `mapbox-gl 3.30.0`
- Custom map components in `src/components/map/`
- `MapSurface` wrapper with lazy loading
- `MapCanvas` for the actual Mapbox instance
- `MapPins` for custom markers
- Token: `NEXT_PUBLIC_MAPBOX_TOKEN` (configured, redacted)
- No-token fallback: renders empty div, rest of UI works

### Drag/drop library

- `@dnd-kit/core 6.3.1` with modifiers and sortable
- PointerSensor (4px distance) and TouchSensor (190ms hold)
- `pointerWithin` collision detection
- DragOverlay for drag preview

### Animation library

- `motion 13.2.0` (formerly framer-motion)
- `MotionConfig reducedMotion="user"` for accessibility
- AnimatePresence for mount/unmount transitions

### Date utilities

- `date-fns 4.4.0`

### Major component hierarchy

```
app/
  layout.tsx → Providers (MotionConfig, SessionStore, AppNavTracker)
  page.tsx → Landing
  dashboard/page.tsx → Dashboard
  discover/page.tsx → DiscoveryStoreProvider → DiscoveryExperience
  trip/[tripId]/page.tsx → TripStoreProvider → PlannerExperience

features/
  landing/ → Landing, Vista, ExploreCta, DateRangeField
  discovery/ → DiscoveryExperience, DiscoveryMap, Steps, Results, Processing, PortHunt
  planner/ → PlannerExperience, Calendar, EventCard, ActivityEditor, Assistant, 
              PlannerMap, Rail, Collaborators, TripChat, SidePanel, ViewMenu, etc.
  dashboard/ → Dashboard, Identity, PersonaPanel, Travels, QuickTrip, Leaderboard, 
                Editorial, AccountSettings, etc.

components/
  map/ → MapSurface, MapCanvas, MapPins, MapPrimitives
  ui/ → Button, Chip, Avatar, Select, Modal, Sheet, Popover, Toast, Meter
  brand/ → Logo, Mark, AiMark, Hummingbird
  nav/ → BackLink, MobileBack, AppNavTracker

stores/
  session-store.tsx → Auth state, user, notifications, connections, wishlist/visited/avoids
  discovery-store.tsx → Discovery stage, prefs, result, active/hovered IDs
  trip-store.tsx → Trip, prefs, editor, assistant, invite, toast

lib/
  discovery/scoring.ts → Two-stage recommendation engine (filters → rank)
  trip/assistant.ts → Deterministic assistant (resolve-overlap, fill-gap, rebalance)
  trip/ai-chat.ts → Deterministic chat responses
  trip/schedule.ts → Day buckets, conflicts, gaps, routes, overlap layout
  trip/time.ts → Wall-clock time, day keys, formatting
  trip/from-destination.ts → Generate itinerary from destination attractions
  trip/fixed-plan.ts → Generate fixed plan for dashboard trips
  categories.ts → Category metadata, budget tiers, experience/interest groups
  geo.ts → Flight hours, distance, walk minutes
  collaboration.ts → Party travellers, connection-as-traveller
```

### Mock/seed data

| File | Content |
|------|---------|
| `src/data/destinations.ts` | 50+ destination cities with scores, budgets, seasons, attractions |
| `src/data/nyc-trip.ts` | Flagship 5-day NYC trip with 30+ activities, 8 travellers, ideas |
| `src/data/account.ts` | Seeded user (Sarthak Goyal), connections, notifications, wishlist/visited/avoids |
| `src/data/trips.ts` | Trip summaries for dashboard, trip generation functions |
| `src/data/nyc-places.ts` | NYC places with coordinates |
| `src/data/origins.ts` | Saved origin cities |
| `src/data/place-photos.ts` | Photo mapping for destinations and places |

### Deterministic logic

- **Recommendation engine:** `src/lib/discovery/scoring.ts` — two-stage pipeline (hard filters → weighted rank). Same inputs always produce the same outputs. No randomness, no external API.
- **Assistant:** `src/lib/trip/assistant.ts` — three intents (resolve-overlap, fill-gap, rebalance). Computed from trip state. No AI API.
- **Chat:** `src/lib/trip/ai-chat.ts` — keyword-matched responses. Same message always produces the same reply.

### API calls

**None.** There are no external API calls. Mapbox tiles are loaded from Mapbox CDN (the only external dependency). Geocoding uses the browser's `navigator.geolocation` API and Mapbox's geocoding endpoint (if configured). (D)

### Environment variables

| Variable | Purpose | Status |
|----------|---------|--------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox access token | Configured, redacted |

### Loading strategy

- **SSR:** All pages are server-rendered. Stores use `skipHydration: true` to prevent mismatches.
- **Client hydration:** Stores rehydrate after mount via `requestAnimationFrame`.
- **Code splitting:** Next.js automatic, Turbopack bundler.
- **Map lazy loading:** Map components are lazy-loaded within the app.

### Client/server split

- **Server components:** Layout, pages, metadata, sitemap, robots
- **Client components:** All interactive features (discovery, planner, dashboard, landing)
- **Providers:** MotionConfig, SessionStore, AppNavTracker are client-side

### Responsive architecture

- `useIsCompact()` hook: `max-width: 880px` (mobile breakpoint)
- `useIsShort()` hook: `max-height: 720px` (short viewport)
- CSS modules with media queries
- No separate mobile codebase — same components with conditional rendering

---

## PART 23 — What Was Changed / Improved

### Discovery question reduction/simplification

The `populated` (Scale) step was removed from the active question sequence. It still exists in the store and scoring but is not asked. This reduced the flow from 7 to 6 questions. (B — Reconstruction improvement, needs confirmation for original reason)

### Map-first composition

Discovery is a full-screen Mapbox takeover. Chrome floats on top. This is a reconstruction decision — the historical product may have had a different composition. (B — needs confirmation)

### Top-three recommendations

The shortlist is capped at exactly three. The code comment explicitly says this is the original product concept: "handing back nine options is a way of declining to." (A — Historical decision)

### Stronger recommendation reasoning

`distinctReasons()` ensures each card's reason is phrased against the others, not in isolation. This is a reconstruction improvement to prevent three identical "great for museums" cards. (B — Reconstruction improvement)

### Planner moving toward calendar-first interaction

The planner is a calendar, not a list with a calendar view. Activities are positioned in time, conflicts and gaps are first-class, and the map sits beside the calendar, not behind it. (A — Historical decision)

### Google Calendar-like functional clarity

The calendar grid uses the same visual vocabulary as Google Calendar: hour rules, day boundaries, activity cards positioned by time, drag/drop, snapping to 15-minute increments. (B — Reconstruction decision)

### Right-side contextual rail

The dock provides persistent access to map, advisor, ideas, travellers, roles, and chat. This is a reconstruction decision — the historical product may have used modals or a different pattern. (B — needs confirmation)

### Category treatment

Each activity category has a distinct colour. Activities are immediately scannable by colour. (B — Reconstruction decision)

### Drag/drop

Full drag/drop with @dnd-kit: pointer and touch sensors, snapping, conflict detection, hours expansion. (B — Reconstruction decision)

### Map coupling

Map and calendar are bidirectionally coupled: selecting in either surface highlights in the other. (A — Historical decision, B — Reconstruction implementation)

### Advisor

The assistant is deterministic, not a chatbot. It reads the day, finds a specific problem, and proposes a reviewable plan. (A — Historical decision, D — Deterministic implementation)

### Travellers/collaboration

Traveller avatars, roles, presence, and invite are seeded. Shared view overlays selected travellers' activities. (A — Historical concept, D — Simulated implementation)

### Dashboard

The dashboard is a mixed profile/home surface with identity, persona, trips, leaderboard, and editorial. (A — Historical concept)

### Mobile behaviour

Mobile uses a segmented control (Schedule/Map/List) instead of a floating map button. Discovery uses a bottom sheet. Advisor is an expandable sheet. (B — Reconstruction improvement)

### Any removed UI

See Part 24.

---

## PART 24 — What Was Deliberately Removed

### Evidence from git history and code comments

1. **Populated/Scale question** — exists in the store (`PopulatedStep` component exists in `steps.tsx`) but is NOT in `DISCOVERY_STEPS`. Removed from the question sequence. (B) — *Why: reduced friction without losing the ranking signal, since populated is still used as a rank factor.*

2. **Previous landing page argument** — the code comment says: "The previous version of this page argued its case — a three-point premise list, a live worked example, a journey strip — and every one of those was true and useful and belonged further down the funnel." Removed in favour of a single hero with two doors. (B) — *Why: someone arriving cold doesn't read an argument; they decide in a second whether this looks like somewhere they want to go.*

3. **Excessive AI-chat treatment** — the assistant is "AI-ASSISTED, not a chatbot." The chat interface exists but is narrow and deterministic, not an open-ended conversation. (A, B) — *Why: the product stance is that the assistant reads the itinerary and proposes concrete changes, not that it chats.*

4. **Dark planner styling** — not present in current build. (Needs confirmation — was the planner ever dark-themed?)

5. **Beige treatment** — not present. Current palette is warm cream (`#faf8f4`), not beige. (Needs confirmation — was a beige palette ever used?)

6. **Floating map button on mobile** — replaced by segmented control (Schedule/Map/List). The code comment says: "on phones the map was demoted behind a floating button and the map/schedule coupling was lost entirely." (B) — *Why: the map/schedule coupling is the product's core interaction; losing it on mobile was the worst regression.*

7. **Prompt chips** — the advisor has prompt chips but they are contextual (based on day state), not generic. No evidence of removed generic prompt chips. (Needs confirmation)

8. **Thoughts accordion** — not present in current build. (Needs confirmation — was this ever a feature?)

---

## PART 25 — Current Product State Model

### Discovery

| State | Description |
|-------|-------------|
| `intro` | Map loaded, console not yet started |
| `questions` | Active question being answered |
| `questions.weekend-shape` | Weekend definition sub-step |
| `questions.add-origin` | Add address form |
| `questions.confirm-origin` | Map confirmation of origin |
| `questions.ports-hunt` | Departure port search animation |
| `questions.income` | Optional income normaliser modal |
| `questions.dest-hunt` | Destination port/city placement animation |
| `processing` | Narrated filter animation |
| `results` | Shortlist visible |
| `results.brief` | Destination detail open |

### Planner

| State | Description |
|-------|-------------|
| `idle` | Calendar visible, nothing selected |
| `activity-selected` | Activity highlighted, peek visible |
| `editing` | Activity editor open (create or edit) |
| `dragging` | Activity being dragged |
| `conflict` | Overlap/tight-turnaround/impossible-commute detected |
| `resolved` | Conflict fixed (via advisor or manual move) |
| `advisor-active` | Advisor panel open |
| `advisor-plan` | Reviewable plan visible |
| `ideas-active` | Ideas panel open |
| `people-active` | Travellers panel open |
| `chat-active` | Chat panel open |
| `settings-open` | Settings workspace open |
| `search-open` | Search overlay open |
| `shared-view` | Overlay mode showing other travellers' activities |

### Dashboard

| State | Description |
|-------|-------------|
| `authenticated` | Full dashboard visible |
| `guest` | Gate card visible |
| `map-expanded` | Identity map full-screen |
| `settings-open` | Account settings workspace |
| `board-open` | Leaderboard full view |
| `editing-persona` | Persona panel in edit mode |

---

## PART 26 — Case-Study Evidence Inventory

| # | Evidence | Product question | Screen/state | Why it matters | Provenance | Can show? | Case-study role | Screenshot |
|---|----------|-----------------|-------------|----------------|-------------|-----------|-----------------|------------|
| 1 | Destination is never asked for | How do we help someone who doesn't know where to travel? | Discovery step 1 | Core thesis | A | Yes | Hero | 03-discovery-01-dates-desktop.png |
| 2 | 6 questions, not 20 | How much information is actually necessary before recommending? | Discovery full flow | Friction vs confidence | A/B | Yes | Hero | 04-discovery-02-scope-desktop.png |
| 3 | Three recommendations | How do we avoid choice paralysis? | Shortlist | Decisiveness | A | Yes | Hero | 09-discovery-shortlist-desktop.png |
| 4 | Distinct reasons per card | How do we explain why a recommendation fits? | Shortlist | Transparency | B | Yes | Hero | 09-discovery-shortlist-desktop.png |
| 5 | Ruled-out list with reasons | How do we show the system's working? | Shortlist | Trust | A | Yes | Supporting | 09-discovery-shortlist-desktop.png |
| 6 | Map confirmation of origin | How do we handle accuracy without friction? | Origin confirm | Trust | A | Yes | Supporting | 05b-discovery-03-origin-confirm-desktop.png |
| 7 | Calendar-first planner | How should itinerary planning work? | Planner overview | Core interaction | A | Yes | Hero | 11-planner-overview-desktop.png |
| 8 | Drag/drop with conflict detection | How do map and calendar reinforce each other? | Planner with conflict | Temporal planning | A/B | Yes | Hero | 13-planner-conflict-desktop.png |
| 9 | Map beside calendar, not behind | How do we expose complexity without overwhelming? | Planner with map | Spatial-temporal coupling | A | Yes | Hero | 11-planner-overview-desktop.png |
| 10 | Advisor proposes, never executes | How does AI assist without taking over? | Advisor panel | Trust + control | A | Yes | Hero | 14-planner-advisor-desktop.png |
| 11 | Reviewable plan with rationale | How do we make AI suggestions legible? | Advisor plan panel | Transparency | A | Yes | Supporting | 14-planner-advisor-desktop.png |
| 12 | Ideas ranked by proximity | How do suggestions relate to the actual plan? | Ideas panel | Context-awareness | B | Yes | Supporting | 17-planner-ideas-desktop.png |
| 13 | Travellers with roles | How does collaboration appear in planning? | Travellers panel | Multi-user | A/D | Yes | Supporting | 16-planner-travellers-desktop.png |
| 14 | Shared view overlay | How do multiple plans coexist? | Planner shared view | Multi-user | A/B | Yes | Optional | 11-planner-overview-desktop.png |
| 15 | Dashboard as mixed profile/home | What does a returning traveller need? | Dashboard | Product architecture | A | Yes | Supporting | 02-dashboard-desktop.png |
| 16 | Landing as doorway, not argument | How do you get someone in? | Landing | Entry experience | B | Yes | Supporting | 01-landing-desktop.png |
| 17 | Income normaliser | How do you personalise "budget"? | Income prompt | Personalisation | A | Yes | Optional | 06b-discovery-04-income-desktop.png |
| 18 | Processing narration | How do you make filtering transparent? | Processing | Trust | B | Yes | Supporting | 09a-discovery-processing-desktop.png |
| 19 | Destination brief with scores | How do you justify a destination? | Brief detail | Evidence | B | Yes | Supporting | 10-destination-detail-brief-desktop.png |
| 20 | Seasonal weather in trip window | How do dates affect the recommendation? | Brief weather card | Temporal relevance | B | Yes | Optional | 10b-destination-detail-scores-desktop.png |
| 21 | Free-time as affordance | How do gaps become opportunities? | Calendar free chips | Planning philosophy | A/B | Yes | Supporting | 11-planner-overview-desktop.png |
| 22 | Commute segments | How do you handle logistics? | Calendar commutes | Realism | A/B | Yes | Supporting | 11-planner-overview-desktop.png |
| 23 | Mobile segmented control | How do you keep coupling on phones? | Planner mobile | Responsive design | B | Yes | Supporting | 11-planner-overview-mobile.png |
| 24 | Guest state honesty | How do you handle no-auth? | Guest state | Honesty | C | Yes | Optional | 18-guest-state-desktop.png |
| 25 | Hours expansion prompt | How do you handle edge cases gracefully? | Hours modal | Edge case handling | B | Yes | Optional | (not captured separately) |

---

## PART 27 — Screenshot Shortlist for the Case Study

### THE 20 STRONGEST PRODUCT SCREENSHOTS

| # | Filename | Screen | State | What it proves | Case-study role |
|---|----------|--------|-------|----------------|-----------------|
| 01 | 03-discovery-01-dates-desktop.png | Discovery — Dates | Step 1 of 6 | Destination is never asked for; map is the page | Hero — opening |
| 02 | 04-discovery-02-scope-desktop.png | Discovery — Scope | Step 2 | Minimal question set | Hero — flow |
| 03 | 05b-discovery-03-origin-confirm-desktop.png | Discovery — Origin confirm | Map confirmation | Trust through verification | Supporting |
| 04 | 06-discovery-04-budget-desktop.png | Discovery — Budget | Step 4 | Personalisation through budget | Supporting |
| 05 | 07b-discovery-05-experiences-selected-desktop.png | Discovery — Experiences | Chips selected | Live filtering with readout | Supporting |
| 06 | 09-discovery-shortlist-desktop.png | Discovery — Shortlist | Results | Three recommendations with distinct reasons | Hero — recommendation |
| 07 | 10-destination-detail-brief-desktop.png | Destination Brief | Detail open | Why this destination, with scores | Hero — justification |
| 08 | 10b-destination-detail-scores-desktop.png | Destination Brief — Scores | Scrolled | Quantitative fit breakdown | Supporting |
| 09 | 11-planner-overview-desktop.png | Planner — Week view | Default | Calendar-first planning with map | Hero — planner |
| 10 | 12-planner-activity-selected-desktop.png | Planner — Activity selected | Selected | Selection and peek | Supporting |
| 11 | 13-planner-conflict-desktop.png | Planner — Conflict | Friday 17 | Conflict detection and visibility | Hero — conflicts |
| 12 | 13-planner-activity-editor-desktop.png | Planner — Editor | Open | Full editing capability | Supporting |
| 13 | 14-planner-advisor-desktop.png | Planner — Advisor | Open with offers | AI that proposes, not chats | Hero — advisor |
| 14 | 15-planner-map-desktop.png | Planner — Map | Rail visible | Map-calendar coupling | Supporting |
| 15 | 16-planner-travellers-desktop.png | Planner — Travellers | Panel open | Collaboration with roles | Supporting |
| 16 | 17-planner-ideas-desktop.png | Planner — Ideas | Panel open | Proximity-ranked suggestions | Supporting |
| 17 | 01-landing-desktop.png | Landing | Default | The doorway, two paths in | Supporting — entry |
| 18 | 02-dashboard-desktop.png | Dashboard | Default | Returning traveller's home | Supporting — dashboard |
| 19 | 11-planner-overview-mobile.png | Planner — Mobile | Default | Responsive coupling | Supporting — mobile |
| 20 | 09a-discovery-processing-desktop.png | Discovery — Processing | Animation | Transparent filtering | Supporting |

### THE 8 ABSOLUTE HERO SHOTS

1. **03-discovery-01-dates-desktop.png** — The product never asks where you want to go
2. **09-discovery-shortlist-desktop.png** — Three recommendations, not a catalogue, with distinct reasons
3. **10-destination-detail-brief-desktop.png** — Why this destination, with scores and weather
4. **11-planner-overview-desktop.png** — Calendar-first planning with map beside it
5. **13-planner-conflict-desktop.png** — Conflicts are visible and named
6. **14-planner-advisor-desktop.png** — AI that proposes, never executes
7. **01-landing-desktop.png** — The doorway: two paths in, nothing else
8. **02-dashboard-desktop.png** — The returning traveller's mixed home/profile

---

## PART 28 — Screenshot Contact Sheets

Contact sheets are generated as labelled montages in `contact-sheets/`. The following sheets are planned:

1. `desktop-product-overview` — 6 key desktop screens in a 3×2 grid
2. `mobile-product-overview` — 4 key mobile screens in a 2×2 grid
3. `destination-discovery-flow` — 8 discovery screens in sequence
4. `planner-flow` — 6 planner screens in sequence
5. `interaction-states` — 6 interaction state screenshots
6. `case-study-hero-shortlist` — 8 hero shots in a 4×2 grid

Contact sheets should be generated using image processing tools (e.g., ImageMagick `montage` or Playwright) from the screenshots in `screenshots/`. Each frame should have a small readable label.

---

## PART 29 — Product Walkthrough

### 60–90 second canonical walkthrough

| Time | Action | What it proves |
|------|--------|----------------|
| 00:00 | Landing page loads | The doorway: dates + "Build trip" or "Help me explore" |
| 00:05 | Click "Help me explore" | Navigation to discovery |
| 00:08 | Discovery: Dates question visible | Map is the page; destination is not asked |
| 00:12 | Click Continue through Scope → Origin | Minimal question set, progress bar |
| 00:20 | Origin confirm: camera flies to London | Trust through map verification |
| 00:25 | Continue through Budget → Experiences → Activities | Live filtering with readouts |
| 00:35 | Click "Find my matches" | Processing narration: "Found 50, ruled out 42" |
| 00:40 | Shortlist appears with confetti on 3rd match | Three recommendations, not a catalogue |
| 00:45 | Navigate 3rd → 2nd → 1st | Distinct reasons per card |
| 00:50 | Click "Build trip here" on best match | Transition to planner |
| 00:55 | Planner loads with seeded NYC itinerary | Calendar-first: days, hours, colour-coded cards |
| 01:05 | Click an activity | Selection, peek, map highlights pin |
| 01:10 | Drag activity to different time | Drag/drop, snapping, conflict detection |
| 01:15 | Open "Ask AI" | Advisor reads the day, offers concrete actions |
| 01:20 | Click "Fill the gap" | Reviewable plan with rationale |
| 01:25 | Apply one change | Change lands on calendar, toast confirms |
| 01:30 | End on planner overview | Calendar + map + advisor = the product |

### 20–30 second hero walkthrough

| Time | Action | What it proves |
|------|--------|----------------|
| 00:00 | Discovery: Dates question on the globe | Destination is an output |
| 00:05 | Fast-forward through questions | Minimal friction |
| 00:10 | Shortlist appears | Three recommendations with reasons |
| 00:15 | Click "Build trip here" | Transition to planner |
| 00:20 | Planner: calendar with activities | Calendar-first planning |
| 00:25 | End on planner + map | The product thesis in one frame |

---

## PART 30 — Gaps / Limitations

### Product gaps

| Gap | Severity | Fix before case study? | Can explain instead? | Keep outside? |
|-----|----------|----------------------|----------------------|---------------|
| No real backend — all data is seeded | Medium | No — explain | Yes | No |
| No real AI — advisor is deterministic | Medium | No — explain | Yes | No |
| No real auth — session is a local mock | Low | No — explain | Yes | No |
| No real-time collaboration | Medium | No — explain | Yes | No |
| No booking/integration with external services | Low | No | Yes | Yes |

### UX gaps

| Gap | Severity | Fix before? | Can explain? | Keep outside? |
|-----|----------|-------------|-------------|---------------|
| Ideas not directly accessible on mobile | Medium | Maybe | Yes | No |
| No undo for applied advisor changes | Low | No | Yes | No |
| No trip sharing (public link) | Low | No | Yes | Yes |
| No offline support | Low | No | Yes | Yes |

### Visual gaps

| Gap | Severity | Fix before? | Can explain? | Keep outside? |
|-----|----------|-------------|-------------|---------------|
| Some screenshots show dev tools badge | Low | No — crop | Yes | No |
| Map loading has no skeleton | Low | No | Yes | No |
| Some dashboard scroll screenshots are identical (scroll didn't capture) | Low | Re-capture | Yes | No |

### Technical/demo gaps

| Gap | Severity | Fix before? | Can explain? | Keep outside? |
|-----|----------|-------------|-------------|---------------|
| 14 pre-existing TypeScript errors | Low | No | Yes | Yes |
| No automated tests beyond Playwright capture | Low | No | Yes | Yes |
| No CI/CD pipeline | Low | No | Yes | Yes |

### Historical-evidence gaps

| Gap | Severity | Fix before? | Can explain? | Keep outside? |
|-----|----------|-------------|-------------|---------------|
| Cannot confirm which decisions are historical vs reconstructed | High | No — ask Sarthak | No | No |
| No access to original product screenshots | Medium | No | Yes | No |
| No research data to cite | Medium | No | Yes | No |

### Case-study-story gaps

| Gap | Severity | Fix before? | Can explain? | Keep outside? |
|-----|----------|-------------|-------------|---------------|
| No metrics or outcomes to cite | High | No — ask Sarthak | Yes | No |
| No user research to reference | Medium | No | Yes | No |
| Cannot claim the reconstruction is the production product | High | No — must state clearly | Yes | No |

---

## PART 31 — Questions for Sarthak

### Required before case-study writing

1. Was the "destination is an output" thesis the original Intripid product concept, or was it introduced during reconstruction?
2. Was the three-recommendation cap a historical product decision or a reconstruction choice?
3. Was the 6-question sequence the original flow, or was it longer/shorter in the actual product?
4. Was the "populated/Scale" question part of the original product? Why was it removed?
5. Was the map-first discovery composition (full-screen Mapbox, floating chrome) the original design?
6. Was the calendar-first planner the original interaction model?
7. Was the advisor always deterministic, or did the original product use a real AI API?
8. Were the traveller roles (owner, co-owner, editor, advisor, viewer) the original permission model?
9. Was the dashboard always a mixed profile/home, or was it separate?
10. Which screenshots, if any, are historically authentic vs reconstructed?
11. What metrics or outcomes can be publicly claimed?
12. Was the product ever shipped to real users?

### Useful for richer storytelling

13. What research led to the question sequence?
14. What was the original visual design direction (dark planner? beige treatment?)
15. Were there features that existed in the original product but are not in this reconstruction?
16. What was the original target user persona?
17. What was the business model (B2C? B2B? Teams?)
18. What was the advisor's original scope — could it do more than resolve/fill/rebalance?

### Optional

19. What happened to Intripid as a company?
20. Is there any existing documentation, PRD, or design spec that could be referenced?
21. Are there any constraints on what can be shown publicly (NDA, client confidentiality)?

---

## PART 32 — Final Summary for Another Designer

# What another designer needs to know before designing the Intripid case study

### Product story

Intripid is a travel planning product that helps you decide where to go without asking you where you want to go. You answer six questions about dates, distance, origin, budget, must-haves, and activities. The product ranks destinations against your answers, shows you three (not nine), explains why each one fits, and then lets you plan the trip on a calendar with a map beside it and an AI assistant that proposes changes but never makes them for you.

### Strongest UX ideas

1. **Destination as output** — the product never asks "where do you want to go?" This is the central design decision.
2. **Three recommendations** — deliberately capped to force a decision, not a browse.
3. **Distinct reasons** — each card's reason is phrased against the others, so you can actually choose.
4. **Calendar-first planning** — activities are in time, not in a list. Conflicts, gaps, and commutes are first-class.
5. **Map beside calendar** — not behind it, not under a button. The coupling is bidirectional.
6. **Advisor that proposes** — it reads the day, finds a specific problem, and shows a reviewable plan with rationale. It never executes without acceptance.
7. **Ruled-out transparency** — the shortlist shows what was eliminated and why, making the filtering legible.

### Strongest visual evidence

- **Discovery on the globe** — a full-screen Mapbox globe with a frosted question card floating on it. This is the product's signature image.
- **The shortlist** — three cards with score rings, distinct reasons, matched-interest chips, and a ruled-out list below. This proves the recommendation is a decision, not a catalogue.
- **The planner** — a week of colour-coded activity cards in a calendar grid, with commute segments, free-time chips, a stay bar, and a map in the right rail. This proves the planning is temporal.
- **The advisor** — a conversation that starts with a day reading and offers concrete actions. This proves the AI is assistive, not autonomous.

### Strongest live interactions

- Answering discovery questions and watching the map pins update
- The processing narration that reports each filter's eliminations
- Dragging an activity and seeing the conflict badge appear
- Opening the advisor and applying a suggested change
- Selecting an activity and seeing its pin highlight on the map

### What is reconstructed

Everything in this repository is a reconstruction (B) built to demonstrate the original product thinking (A). The frontend is not the original production implementation. All data is seeded (D). All logic is deterministic (D). There is no backend, no real AI, no real auth, no real-time collaboration.

### What cannot be claimed yet

- That this is the original production product
- That the advisor uses real AI
- That the data is real
- That the collaboration is real-time
- Any metrics, outcomes, or user research (needs Sarthak's confirmation)
- Which specific decisions are historical vs reconstructed (needs Sarthak's confirmation)

### Recommended storytelling order

1. **The thesis** — destination is an output, not an input
2. **The question flow** — six questions on a globe, not a form
3. **The recommendation** — three places with distinct reasons
4. **The brief** — why this destination, with scores and weather
5. **The planner** — calendar-first, map beside it
6. **The advisor** — proposes, never executes
7. **Collaboration** — travellers, roles, shared view
8. **The dashboard** — the returning traveller's home

### Screenshots to inspect first

1. `03-discovery-01-dates-desktop.png` — the product never asks where
2. `09-discovery-shortlist-desktop.png` — three recommendations with reasons
3. `10-destination-detail-brief-desktop.png` — why this destination
4. `11-planner-overview-desktop.png` — calendar-first planning
5. `13-planner-conflict-desktop.png` — conflicts are visible
6. `14-planner-advisor-desktop.png` — AI that proposes
7. `01-landing-desktop.png` — the doorway
8. `02-dashboard-desktop.png` — the returning traveller's home

### Unresolved questions

See Part 31. The most critical: which decisions are historical (A) vs reconstructed (B), and what metrics/outcomes can be publicly claimed. These must be answered before the case study is written.

---

*End of report.*
