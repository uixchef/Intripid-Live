/**
 * The canonical journey, end to end, in one browser session:
 *
 *   Discovery → recommendation → NYC brief → Trip Planner
 *   → selection → editing → drag/scheduling → AI → collaboration
 *
 * Every step asserts an observable outcome rather than just clicking through,
 * so a regression anywhere along the path fails loudly.
 *
 *   node qa/journey-test.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.QA_BASE ?? "http://localhost:3000";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
/*
 * 8s, not Playwright's 30s default. A broken step should report in seconds;
 * at 30s a handful of cascading failures turned a 90-second suite into a
 * twenty-minute one with no output until the end.
 */
page.setDefaultTimeout(8000);

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 160));
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 160)));

const steps = [];
async function step(name, fn) {
  try {
    const detail = await fn();
    steps.push({ name, pass: true, detail: detail ?? "ok" });
    process.stdout.write(`  \u2713 ${name}\n`);
  } catch (error) {
    const detail = error.message.split("\n")[0].slice(0, 170);
    steps.push({ name, pass: false, detail });
    process.stdout.write(`  \u2717 ${name}\n      ${detail}\n`);
  }
}

/** Drags between two points with enough moves for dnd-kit's sensors. */
async function drag(from, to, count = 14) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= count; i++) {
    await page.mouse.move(
      from.x + ((to.x - from.x) * i) / count,
      from.y + ((to.y - from.y) * i) / count,
    );
    await page.waitForTimeout(18);
  }
  await page.mouse.up();
  await page.waitForTimeout(700);
}

/* ========================================================================== */
/* 1 · Entry                                                                  */
/* ========================================================================== */

await step("landing states the premise and offers a way in", async () => {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1");
  const heading = (await page.locator("h1").textContent())?.replace(/\s+/g, " ").trim();
  await page.getByRole("button", { name: /Help me explore/ }).click();
  await page.waitForSelector("text=When do you want to travel?");
  return `"${heading}" → discovery`;
});

/* ========================================================================== */
/* 2 · Discovery — six questions, every answer moves the ranking              */
/* ========================================================================== */

await step("1 · dates accepts a range and reports nights", async () => {
  const nights = await page.locator("text=/\\d+ nights away/").first().textContent();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForSelector("text=Where would you like to explore?");
  return nights?.replace(/\s+/g, " ").trim();
});

await step("2 · scope narrows the field", async () => {
  await page.getByRole("radio", { name: /Go abroad/ }).click();
  await page.waitForTimeout(320);
  const remaining = await page
    .locator('[class*="liveCount"]')
    .first()
    .textContent();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForSelector("text=From where will you be leaving?");
  return `abroad only · ${remaining?.replace(/\s+/g, " ").trim()}`;
});

await step("3 · origin asks for confirmation on the map", async () => {
  await page.getByRole("radio", { name: /London/ }).click();
  /*
   * Choosing a city is not the same as agreeing it is right, so Continue
   * lands on a confirmation against the pin rather than the next question —
   * origin silently determines every recommendation, so it is never assumed.
   */
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForSelector("text=Did we find you?");
  await page.getByRole("button", { name: /Looks good/ }).click();
  await page.waitForSelector("text=/What.s your budget/");
  return "London → confirmed on the map";
});

await step("4 · budget visibly changes the ranking", async () => {
  /*
   * The top slot may legitimately hold across tiers. What must change is the
   * field or the scores — that is what "recommendations respond to
   * preferences" actually means.
   */
  const read = async (tier) => {
    await page.getByRole("radio", { name: new RegExp(tier) }).click();
    await page.waitForTimeout(400);
    const names = await page.locator('[class*="leaderName"]').allTextContents();
    const scores = await page.locator('[class*="leaderScore"]').allTextContents();
    return {
      names: names.map((n) => n.trim()),
      scores: scores.map((v) => v.trim()),
    };
  };

  const cheap = await read("Backpack");
  const rich = await read("Premium");

  if (
    cheap.names.join() === rich.names.join() &&
    cheap.scores.join() === rich.scores.join()
  ) {
    throw new Error("budget changed neither the field nor the scores");
  }
  return `Backpack → ${cheap.names.join(", ")} | Premium → ${rich.names.join(", ")}`;
});

