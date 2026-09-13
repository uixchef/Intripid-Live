import { chromium } from "playwright";

const BASE = "https://intripid-live.vercel.app";

async function check() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto(BASE + "/trip/nyc-spring", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(5000);

  // Get page title and visible text
  const title = await page.title();
  console.log("Title:", title);
  
  // Get all visible text content
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
  console.log("\n=== BODY TEXT (first 2000 chars) ===");
  console.log(bodyText);

  // Check for specific elements
  const canvasCount = await page.locator("canvas").count();
  console.log("\nCanvas count:", canvasCount);
  
  const buttonCount = await page.locator("button:visible").count();
  console.log("Visible buttons:", buttonCount);

  // Check for key planner elements
  const plannerTexts = ["NYC", "New York", "April", "May", "Monday", "Tuesday", "Advisor", "Ask", "calendar", "Schedule", "Day", "Map", "Travellers"];
  for (const text of plannerTexts) {
    const count = await page.locator(`text=/${text}/i`).count();
    if (count > 0) console.log(`  Found "${text}": ${count}`);
  }

  // Take screenshot
  await page.screenshot({ path: "qa/deploy-planner-check.png", fullPage: false });
  console.log("\nScreenshot saved to qa/deploy-planner-check.png");

  console.log("\n=== CONSOLE ERRORS ===");
  if (errors.length === 0) console.log("None");
  else errors.slice(0, 10).forEach(e => console.log("  -", e.substring(0, 200)));

  await browser.close();
}

check().catch(e => { console.error("FATAL:", e); process.exit(1); });
