"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";

import Image from "next/image";

import { Logo } from "@/components/brand/mark";
import { AvatarStack } from "@/components/ui/avatar";
import { site } from "@/config/site";
import { NYC_TRIP } from "@/data/nyc-trip";
import { plannerHrefForDates } from "@/data/trips";
import { useSessionApi } from "@/stores/session-store";

import { DateRangeField } from "./date-range-field";
import { ExploreCta } from "./explore-cta";
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
 * to go. So the page is now a place, and the only interactive things on it
 * are the two ways in: dates into the planner, or discovery if they do not
 * yet have a destination. Sign in is chrome, not a third door — it opens
 * the returning-traveller view.
 *
 * The scene behind it does the persuading. That is either supplied artwork
 * from `public/vista.*` or, with no file there, the scene drawn in
 * `vista.tsx` — `app/page.tsx` decides and passes `heroImage`. Everything
 * here sits in the top half of the viewport because that is the only region
 * where white type holds contrast; below the horizon the clouds are lit, and
 * that is true of the reference artwork as much as of the drawn version.
 */

/* The motion vocabulary from the rest of the product: a short rise, the
   product's own ease, and a stagger small enough to read as one movement. */
const rise = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const FEATURES = [
  {
    id: "ai-human",
    kicker: "01 — AI and human",
    title: "The perfect blend of AI efficiency and human expertise",
    body: "Intripid combines cutting-edge AI technology with seasoned travel advisors to create your ideal trip. Get the speed and precision of AI with the nuanced understanding only a human can provide.",
    image: "/features/now/ai-human-d.jpg",
    imageMobile: "/features/now/ai-human-m.jpg",
    alt: "The Intripid advisor offering AI suggestions on a live itinerary",
  },
  {
    id: "end-to-end",
    kicker: "02 — End to end",
    title: "Plan every detail with ease, from inspiration to adventure",
    body: "Intripid is your one-stop travel solution, guiding you through every step of your journey. Discover new destinations, create personalized itineraries, and manage your entire trip effortlessly.",
    image: "/features/now/end-to-end-d.jpg",
    imageMobile: "/features/now/end-to-end-day.jpg",
    alt: "A five-day New York itinerary on the Intripid planner, with the map beside it",
  },
  {
    id: "savor",
    kicker: "03 — Discovery",
    title: "Skip the stress, savor the journey",
    body: "Say goodbye to hours of cumbersome travel research. With Intripid, focus on what truly matters \u2014 enjoying your trip.",
    image: "/features/now/savor-d.jpg",
    imageMobile: "/features/now/savor-m.jpg",
    alt: "Destination Discovery ranking places against dates, budget and taste",
    cta: "discover",
  },
  {
    id: "teams",
    kicker: "04 — For teams",
    title: "Empower your team to explore the world",
    body: "Support your employees' mental health and work-life balance by making travel planning effortless. Offer Intripid as a unique and valuable employee benefit.",
    image: "/features/now/teams-d.jpg",
    imageMobile: "/features/now/teams-m.jpg",
    alt: "The Intripid dashboard with trips, persona and the people you plan with",
    cta: "action",
    ctaLabel: "Explore corporate plan",
  },
  {
    id: "advisors",
    kicker: "05 — For advisors",
    title: "Travel advisors, connect with millions of travelers",
    body: "Create unforgettable journeys. Join our platform to offer your expertise and find eager travelers looking for the perfect trip.",
    image: "/features/now/advisors-d.jpg",
    imageMobile: "/features/now/advisors-m.jpg",
    alt: "Travellers and advisors on a shared Intripid trip",
    cta: "action",
    ctaLabel: "Join as travel advisor",
  },
] as const;

const EASE = [0.2, 0, 0, 1] as const;
const viewOnce = { once: true, amount: 0.28 } as const;

function FeaturesBand() {
  const reduce = useReducedMotion();

  return (
    <section className={styles.features} aria-labelledby="features-heading">
      <h2 id="features-heading" className="srOnly">
        Why Intripid
      </h2>

      {FEATURES.map((feature, index) => (
        <article
          key={feature.id}
          id={feature.id}
          className={styles.sheet}
          style={{ zIndex: index + 1 }}
        >
          <div className={styles.sheetInner}>
            <header className={styles.sheetHead}>
              <p className={styles.sheetKicker}>
                <span aria-hidden />
                {feature.kicker}
              </p>
              <h3 className={styles.sheetTitle}>{feature.title}</h3>
              <div className={styles.sheetAside}>
                <p className={styles.sheetBody}>{feature.body}</p>
                {"cta" in feature && feature.cta === "discover" ? (
                  <ExploreCta />
                ) : "cta" in feature && feature.cta === "action" ? (
                  <button type="button" className={styles.sheetCta}>
                    {feature.ctaLabel}
                  </button>
                ) : null}
              </div>
            </header>

            <motion.figure
              className={styles.shot}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={viewOnce}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <div className={styles.shotDeskFrame}>
                <Image
                  src={feature.image}
                  alt={feature.alt}
                  fill
                  sizes="800px"
                  quality={90}
                  style={{ objectFit: "contain", objectPosition: "top center" }}
                />
              </div>
              <div className={styles.shotPhoneFrame}>
                <Image
                  src={feature.imageMobile}
                  alt=""
                  aria-hidden
                  fill
                  sizes="220px"
                  quality={90}
                  style={{ objectFit: "contain", objectPosition: "top center" }}
                />
              </div>
            </motion.figure>
          </div>
        </article>
      ))}
    </section>
  );
}

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

