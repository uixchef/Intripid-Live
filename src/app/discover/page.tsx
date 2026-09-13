import type { Metadata } from "next";

import { DiscoveryExperience } from "@/features/discovery/discovery-experience";
import { DiscoveryStoreProvider } from "@/stores/discovery-store";

export const metadata: Metadata = {
  title: "Find where to go",
  description:
    "Answer a few questions and watch destinations rank themselves against what you actually care about.",
};

export default async function DiscoverPage({
  searchParams,
}: PageProps<"/discover">) {
  const query = await searchParams;
  const startDate = typeof query.from === "string" ? query.from : undefined;
  const endDate = typeof query.to === "string" ? query.to : undefined;

  return (
    <DiscoveryStoreProvider startDate={startDate} endDate={endDate}>
      <DiscoveryExperience />
    </DiscoveryStoreProvider>
  );
}
