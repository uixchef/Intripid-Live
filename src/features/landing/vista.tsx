import styles from "./vista.module.css";

/**
 * The vista — dawn above the cloud line.
 *
 * The doorway's whole argument is emotional: you are looking at the moment
 * before a trip, not at a product. So the landing page is a place rather
 * than a surface, and everything below is drawn rather than photographed.
 *
 * WHY THIS IS VECTOR AND NOT A JPEG.
 * A raster hero would be a 1.5MB LCP on the one page that has to load fast,
 * would need art direction at four breakpoints, and would sit outside the
 * token system — it could not be retuned when the palette moves. This is a
 * few KB of gzipped markup, resolution-independent, and every colour in it
 * is a value we control. If a commissioned illustration ever replaces it,
 * swap `.sky`'s background for the image in `vista.module.css` and delete
 * the layers you no longer want behind it.
 *
 * CONSTRUCTION, back to front:
 *   1. sky      — the dawn gradient, compressed so the horizon lands mid-frame
 *   2. stars    — the night that has not left yet, dissolving downward
 *   3. veil     — a cool wash over the top third, so white type has ground
 *   4. clouds   — four decks of billows, lit along their top edges
 *   5. hill     — the far slope, generated from one ridge function
 *   6. figure   — the traveller, sitting with something still open in her lap
 *   7. meadow   — the near slope, drawn IN FRONT of her so she is seated in
 *                 the world instead of pasted onto it
 *   8. grain    — kills gradient banding on wide-gamut displays
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY EVERY BAND IS `preserveAspectRatio="none"`.
 *
 * The first pass used `slice`, reasoning that uniform scaling would keep the
 * billows circular. What it actually did was crop the composition away: a
 * band 40% of the viewport tall is roughly 4:1, a 1600×560 viewBox is 2.9:1,
 * so `slice` scaled to width and then ate the top 200 units — which is where
 * the cloud decks and the hill's crest lived. The hill rendered as a straight
 * diagonal because the only part of the curve still on screen was its
 * steepest, most linear tail.
 *
 * Full-bleed scenery is the one case where non-uniform scaling is correct:
 * these are soft organic masses with no circles or text in them, the vertical
 * stretch at desktop is under 20%, and in exchange the composition is exactly
 * what was authored at every width. The figure keeps `meet` — she has
 * proportions, and stretching a person is immediately visible.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Nothing here is interactive or announced: the whole scene is one
 * `aria-hidden` decoration, and the page reads identically without it.
 */

/* -------------------------------------------------------------------------- */
/* Deterministic scatter                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A tiny linear congruential generator.
 *
 * Stars, clouds and flowers have to land on the same pixels on the server and
 * in the browser — `Math.random()` here would mean a hydration mismatch and a
 * re-scattered sky on every load. Seeded, the scatter is stable everywhere
 * while still looking unplanned.
 */
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/* -------------------------------------------------------------------------- */
/* Stars                                                                      */
/* -------------------------------------------------------------------------- */

interface Star {
  x: number;
  y: number;
  r: number;
  o: number;
}

const STAR_SPACE = { w: 1600, h: 540 };

const STARS: Star[] = (() => {
  const rand = seeded(20260414);
  return Array.from({ length: 110 }, () => {
    /* Biased upward: the sky is emptiest where it is darkest. */
    const y = rand() ** 1.7 * STAR_SPACE.h * 0.95;
    return {
      x: rand() * STAR_SPACE.w,
      y,
      r: 0.6 + rand() * 1.5,
      /* They fade into the dawn rather than stopping at a line. */
      o: (0.2 + rand() * 0.68) * Math.max(0, 1 - y / (STAR_SPACE.h * 0.78)),
    };
  });
})();

/* -------------------------------------------------------------------------- */
/* Cloud decks                                                                */
/* -------------------------------------------------------------------------- */

const CLOUD_SPACE = { w: 1600, h: 540 };

/**
 * One deck of cloud, as a run of arcs along a wandering baseline.
 *
 * An earlier attempt drew blurred ellipses, and it failed instructively: once
 * the blur is wide enough to fuse ellipses into a mass, it is also wide enough
 * to erase the mass's edge, and a cloud with no edge is just coloured fog.
 * Arcs give the silhouette a cloud actually has.
 *
 * The size range matters as much as the shape. Billows of one size read as a
 * row of scallops — a decorative border, not weather. The `spike` roll gives
 * roughly one bump in five a much larger radius, and that single change is
 * what turns the run into a cloud deck.
 *
 * `pull` drags the baseline back toward `baseY` each step, so the deck wanders
 * without drifting off the frame.
 */
