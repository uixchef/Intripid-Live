/**
 * Visual QA capture.
 *
 * Drives the real app in Chromium, captures screenshots into
 * qa/screenshots/, and reports console errors plus horizontal-overflow
 * checks. Run against a dev or production server:
 *
 *   node qa/shoot.mjs                # all shots
 *   node qa/shoot.mjs planner        # only shots whose name matches
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.QA_BASE ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "qa", "screenshots");
const filter = process.argv[2] ?? "";

const DESKTOP = { width: 1440, height: 900 };
const SMALL_DESKTOP = { width: 1180, height: 800 };
const PHONE = { width: 390, height: 844 };
const PHONE_SE = { width: 375, height: 667 };
const NARROW = { width: 320, height: 720 };

/** Give Mapbox time to load tiles and settle its camera. */
async function settleMap(page, ms = 2600) {
  await page.waitForTimeout(ms);
}

const shots = [
  {
    name: "01-landing-desktop",
    viewport: DESKTOP,
    url: "/",
    async run(page) {
      await page.waitForSelector("h1");
      await page.waitForTimeout(900);
    },
  },
  {
    name: "02-discovery-dates-desktop",
    viewport: DESKTOP,
    url: "/discover",
    async run(page) {
      await page.waitForSelector("text=When do you want to travel?");
      await settleMap(page);
    },
  },
  {
    name: "03-discovery-budget-desktop",
    viewport: DESKTOP,
    url: "/discover",
    async run(page) {
      await page.waitForSelector("text=When do you want to travel?");
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByRole("radio", { name: /London/ }).click();
      await page.getByRole("radio", { name: "Go abroad" }).click();
      await page.getByRole("button", { name: "Continue" }).click();
      await page.waitForSelector("text=Premium");
      await page.getByRole("radio", { name: /Premium/ }).click();
      await settleMap(page);
    },
  },
  {
    name: "04-discovery-results-desktop",
    viewport: DESKTOP,
    url: "/discover",
    async run(page) {
      await runDiscoveryToResults(page);
      await settleMap(page);
    },
  },
  {
    name: "05-destination-brief-desktop",
    viewport: DESKTOP,
    url: "/discover",
    async run(page) {
      await runDiscoveryToResults(page);
      await page.getByRole("button", { name: /New York City/ }).first().click();
      await page.waitForSelector("text=Why it placed here");
      await settleMap(page);
    },
  },
  {
    name: "06-planner-desktop",
    viewport: DESKTOP,
    url: "/trip/nyc-spring",
    async run(page) {
      await page.waitForSelector("[data-planner-ready]");
      await settleMap(page);
    },
  },
  {
    name: "07-planner-selected-desktop",
    viewport: DESKTOP,
    url: "/trip/nyc-spring",
    async run(page) {
      await page.waitForSelector("[data-planner-ready]");
      await settleMap(page, 2000);
      await page.locator("[data-event]").first().click();
      await page.waitForTimeout(1200);
    },
  },
  {
    name: "08-planner-editing-desktop",
    viewport: DESKTOP,
    url: "/trip/nyc-spring",
    async run(page) {
      await page.waitForSelector("[data-planner-ready]");
      await settleMap(page, 2000);
      await page.locator("[data-event]").first().dblclick();
      await page.waitForTimeout(1000);
    },
  },
  {
    name: "09-planner-itinerary-desktop",
    viewport: DESKTOP,
    url: "/trip/nyc-spring",
    async run(page) {
      await page.waitForSelector("[data-planner-ready]");
      await page.getByRole("radio", { name: "Itinerary" }).click();
      await settleMap(page);
    },
  },
  {
    name: "10-planner-assistant-desktop",
    viewport: DESKTOP,
    url: "/trip/nyc-spring",
    async run(page) {
      await page.waitForSelector("[data-planner-ready]");
      await settleMap(page, 2000);
      // Day 3 carries the seeded overlap.
      await page.locator("[data-day-tab]").nth(2).click();
      await page.waitForTimeout(700);
      const resolve = page.getByRole("button", { name: /Resolve clash/i }).first();
      if (await resolve.count()) {
        await resolve.click();
        await page.waitForTimeout(900);
      }
    },
  },
  {
    name: "11-planner-small-desktop",
    viewport: SMALL_DESKTOP,
    url: "/trip/nyc-spring",
    async run(page) {
      await page.waitForSelector("[data-planner-ready]");
      await settleMap(page);
    },
  },
  {
    name: "12-mobile-discovery",
    viewport: PHONE,
    url: "/discover",
    async run(page) {
      await page.waitForSelector("text=When do you want to travel?");
      await settleMap(page);
    },
  },
  {
    name: "13-mobile-discovery-results",
    viewport: PHONE,
    url: "/discover",
    async run(page) {
      await runDiscoveryToResults(page);
      await settleMap(page);
    },
  },
  {
    name: "14-mobile-planner",
    viewport: PHONE,
    url: "/trip/nyc-spring",
    async run(page) {
      await page.waitForSelector("[data-planner-ready]");
      await settleMap(page);
    },
  },
  {
    name: "15-mobile-activity-detail",
    viewport: PHONE,
    url: "/trip/nyc-spring",
    async run(page) {
      await page.waitForSelector("[data-planner-ready]");
      await page.waitForTimeout(1500);
      await page.locator("[data-event]").first().click();
      await page.waitForTimeout(1100);
    },
  },
  {
    name: "16-mobile-planner-map",
    viewport: PHONE,
    url: "/trip/nyc-spring",
    async run(page) {
      await page.waitForSelector("[data-planner-ready]");
      const toggle = page.getByRole("button", { name: /^Map$/ }).first();
      if (await toggle.count()) await toggle.click();
      await settleMap(page);
    },
  },
  {
    name: "17-mobile-se-planner",
    viewport: PHONE_SE,
    url: "/trip/nyc-spring",
    async run(page) {
      await page.waitForSelector("[data-planner-ready]");
      await settleMap(page);
    },
  },
  {
    name: "18-narrow-320-planner",
    viewport: NARROW,
    url: "/trip/nyc-spring",
    async run(page) {
      await page.waitForSelector("[data-planner-ready]");
      await settleMap(page);
    },
  },
  {
    name: "19-narrow-320-discovery",
    viewport: NARROW,
    url: "/discover",
    async run(page) {
      await page.waitForSelector("text=When do you want to travel?");
      await settleMap(page);
    },
  },
  {
    // Mid-flow on a phone: completed steps, the map at the origin, and the
    // live leaderboard that makes the ranking's responsiveness visible.
    name: "24-mobile-discovery-midflow",
    viewport: PHONE,
    url: "/discover",
    async run(page) {
      await page.waitForSelector("text=When do you want to travel?");
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByRole("radio", { name: /London/ }).click();
      await page.getByRole("radio", { name: "Go abroad" }).click();
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByRole("radio", { name: /Premium/ }).click();
      await settleMap(page);
    },
  },
  {
    name: "20-landing-mobile",
    viewport: PHONE,
    url: "/",
    async run(page) {
      await page.waitForSelector("h1");
      await page.waitForTimeout(800);
    },
  },
];

