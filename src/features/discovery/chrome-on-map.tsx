"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { Map as MapboxMap } from "mapbox-gl";

import { useMap } from "@/components/map/map-surface";

const PROBE_W = 12;
const PROBE_H = 8;
/** Relative luminance: above this, white lockup fails — switch to black. */
const LIGHT_ENTER = 0.58;
/** Below this, black lockup fails — switch to white. */
const LIGHT_LEAVE = 0.46;

function srgbToLin(channel: number) {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function relativeLuma(r: number, g: number, b: number) {
  return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
}

function sampleLuma(map: MapboxMap, region: HTMLElement): number | null {
  let canvas: HTMLCanvasElement | undefined;
  try {
    canvas = map.getCanvas();
  } catch {
    return null;
  }
  if (!canvas) return null;
  const mapRect = canvas.getBoundingClientRect();
  const regionRect = region.getBoundingClientRect();

  const left = Math.max(regionRect.left, mapRect.left);
  const top = Math.max(regionRect.top, mapRect.top);
  const right = Math.min(regionRect.right, mapRect.right);
  const bottom = Math.min(regionRect.bottom, mapRect.bottom);
  if (right - left < 4 || bottom - top < 4) return null;

  const scaleX = canvas.width / mapRect.width;
  const scaleY = canvas.height / mapRect.height;
  const sx = (left - mapRect.left) * scaleX;
  const sy = (top - mapRect.top) * scaleY;
  const sw = (right - left) * scaleX;
  const sh = (bottom - top) * scaleY;
  if (sw < 2 || sh < 2) return null;

  const probe = getProbe();
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.clearRect(0, 0, PROBE_W, PROBE_H);
  try {
    ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, PROBE_W, PROBE_H);
  } catch {
    return null;
  }

  const { data } = ctx.getImageData(0, 0, PROBE_W, PROBE_H);
  let sum = 0;
  let opaque = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 8) continue;
    sum += relativeLuma(data[i], data[i + 1], data[i + 2]);
    opaque += 1;
  }
  if (opaque < 8) return null;
  return sum / opaque;
}

let probeCanvas: HTMLCanvasElement | null = null;

function getProbe() {
  if (probeCanvas) return probeCanvas;
  probeCanvas = document.createElement("canvas");
  probeCanvas.width = PROBE_W;
  probeCanvas.height = PROBE_H;
  return probeCanvas;
}

/**
 * Samples the map under a chrome region and reports whether that chrome
 * should use the white-on-dark lockup (`true`) or the black lockup (`false`).
 */
export function ChromeOnMap({
  regionRef,
  onOnDark,
}: {
  regionRef: RefObject<HTMLElement | null>;
  onOnDark: (onDark: boolean) => void;
}) {
  const { map, ready } = useMap();
  const onDarkRef = useRef(true);
  const onOnDarkRef = useRef(onOnDark);
  onOnDarkRef.current = onOnDark;

  useEffect(() => {
    if (!ready) return;

    let frame = 0;
    const read = () => {
      const region = regionRef.current;
      if (!region) return;
      const luma = sampleLuma(map, region);
      if (luma == null) return;

      const next =
        luma >= LIGHT_ENTER
          ? false
          : luma <= LIGHT_LEAVE
            ? true
            : onDarkRef.current;
      if (next === onDarkRef.current) return;
      onDarkRef.current = next;
      onOnDarkRef.current(next);
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(read);
      });
    };

    map.on("idle", schedule);
    map.on("move", schedule);
    map.on("moveend", schedule);
    map.on("zoomend", schedule);
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      try {
        map.off("idle", schedule);
        map.off("move", schedule);
        map.off("moveend", schedule);
        map.off("zoomend", schedule);
      } catch {
        /* map already torn down */
      }
    };
  }, [map, ready, regionRef]);

  return null;
}