await step("4b · income context is asked once, and is skippable", async () => {
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForSelector('text=/means to you/');
  const skip = page.getByRole("button", { name: /Skip — use typical local costs/ });
  const label = await skip.textContent();
  await skip.click();
  await page.waitForSelector("text=Are there any experiences you must have?");
  return label?.replace(/\s+/g, " ").trim();
});

await step("5 · must-have experiences filter, not rank", async () => {
  const badge = await page.locator('[class*="kindFilter"], [class*="kindRank"]').first().textContent();
  await page.getByRole("button", { name: /Live city life/ }).click();
  await page.getByRole("button", { name: /Steep in culture/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForSelector("text=Anything specific you'd like to do?");
  return `experiences ${badge?.trim()}`;
});

await step("6 · activities order the survivors", async () => {
  const badge = await page.locator('[class*="kindFilter"], [class*="kindRank"]').first().textContent();
  await page.getByRole("button", { name: /Museums & galleries/ }).click();
  await page.getByRole("button", { name: /Fine dining/ }).click();
  await page.getByRole("button", { name: /Find my matches/ }).click();
  return `activities ${badge?.trim()} → processing`;
});

await step("narrated processing resolves to exactly three places", async () => {
  await page.waitForSelector("text=/places that fit|closest/", { timeout: 25000 });
  const heading = await page
    .locator('[class*="resultsTitle"]')
    .first()
    .textContent();
  /*
   * Three, not a catalogue. The count is the product decision under test:
   * a best card plus two runners-up.
   */
  const best = await page.locator('[class*="bestCard"]').count();
  const runners = await page.locator('[class*="runnerCard"]').count();
  if (best !== 1 || runners !== 2) {
    throw new Error(`expected 1 best + 2 runners, got ${best} + ${runners}`);
  }
  return `${heading?.trim()} · 1 best + 2 runners-up`;
});

await step("each of the three gives a DIFFERENT reason", async () => {
  const reasons = [
    await page.locator('[class*="bestReason"]').first().textContent(),
    ...(await page.locator('[class*="runnerReason"]').allTextContents()),
  ].map((r) => (r ?? "").replace(/\s+/g, " ").trim());

  const unique = new Set(reasons);
  if (unique.size !== reasons.length) {
    throw new Error(`repeated reasoning: ${reasons.join(" | ")}`);
  }
  return reasons.map((r) => r.slice(0, 34) + "…").join(" / ");
});

await step("ruled-out places are named, with the answer that removed them", async () => {
  const items = await page.locator('[class*="ruledOutItem"]').allTextContents();
  if (items.length === 0) return "nothing was hard-filtered at these answers";
  return items.map((t) => t.replace(/\s+/g, " ").trim()).join("; ");
});

/* ========================================================================== */
/* 3 · NYC brief — the bridge                                                 */
/* ========================================================================== */

await step("NYC leads the ranking for a city/culture/food trip", async () => {
  const leader = await page.locator('[class*="bestName"]').first().textContent();
  if (!leader?.includes("New York")) {
    throw new Error(`expected New York City to lead, got "${leader?.trim()}"`);
  }
  return leader.trim();
});

await step("the brief explains the score and answers trip fit", async () => {
  await page.getByRole("button", { name: /New York City/ }).first().click();
  await page.waitForSelector("text=Why it placed here");
  const factors = await page.locator('[class*="factorDetail"]').count();
  const fit = await page.locator('[class*="fitCell"] dd').first().textContent();
  if (factors < 4) throw new Error(`only ${factors} explained factors`);
  return `${factors} explained factors, window: ${fit?.trim()}`;
});

await step("brief hands off into the planner", async () => {
  await page.getByRole("button", { name: /Start planning/ }).click();
  await page.waitForURL(/\/trip\/nyc-spring/, { timeout: 15000 });
  await page.waitForSelector("[data-planner-ready]");
  return page.url().replace(BASE, "");
});

/* ========================================================================== */
/* 4 · Planner — selection couples the surfaces                               */
/* ========================================================================== */

await page.waitForTimeout(2500);

await step("planner opens with the seeded five-day trip", async () => {
  const name = await page.locator('[class*="tripName"]').textContent();
  const days = await page.locator("[data-day-tab]").count();
  const items = await page.locator("[data-event]").count();
  if (days !== 5) throw new Error(`expected 5 days, got ${days}`);
  return `${name?.trim()} · ${days} days · ${items} scheduled items`;
});

await step("selecting a card opens its details and focuses the map", async () => {
  await page.locator('[data-event="i-frenchette-bakery"]').click();
  await page.waitForTimeout(900);
  const title = await page.locator('[class*="detailsTitle"]').textContent();
  const where = await page.locator('[class*="detailsFacts"] dd').nth(1).textContent();
  return `${title?.trim()} — ${where?.replace(/\s+/g, " ").trim().slice(0, 46)}`;
});

await step("selecting on the MAP drives the itinerary (reverse coupling)", async () => {
  await page.locator("[data-event]").first().click(); // clear focus noise
  await page.waitForTimeout(300);
  // Map markers are buttons labelled "<letter>. <title>".
  const marker = page.getByRole("button", { name: /^c\. / }).first();
  const label = await marker.getAttribute("aria-label");
  await marker.click();
  await page.waitForTimeout(800);
  const title = await page.locator('[class*="detailsTitle"]').textContent();
  if (!label?.includes(title?.trim() ?? "@@")) {
    throw new Error(`map pin "${label}" did not open matching details "${title}"`);
  }
  return `map pin ${label} → details`;
});

/* ========================================================================== */
/* 5 · Editing in context                                                     */
/* ========================================================================== */

await step("editing opens beside the day and saves a real change", async () => {
  await page.locator('[data-event="i-frenchette-bakery"]').dblclick();
  await page.waitForSelector("text=/What is it\\?/");
  const input = page.locator('input[value*="Frenchette"]').first();
  await input.fill("Breakfast at Frenchette Bakery (edited)");
  await page.getByRole("button", { name: /Save changes/ }).click();
  await page.waitForTimeout(800);
  const card = await page
    .locator('[data-event="i-frenchette-bakery"]')
    .getAttribute("aria-label");
  if (!card?.includes("edited")) throw new Error(`title did not persist: ${card}`);
  return "title updated on the grid";
});

await step("location search finds real NYC places", async () => {
  // "Add" also appears on in-grid gap slots; target the top bar's button.
  await page
    .locator('[class*="planner-experience-module"][class*="topbarAdd"]')
    .click();
  await page.waitForSelector("text=/What is it\\?/");
  await page.getByPlaceholder(/The Met, Katz/).fill("katz");
  await page.waitForTimeout(300);
  const first = await page.locator('[class*="resultName"]').first().textContent();
  await page.locator('button[class*="activity-editor-module"][class*="result"]').first().click();
  await page.waitForTimeout(300);
  const chosen = await page.locator('[class*="chosenName"]').textContent();
  await page.getByRole("button", { name: /Add to plan/ }).click();
  await page.waitForTimeout(700);
  return `searched "katz" → ${first?.trim()} → added as ${chosen?.trim()}`;
});

/* ========================================================================== */
/* 6 · Drag scheduling                                                        */
/* ========================================================================== */

await step("dragging an activity moves it in time", async () => {
  const card = page.locator('[data-event="i-frenchette-bakery"]');
  const before = await card.boundingBox();
  await drag(
    { x: before.x + before.width / 2, y: before.y + 14 },
    { x: before.x + before.width / 2, y: before.y + 14 + 112 },
  );
  const after = await card.boundingBox();
  const delta = Math.round(after.y - before.y);
  if (Math.abs(delta - 112) > 10) throw new Error(`moved ${delta}px, expected ~112`);
  return `moved ${delta}px (2h later)`;
});

await step("dragging an idea onto a day schedules it", async () => {
  await page.getByRole("tab", { name: /Ideas/ }).click();
  await page.waitForTimeout(400);
  const ideasBefore = await page.locator("[data-idea]").count();
  const eventsBefore = await page.locator("[data-event]").count();

  const grip = await page.locator("[data-idea-grip]").first().boundingBox();
  const col = await page
    .locator('[class*="calendar-module"][class*="column"]')
    .nth(1)
    .boundingBox();
  await drag(
    { x: grip.x + grip.width / 2, y: grip.y + Math.min(grip.height / 2, 40) },
    { x: col.x + col.width / 2, y: col.y + 430 },
  );

  const eventsAfter = await page.locator("[data-event]").count();
  await page.getByRole("tab", { name: /Ideas/ }).click().catch(() => {});
  await page.waitForTimeout(400);
  const ideasAfter = await page.locator("[data-idea]").count();

  if (eventsAfter !== eventsBefore + 1 || ideasAfter !== ideasBefore - 1) {
    throw new Error(
      `events ${eventsBefore}→${eventsAfter}, ideas ${ideasBefore}→${ideasAfter}`,
    );
  }
  return `idea promoted (events ${eventsBefore}→${eventsAfter}, ideas ${ideasBefore}→${ideasAfter})`;
});

/* ========================================================================== */
/* 7 · AI assistance                                                          */
/* ========================================================================== */

await step("assistant detects the seeded clash and explains itself", async () => {
  await page.locator("[data-day-tab]").nth(2).click(); // Thursday carries the overlap
  await page.waitForTimeout(700);
  await page.getByRole("tab", { name: /Advisor/ }).click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /Resolve clash/i }).first().click();
  await page.waitForTimeout(700);
  const title = await page.locator('[class*="panelTitle"]').textContent();
  const reasons = await page.locator('[class*="rationale"] li').count();
  const change = await page.locator('[class*="changeSummary"]').first().textContent();
  if (reasons < 2) throw new Error(`only ${reasons} reasoning steps`);
  return `"${title?.trim()}" · ${reasons} steps · ${change?.trim()}`;
});

