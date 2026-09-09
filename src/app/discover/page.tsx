import type { Metadata } from "next";

import { DiscoveryExperience } from "@/features/discovery/discovery-experience";
import { DiscoveryStoreProvider } from "@/stores/discovery-store";

export const metadata: Metadata = {
  title: "Find where to go",
  description:
    "Answer a few questions and watch destinations rank themselves against what you actually care about.",
};

export default function DiscoverPage() {
  return (
    <DiscoveryStoreProvider>
      <DiscoveryExperience />
    </DiscoveryStoreProvider>
  );
}
