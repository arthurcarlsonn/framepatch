import { PatchesView } from "@/components/patches-view";

export const metadata = {
  title: "Frame rate patches",
  description: "Every verified console frame rate patch, newest first.",
};

export default function Page() {
  return <PatchesView />;
}
