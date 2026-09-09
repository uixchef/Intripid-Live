import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NYC_TRIP, NYC_TRIP_ID } from "@/data/nyc-trip";
import { PlannerExperience } from "@/features/planner/planner-experience";
import { TripStoreProvider } from "@/stores/trip-store";

export const metadata: Metadata = {
  title: "Trip planner",
  description:
    "A five-day New York itinerary on a calendar that knows what fits, with the map beside it.",
};

export default async function TripPage({ params }: PageProps<"/trip/[tripId]">) {
  // `params` is a Promise in Next 16 — synchronous access is fully removed.
  const { tripId } = await params;

  // One trip is seeded; anything else is a genuine 404 rather than an empty shell.
  if (tripId !== NYC_TRIP_ID) notFound();

  return (
    <TripStoreProvider>
      <PlannerExperience />
    </TripStoreProvider>
  );
}

export function generateStaticParams() {
  return [{ tripId: NYC_TRIP.id }];
}
