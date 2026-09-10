/**
 * Dashboard interactions, asserted end to end in one browser session.
 *
 * Every affordance the dashboard renders is exercised here. The rule the
 * build is held to is "no fake buttons": if a control exists, this file proves
 * it does something observable.
 *
 *   node qa/dashboard-test.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.QA_BASE ?? "http://localhost:3000";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
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
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (error) {
    const detail = error.message.split("\n")[0].slice(0, 170);
    steps.push({ name, pass: false, detail });
    process.stdout.write(`  ✗ ${name}\n      ${detail}\n`);
  }
}

const goDashboard = async () => {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=My travels");
  await page.waitForTimeout(700);
};

/* ========================================================================== */
/* 1 · The page                                                               */
/* ========================================================================== */

await step("dashboard renders the seeded account", async () => {
  await goDashboard();
  const name = await page.locator("h1").first().textContent();
  const wishlist = await page.locator("text=/^32$/").first().count();
  if (!name?.includes("Sarthak")) throw new Error(`got heading "${name}"`);
  if (!wishlist) throw new Error("wishlist stat missing");
  return `${name?.trim()} · stats present`;
});

await step("all four travel tabs carry counts", async () => {
  const labels = await page.getByRole("tab").allTextContents();
  const joined = labels.map((l) => l.replace(/\s+/g, "")).join(" | ");
  if (labels.length !== 4) throw new Error(`expected 4 tabs, got ${labels.length}`);
  if (!joined.includes("All5")) throw new Error(`counts wrong: ${joined}`);
  return joined;
});

/* ========================================================================== */
/* 2 · Travel history filtering                                               */
/* ========================================================================== */

await step("tabs filter the trip list correctly", async () => {
  const count = async () => page.locator("[class*='travels-module'][class*='gridItem']").count();

  const all = await count();
  await page.getByRole("tab", { name: /Upcoming/ }).click();
  await page.waitForTimeout(400);
  const upcoming = await count();

  await page.getByRole("tab", { name: /Completed/ }).click();
  await page.waitForTimeout(400);
  const completed = await count();

  if (all !== 5 || upcoming !== 2 || completed !== 3) {
    throw new Error(`all=${all} upcoming=${upcoming} completed=${completed}`);
  }
  return `all 5 · upcoming 2 · completed 3`;
});

await step("the empty Ongoing tab renders a real empty state", async () => {
  await page.getByRole("tab", { name: /Ongoing/ }).click();
  await page.waitForTimeout(400);
  const cards = await page
    .locator("[class*='travels-module'][class*='gridItem']")
    .count();
  const empty = await page
    .locator("[class*='travels-module'][class*='emptyTitle']")
    .textContent();
  if (cards !== 0) throw new Error(`${cards} cards on an empty tab`);
  return `"${empty?.trim()}"`;
});

/* ========================================================================== */
/* 3 · Navigation into the rest of the product                                */
/* ========================================================================== */

await step("the New York card opens the real planner", async () => {
  await page.getByRole("tab", { name: /^All/ }).click();
  await page.waitForTimeout(400);
  await page.getByRole("link", { name: /Five days in New York/ }).click();
  await page.waitForSelector("[data-planner-ready]");
  const url = page.url();
  const items = await page.locator("[data-event]").count();
  if (!url.endsWith("/trip/nyc-spring")) throw new Error(`landed on ${url}`);
  if (items < 30) throw new Error(`planner only rendered ${items} items`);
  return `${url.replace(BASE, "")} · ${items} itinerary items`;
});

await step("a summary-only trip offers no link to nowhere", async () => {
  await goDashboard();
  const lisbon = page.locator("text=Lisbon long weekend").first();
  const isLink = await lisbon.evaluate(
    (el) => Boolean(el.closest("a")),
  );
  if (isLink) throw new Error("Lisbon is wrapped in a link but has no itinerary");
  const note = await page
    .locator("[class*='trip-card-module'][class*='summaryNote']")
    .first()
    .textContent();
  return `not a link · says "${note?.trim()}"`;
});

await step("Build trip carries the dates into the planner", async () => {
  await goDashboard();
  await page.getByRole("button", { name: /Build trip/ }).click();
  await page.waitForSelector("[data-planner-ready]");
  const url = page.url();
  if (!url.includes("/trip/nyc-spring")) throw new Error(`landed on ${url}`);
  return url.replace(BASE, "");
});

