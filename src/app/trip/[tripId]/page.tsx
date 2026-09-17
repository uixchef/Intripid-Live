import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { plannerStaticTripIds, getPlannerTrip } from "@/data/trips";
import { PlannerExperience } from "@/features/planner/planner-experience";
import { TripStoreProvider } from "@/stores/trip-store";
import {
  BUDGET_TIERS,
  INTERESTS,
  TRIP_STYLES,
  type BudgetTier,
  type Interest,
  type TripStyle,
} from "@/lib/types";

export const metadata: Metadata = {
  title: "Trip planner",
  description:
    "Plan the trip on a calendar that knows what fits, with the map beside it.",
};

export default async function TripPage({
  params,
  searchParams,
}: PageProps<"/trip/[tripId]">) {
  const { tripId } = await params;
  const query = await searchParams;
  const from = typeof query.from === "string" ? query.from : undefined;
  const to = typeof query.to === "string" ? query.to : undefined;
  const place = typeof query.place === "string" ? query.place : undefined;
  const lng = typeof query.lng === "string" ? Number(query.lng) : Number.NaN;
  const lat = typeof query.lat === "string" ? Number(query.lat) : Number.NaN;
  const styles = (
    typeof query.styles === "string" ? query.styles.split(",") : []
  ).filter((value): value is TripStyle =>
    (TRIP_STYLES as readonly string[]).includes(value),
  );
  const interests = (
    typeof query.interests === "string" ? query.interests.split(",") : []
  ).filter((value): value is Interest =>
    (INTERESTS as readonly string[]).includes(value),
  );
  const budgetRaw = typeof query.budget === "string" ? query.budget : undefined;
  const budget = (BUDGET_TIERS as readonly string[]).includes(budgetRaw ?? "")
    ? (budgetRaw as BudgetTier)
    : undefined;
  const trip = getPlannerTrip(tripId, {
    startDate: from,
    endDate: to,
    name: place,
    coords:
      Number.isFinite(lng) && Number.isFinite(lat) ? { lng, lat } : undefined,
    prefs: {
      budget: budget ?? null,
      styles,
      interests,
    },
  });
  if (!trip) notFound();

  return (
    <TripStoreProvider trip={trip}>
      <PlannerExperience />
    </TripStoreProvider>
  );
}

export function generateStaticParams() {
  return plannerStaticTripIds().map((tripId) => ({ tripId }));
}