export function Landing({ heroImage }: { heroImage?: string | null }) {
  const router = useRouter();
  const session = useSessionApi();
  const [start, setStart] = useState(NYC_TRIP.startDate);
  const [end, setEnd] = useState(NYC_TRIP.endDate);

  const invalid = end < start;

  function handleDates(nextStart: string, nextEnd: string) {
    setStart(nextStart);
    setEnd(nextEnd);
  }

  /**
   * Two doors, same as the dashboard's quick-trip panel.
   *
   * Build trip is for people who already have dates: it opens an empty
   * planner on those nights. Help me explore is the door when they still
   * need a destination.
   *
   * The form's `action` and the explore `<Link>` are the mechanism; the
   * router push is the enhancement. Both ways in work before hydration.
   */
  function handleBuild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalid) return;
    router.push(plannerHrefForDates(start, end));
  }

  function handleSignIn() {
    session.getState().signIn();
    router.push("/dashboard");
  }

  return (
    <main className={styles.root}>
      <div className={`${styles.doorway} onEnv`}>
        {heroImage ? <VistaImage src={heroImage} /> : <Vista />}

        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label={site.name}>
            <Logo size={24} onDark priority />
          </Link>

          <button type="button" className={styles.signIn} onClick={handleSignIn}>
            Sign in
          </button>
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
          Discover, plan and <em>enjoy</em>
        </motion.h1>

        <motion.p
          className={styles.lede}
          {...rise}
          transition={{ duration: 0.46, ease: EASE, delay: 0.12 }}
        >
          Start with the dates you have. Open a blank plan, then fill it
          in — or explore if you do not know where yet.
        </motion.p>

        <motion.div
          className={styles.door}
          {...rise}
          transition={{ duration: 0.46, ease: EASE, delay: 0.18 }}
        >
          <form
            className={styles.form}
            action="/trip/draft"
            method="get"
            onSubmit={handleBuild}
          >
            <DateRangeField
              start={start}
              end={end}
              onChange={handleDates}
              className={styles.dates}
            />
            {invalid ? (
              <p className="srOnly" role="alert">
                The end date is before the start date.
              </p>
            ) : null}
            <button
              type="submit"
              className={styles.submit}
              disabled={invalid}
            >
              <span>Build trip</span>
              <ArrowRight size={15} strokeWidth={2.2} aria-hidden />
            </button>
          </form>

          <div className={styles.alt}>
            <p className={styles.altPrompt}>
              <span>Don&rsquo;t know where to go?</span>
            </p>
            <ExploreCta />
          </div>
        </motion.div>
        </div>

        <div className={styles.horizonFade} aria-hidden />
      </div>

      <FeaturesBand />

      <footer className={styles.footer}>
        <Image
          className={styles.footerPhoto}
          src="/footer-vista.png"
          alt=""
          fill
          sizes="100vw"
          quality={90}
        />
        <div className={styles.footerMatter}>
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>
              <Link href="/" className={styles.footerLogo} aria-label={site.name}>
                <Logo size={36} />
              </Link>
              <p className={styles.footerTagline}>{site.tagline}</p>
              <ul className={styles.footerSocial}>
                {site.social.map((account) => (
                  <li key={account.id}>
                    <a
                      href={account.href}
                      aria-label={account.label}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {SOCIAL_ICONS[account.id]}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <nav className={styles.footerNav} aria-label="Footer">
              <div className={styles.footerCol}>
                <p className={styles.footerHeading}>Product</p>
                <Link href="/discover">Discover destinations</Link>
                <Link href="/discover">Plan a trip</Link>
                <button type="button" onClick={handleSignIn}>
                  Sign in
                </button>
              </div>
              <div className={styles.footerCol}>
                <p className={styles.footerHeading}>Platform</p>
                <a href="#ai-human">Why Intripid</a>
                <a href="#teams">For teams</a>
                <a href="#advisors">For advisors</a>
              </div>
            </nav>
          </div>

          <p className={styles.footerCopy}>
            © {new Date().getFullYear()} {site.name}
          </p>
        </div>
      </footer>
    </main>
  );
}
