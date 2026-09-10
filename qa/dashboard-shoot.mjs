/**
 * Dashboard visual QA.
 *
 * Drives the real /dashboard, captures every state the brief asks to inspect,
 * and reports console errors, horizontal overflow and broken images.
 *
 *   node qa/dashboard-shoot.mjs [nameFilter]
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.QA_BASE ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "qa", "screenshots");
const filter = process.argv[2] ?? "";

const D1440 = { width: 1440, height: 1000 };
const D1180 = { width: 1180, height: 900 };
const TABLET = { width: 768, height: 1024 };
const PHONE = { width: 390, height: 844 };
const PHONE_SE = { width: 375, height: 667 };
const NARROW = { width: 320, height: 640 };

const settle = (page, ms = 2400) => page.waitForTimeout(ms);

const shots = [
  {
    name: "d01-dashboard-1440",
    viewport: D1440,
    url: "/dashboard",
    fullPage: true,
    async run(page) {
      await settle(page);
    },
  },
  {
    name: "d02-dashboard-connections",
    viewport: D1440,
    url: "/dashboard",
    async run(page) {
      await settle(page);
      await page.getByRole("button", { name: /Connections/ }).click();
      await page.waitForTimeout(700);
    },
  },
  {
    name: "d03-dashboard-notifications",
    viewport: D1440,
    url: "/dashboard",
    async run(page) {
      await settle(page);
      await page.getByRole("button", { name: /Notifications/ }).click();
      await page.waitForTimeout(700);
    },
  },
  {
    name: "d04-dashboard-profile-menu",
    viewport: D1440,
    url: "/dashboard",
    async run(page) {
      await settle(page);
      await page.getByRole("button", { name: /^Account/ }).click();
      await page.waitForTimeout(700);
    },
  },
  {
    name: "d05-dashboard-tab-ongoing",
    viewport: D1440,
    url: "/dashboard",
    async run(page) {
      await settle(page);
      await page.getByRole("tab", { name: /Ongoing/ }).click();
      await page.waitForTimeout(500);
      await page
        .locator('[class*="travels-module"][class*="empty"]')
        .first()
        .scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
    },
  },
  {
    name: "d06-dashboard-tab-completed",
    viewport: D1440,
    url: "/dashboard",
    fullPage: true,
    async run(page) {
      await settle(page);
      await page.getByRole("tab", { name: /Completed/ }).click();
      await page.waitForTimeout(600);
    },
  },
  {
    name: "d07-dashboard-persona-editing",
    viewport: D1440,
    url: "/dashboard",
    async run(page) {
      await settle(page);
      await page.getByRole("button", { name: /Refine persona/ }).click();
      await page.waitForTimeout(800);
    },
  },
  {
    name: "d08-dashboard-1180",
    viewport: D1180,
    url: "/dashboard",
    fullPage: true,
    async run(page) {
      await settle(page);
    },
  },
  {
    name: "d09-dashboard-768",
    viewport: TABLET,
    url: "/dashboard",
    fullPage: true,
    async run(page) {
      await settle(page);
    },
  },
  {
    name: "d10-dashboard-390",
    viewport: PHONE,
    url: "/dashboard",
    fullPage: true,
    async run(page) {
      await settle(page);
    },
  },
  {
    name: "d11-dashboard-375",
    viewport: PHONE_SE,
    url: "/dashboard",
    fullPage: true,
    async run(page) {
      await settle(page);
    },
  },
  {
    name: "d12-dashboard-320",
    viewport: NARROW,
    url: "/dashboard",
    fullPage: true,
    async run(page) {
      await settle(page);
    },
  },
  {
    name: "d13-dashboard-guest",
    viewport: D1440,
    url: "/dashboard",
    async run(page) {
      await settle(page);
      await page.getByRole("button", { name: /^Account/ }).click();
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: /Sign out/ }).click();
      await page.waitForTimeout(900);
    },
  },
  {
    name: "d14-dashboard-guest-390",
    viewport: PHONE,
    url: "/dashboard",
    async run(page) {
      await settle(page);
      await page.getByRole("button", { name: /^Account/ }).click();
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: /Sign out/ }).click();
      await page.waitForTimeout(900);
    },
  },
  {
    name: "d15-dashboard-reduced-motion",
    viewport: D1440,
    url: "/dashboard",
    reducedMotion: true,
    async run(page) {
      await settle(page);
    },
  },
];

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
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text().slice(0, 150));
    });
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 150)}`));
    page.on("requestfailed", (r) =>
      errors.push(`requestfailed: ${r.url().slice(0, 90)}`),
    );

    let status = "ok";
    try {
      await page.goto(`${BASE}${shot.url}`, { waitUntil: "domcontentloaded" });
      await shot.run(page);
      await page.screenshot({
        path: path.join(OUT, `${shot.name}.png`),
        fullPage: Boolean(shot.fullPage),
      });
    } catch (error) {
      status = `FAILED: ${error.message.split("\n")[0].slice(0, 110)}`;
    }

    let audit = null;
    try {
      audit = await page.evaluate(() => {
        const de = document.documentElement;
        const brokenImages = [...document.images].filter(
          (img) => !img.complete || img.naturalWidth === 0,
        ).length;
        /* A control that exists but resolves nowhere. */
        const deadLinks = [...document.querySelectorAll("a")].filter((a) => {
          const href = a.getAttribute("href");
          return !href || href === "#" || href === "";
        }).length;
        return {
          overflowing: de.scrollWidth > de.clientWidth + 1,
          scrollW: de.scrollWidth,
          clientW: de.clientWidth,
          brokenImages,
          deadLinks,
        };
      });
    } catch {
      /* page may have been torn down by a failure above */
    }

    results.push({ shot, status, errors, audit });
    await context.close();
  }

  await browser.close();

  console.log("\n=== DASHBOARD QA ===\n");
  let clean = 0;
  for (const { shot, status, errors, audit } of results) {
    const flags = [];
    if (audit?.overflowing)
      flags.push(`OVERFLOW ${audit.scrollW}>${audit.clientW}`);
    if (audit?.brokenImages) flags.push(`BROKEN-IMG ${audit.brokenImages}`);
    if (audit?.deadLinks) flags.push(`DEAD-LINK ${audit.deadLinks}`);
    if (errors.length) flags.push(`ERRORS(${errors.length})`);
    const ok = status === "ok" && flags.length === 0;
    if (ok) clean += 1;
    console.log(
      `${ok ? "✓" : "✗"} ${shot.name} [${shot.viewport.width}x${shot.viewport.height}] ${status === "ok" ? "" : status} ${flags.join(" ")}`,
    );
    errors.slice(0, 3).forEach((e) => console.log(`    ! ${e}`));
  }
  console.log(`\n${clean}/${results.length} clean\n`);
}

await main();
