/**
 * Behavioural verification beyond screenshots.
 *
 *   node qa/verify.mjs               # against QA_BASE (default :3000)
 *   QA_BASE=http://localhost:3100 node qa/verify.mjs --no-token
 *
 * `--no-token` expects a server started with NEXT_PUBLIC_MAPBOX_TOKEN empty,
 * and asserts the app degrades to its designed fallback rather than crashing.
 */
import { chromium } from "playwright";

const BASE = process.env.QA_BASE ?? "http://localhost:3000";
const noToken = process.argv.includes("--no-token");

const browser = await chromium.launch();
const results = [];

function check(name, pass, detail) {
  results.push({ name, pass, detail });
}

/* -------------------------------------------------------------------------- */
/* Reduced motion                                                            */
/* -------------------------------------------------------------------------- */

if (!noToken) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => {
    if (m.type() === "error") errs.push(m.text().slice(0, 120));
  });

  await page.goto(`${BASE}/trip/nyc-spring`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-planner-ready]");
  await page.waitForTimeout(2000);

  // Every transition/animation must be neutralised by the global media query.
  const animated = await page.evaluate(() => {
    const offenders = [];
    for (const el of Array.from(document.querySelectorAll("*")).slice(0, 3000)) {
      const cs = getComputedStyle(el);
      const dur = parseFloat(cs.transitionDuration) || 0;
      const anim = parseFloat(cs.animationDuration) || 0;
      if (dur > 0.05 || anim > 0.05) {
        offenders.push(`${el.tagName}.${el.className}`.slice(0, 70));
      }
    }
    return offenders;
  });
  check(
    "reduced motion neutralises transitions",
    animated.length === 0,
    animated.length === 0
      ? "no element animates for longer than 50ms"
      : `${animated.length} still animating, e.g. ${animated.slice(0, 3).join(", ")}`,
  );

  // The planner must still be fully usable with motion off. Target a real
  // activity — commutes have no participants section.
  await page.locator('[data-event="i-frenchette-bakery"]').click();
  await page.waitForTimeout(400);
  const detailsVisible = await page.locator("text=/Who.s going/").count();
  check(
    "planner works with reduced motion",
    detailsVisible > 0,
    detailsVisible > 0 ? "selection still opens the details panel" : "details panel missing",
  );

  await page.screenshot({ path: "qa/screenshots/21-reduced-motion-planner.png" });
  check("no console errors under reduced motion", errs.length === 0, errs.join("; ") || "clean");
  await ctx.close();
}

/* -------------------------------------------------------------------------- */
/* No Mapbox token                                                           */
/* -------------------------------------------------------------------------- */

if (noToken) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => {
    if (m.type() === "error") errs.push(m.text().slice(0, 160));
  });
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message.slice(0, 160)));

  // Planner
  await page.goto(`${BASE}/trip/nyc-spring`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-planner-ready]");
  await page.waitForTimeout(1500);

  const fallback = await page.locator("text=Map unavailable").count();
  const calendarWorks = await page.locator("[data-event]").count();
  check(
    "planner shows the designed map fallback",
    fallback > 0,
    fallback > 0 ? "“Map unavailable” panel rendered" : "fallback missing",
  );
  check(
    "planner still usable without a token",
    calendarWorks > 20,
    `${calendarWorks} calendar items still render`,
  );

  await page.locator('[data-event="i-frenchette-bakery"]').click();
  await page.waitForTimeout(400);
  check(
    "selection still works without a map",
    (await page.locator("text=/Who.s going/").count()) > 0,
    "details panel opens",
  );
  await page.screenshot({ path: "qa/screenshots/22-no-token-planner.png" });

  // Discovery
  await page.goto(`${BASE}/discover`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=When do you want to travel?");
  await page.waitForTimeout(900);
  check(
    "discovery shows the map fallback",
    (await page.locator("text=Map unavailable").count()) > 0,
    "fallback rendered on the discovery canvas",
  );
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(300);
  check(
    "discovery flow advances without a map",
    (await page.locator("text=Where are you starting from?").count()) > 0,
    "step 2 reached",
  );
  await page.screenshot({ path: "qa/screenshots/23-no-token-discovery.png" });

  check("no console errors without a token", errs.length === 0, errs.join("; ") || "clean");
  await ctx.close();
}

await browser.close();

console.log(`\n=== ${noToken ? "NO-TOKEN" : "REDUCED MOTION"} VERIFICATION ===\n`);
for (const r of results) {
  console.log(`${r.pass ? "✓" : "✗"} ${r.name}\n    ${r.detail}`);
}
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} checks passed\n`);
process.exit(passed === results.length ? 0 : 1);