function deck(
  rand: () => number,
  baseY: number,
  minR: number,
  maxR: number,
  wander: number,
) {
  let x = -120;
  let y = baseY;
  const parts = [`M${x} ${CLOUD_SPACE.h + 80}`, `L${x} ${y.toFixed(1)}`];

  while (x < CLOUD_SPACE.w + 120) {
    const spike = rand() < 0.2 ? 1.55 : 1;
    const r = (minR + rand() * (maxR - minR)) * spike;
    /* Squat billows read as distance, tall ones as weight overhead. */
    const ry = r * (0.42 + rand() * 0.72);
    const dy = (baseY - y) * 0.32 + (rand() - 0.5) * wander;
    parts.push(
      `a${r.toFixed(1)} ${ry.toFixed(1)} 0 0 1 ${(r * 2).toFixed(1)} ${dy.toFixed(1)}`,
    );
    x += r * 2;
    y += dy;
  }

  parts.push(`L${x.toFixed(1)} ${CLOUD_SPACE.h + 80}`, "Z");
  return parts.join(" ");
}

const CLOUD_DECKS = (() => {
  const rand = seeded(1445);
  return {
    /* Flattened by distance, almost sitting on the horizon line. */
    far: deck(rand, 74, 12, 30, 5),
    mid: deck(rand, 146, 20, 48, 9),
    near: deck(rand, 248, 32, 74, 15),
    /* The deck we are standing above: biggest billows, softest edge. */
    front: deck(rand, 384, 48, 112, 24),
  };
})();

/* -------------------------------------------------------------------------- */
/* Land                                                                       */
/* -------------------------------------------------------------------------- */

const LAND_SPACE = { w: 1600, h: 400 };

/**
 * The ridge, as a function rather than as hand-written path data.
 *
 * Two things have to agree about where the hilltop is: the hill's fill and
 * everything scattered on it. Deriving both from one function means they
 * cannot drift apart when the slope is retuned — flowers can never float off
 * the top edge, which is the failure mode of a hand-authored bezier.
 *
 * The `1 - cos` easing is the whole difference between a hill and a wedge:
 * a power curve over this width renders as a straight diagonal, while a
 * cosine leaves the crest genuinely flat on the left and lets it fall away,
 * which is what a hill shoulder does. The sine keeps it from looking plotted.
 */
function ridgeY(x: number) {
  const t = clamp01(x / LAND_SPACE.w);
  return (
    70 + 188 * (1 - Math.cos(t * Math.PI * 0.5)) + Math.sin(t * Math.PI * 1.7) * 8
  );
}

const HILL_PATH = (() => {
  const points: string[] = [];
  for (let x = -40; x <= LAND_SPACE.w + 40; x += 32) {
    points.push(`${x} ${ridgeY(x).toFixed(1)}`);
  }
  return `M${points.join(" L")} L${LAND_SPACE.w + 40} ${LAND_SPACE.h + 40} L-40 ${LAND_SPACE.h + 40} Z`;
})();

/* -------------------------------------------------------------------------- */
/* Meadow — the foreground, in front of the figure                            */
/* -------------------------------------------------------------------------- */

const MEADOW_SPACE = { w: 1600, h: 180 };

/**
 * The near crest, descending in the same direction as the ridge behind it.
 *
 * It has to: a level foreground crest against a falling ridge crosses it on
 * the right, and the grass then pokes up into the lit sky — which is exactly
 * what an earlier pass did. Sloping the two in parallel keeps the foreground
 * strictly below the hill at every x.
 */
function meadowY(x: number) {
  const t = clamp01(x / MEADOW_SPACE.w);
  return 38 + 48 * t + Math.sin(x / 190) * 7 + Math.sin(x / 68) * 3;
}

const MEADOW_PATH = (() => {
  const points: string[] = [];
  for (let x = -40; x <= MEADOW_SPACE.w + 40; x += 24) {
    points.push(`${x} ${meadowY(x).toFixed(1)}`);
  }
  return `M${points.join(" L")} L${MEADOW_SPACE.w + 40} ${MEADOW_SPACE.h} L-40 ${MEADOW_SPACE.h} Z`;
})();