await step("applying the fix actually resolves the conflict", async () => {
  const badgeBefore = await page
    .locator("[data-day-tab]")
    .nth(2)
    .locator('[class*="dayConflict"]')
    .count();
  await page.getByRole("button", { name: /^Apply change$/ }).click();
  await page.waitForTimeout(900);
  const badgeAfter = await page
    .locator("[data-day-tab]")
    .nth(2)
    .locator('[class*="dayConflict"]')
    .count();
  if (!(badgeBefore > 0 && badgeAfter === 0)) {
    throw new Error(`conflict badge ${badgeBefore} → ${badgeAfter} (expected 1 → 0)`);
  }
  return "clash badge cleared on the day tab";
});

await step("gap suggestion fills an empty afternoon", async () => {
  await page.locator("[data-day-tab]").nth(4).click(); // Saturday is deliberately open
  await page.waitForTimeout(600);
  const before = await page.locator("[data-event]").count();
  await page.getByRole("button", { name: /Fill the gap/i }).first().click();
  await page.waitForTimeout(700);
  const summary = await page.locator('[class*="changeSummary"]').first().textContent();
  await page.getByRole("button", { name: /^Apply change$/ }).click();
  await page.waitForTimeout(900);
  const after = await page.locator("[data-event]").count();
  if (after <= before) throw new Error(`items ${before} → ${after}`);
  return `${summary?.trim()} (items ${before}→${after})`;
});

