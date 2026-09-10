/**
 * Exercises the two drag paths the product needs to be more than a mock:
 * moving a scheduled activity, and promoting an idea onto the calendar.
 *
 * Run with a dev or production server up:  node qa/drag-test.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.QA_BASE ?? "http://localhost:3000";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 140));
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 140)));

await page.goto(`${BASE}/trip/nyc-spring`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-planner-ready]");
await page.waitForTimeout(2500);

/** Drags between two points with enough intermediate moves for dnd-kit. */
async function drag(from, to, steps = 14) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      from.x + ((to.x - from.x) * i) / steps,
      from.y + ((to.y - from.y) * i) / steps,
    );
    await page.waitForTimeout(18);
  }
  await page.mouse.up();
  await page.waitForTimeout(750);
}

const results = [];

/* -------------------------------------------------------------------------- */
/* 1. Move a scheduled activity two hours later                              */
/* -------------------------------------------------------------------------- */

const card = page.locator('[data-event="i-frenchette-bakery"]');
const before = await card.boundingBox();
await drag(
  { x: before.x + before.width / 2, y: before.y + 14 },
  { x: before.x + before.width / 2, y: before.y + 14 + 112 }, // 2h at 56px/hr
);
const after = await card.boundingBox();
const delta = Math.round((after?.y ?? 0) - before.y);
results.push({
  name: "move a scheduled activity",
  pass: after !== null && Math.abs(delta - 112) < 10,
  detail: `moved ${delta}px (expected ~112 = 2h)`,
});

/* -------------------------------------------------------------------------- */
/* 2. Promote an idea from the rail onto a day column                        */
/* -------------------------------------------------------------------------- */

// The move above selected an item, which flips the panel to Details.
await page.getByRole("tab", { name: /Ideas/ }).click();
await page.waitForTimeout(400);

const ideasBefore = await page.locator("[data-idea]").count();
const eventsBefore = await page.locator("[data-event]").count();

const grip = page.locator("[data-idea-grip]").first();
const gripBox = await grip.boundingBox();
const dayTwo = await page
  .locator('[class*="calendar-module"][class*="column"]')
  .nth(1)
  .boundingBox();

// Grab near the top of the grip: it stretches the full card height, so its
// centre can fall below the viewport on a short window.
await drag(
  {
    x: gripBox.x + gripBox.width / 2,
    y: gripBox.y + Math.min(gripBox.height / 2, 40),
  },
  { x: dayTwo.x + dayTwo.width / 2, y: dayTwo.y + 430 },
);

const toast = await page
  .locator('[class*="overlay-module"][class*="toast"]')
  .first()
  .textContent()
  .catch(() => null);
const eventsAfter = await page.locator("[data-event]").count();

// Reopen the rail to confirm the idea left the backlog.
await page.getByRole("tab", { name: /Ideas/ }).click().catch(() => {});
await page.waitForTimeout(400);
const ideasAfter = await page.locator("[data-idea]").count();

results.push({
  name: "schedule an idea by dragging",
  pass: eventsAfter === eventsBefore + 1 && ideasAfter === ideasBefore - 1,
  detail: `events ${eventsBefore}→${eventsAfter}, ideas ${ideasBefore}→${ideasAfter}, toast: ${
    toast?.trim() || "(none)"
  }`,
});

/* -------------------------------------------------------------------------- */
/* 3. A locked stay must refuse to move                                      */
/* -------------------------------------------------------------------------- */

const stay = page.locator('[class*="calendar-module"][class*="stayBar"]').first();
const stayBox = await stay.boundingBox();
if (stayBox) {
  await drag(
    { x: stayBox.x + 120, y: stayBox.y + stayBox.height / 2 },
    { x: stayBox.x + 120, y: stayBox.y + 300 },
  );
  const stayAfter = await stay.boundingBox();
  results.push({
    name: "locked stay resists dragging",
    pass: Math.abs((stayAfter?.y ?? 0) - stayBox.y) < 4,
    detail: `stay stayed put (moved ${Math.round((stayAfter?.y ?? 0) - stayBox.y)}px)`,
  });
}

await page.screenshot({ path: "qa/screenshots/_drag-result.png" });

console.log("\n=== DRAG BEHAVIOUR ===\n");
for (const r of results) {
  console.log(`${r.pass ? "✓" : "✗"} ${r.name}\n    ${r.detail}`);
}
console.log(
  `\nconsole errors: ${errors.length ? errors.join("\n  ") : "none"}`,
);
console.log(
  `${results.filter((r) => r.pass).length}/${results.length} drag paths working\n`,
);

await browser.close();
process.exit(results.every((r) => r.pass) ? 0 : 1);
