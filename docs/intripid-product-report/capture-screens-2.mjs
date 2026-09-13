import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const shotsDir = join(__dirname, "screenshots");
mkdirSync(shotsDir, { recursive: true });

const BASE = "http://localhost:3000";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
let browser, shotCount = 0;

async function shot(page, name) {
  await page.screenshot({ path: join(shotsDir, `${name}.png`) });
  shotCount++;
  console.log(`  📸 ${name}.png`);
}

async function ctxFor(viewport, isMobile = false) {
  const ctx = await browser.newContext({ viewport, isMobile, hasTouch: isMobile });
  const page = await ctx.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  return { page, ctx };
}

async function goto(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
}

async function run() {
  browser = await chromium.launch({ headless: true });

  // === Activity Editor (desktop) ===
  console.log("\n=== ACTIVITY EDITOR ===");
  {
    const { page, ctx } = await ctxFor(DESKTOP);
    await goto(page, `${BASE}/trip/nyc-spring`);
    await wait(4000);
    // Click the first event card to open peek
    const card = page.locator('[data-event]').first();
    await card.click().catch(() => {});
    await wait(1500);
    // Look for edit button in peek
    const editBtn = page.getByRole("button", { name: /Edit/i }).first();
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      await wait(1500);
      await shot(page, "13-planner-activity-editor-desktop");
    } else {
      // Try clicking the card title to open editor
      await card.dblclick().catch(() => {});
      await wait(1500);
      await shot(page, "13-planner-activity-editor-desktop");
    }
    await ctx.close();
  }

  // === Conflict state (Friday April 17) ===
  console.log("\n=== CONFLICT STATE ===");
  {
    const { page, ctx } = await ctxFor(DESKTOP);
    await goto(page, `${BASE}/trip/nyc-spring`);
    await wait(4000);
    // Click on Friday 17 in the day rail
    await page.evaluate(() => {
      const tabs = document.querySelectorAll('[role="tab"]');
      for (const t of tabs) {
        if (t.textContent && t.textContent.includes('17')) {
          t.click();
          break;
        }
      }
    });
    await wait(1500);
    await shot(page, "13-planner-conflict-desktop");
    await ctx.close();
  }

  // === Destination detail with scores ===
  console.log("\n=== DESTINATION DETAIL SCROLL ===");
  {
    const { page, ctx } = await ctxFor(DESKTOP);
    await goto(page, `${BASE}/discover`);
    await wait(2000);
    // Fast-forward through all questions
    for (let i = 0; i < 6; i++) {
      await page.getByRole("button", { name: /Continue|Find my matches/i }).click().catch(() => {});
      await wait(1000);
      await page.getByRole("button", { name: /Skip/i }).click().catch(() => {});
      await wait(400);
    }
    await wait(2000);
    // Click on best match
    await page.locator('[aria-current="true"]').first().click().catch(() => {});
    await wait(1500);
    // Scroll the brief content
    const brief = page.locator('[class*="briefScroll"]').first();
    await brief.evaluate(el => el.scrollTop = 500).catch(() => {});
    await wait(500);
    await shot(page, "10b-destination-detail-scores-desktop");
    await brief.evaluate(el => el.scrollTop = 1000).catch(() => {});
    await wait(500);
    await shot(page, "10c-destination-detail-attractions-desktop");
    await ctx.close();
  }

  // === Planner Day View ===
  console.log("\n=== PLANNER DAY VIEW ===");
  {
    const { page, ctx } = await ctxFor(DESKTOP);
    await goto(page, `${BASE}/trip/nyc-spring`);
    await wait(3000);
    // Switch to day view via view menu
    const viewBtn = page.locator('[aria-label="Calendar view"], [class*="viewMenu"]').first();
    await viewBtn.click().catch(() => {});
    await wait(500);
    await page.getByRole("menuitemradio", { name: /^Day$/ }).click().catch(() => {});
    await wait(1000);
    await shot(page, "11b-planner-day-view-desktop");
    await ctx.close();
  }

  // === Planner Itinerary View ===
  console.log("\n=== PLANNER ITINERARY ===");
  {
    const { page, ctx } = await ctxFor(DESKTOP);
    await goto(page, `${BASE}/trip/nyc-spring`);
    await wait(3000);
    const viewBtn = page.locator('[aria-label="Calendar view"], [class*="viewMenu"]').first();
    await viewBtn.click().catch(() => {});
    await wait(500);
    await page.getByRole("menuitemradio", { name: /Itinerary/i }).click().catch(() => {});
    await wait(1000);
    await shot(page, "11c-planner-itinerary-view-desktop");
    await ctx.close();
  }

  // === Mobile planner day view ===
  console.log("\n=== MOBILE PLANNER DAY ===");
  {
    const { page, ctx } = await ctxFor(MOBILE, true);
    await goto(page, `${BASE}/trip/nyc-spring`);
    await wait(4000);
    await page.getByRole("button", { name: /Open menu/i }).click();
    await wait(500);
    await page.getByRole("radio", { name: /^Day$/ }).click().catch(() => {});
    await wait(1000);
    await shot(page, "11b-planner-day-view-mobile");
    await ctx.close();
  }

  // === Mobile dashboard scroll ===
  console.log("\n=== MOBILE DASHBOARD SCROLL ===");
  {
    const { page, ctx } = await ctxFor(MOBILE, true);
    await goto(page, `${BASE}/dashboard`);
    await wait(2500);
    await page.evaluate(() => window.scrollTo(0, 600));
    await wait(600);
    await shot(page, "02b-dashboard-travels-mobile");
    await page.evaluate(() => window.scrollTo(0, 1200));
    await wait(600);
    await shot(page, "02c-dashboard-quicktrip-mobile");
    await ctx.close();
  }

  // === Discovery flexible dates ===
  console.log("\n=== DISCOVERY FLEXIBLE DATES ===");
  {
    const { page, ctx } = await ctxFor(DESKTOP);
    await goto(page, `${BASE}/discover`);
    await wait(2000);
    await page.getByRole("radio", { name: /I'm flexible/i }).click().catch(() => {});
    await wait(500);
    await shot(page, "03b-discovery-01-dates-flexible-desktop");
    await ctx.close();
  }

  // === Discovery weekend dates ===
  {
    const { page, ctx } = await ctxFor(DESKTOP);
    await goto(page, `${BASE}/discover`);
    await wait(2000);
    await page.getByRole("radio", { name: /This weekend/i }).click().catch(() => {});
    await wait(500);
    await shot(page, "03c-discovery-01-dates-weekend-desktop");
    await ctx.close();
  }

  // === Discovery add origin ===
  console.log("\n=== DISCOVERY ADD ORIGIN ===");
  {
    const { page, ctx } = await ctxFor(DESKTOP);
    await goto(page, `${BASE}/discover`);
    await wait(2000);
    // Skip to origin step
    await page.getByRole("button", { name: /Continue/i }).click();
    await wait(1000);
    await page.getByRole("radio", { name: /Go abroad/i }).click().catch(() => {});
    await page.getByRole("button", { name: /Continue/i }).click();
    await wait(1000);
    // Click "Add a new address"
    await page.getByRole("button", { name: /Add a new address/i }).click().catch(() => {});
    await wait(1000);
    await shot(page, "05c-discovery-03-origin-add-desktop");
    await ctx.close();
  }

  // === Discovery income prompt ===
  console.log("\n=== DISCOVERY INCOME ===");
  {
    const { page, ctx } = await ctxFor(DESKTOP);
    await goto(page, `${BASE}/discover`);
    await wait(2000);
    // Skip to budget
    await page.getByRole("button", { name: /Continue/i }).click();
    await wait(1000);
    await page.getByRole("radio", { name: /Go abroad/i }).click().catch(() => {});
    await page.getByRole("button", { name: /Continue/i }).click();
    await wait(1000);
    await page.getByRole("button", { name: /Continue/i }).click();
    await wait(1000);
    await page.getByRole("button", { name: /Continue/i }).click();
    await wait(2000);
    await page.getByRole("radio", { name: /Premium/i }).click().catch(() => {});
    await page.getByRole("button", { name: /Continue/i }).click();
    await wait(1500);
    // Income prompt should be visible
    await shot(page, "06b-discovery-04-income-desktop");
    await ctx.close();
  }

  // === Discovery processing ===
  console.log("\n=== DISCOVERY PROCESSING ===");
  {
    const { page, ctx } = await ctxFor(DESKTOP);
    await goto(page, `${BASE}/discover`);
    await wait(2000);
    // Answer all questions quickly to trigger processing
    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: /Continue/i }).click().catch(() => {});
      await wait(800);
      await page.getByRole("button", { name: /Skip/i }).click().catch(() => {});
      await wait(400);
    }
    await page.getByRole("button", { name: /Find my matches/i }).click().catch(() => {});
    await wait(800);
    await shot(page, "09a-discovery-processing-desktop");
    await ctx.close();
  }

  // === Guest state mobile ===
  console.log("\n=== GUEST MOBILE ===");
  {
    const { page, ctx } = await ctxFor(MOBILE, true);
    await goto(page, `${BASE}/dashboard`);
    await wait(2000);
    await page.getByRole("button", { name: /Sign out|sign out/i }).click().catch(() => {});
    await wait(1500);
    await shot(page, "18-guest-state-mobile");
    await ctx.close();
  }

  // === Planner settings ===
  console.log("\n=== PLANNER SETTINGS ===");
  {
    const { page, ctx } = await ctxFor(DESKTOP);
    await goto(page, `${BASE}/trip/nyc-spring`);
    await wait(3000);
    const settingsBtn = page.locator('[aria-label*="Settings"], [class*="settings"]').first();
    await settingsBtn.click().catch(() => {});
    await wait(1500);
    await shot(page, "19-planner-settings-desktop");
    await ctx.close();
  }

  // === Trip chat ===
  console.log("\n=== TRIP CHAT ===");
  {
    const { page, ctx } = await ctxFor(DESKTOP);
    await goto(page, `${BASE}/trip/nyc-spring`);
    await wait(3000);
    // Find chat button in dock
    const chatBtn = page.getByRole("button", { name: /Trip chat|Chat/i }).first();
    await chatBtn.click().catch(() => {});
    await wait(1500);
    await shot(page, "20-planner-chat-desktop");
    await ctx.close();
  }

  // === Mobile activity editor ===
  console.log("\n=== MOBILE ACTIVITY EDITOR ===");
  {
    const { page, ctx } = await ctxFor(MOBILE, true);
    await goto(page, `${BASE}/trip/nyc-spring`);
    await wait(4000);
    // Click add button
    await page.getByRole("button", { name: /Add an activity/i }).click().catch(() => {});
    await wait(1500);
    await shot(page, "13-planner-activity-editor-mobile");
    await ctx.close();
  }

  await browser.close();
  console.log(`\n✅ Done. ${shotCount} additional screenshots captured.`);
}

run().catch(err => { console.error(err); process.exit(1); });