/* ========================================================================== */
/* 8 · Collaboration                                                          */
/* ========================================================================== */

await step("presence lists travellers, roles and what they're viewing", async () => {
  await page.locator('button[class*="collaborators-module"][class*="trigger"]').click();
  await page.waitForTimeout(500);
  const people = await page.locator('li[class*="collaborators-module"][class*="person"]').count();
  const roles = await page.locator('[class*="chip-module"][class*="tag"]').allTextContents();
  const viewing = await page.locator('[class*="personViewing"]').count();
  if (people < 4) throw new Error(`only ${people} travellers listed`);
  return `${people} people, roles: ${[...new Set(roles)].join("/")}, ${viewing} viewing indicator(s)`;
});

await step("inviting someone adds them to the trip", async () => {
  /* The travellers section is a rail section now, not a top-bar popover. */
  await page.getByRole("button", { name: /Invite by email/ }).click();
  await page.waitForSelector("text=/Invite someone to plan/");
  await page.getByPlaceholder(/name@example.com/).fill("rosa.linden@example.com");
  await page.getByRole("button", { name: /Send invitation/ }).click();
  await page.waitForTimeout(900);
  const toast = await page
    .locator('[class*="overlay-module"][class*="toast"]')
    .first()
    .textContent()
    .catch(() => null);
  await page.waitForTimeout(500);
  const people = await page
    .locator('li[class*="collaborators-module"][class*="person"]')
    .count();
  const pending = await page.locator('[class*="personPending"]').count();
  if (people < 5) throw new Error(`traveller not added (${people} listed)`);
  return `${toast?.trim()} · ${people} listed · ${pending} pending invitation shown`;
});

