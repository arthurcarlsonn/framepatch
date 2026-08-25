import Link from "next/link";

import { Badge } from "@/components/ui/badge";

export function SectionHeader({
  title,
  tag,
  href,
  className,
}: {
  title: string;
  tag?: string;
  href?: string;
  className?: string;
}) {
  return (
    <div className={`mb-4 flex items-center justify-between gap-4 ${className ?? ""}`}>
      <div className="flex items-center gap-2.5">
        <h2 className="font-heading text-xl font-semibold tracking-[-0.02em]">{title}</h2>
        {tag ? (
          <Badge variant="secondary" className="rounded-full text-[11px] font-medium">
            {tag}
          </Badge>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
        >
          View All
        </Link>
      ) : null}
    </div>
  );
}