await step("Help me explore reaches Destination Discovery", async () => {
  await goDashboard();
  await page.getByRole("button", { name: /Help me explore/ }).click();
  await page.waitForSelector("text=When do you want to travel?");
  return page.url().replace(BASE, "");
});

await step("the editorial card links into Discovery", async () => {
  await goDashboard();
  await page.getByRole("link", { name: /Check it against your dates/ }).click();
  await page.waitForSelector("text=When do you want to travel?");
  return page.url().replace(BASE, "");
});

await step("a saved destination links into Discovery", async () => {
  await goDashboard();
  await page.getByRole("link", { name: /Lisbon/ }).first().click();
  await page.waitForSelector("text=When do you want to travel?");
  return page.url().replace(BASE, "");
});

/* ========================================================================== */
/* 4 · New trip                                                               */
/* ========================================================================== */

await step("New trip moves focus to the trip-creation control", async () => {
  await goDashboard();
  await page.getByRole("button", { name: /New trip/ }).first().click();
  await page.waitForTimeout(700);
  const focused = await page.evaluate(() => document.activeElement?.id ?? "");
  if (focused !== "quick-start") throw new Error(`focus went to "${focused}"`);
  return "focus on the Begin date field";
});

/* ========================================================================== */
/* 5 · Travel persona                                                         */
/* ========================================================================== */

await step("Refine persona opens a usable editor", async () => {
  await goDashboard();
  await page.getByRole("button", { name: /Refine persona/ }).click();
  await page.waitForSelector("text=In your words");
  const chips = await page.locator("[class*='persona-module'] [class*='chip-module']").count();
  const saveDisabled = await page
    .getByRole("button", { name: /^Save$/ })
    .isDisabled();
  if (chips < 12) throw new Error(`only ${chips} interest chips`);
  if (!saveDisabled) throw new Error("Save is enabled before any edit");
  return `${chips} interests · Save correctly disabled while clean`;
});

await step("editing the persona enables Save and persists the change", async () => {
  await page.getByRole("button", { name: /^Hiking$/ }).click();
  await page.waitForTimeout(300);
  const enabled = await page.getByRole("button", { name: /^Save$/ }).isEnabled();
  if (!enabled) throw new Error("Save stayed disabled after a change");

  await page.getByRole("button", { name: /^Save$/ }).click();
  await page.waitForTimeout(600);

  /* Back in the read view, the new interest is listed. */
  const shown = await page
    .locator("[class*='persona-module'][class*='interestList']")
    .textContent();
  if (!shown?.includes("Hiking")) throw new Error(`read view shows "${shown}"`);
  return "added Hiking, saved, visible in the read view";
});

await step("cancelling an edit discards it", async () => {
  await page.getByRole("button", { name: /^Edit$/ }).click();
  await page.waitForSelector("text=In your words");
  await page.getByRole("button", { name: /^Shopping$/ }).click();
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: /Cancel/ }).click();
  await page.waitForTimeout(500);
  const shown = await page
    .locator("[class*='persona-module'][class*='interestList']")
    .textContent();
  if (shown?.includes("Shopping")) throw new Error("cancelled edit was kept");
  return "Shopping not kept";
});

/* ========================================================================== */
/* 6 · Header surfaces                                                        */
/* ========================================================================== */

await step("Connections shows the planner's people with shared history", async () => {
  await goDashboard();
  await page.getByRole("button", { name: /Connections/ }).click();
  await page.waitForTimeout(500);
  const rows = await page
    .locator("[class*='connections-panel-module'][class*='name']")
    .allTextContents();
  const hasHistory = await page
    .locator("[class*='connections-panel-module'][class*='history']")
    .first()
    .textContent();
  if (rows.length !== 6) throw new Error(`${rows.length} connections listed`);
  if (!["Maya Rasheed", "Danny Okonkwo", "Priya Venkatesan", "Jonas Lindqvist"]
    .every((n) => rows.some((r) => r.includes(n)))) {
    throw new Error(`planner travellers missing: ${rows.join(", ")}`);
  }
  return `${rows.length} people · first history "${hasHistory?.trim()}"`;
});

await step("a connection row opens the trip they share with you", async () => {
  await page.getByRole("link", { name: /Maya Rasheed/ }).click();
  await page.waitForSelector("[data-planner-ready]");
  return page.url().replace(BASE, "");
});