/** Walks the discovery flow to the results stage. */
async function runDiscoveryToResults(page) {
  await page.waitForSelector("text=When do you want to travel?");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: /London/ }).click();
  await page.getByRole("radio", { name: "Go abroad" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: /Premium/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /^City/ }).click();
  await page.getByRole("button", { name: /^Culture/ }).click();
  await page.getByRole("button", { name: /^Food/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Museums/ }).click();
  await page.getByRole("button", { name: /Fine dining/ }).click();
  await page.getByRole("button", { name: "See matches" }).click();
  // The processing narration runs, then the ranked rail appears.
  await page.waitForSelector("text=/worth your time|Nothing scored well/", {
    timeout: 20000,
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const results = [];

  for (const shot of shots) {
    if (filter && !shot.name.includes(filter)) continue;

    const context = await browser.newContext({
      viewport: shot.viewport,
      deviceScaleFactor: 2,
      reducedMotion: shot.reducedMotion ? "reduce" : "no-preference",
    });
    const page = await context.newPage();

    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

    let status = "ok";
    try {
      await page.goto(`${BASE}${shot.url}`, { waitUntil: "domcontentloaded" });
      await shot.run(page);
      await page.screenshot({
        path: path.join(OUT, `${shot.name}.png`),
        fullPage: Boolean(shot.fullPage),
      });
    } catch (error) {
      status = `FAILED: ${error.message.split("\n")[0]}`;
    }

    // Horizontal overflow check — the page body must never scroll sideways.
    let overflow = null;
    try {
      overflow = await page.evaluate(() => {
        const de = document.documentElement;
        return {
          scrollW: de.scrollWidth,
          clientW: de.clientWidth,
          overflowing: de.scrollWidth > de.clientWidth + 1,
        };
      });
    } catch {
      /* page may have failed to load */
    }

    results.push({
      name: shot.name,
      viewport: `${shot.viewport.width}x${shot.viewport.height}`,
      status,
      overflow,
      errors: errors.filter(
        (e) =>
          // Mapbox emits benign telemetry/abort noise on fast teardown.
          !/ERR_ABORTED|events.mapbox.com|Failed to load resource.*mapbox/i.test(e),
      ),
    });

    await context.close();
  }

  await browser.close();

  console.log("\n=== QA RESULTS ===\n");
  for (const r of results) {
    const of = r.overflow?.overflowing
      ? ` OVERFLOW(${r.overflow.scrollW}>${r.overflow.clientW})`
      : "";
    const errs = r.errors.length ? ` ERRORS(${r.errors.length})` : "";
    console.log(`${r.status === "ok" ? "✓" : "✗"} ${r.name} [${r.viewport}]${of}${errs}`);
    if (r.status !== "ok") console.log(`    ${r.status}`);
    for (const e of r.errors.slice(0, 4)) console.log(`    ! ${e.slice(0, 200)}`);
  }

  const bad = results.filter(
    (r) => r.status !== "ok" || r.errors.length || r.overflow?.overflowing,
  );
  console.log(
    `\n${results.length - bad.length}/${results.length} clean\n`,
  );
}

main();