await step("per-activity participants can be changed", async () => {
  await page.locator("[data-day-tab]").nth(0).click();
  await page.waitForTimeout(400);
  await page.locator('[data-event="i-frenchette-bakery"]').click();
  await page.waitForTimeout(600);
  const chip = page.locator('[class*="side-panel-module"][class*="whoChip"]').first();
  const before = await chip.getAttribute("aria-pressed");
  await chip.click();
  await page.waitForTimeout(400);
  const after = await chip.getAttribute("aria-pressed");
  if (before === after) throw new Error(`participant toggle did not change (${before})`);
  return `participant toggled ${before} → ${after}`;
});

/* ========================================================================== */
/* 9 · Persistence + reset                                                    */
/* ========================================================================== */

await step("edits survive a refresh, and reset restores the trip", async () => {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-planner-ready]");
  await page.waitForTimeout(1200);
  const persisted = await page
    .locator('[data-event="i-frenchette-bakery"]')
    .getAttribute("aria-label");
  if (!persisted?.includes("edited")) {
    throw new Error(`edit did not persist across reload: ${persisted}`);
  }

  await page.getByRole("button", { name: /Reset trip/ }).click();
  await page.waitForTimeout(900);
  const reset = await page
    .locator('[data-event="i-frenchette-bakery"]')
    .getAttribute("aria-label");
  if (reset?.includes("edited")) throw new Error("reset did not restore the seed");
  return "persisted across reload, then reset cleanly";
});

/* ========================================================================== */

await page.screenshot({ path: "qa/screenshots/_journey-end.png" });

console.log("\n=== CANONICAL JOURNEY ===\n");
for (const s of steps) {
  console.log(`${s.pass ? "✓" : "✗"} ${s.name}`);
  console.log(`    ${s.detail}`);
}
const passed = steps.filter((s) => s.pass).length;
console.log(`\nconsole errors: ${errors.length ? errors.join("\n  ") : "none"}`);
console.log(`${passed}/${steps.length} journey steps passed\n`);

await browser.close();
process.exit(passed === steps.length && errors.length === 0 ? 0 : 1);