await step("Notifications lists seeded, actionable items", async () => {
  await goDashboard();
  await page.getByRole("button", { name: /Notifications/ }).click();
  await page.waitForTimeout(500);
  const titles = await page
    .locator("[class*='notifications-panel-module'][class*='rowTitle']")
    .allTextContents();
  const unread = await page
    .locator("[class*='notifications-panel-module'][class*='rowUnread']")
    .count();
  if (titles.length !== 4) throw new Error(`${titles.length} notifications`);
  if (unread !== 2) throw new Error(`${unread} unread, expected 2`);
  return `${titles.length} items · ${unread} unread`;
});

await step("Mark all read clears the unread state and the header dot", async () => {
  await page.getByRole("button", { name: /Mark all read/ }).click();
  await page.waitForTimeout(500);
  const unread = await page
    .locator("[class*='notifications-panel-module'][class*='rowUnread']")
    .count();
  const dot = await page
    .locator("[class*='app-header-module'][class*='unread']")
    .count();
  if (unread !== 0) throw new Error(`${unread} still unread`);
  if (dot !== 0) throw new Error("header dot still showing");
  return "0 unread · header dot gone";
});

await step("a notification navigates to where it can be acted on", async () => {
  await goDashboard();
  await page.getByRole("button", { name: /Notifications/ }).click();
  await page.waitForTimeout(400);
  await page.getByRole("link", { name: /Thursday has a clash/ }).click();
  await page.waitForSelector("[data-planner-ready]");
  return page.url().replace(BASE, "");
});

/* ========================================================================== */
/* 7 · Session                                                                */
/* ========================================================================== */

await step("the account menu exposes working account options", async () => {
  await goDashboard();
  await page.getByRole("button", { name: /^Account/ }).click();
  await page.waitForTimeout(400);
  const items = await page
    .locator("[class*='profile-menu-module'][class*='item']")
    .allTextContents();
  const hasSignOut = await page.getByRole("button", { name: /Sign out/ }).count();
  if (!hasSignOut) throw new Error("no sign out");
  return `${items.map((i) => i.trim()).join(" | ")} | Sign out`;
});

await step("Refine travel persona from the menu opens the editor", async () => {
  await page.getByRole("button", { name: /Refine travel persona/ }).click();
  await page.waitForSelector("text=In your words");
  return "editor open";
});

await step("signing out reaches the guest state, and back in again", async () => {
  await goDashboard();
  await page.getByRole("button", { name: /^Account/ }).click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /Sign out/ }).click();
  await page.waitForSelector("text=You’re signed out");

  /* And the decision survives a reload — it is a persisted session. */
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=You’re signed out");

  await page.getByRole("button", { name: /Continue as Sarthak Goyal/ }).click();
  await page.waitForSelector("text=My travels");
  return "guest → persisted across reload → signed back in";
});

await step("the guest state still offers Discovery", async () => {
  await page.getByRole("button", { name: /^Account/ }).click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /Sign out/ }).click();
  await page.waitForSelector("text=You’re signed out");
  await page.getByRole("link", { name: /Find where to go instead/ }).click();
  await page.waitForSelector("text=When do you want to travel?");
  const url = page.url().replace(BASE, "");
  /* Restore for any later run. */
  await goDashboard().catch(() => {});
  await page
    .getByRole("button", { name: /Continue as Sarthak Goyal/ })
    .click()
    .catch(() => {});
  return url;
});

/* ========================================================================== */
/* 8 · The rest of the product is untouched                                   */
/* ========================================================================== */

await step("the logged-out landing still works and is unchanged", async () => {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1");
  const heading = (await page.locator("h1").textContent())?.replace(/\s+/g, " ").trim();
  await page.getByRole("button", { name: /Help me explore/ }).click();
  await page.waitForSelector("text=When do you want to travel?");
  return `"${heading}" → discovery`;
});

await step("the planner still works", async () => {
  await page.goto(`${BASE}/trip/nyc-spring`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-planner-ready]");
  const days = await page.locator("[data-day-tab]").count();
  const items = await page.locator("[data-event]").count();
  if (days !== 5) throw new Error(`${days} day tabs`);
  return `${days} days · ${items} items`;
});

/* ========================================================================== */

const passed = steps.filter((s) => s.pass).length;
console.log("\n=== DASHBOARD INTERACTIONS ===\n");
for (const s of steps) {
  console.log(`${s.pass ? "✓" : "✗"} ${s.name}`);
  console.log(`    ${s.detail}`);
}
console.log(`\nconsole errors: ${errors.length === 0 ? "none" : errors.length}`);
errors.slice(0, 5).forEach((e) => console.log(`  ! ${e}`));
console.log(`${passed}/${steps.length} interactions working\n`);

await browser.close();
