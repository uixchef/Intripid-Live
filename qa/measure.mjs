import { chromium } from "playwright";
const [route, sel] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`http://localhost:3000${route}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
const out = await page.evaluate((sel) => {
  const pick = (el) => {
    const r = el.getBoundingClientRect();
    return {
      cls: (el.className || "").toString().slice(0, 44),
      tag: el.tagName.toLowerCase(),
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      h: Math.round(r.height),
      w: Math.round(r.width),
      scrollH: el.scrollHeight,
      clientH: el.clientHeight,
    };
  };
  const root = document.querySelector(sel);
  if (!root) return { error: "not found" };
  return {
    self: pick(root),
    children: [...root.children].map(pick),
    viewport: window.innerHeight,
  };
}, sel);
console.log(JSON.stringify(out, null, 1));
await browser.close();
