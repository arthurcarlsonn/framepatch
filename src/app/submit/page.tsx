import type { Metadata } from "next";

import { SubmitView } from "@/components/submit-view";

export const metadata: Metadata = {
  title: "Submit frame rate info",
  description: "Report a frame rate patch or correct existing FramePatch data.",
  alternates: { canonical: "/submit" },
  // A form has nothing to answer, and robots.ts disallows it. Say so in the page too, so a
  // crawler that reaches it by link does not hold it.
  robots: { index: false, follow: true },
};

export default function Page() {
  return <SubmitView />;
}
