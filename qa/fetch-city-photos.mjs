import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const UA =
  "IntripidLive/1.0 (destination covers; educational prototype)";
const OUT = fileURLToPath(new URL("../public/places/", import.meta.url));
mkdirSync(OUT, { recursive: true });

const CITIES = [
  ["mexico-city", "Mexico City"],
  ["queenstown", "Queenstown, New Zealand"],
  ["oaxaca", "Oaxaca City"],
  ["reykjavik", "Reykjavík"],
  ["berlin", "Berlin"],
  ["prague", "Prague"],
  ["budapest", "Budapest"],
  ["athens", "Athens"],
  ["edinburgh", "Edinburgh"],
  ["dublin", "Dublin"],
  ["stockholm", "Stockholm"],
  ["oslo", "Oslo"],
  ["venice", "Venice"],
  ["florence", "Florence"],
  ["dubrovnik", "Dubrovnik"],
  ["krakow", "Kraków"],
  ["istanbul", "Istanbul"],
  ["los-angeles", "Los Angeles"],
  ["san-francisco", "San Francisco"],
  ["chicago", "Chicago"],
  ["miami", "Miami"],
  ["vancouver", "Vancouver"],
  ["montreal", "Montreal"],
  ["toronto", "Toronto"],
  ["lima", "Lima"],
  ["bogota", "Bogotá"],
  ["buenos-aires", "Buenos Aires"],
  ["rio", "Rio de Janeiro"],
  ["santiago", "Santiago"],
  ["cusco", "Cusco"],
  ["bangkok", "Bangkok"],
  ["singapore", "Singapore"],
  ["hong-kong", "Hong Kong"],
  ["taipei", "Taipei"],
  ["osaka", "Osaka"],
  ["hanoi", "Hanoi"],
  ["ho-chi-minh", "Ho Chi Minh City"],
  ["bali", "Canggu"],
  ["chiang-mai", "Chiang Mai"],
  ["mumbai", "Mumbai"],
  ["delhi", "Delhi"],
  ["jaipur", "Jaipur"],
  ["goa", "Goa"],
  ["udaipur", "Udaipur"],
  ["kathmandu", "Kathmandu"],
  ["nairobi", "Nairobi"],
  ["cairo", "Cairo"],
  ["zanzibar", "Stone Town"],
  ["sydney", "Sydney"],
  ["melbourne", "Melbourne"],
  ["auckland", "Auckland"],
];

function destPath(id) {
  return join(OUT, `${id}.jpg`);
}

function skip(id) {
  return existsSync(destPath(id));
}

async function wikiJson(path) {
  let last = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (attempt > 0) await sleep(2000 * attempt);
    const res = await fetch(`https://en.wikipedia.org${path}`, {
      headers: { "user-agent": UA, accept: "application/json" },
    });
    if (res.status === 429) {
      last = new Error(`${res.status} ${path}`);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${path}`);
    return res.json();
  }
  throw last ?? new Error(path);
}

function looksLikePhoto(title = "", mime = "") {
  const t = title.toLowerCase();
  if (mime && !mime.startsWith("image/")) return false;
  if (mime === "image/svg+xml") return false;
  if (
    /map|coat of arms|flag of|locator|logo|icon|diagram|seal of/.test(t)
  ) {
    return false;
  }
  return true;
}

async function imageFromSummary(title) {
  const data = await wikiJson(
    `/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
  );
  const thumb = data.thumbnail;
  const original = data.originalimage;
  const src = thumb?.source || original?.source;
  const imgTitle = original?.source || data.title || "";
  if (!src || !looksLikePhoto(imgTitle, original?.mime || thumb?.mime)) {
    return null;
  }
  if ((thumb?.width ?? original?.width ?? 0) < 400) return null;
  return src.split("?")[0];
}

async function imageFromPageImage(title) {
  const url =
    `/w/api.php?action=query&format=json` +
    `&prop=pageimages&piprop=thumbnail|name&pithumbsize=1280` +
    `&titles=${encodeURIComponent(title)}`;
  const data = await wikiJson(url);
  const page = Object.values(data.query?.pages ?? {})[0];
  const src = page?.thumbnail?.source;
  if (!src) return null;
  return src.split("?")[0];
}

async function imageFromSearch(query) {
  const url =
    `/w/api.php?action=query&format=json` +
    `&generator=search&gsrsearch=${encodeURIComponent(query + " skyline")}` +
    `&gsrnamespace=6&gsrlimit=8&prop=imageinfo` +
    `&iiprop=url|size|mime&iiurlwidth=1280`;
  const data = await wikiJson(url);
  const pages = Object.values(data.query?.pages ?? {});
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    if (!looksLikePhoto(page.title, info.mime)) continue;
    const src = info.thumburl || info.url;
    if (src) return src.split("?")[0];
  }
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function download(src, dest) {
  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (attempt > 0) await sleep(1500 * attempt);
    const res = await fetch(src, { headers: { "user-agent": UA } });
    if (res.status === 429) {
      lastError = new Error(`download 429 ${src}`);
      continue;
    }
    if (!res.ok) throw new Error(`download ${res.status} ${src}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const raw = join(
      tmpdir(),
      `city-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    writeFileSync(raw, buf);
    try {
      execFileSync("sips", ["-s", "format", "jpeg", "-Z", "1600", raw, "--out", dest], {
        stdio: "pipe",
      });
    } finally {
      try {
        execFileSync("rm", ["-f", raw]);
      } catch {
        /* ignore */
      }
    }
    return;
  }
  throw lastError ?? new Error(`download failed ${src}`);
}

const missing = [];
for (const [id, title] of CITIES) {
  if (skip(id)) {
    console.log(`skip ${id}`);
    continue;
  }
  const dest = destPath(id);
  let src = null;
  try {
    src =
      (await imageFromPageImage(title)) ||
      (await imageFromSummary(title)) ||
      (await imageFromSearch(title));
    await sleep(900);
  } catch (error) {
    console.error(`lookup ${id}:`, error.message);
  }
  if (!src) {
    missing.push(id);
    console.error(`no image ${id}`);
    continue;
  }
  try {
    await download(src, dest);
    console.log(`ok ${id}`);
  } catch (error) {
    missing.push(id);
    console.error(`save ${id}:`, error.message);
  }
}

if (missing.length) {
  console.error("missing:", missing.join(", "));
  process.exitCode = 1;
}
