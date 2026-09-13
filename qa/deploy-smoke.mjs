import { chromium } from "playwright";

const BASE = "https://intripid-live.vercel.app";
const results = [];

function log(step, status, detail = "") {
  const entry = { step, status, detail };
  results.push(entry);
  console.log(`[${status}] ${step}${detail ? ": " + detail : ""}`);
}

async function smoke() {
  const browser = await chromium.launch({ headless: true });

  // ─── Desktop 1440×900 ───
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const dPage = await desktop.newPage();
  const dConsole = [];
  dPage.on("console", (msg) => {
    if (msg.type() === "error") dConsole.push(msg.text());
  });
  dPage.on("pageerror", (err) => dConsole.push(String(err)));

  // 1. Landing
  await dPage.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await dPage.waitForTimeout(2000);
  const hasBuildTrip = await dPage.locator("text=Build trip").count();
  const hasExplore = await dPage.locator("text=Help me explore").count();
  log("D-landing", hasBuildTrip > 0 && hasExplore > 0 ? "PASS" : "FAIL",
    `Build trip=${hasBuildTrip}, Explore=${hasExplore}`);

  // 2. Click "Help me explore" → Discovery
  await dPage.locator("text=Help me explore").first().click();
  await dPage.waitForTimeout(3000);
  const dUrl = dPage.url();
  const onDiscover = dUrl.includes("/discover");
  log("D-discovery-nav", onDiscover ? "PASS" : "FAIL", `URL: ${dUrl}`);

  if (onDiscover) {
    // 3. Check Mapbox loads
    const hasMapbox = await dPage.locator("canvas").count();
    log("D-mapbox", hasMapbox > 0 ? "PASS" : "FAIL", `canvas count: ${hasMapbox}`);

    // 4. Check discovery questions exist
    const hasDates = await dPage.locator("text=/dates|Dates|travel dates|Travel dates/i").count();
    log("D-discovery-questions", hasDates > 0 ? "PASS" : "INFO", `date elements: ${hasDates}`);

    // 5. Try to advance through discovery — look for selectable options
    const buttons = await dPage.locator("button:visible").count();
    log("D-discovery-buttons", buttons > 0 ? "PASS" : "FAIL", `visible buttons: ${buttons}`);
  }

  // 5. Dashboard
  await dPage.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded", timeout: 30000 });
  await dPage.waitForTimeout(2000);
  const dashContent = await dPage.locator("text=/Travels|Dashboard|Identity|map/i").count();
  log("D-dashboard", dashContent > 0 ? "PASS" : "FAIL", `content elements: ${dashContent}`);

  // 6. Planner
  await dPage.goto(BASE + "/trip/nyc-spring", { waitUntil: "domcontentloaded", timeout: 30000 });
  await dPage.waitForTimeout(3000);
  const hasCalendar = await dPage.locator("text=/calendar|Calendar|Monday|Tuesday|Wednesday/i").count();
  const hasAdvisor = await dPage.locator("text=/Advisor|advisor|Ask/i").count();
  log("D-planner", hasCalendar > 0 ? "PASS" : "FAIL", `calendar elements: ${hasCalendar}, advisor: ${hasAdvisor}`);

  // 7. Check for Advisor
  log("D-planner-advisor", hasAdvisor > 0 ? "PASS" : "INFO", `advisor elements: ${hasAdvisor}`);

  // Desktop console errors
  const dErrors = dConsole.filter(e => !e.includes("mapbox") && !e.includes("Mapbox") && !e.includes("favicon"));
  log("D-console-errors", dErrors.length === 0 ? "PASS" : "WARN",
    dErrors.length === 0 ? "no errors" : `${dErrors.length} errors: ${dErrors.slice(0, 3).join("; ")}`);

  await desktop.close();

  // ─── Mobile 390×844 ───
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const mPage = await mobile.newPage();
  const mConsole = [];
  mPage.on("console", (msg) => {
    if (msg.type() === "error") mConsole.push(msg.text());
  });
  mPage.on("pageerror", (err) => mConsole.push(String(err)));

  // Mobile landing
  await mPage.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await mPage.waitForTimeout(2000);
  const mHasBuildTrip = await mPage.locator("text=Build trip").count();
  const mHasExplore = await mPage.locator("text=Help me explore").count();
  log("M-landing", mHasBuildTrip > 0 && mHasExplore > 0 ? "PASS" : "FAIL",
    `Build trip=${mHasBuildTrip}, Explore=${mHasExplore}`);

  // Mobile dashboard
  await mPage.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded", timeout: 30000 });
  await mPage.waitForTimeout(2000);
  const mDash = await mPage.locator("text=/Travels|Dashboard|Identity/i").count();
  log("M-dashboard", mDash > 0 ? "PASS" : "FAIL", `content: ${mDash}`);

  // Mobile discover
  await mPage.goto(BASE + "/discover", { waitUntil: "domcontentloaded", timeout: 30000 });
  await mPage.waitForTimeout(2000);
  const mDiscover = mPage.url().includes("/discover");
  log("M-discover", mDiscover ? "PASS" : "FAIL", `URL: ${mPage.url()}`);

  // Mobile planner
  await mPage.goto(BASE + "/trip/nyc-spring", { waitUntil: "domcontentloaded", timeout: 30000 });
  await mPage.waitForTimeout(2000);
  const mPlanner = await mPage.locator("text=/calendar|Calendar|Monday|Tuesday/i").count();
  log("M-planner", mPlanner > 0 ? "PASS" : "FAIL", `calendar elements: ${mPlanner}`);

  // Mobile console errors
  const mErrors = mConsole.filter(e => !e.includes("mapbox") && !e.includes("Mapbox") && !e.includes("favicon"));
  log("M-console-errors", mErrors.length === 0 ? "PASS" : "WARN",
    mErrors.length === 0 ? "no errors" : `${mErrors.length} errors: ${mErrors.slice(0, 3).join("; ")}`);

  await mobile.close();
  await browser.close();

  // Summary
  console.log("\n=== SMOKE SUMMARY ===");
  const passes = results.filter(r => r.status === "PASS").length;
  const fails = results.filter(r => r.status === "FAIL").length;
  const warns = results.filter(r => r.status === "WARN").length;
  console.log(`PASS: ${passes}, FAIL: ${fails}, WARN: ${warns}`);
  if (fails > 0) {
    console.log("\nFAILED STEPS:");
    results.filter(r => r.status === "FAIL").forEach(r => console.log(`  - ${r.step}: ${r.detail}`));
  }
}

smoke().catch(e => { console.error("FATAL:", e); process.exit(1); });
