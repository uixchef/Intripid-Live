import type { Attraction } from "@/lib/types";

const IMMERSIVE_CATS = new Set(["culture", "outdoors", "sightseeing", "transit"]);

/** Same buckets as the destination brief rails. */
export function splitBriefPlaces(attractions: Attraction[]) {
  const immersive = attractions.filter((item) => IMMERSIVE_CATS.has(item.category));
  const food = attractions.filter((item) => item.category === "food");
  const exciting = attractions.filter(
    (item) => !IMMERSIVE_CATS.has(item.category) && item.category !== "food",
  );
  return { immersive, food, exciting };
}

/** Every place the brief rails show, in the same order. */
export function briefPlacesOnMap(attractions: Attraction[]) {
  const { immersive, exciting, food } = splitBriefPlaces(attractions);
  return [...immersive, ...exciting, ...food];
}
