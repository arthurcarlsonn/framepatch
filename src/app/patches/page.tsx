import type { Metadata } from "next";

import { PatchesView } from "@/components/patches-view";

export const metadata: Metadata = {
  title: "Frame rate patches",
  description: "Every verified console frame rate patch, newest first.",
  alternates: { canonical: "/patches" },
};

export default function Page() {
  return <PatchesView />;
}
