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

async function goto(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
}

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

async function clickContinue(page) {
  await page.getByRole("button", { name: /Continue|Find my matches/i }).click().catch(() => {});
  await wait(1200);
  await page.getByRole("button", { name: /Skip/i }).click().catch(() => {});
  await wait(500);
}

async function run() {
  browser = await chromium.launch({ headless: true });
  console.log("Browser launched");

  // === LANDING ===
  console.log("\n=== LANDING ===");
  {
    const { page, ctx } = await ctxFor(DESKTOP);
    await goto(page, BASE);
    await wait(2000);
    await shot(page, "01-landing-desktop");
    await page.evaluate(() => window.scrollTo(0, 600));
    await wait(800);
    await shot(page, "01b-landing-features-1-desktop");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await wait(800);
    await shot(page, "01d-landing-footer-desktop");
    await ctx.close();
  }
  {
    const { page, ctx } = await ctxFor(MOBILE, true);
    await goto(page, BASE);
    await wait(2000);
    await shot(page, "01-landing-mobile");
    await ctx.close();
  }

  // === DASHBOARD ===
  console.log("\n=== DASHBOARD ===");
  {
    const { page, ctx } = await ctxFor(DESKTOP);
    await goto(page, `${BASE}/dashboard`);
    await wait(2500);
    await shot(page, "02-dashboard-desktop");
    await page.evaluate(() => window.scrollTo(0, 400));
    await wait(600);
    await shot(page, "02b-dashboard-travels-desktop");
    await page.evaluate(() => window.scrollTo(0, 800));
    await wait(600);
    await shot(page, "02c-dashboard-quicktrip-leaderboard-desktop");
    await ctx.close();
  }
  {
    const { page, ctx } = await ctxFor(MOBILE, true);
    await goto(page, `${BASE}/dashboard`);
    await wait(2500);
    await shot(page, "02-dashboard-mobile");
    await ctx.close();
  }

  // === DISCOVERY ===
  console.log("\n=== DISCOVERY ===");
  {
    const { page, ctx } = await ctxFor(DESKTOP);
    await goto(page, `${BASE}/discover`);
    await wait(3000);
    await shot(page, "03-discovery-01-dates-desktop");
    await clickContinue(page);
    await shot(page, "04-discovery-02-scope-desktop");
    await page.getByRole("radio", { name: /Go abroad/i }).click().catch(() => {});
    await clickContinue(page);
    await shot(page, "05-discovery-03-origin-desktop");
    await clickContinue(page);
    await shot(page, "05b-discovery-03-origin-confirm-desktop");
    await clickContinue(page);
    await wait(2000);
    await shot(page, "06-discovery-04-budget-desktop");
    await page.getByRole("radio", { name: /Premium/i }).click().catch(() => {});
    await clickContinue(page);
    await shot(page, "07-discovery-05-experiences-desktop");
    await page.getByRole("checkbox", { name: /Museums/i }).click().catch(() => {});
    await page.getByRole("checkbox", { name: /Fine dining/i }).click().catch(() => {});
    await wait(500);
    await shot(page, "07b-discovery-05-experiences-selected-desktop");
    await clickContinue(page);
    await shot(page, "08-discovery-06-activities-desktop");
    await page.getByRole("checkbox", { name: /Museums/i }).click().catch(() => {});
    await page.getByRole("checkbox", { name: /Fine dining/i }).click().catch(() => {});
    await wait(500);
    await shot(page, "08b-discovery-06-activities-selected-desktop");
    await page.getByRole("button", { name: /Find my matches/i }).click().catch(() => {});
    await wait(3000);
    await shot(page, "09-discovery-shortlist-desktop");
    // Click best match to open brief
    await page.locator('[aria-current="true"]').first().click().catch(() => {});
    await wait(1500);
    await shot(page, "10-destination-detail-brief-desktop");
    await ctx.close();
  }
  {
    const { page, ctx } = await ctxFor(MOBILE, true);
    await goto(page, `${BASE}/discover`);
    await wait(3000);
    await shot(page, "03-discovery-01-dates-mobile");
    await clickContinue(page);
    await shot(page, "04-discovery-02-scope-mobile");
    await page.getByRole("radio", { name: /Go abroad/i }).click().catch(() => {});
    await clickContinue(page);
    await shot(page, "05-discovery-03-origin-mobile");
    await clickContinue(page);
    await shot(page, "05b-discovery-03-origin-confirm-mobile");
    await clickContinue(page);
    await wait(2000);
    await shot(page, "06-discovery-04-budget-mobile");
    await page.getByRole("radio", { name: /Premium/i }).click().catch(() => {});
    await clickContinue(page);
    await shot(page, "07-discovery-05-experiences-mobile");
    await page.getByRole("checkbox", { name: /Museums/i }).click().catch(() => {});
    await clickContinue(page);
    await shot(page, "08-discovery-06-activities-mobile");
    await page.getByRole("checkbox", { name: /Museums/i }).click().catch(() => {});
    await page.getByRole("button", { name: /Find my matches/i }).click().catch(() => {});
    await wait(3000);
    await shot(page, "09-discovery-shortlist-mobile");
    await ctx.close();
  }

  // === PLANNER ===
  console.log("\n=== PLANNER ===");
  {
    const { page, ctx } = await ctxFor(DESKTOP);
    await goto(page, `${BASE}/trip/nyc-spring`);
    await wait(4000);
    await shot(page, "11-planner-overview-desktop");
    // Select activity
    await page.locator('[data-event], [class*="eventCard"]').first().click().catch(() => {});
    await wait(1000);
    await shot(page, "12-planner-activity-selected-desktop");
    await page.keyboard.press("Escape");
    await wait(500);
    // Ask AI
    await page.getByRole("button", { name: /Ask AI/i }).first().click().catch(() => {});
    await wait(1500);
    await shot(page, "14-planner-advisor-desktop");
    await page.keyboard.press("Escape");
    await wait(500);
    // Map is in rail by default
    await shot(page, "15-planner-map-desktop");
    // Travellers
    await page.getByRole("button", { name: /Travellers|People/i }).first().click().catch(() => {});
    await wait(1500);
    await shot(page, "16-planner-travellers-desktop");
    await page.keyboard.press("Escape");
    await wait(500);
    // Ideas
    await page.getByRole("button", { name: /Idea|Ideas/i }).first().click().catch(() => {});
    await wait(1500);
    await shot(page, "17-planner-ideas-desktop");
    await ctx.close();
  }
  {
    const { page, ctx } = await ctxFor(MOBILE, true);
    await goto(page, `${BASE}/trip/nyc-spring`);
    await wait(4000);
    await shot(page, "11-planner-overview-mobile");
    await page.getByRole("button", { name: /Ask AI/i }).click().catch(() => {});
    await wait(1500);
    await shot(page, "14-planner-advisor-mobile");
    await page.keyboard.press("Escape").catch(() => {});
    await wait(500);
    await page.getByRole("radio", { name: /Map/i }).click().catch(() => {});
    await wait(1500);
    await shot(page, "15-planner-map-mobile");
    await ctx.close();
  }

  // === GUEST STATE ===
  console.log("\n=== GUEST ===");
  {
    const { page, ctx } = await ctxFor(DESKTOP);
    // Sign out via dashboard
    await goto(page, `${BASE}/dashboard`);
    await wait(2000);
    await page.getByRole("button", { name: /Sign out|sign out/i }).click().catch(() => {});
    await wait(1500);
    await shot(page, "18-guest-state-desktop");
    await ctx.close();
  }

  await browser.close();
  console.log(`\n✅ Done. ${shotCount} screenshots captured.`);
}

run().catch(err => { console.error(err); process.exit(1); });
