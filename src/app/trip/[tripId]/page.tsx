import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { plannerStaticTripIds, getPlannerTrip } from "@/data/trips";
import { PlannerExperience } from "@/features/planner/planner-experience";
import { TripStoreProvider } from "@/stores/trip-store";

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
  const trip = getPlannerTrip(tripId, {
    startDate: from,
    endDate: to,
    name: place,
    coords:
      Number.isFinite(lng) && Number.isFinite(lat) ? { lng, lat } : undefined,
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
