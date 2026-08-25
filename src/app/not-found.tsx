import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-32 text-center sm:px-6">
      <p className="text-primary font-mono text-sm">404</p>
      <h1 className="font-heading mt-3 text-2xl font-semibold tracking-[-0.02em]">
        No frame rate data here
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        The page you were looking for isn&apos;t indexed.
      </p>
      <Button asChild size="lg" className="mt-6">
        <Link href="/browse">Browse all games</Link>
      </Button>
    </div>
  );
}