/* -------------------------------------------------------------------------- */
/* Blossoms and grass                                                         */
/* -------------------------------------------------------------------------- */

interface Blossom {
  x: number;
  y: number;
  r: number;
  fill: string;
  o: number;
}

/* Meadow palette. Pinks lead, with cornflower and white to cool it down —
   an all-pink hillside under a pink sky loses the horizon entirely. */
const FLOWER_FILLS = [
  "#f0b4d0",
  "#f8f0f9",
  "#bfc5ee",
  "#a5c3e9",
  "#e59fc4",
  "#fbdcec",
];

/**
 * Blossoms, in clusters.
 *
 * Evenly scattered single circles read as confetti — an earlier pass did
 * exactly that and looked like polka-dot fabric. Flowers grow in patches, so
 * each cluster centre gets a handful of petals jittered around it, and the
 * whole field is then broken up by grass drawn on top of it.
 */
function blossoms(
  seed: number,
  clusters: number,
  space: { w: number; h: number },
  topAt: (x: number) => number,
  scaleAt: (depth: number) => number,
  bias: number,
): Blossom[] {
  const rand = seeded(seed);
  const out: Blossom[] = [];

  for (let i = 0; i < clusters; i++) {
    const cx = -50 + rand() * (space.w + 100);
    const top = topAt(cx);
    /* Biased downhill, where the eye actually lands. */
    const depth = rand() ** bias;
    const cy = top + 4 + depth * (space.h - top - 4);
    const scale = scaleAt(depth);
    const petals = 3 + Math.floor(rand() * 5);

    for (let p = 0; p < petals; p++) {
      out.push({
        x: cx + (rand() - 0.5) * scale * 6,
        y: cy + (rand() - 0.5) * scale * 3.6,
        r: scale * (0.5 + rand() * 0.6),
        fill: FLOWER_FILLS[Math.floor(rand() * FLOWER_FILLS.length)],
        /* Kept low: they are lit by a horizon, not by a flash. */
        o: 0.3 + depth * 0.44,
      });
    }
  }

  return out;
}

/**
 * Grass — a texture, not a set of blades.
 *
 * An earlier pass drew long light strokes and the hillside looked like it was
 * being rained on. At this scale grass is not legible as individual blades;
 * it is a fine directional grain over the fill. So: short, leaning, and
 * barely there.
 *
 * WHY A PATTERN AND NOT 1,200 LINES.
 * Scattering real blades across both bands is what the first working version
 * did, and it cost 1,220 `<line>` elements and 120KB of markup — for a grain
 * held at 4-14% opacity that you cannot resolve individually at any window
 * size. Measured, the whole scene was 2,561 nodes and 96% of the document.
 * One tile of a dozen blades, repeated, is visually indistinguishable and
 * costs twelve nodes. At this opacity the repeat is not detectable; the tile
 * is in each band's own user space, so the near band's grass comes out
 * proportionally coarser than the far band's, which is the perspective we
 * would have had to fake anyway.
 */
const GRASS_TILE = { w: 132, h: 88 };

interface Blade {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
  o: number;
}

const GRASS_BLADES: Blade[] = (() => {
  const rand = seeded(4177);
  return Array.from({ length: 13 }, () => {
    const x = rand() * GRASS_TILE.w;
    const y = GRASS_TILE.h * (0.2 + rand() * 0.8);
    return {
      x1: x,
      y1: y,
      /* Leaning hard: a near-vertical thin line reads as falling rain. */
      x2: x + (rand() - 0.5) * 15,
      y2: y - (4 + rand() * 11),
      w: 0.7 + rand() * 0.6,
      o: 0.04 + rand() * 0.11,
    };
  });
})();

/**
 * Blossoms grouped by fill, so the one attribute they share is hoisted onto a
 * `<g>` instead of repeated on every circle. Six groups, and each circle
 * loses ~20 bytes of markup.
 */
function byFill(list: Blossom[]) {
  return FLOWER_FILLS.map((fill) => ({
    fill,
    items: list.filter((blossom) => blossom.fill === fill),
  })).filter((group) => group.items.length > 0);
}

const HILL_BLOSSOMS = blossoms(
  60414,
  52,
  LAND_SPACE,
  ridgeY,
  (depth) => 1.1 + depth * 3,
  0.8,
);

