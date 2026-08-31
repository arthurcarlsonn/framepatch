"use client";

import { MenuIcon, SearchIcon, ZapIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";

import { PlatformSwitcher } from "@/components/platform-switcher";
import { useSearchHotkey } from "@/components/use-search-hotkey";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/browse", label: "Browse" },
  { href: "/consoles", label: "Consoles" },
  { href: "/patches", label: "Patches" },
  { href: "/live", label: "Live" },
  { href: "/submit", label: "Submit Info" },
];

/**
 * The search dialog imports the catalogue, so importing it from the header put all 769 titles
 * in the first-load bundle of every page on the site. Loading it on first open instead keeps
 * that weight off pages nobody searches from, which is most of them.
 */
const SearchDialog = dynamic(
  () => import("@/components/search-dialog").then((m) => m.SearchDialog),
  { ssr: false },
);

export function SiteHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoaded, setSearchLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Mount on the first open and leave it mounted, so reopening is instant.
  const openSearch = useCallback(() => {
    setSearchLoaded(true);
    setSearchOpen(true);
  }, []);

  useSearchHotkey(openSearch);

  return (
    <>
      <header className="bg-background/80 border-border/70 sticky top-0 z-50 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="bg-primary grid size-8 place-items-center rounded-lg">
              <ZapIcon className="size-4 fill-white text-white" strokeWidth={2} />
            </span>
            <span className="font-heading text-[17px] font-bold tracking-[-0.02em]">
              Frame<span className="text-primary">Patch</span>
            </span>
          </Link>

          <PlatformSwitcher className="ml-2 hidden md:inline-flex" />

          <div className="flex-1" />

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "text-foreground bg-muted/70"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Search games"
            className="text-muted-foreground hover:text-foreground"
            onClick={openSearch}
          >
            <SearchIcon className="size-4.5" />
          </Button>

          <ThemeToggle />

          <Separator orientation="vertical" className="mx-1 hidden h-5! sm:block" />

          <Button size="lg" className="hidden sm:inline-flex">
            Sign In
          </Button>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-lg" aria-label="Menu" className="lg:hidden">
                <MenuIcon className="size-4.5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-6">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex flex-col gap-6">
                <PlatformSwitcher className="w-full justify-between md:hidden" />
                <nav className="flex flex-col gap-1">
                  {NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="hover:bg-muted rounded-lg px-3 py-2 text-sm font-medium"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <Button size="lg">Sign In</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {searchLoaded ? <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} /> : null}
    </>
  );
}
