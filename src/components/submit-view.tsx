"use client";

import { CheckCircle2Icon, InfoIcon, SendIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { usePlatform } from "@/components/platform-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PLATFORMS, type PlatformId } from "@/lib/types";

const FPS_OPTIONS = ["30", "40", "60", "120"];

export function SubmitView() {
  const { platform } = usePlatform();
  const [console_, setConsole] = useState<PlatformId>(platform);
  const [fps, setFps] = useState("60");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Add the game title first");
      return;
    }
    setSent(true);
    toast.success("Submission queued for verification");
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
        <CheckCircle2Icon className="text-fps-good mx-auto size-10" />
        <h1 className="font-heading mt-4 text-2xl font-semibold tracking-[-0.02em]">
          Thanks — it&apos;s in the queue
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          A moderator checks every submission against publisher patch notes or capture footage
          before it appears on {title}.
        </p>
        <Button
          variant="outline"
          size="lg"
          className="mt-6"
          onClick={() => {
            setSent(false);
            setTitle("");
            setSource("");
            setNotes("");
          }}
        >
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 sm:px-6">
      <header className="mb-8">
        <p className="text-primary text-xs font-semibold tracking-[0.09em] uppercase">Community</p>
        <h1 className="font-heading mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
          Submit frame rate info
        </h1>
        <p className="text-muted-foreground mt-2 text-[15px]">
          Spotted a patch we missed, or data that looks wrong? Send it over — every entry is verified
          before it goes live.
        </p>
      </header>

      <form onSubmit={onSubmit} className="surface space-y-6 p-6">
        <Field label="Game title" hint="Exactly as it appears on the store">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Mafia: Definitive Edition"
            className="h-10!"
          />
        </Field>

        <Field label="Console">
          <ToggleGroup
            type="single"
            value={console_}
            onValueChange={(v) => v && setConsole(v as PlatformId)}
            variant="outline"
            className="w-full"
          >
            {PLATFORMS.map((p) => (
              <ToggleGroupItem key={p.id} value={p.id} className="flex-1 text-[13px]">
                {p.short}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        <Field label="Observed frame rate" hint="The rate you measured in the default mode">
          <ToggleGroup
            type="single"
            value={fps}
            onValueChange={(v) => v && setFps(v)}
            variant="outline"
            className="w-full"
          >
            {FPS_OPTIONS.map((f) => (
              <ToggleGroupItem key={f} value={f} className="flex-1 tabular-nums">
                {f} FPS
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        <Field label="Source" hint="Patch notes URL, capture footage, or a Digital Foundry video">
          <Input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="https://"
            type="url"
            className="h-10!"
          />
        </Field>

        <Field label="Notes" hint="Optional — modes, VRR behaviour, drops you noticed">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Performance mode holds 60 outside of cutscenes…"
            rows={4}
          />
        </Field>

        <div className="border-border/70 text-muted-foreground flex items-start gap-2.5 rounded-lg border border-dashed p-3 text-xs">
          <InfoIcon className="mt-px size-4 shrink-0" />
          <p>
            Submissions without a verifiable source are held until a second report confirms them.
          </p>
        </div>

        <Button type="submit" size="lg" className="w-full">
          <SendIcon data-icon="inline-start" className="size-4" />
          Submit for verification
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}