const MEADOW_BLOSSOMS = blossoms(
  7781,
  62,
  MEADOW_SPACE,
  meadowY,
  (depth) => 1.8 + depth * 4.2,
  0.85,
);

/* -------------------------------------------------------------------------- */
/* The figure                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A traveller, from behind, sitting cross-legged with something open in her
 * lap.
 *
 * Deliberately a silhouette and nothing more. A face would need to be
 * somebody — an age, an ethnicity, a mood — and the entire point of this page
 * is that the person looking at it is the one going. Backlit against the
 * horizon, she is anyone.
 *
 * The proportions are the only thing keeping this from reading as a chess
 * pawn, which is precisely what a first attempt was: a bell with a ball on
 * top. A seated human from behind is three widths in a strict ratio —
 * head 52, shoulders 70, lap 148 — with a visible pinch at the neck and the
 * shoulder line clearly above where the lap starts to spread.
 */
const ROBE_PATH =
  "M120 82 C104 82 92 90 86 104 C80 120 76 140 73 160 " +
  "C68 196 55 240 38 286 C28 304 32 318 48 318 L192 318 " +
  "C208 318 212 304 202 286 C185 240 172 196 167 160 " +
  "C164 140 160 120 154 104 C148 90 136 82 120 82 Z";

/*
 * Where the arm meets the torso — a crease, drawn DARKER than the robe.
 * An earlier pass put a lighter shape here for the arm itself and it read as
 * a smudge on her back: light on a backlit silhouette can only come from the
 * horizon, so anything in front of her has to be described by shadow.
 */
const ARM_CREASE = "M92 116 C84 148 79 188 81 222";

