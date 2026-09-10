"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

import { Logo } from "@/components/brand/mark";
import { AvatarStack } from "@/components/ui/avatar";
import { site } from "@/config/site";
import { NYC_TRIP, NYC_TRIP_ID } from "@/data/nyc-trip";

import { Vista } from "./vista";
import { VistaImage } from "./vista-image";
import styles from "./landing.module.css";

/**
 * The doorway.
 *
 * One screen, one claim, one thing to do. The previous version of this page
 * argued its case — a three-point premise list, a live worked example, a
 * journey strip — and every one of those was true and useful and belonged
 * further down the funnel. Someone arriving cold does not read an argument;
 * they decide in about a second whether this looks like somewhere they want
 * to go. So the page is now a place, and the only interactive thing on it is
 * the way in.
 *
 * The scene behind it does the persuading. That is either supplied artwork
 * from `public/vista.*` or, with no file there, the scene drawn in
 * `vista.tsx` — `app/page.tsx` decides and passes `heroImage`. Everything
 * here sits in the top half of the viewport because that is the only region
 * where white type holds contrast; below the horizon the clouds are lit, and
 * that is true of the reference artwork as much as of the drawn version.
 */

/*
 * Hand-drawn because lucide dropped its brand icons at v1 — there is no
 * `<Instagram />` to import any more, and pulling a second icon package for
 * three glyphs is not a trade worth making. Standard marks, 24px grid.
 */
const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  instagram: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <rect
        x="2.6"
        y="2.6"
        width="18.8"
        height="18.8"
        rx="5.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle
        cx="12"
        cy="12"
        r="4.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="17.3" cy="6.7" r="1.15" fill="currentColor" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
      <path
        d="M17.53 3h3.08l-6.73 7.69L21.5 21h-6.1l-4.2-5.5L6.3 21H3.2l7.02-8.02L2.5 3h6.24l3.9 5.15L17.53 3Zm-1.08 16.1h1.7L7.3 4.82H5.5l10.95 14.28Z"
        fill="currentColor"
      />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
      <path
        d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3.1 9.5h3.76v11H3.1v-11Zm6.14 0h3.6v1.5h.05c.5-.95 1.73-1.95 3.56-1.95 3.8 0 4.5 2.5 4.5 5.76v5.69h-3.76v-5.04c0-1.2-.02-2.75-1.67-2.75-1.68 0-1.94 1.31-1.94 2.66v5.13H9.24v-11Z"
        fill="currentColor"
      />
    </svg>
  ),
};

/* The motion vocabulary from the rest of the product: a short rise, the
   product's own ease, and a stagger small enough to read as one movement. */
const rise = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const EASE = [0.2, 0, 0, 1] as const;

export function Landing({ heroImage }: { heroImage?: string | null }) {
  const router = useRouter();
  const [from, setFrom] = useState("");

  /**
   * The hero field is a head start, not a gate.
   *
   * Whatever is typed rides along as `?from=` — discovery asks for an origin
   * as its second question, and this is the answer arriving early. The flow
   * does not read the parameter yet, so today an empty field and a filled
   * one land in the same place; wiring it into the origin step is a change
   * to discovery, not to the doorway.
   *
   * This handler is the enhancement, not the mechanism. The form carries a
   * real `action="/discover" method="get"`, so the only control on the page
   * works from the moment the markup arrives — before hydration, with a
   * failed chunk, with JS off. The previous doorway got that for free by
   * wrapping a `<Link>`; a form with an onSubmit and no action would have
   * quietly traded it away, and on a landing page the way in is the one
   * thing that cannot wait for a bundle.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const origin = from.trim();
    router.push(
      origin ? `/discover?from=${encodeURIComponent(origin)}` : "/discover",
    );
  }

  return (
    <main className={`${styles.root} onEnv`}>
      {heroImage ? <VistaImage src={heroImage} /> : <Vista />}

      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label={site.name}>
          <Logo size={20} />
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          <Link href="/discover" className={styles.navLink}>
            Discover
          </Link>
          <Link href={`/trip/${NYC_TRIP_ID}`} className={styles.navLink}>
            Example trip
          </Link>
        </nav>

        <ul className={styles.social}>
          {site.social.map((account) => (
            <li key={account.id}>
              <a
                href={account.href}
                className={styles.socialLink}
                aria-label={account.label}
                target="_blank"
                rel="noreferrer noopener"
              >
                {SOCIAL_ICONS[account.id]}
              </a>
            </li>
          ))}
        </ul>
      </header>

      <div className={styles.hero}>
        {/*
          The reference for this composition carries a subscriber count here.
          We do not have one, and inventing it is the one thing a doorway can
          do that costs trust permanently. What is true is that a trip has
          more than one person in it — so the avatars are the example trip's
          actual collaborators, and the claim is about the product.
        */}
        <motion.p
          className={styles.proof}
          {...rise}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <AvatarStack travellers={NYC_TRIP.travellers} size="xs" max={4} />
          <span>Planned together, on one timeline</span>
        </motion.p>

        <motion.h1
          className={styles.headline}
          {...rise}
          transition={{ duration: 0.46, ease: EASE, delay: 0.06 }}
        >
          Find <em>Where</em> to Go Next
        </motion.h1>

        <motion.p
          className={styles.lede}
          {...rise}
          transition={{ duration: 0.46, ease: EASE, delay: 0.12 }}
        >
          Most travel tools open with a search box. Intripid starts with your
          dates, your budget and what you actually care about — then shows you
          where they point, and why.
        </motion.p>

        <motion.form
          className={styles.form}
          action="/discover"
          method="get"
          onSubmit={handleSubmit}
          {...rise}
          transition={{ duration: 0.46, ease: EASE, delay: 0.18 }}
        >
          <label className="srOnly" htmlFor="landing-origin">
            Where are you starting from?
          </label>
          <input
            id="landing-origin"
            className={styles.input}
            type="text"
            name="from"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            placeholder="Where are you starting from?"
            autoComplete="address-level2"
            enterKeyHint="go"
          />
          {/* Named explicitly: the label is display:none under 400px, and a
              button whose only remaining child is an aria-hidden arrow has
              no accessible name at all. */}
          <button
            type="submit"
            className={styles.submit}
            aria-label="Help me explore"
          >
            <span>Help me explore</span>
            <ArrowRight size={15} strokeWidth={2.2} aria-hidden />
          </button>
        </motion.form>

        <motion.p
          className={styles.note}
          {...rise}
          transition={{ duration: 0.4, ease: EASE, delay: 0.24 }}
        >
          Six questions. You can stop after two.
        </motion.p>
      </div>
    </main>
  );
}
