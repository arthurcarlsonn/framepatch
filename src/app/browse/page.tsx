import { Suspense } from "react";

import { BrowseView } from "@/components/browse-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Browse games",
  description: "Every console game with verified frame rate data on FramePatch.",
};

export default function Page() {
  return (
    <Suspense fallback={<BrowseSkeleton />}>
      <BrowseView />
    </Suspense>
  );
}

function BrowseSkeleton() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-10 sm:px-6">
      <Skeleton className="h-10 w-64" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