export function Vista() {
  return (
    <div className={styles.vista} aria-hidden>
      <div className={styles.sky} />

      <svg
        className={styles.stars}
        viewBox={`0 0 ${STAR_SPACE.w} ${STAR_SPACE.h}`}
        preserveAspectRatio="xMidYMin slice"
      >
        {STARS.map((star, i) => (
          <circle
            key={i}
            cx={star.x.toFixed(1)}
            cy={star.y.toFixed(1)}
            r={star.r.toFixed(2)}
            fill="#fffaf2"
            opacity={star.o.toFixed(3)}
          />
        ))}
      </svg>

      <div className={styles.veil} />

      <svg
        className={styles.clouds}
        viewBox={`0 0 ${CLOUD_SPACE.w} ${CLOUD_SPACE.h}`}
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="vistaSoftFar" x="-4%" y="-30%" width="108%" height="180%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
          <filter id="vistaSoftMid" x="-4%" y="-30%" width="108%" height="180%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
          <filter id="vistaSoftNear" x="-4%" y="-30%" width="108%" height="180%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id="vistaSoftFront" x="-4%" y="-30%" width="108%" height="180%">
            <feGaussianBlur stdDeviation="7.5" />
          </filter>

          {/* Every deck is lit from behind along its top edge and cools into
              lavender underneath. That vertical shading is the only thing
              giving a flat fill the volume of weather. */}
          <linearGradient
            id="vistaDeckFar"
            x1="0"
            y1="60"
            x2="0"
            y2="170"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#fce6d6" />
            <stop offset="1" stopColor="#dbb9c5" />
          </linearGradient>
          <linearGradient
            id="vistaDeckMid"
            x1="0"
            y1="128"
            x2="0"
            y2="290"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#fdebd9" />
            <stop offset="1" stopColor="#cbafcc" />
          </linearGradient>
          <linearGradient
            id="vistaDeckNear"
            x1="0"
            y1="222"
            x2="0"
            y2="440"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#fef0e0" />
            <stop offset="0.5" stopColor="#e2c6d3" />
            <stop offset="1" stopColor="#b0a8c8" />
          </linearGradient>
          <linearGradient
            id="vistaDeckFront"
            x1="0"
            y1="356"
            x2="0"
            y2="600"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#fff5e9" />
            <stop offset="0.45" stopColor="#ddc0ce" />
            <stop offset="1" stopColor="#9f98c1" />
          </linearGradient>
        </defs>

        <g filter="url(#vistaSoftFar)">
          <path d={CLOUD_DECKS.far} fill="url(#vistaDeckFar)" opacity="0.6" />
          <path
            d={CLOUD_DECKS.far}
            fill="none"
            stroke="#fff2df"
            strokeWidth="1.6"
            strokeOpacity="0.5"
          />
        </g>

        <g filter="url(#vistaSoftMid)">
          <path d={CLOUD_DECKS.mid} fill="url(#vistaDeckMid)" opacity="0.76" />
          <path
            d={CLOUD_DECKS.mid}
            fill="none"
            stroke="#fff5e6"
            strokeWidth="2"
            strokeOpacity="0.5"
          />
        </g>

        <g filter="url(#vistaSoftNear)">
          <path d={CLOUD_DECKS.near} fill="url(#vistaDeckNear)" opacity="0.88" />
          <path
            d={CLOUD_DECKS.near}
            fill="none"
            stroke="#fff7ea"
            strokeWidth="2.6"
            strokeOpacity="0.46"
          />
        </g>

        <g filter="url(#vistaSoftFront)">
          <path d={CLOUD_DECKS.front} fill="url(#vistaDeckFront)" />
          <path
            d={CLOUD_DECKS.front}
            fill="none"
            stroke="#fff8ee"
            strokeWidth="3.4"
            strokeOpacity="0.4"
          />
        </g>
      </svg>

      <svg
        className={styles.hill}
        viewBox={`0 0 ${LAND_SPACE.w} ${LAND_SPACE.h}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id="vistaHill"
            x1="0"
            y1="64"
            x2="0"
            y2="400"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#5b807d" />
            <stop offset="0.3" stopColor="#3c5f6a" />
            <stop offset="1" stopColor="#1f3946" />
          </linearGradient>
          <radialGradient
            id="vistaHillShade"
            cx="0.16"
            cy="1"
            r="0.92"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0" stopColor="#142c3a" stopOpacity="0.6" />
            <stop offset="1" stopColor="#142c3a" stopOpacity="0" />
          </radialGradient>
          <filter id="vistaRidgeMist" x="-8%" y="-500%" width="116%" height="1100%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <pattern
            id="vistaGrassFar"
            width={GRASS_TILE.w}
            height={GRASS_TILE.h}
            patternUnits="userSpaceOnUse"
          >
            <g stroke="#a8c6bd" strokeLinecap="round">
              {GRASS_BLADES.map((b, i) => (
                <line
                  key={i}
                  x1={b.x1.toFixed(1)}
                  y1={b.y1.toFixed(1)}
                  x2={b.x2.toFixed(1)}
                  y2={b.y2.toFixed(1)}
                  strokeWidth={b.w.toFixed(2)}
                  strokeOpacity={b.o.toFixed(3)}
                />
              ))}
            </g>
          </pattern>
        </defs>

        {/* Haze along the crest. Distant land does not meet sky at a hard
            line — the mist is what makes the hill sit *in* the air behind it
            rather than on top of it. */}
        <path
          d={HILL_PATH}
          fill="none"
          stroke="#ffdcb6"
          strokeWidth="10"
          strokeOpacity="0.44"
          filter="url(#vistaRidgeMist)"
        />
        <path d={HILL_PATH} fill="url(#vistaHill)" />
        {/* Shadow pooling in the near corner, so the slope is not one flat
            fill from crest to frame edge. */}
        <path d={HILL_PATH} fill="url(#vistaHillShade)" />

        {byFill(HILL_BLOSSOMS).map((group) => (
          <g key={group.fill} fill={group.fill}>
            {group.items.map((f, i) => (
              <circle
                key={i}
                cx={f.x.toFixed(1)}
                cy={f.y.toFixed(1)}
                r={f.r.toFixed(2)}
                opacity={f.o.toFixed(3)}
              />
            ))}
          </g>
        ))}

        {/* Grain last, so it crosses in front of the petals — that is what
            seats them in a field instead of printing them on top of one. */}
        <path d={HILL_PATH} fill="url(#vistaGrassFar)" />
      </svg>

      <svg
        className={styles.figure}
        viewBox="0 0 240 340"
        preserveAspectRatio="xMidYMax meet"
      >
        <defs>
          <linearGradient
            id="vistaRobe"
            x1="0"
            y1="96"
            x2="0"
            y2="322"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#404e72" />
            <stop offset="0.55" stopColor="#323e5f" />
            <stop offset="1" stopColor="#222d48" />
          </linearGradient>
          <filter id="vistaHalo" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
          <filter id="vistaBook" x="-90%" y="-160%" width="280%" height="420%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>

        {/* Dawn behind the shoulders — the halo is what separates a dark
            silhouette from a dark cloud deck directly behind it. Small and
            faint: any brighter and she reads as lit from the front. */}
        <ellipse
          cx="120"
          cy="150"
          rx="72"
          ry="62"
          fill="#ffdcb8"
          opacity="0.22"
          filter="url(#vistaHalo)"
        />

        {/* Whatever is open in her lap is lit. You only ever see the spill. */}
        <ellipse
          cx="94"
          cy="252"
          rx="26"
          ry="12"
          fill="#ffe7bd"
          opacity="0.4"
          filter="url(#vistaBook)"
        />

        <path d={ROBE_PATH} fill="url(#vistaRobe)" />
        <path
          d={ARM_CREASE}
          fill="none"
          stroke="#242e4a"
          strokeOpacity="0.55"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Rim light, the same trick as the ridge, one scale down. */}
        <path
          d={ROBE_PATH}
          fill="none"
          stroke="#aec1dc"
          strokeOpacity="0.24"
          strokeWidth="2.2"
        />

        {/* Hair as one mass: a rounded crown falling to a jaw-length bob that
            flares very slightly, and stays narrower than the shoulders. */}
        <path
          d="M120 36 C105 36 97 48 96 66 C95 77 97 86 100 93
             C102 97 105 99 109 97 C115 95 125 95 131 97
             C135 99 138 97 140 93 C143 86 145 77 144 66
             C143 48 135 36 120 36 Z"
          fill="#27304c"
        />
        <path
          d="M104 46 C110 39 130 39 136 46"
          fill="none"
          stroke="#94a7c7"
          strokeOpacity="0.3"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {/* The shoulder line, caught by the horizon. Without it the head and
            the lap are one continuous shape. */}
        <path
          d="M88 108 C98 96 142 96 152 108"
          fill="none"
          stroke="#b6c8e2"
          strokeOpacity="0.22"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>

      <svg
        className={styles.meadow}
        viewBox={`0 0 ${MEADOW_SPACE.w} ${MEADOW_SPACE.h}`}
        preserveAspectRatio="none"
      >
        <defs>
          {/*
           * Darker than the hill it overlaps, not lighter. An earlier pass had
           * the foreground brighter than the slope behind it, which put a pale
           * band across the bottom of the frame and flattened the whole scene.
           * The near ground at dawn is the part the light has not reached.
           */}
          <linearGradient
            id="vistaMeadow"
            x1="0"
            y1="34"
            x2="0"
            y2="180"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#213c48" />
            <stop offset="0.55" stopColor="#1a3040" />
            <stop offset="1" stopColor="#112331" />
          </linearGradient>
          <filter id="vistaCrest" x="-8%" y="-600%" width="116%" height="1300%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <pattern
            id="vistaGrassNear"
            width={GRASS_TILE.w}
            height={GRASS_TILE.h}
            patternUnits="userSpaceOnUse"
          >
            <g stroke="#9dbcb2" strokeLinecap="round">
              {GRASS_BLADES.map((b, i) => (
                <line
                  key={i}
                  x1={b.x1.toFixed(1)}
                  y1={b.y1.toFixed(1)}
                  x2={b.x2.toFixed(1)}
                  y2={b.y2.toFixed(1)}
                  strokeWidth={b.w.toFixed(2)}
                  strokeOpacity={b.o.toFixed(3)}
                />
              ))}
            </g>
          </pattern>
        </defs>

        {/* Two dark planes overlapping need a light edge to separate at all. */}
        <path
          d={MEADOW_PATH}
          fill="none"
          stroke="#c9b8b0"
          strokeWidth="3"
          strokeOpacity="0.15"
          filter="url(#vistaCrest)"
        />
        <path d={MEADOW_PATH} fill="url(#vistaMeadow)" />

        {byFill(MEADOW_BLOSSOMS).map((group) => (
          <g key={group.fill} fill={group.fill}>
            {group.items.map((f, i) => (
              <circle
                key={i}
                cx={f.x.toFixed(1)}
                cy={f.y.toFixed(1)}
                r={f.r.toFixed(2)}
                opacity={f.o.toFixed(3)}
              />
            ))}
          </g>
        ))}

        <path d={MEADOW_PATH} fill="url(#vistaGrassNear)" />
      </svg>

      <div className={styles.grain} />
    </div>
  );
}
