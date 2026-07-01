"use client";

import * as React from "react";
import {
  SlidersHorizontalIcon,
  CodeIcon,
  Dices as DicesIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTheme } from "@/components/theme/theme-provider";
import {
  ACCENTS,
  BASE_COLORS,
  BODY_FONT_KEYS,
  buildCss,
  CHART_COLORS,
  FONTS,
  HEADING_FONT_KEYS,
  presetLabel,
  STYLES,
  type ThemeConfig,
} from "@/lib/theme-presets";

function Row({
  label,
  children,
  swatch,
}: {
  label: string;
  children: React.ReactNode;
  swatch?: React.ReactNode;
}) {
  return (
    <div className="bg-card/40 hover:bg-card/70 rounded-lg border p-3 transition-colors">
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-muted-foreground text-xs tracking-wide uppercase">
          {label}
        </Label>
        {swatch}
      </div>
      {children}
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      className="size-4 rounded-full border shadow-sm"
      style={{ background: color }}
    />
  );
}

export function ThemeSettingsPanel() {
  const { draft, dirty, setField, shuffle, apply, reset } = useTheme();

  const set =
    <K extends keyof ThemeConfig>(key: K) =>
    (value: ThemeConfig[K] | null) => {
      if (value != null) setField(key, value);
    };

  const chartHue = CHART_COLORS[draft.chart].h;
  const accent = ACCENTS[draft.accent];

  const getCode = async () => {
    const css = buildCss(draft);
    try {
      await navigator.clipboard.writeText(css);
      toast.success("Theme CSS copied", {
        description: "Paste it into src/app/globals.css to bake it in.",
      });
    } catch {
      toast.error("Couldn't copy", { description: "Clipboard is unavailable." });
    }
  };

  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
        <SlidersHorizontalIcon className="size-4" />
        <span className="hidden sm:inline">Theme</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-[22rem] gap-0 p-0 sm:max-w-none">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <SlidersHorizontalIcon className="size-4" />
            Theme
          </SheetTitle>
          <SheetDescription>
            Shuffle presets, preview live, then apply across the dashboard.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 overflow-y-auto p-4">
          <Row label="Style">
            <Select value={draft.style} onValueChange={set("style")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STYLES).map(([key, s]) => (
                  <SelectItem key={key} value={key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>

          <Row
            label="Base Color"
            swatch={<Swatch color={BASE_COLORS[draft.base].swatch} />}
          >
            <Select value={draft.base} onValueChange={set("base")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BASE_COLORS).map(([key, b]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <Swatch color={b.swatch} />
                      {b.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>

          <Row
            label="Theme"
            swatch={
              <Swatch color={`oklch(${accent.l} ${accent.c} ${accent.h})`} />
            }
          >
            <Select value={draft.accent} onValueChange={set("accent")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACCENTS).map(([key, a]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <Swatch color={`oklch(${a.l} ${a.c} ${a.h})`} />
                      {a.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>

          <Row
            label="Chart Color"
            swatch={<Swatch color={`oklch(0.72 0.13 ${chartHue})`} />}
          >
            <Select value={draft.chart} onValueChange={set("chart")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CHART_COLORS).map(([key, c]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <Swatch color={`oklch(0.72 0.13 ${c.h})`} />
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>

          <Row label="Heading">
            <Select value={draft.heading} onValueChange={set("heading")}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  <span style={{ fontFamily: FONTS[draft.heading].varName }}>
                    {FONTS[draft.heading].label}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {HEADING_FONT_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    <span style={{ fontFamily: FONTS[key].varName }}>
                      {FONTS[key].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>

          <Row label="Body">
            <Select value={draft.body} onValueChange={set("body")}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  <span style={{ fontFamily: FONTS[draft.body].varName }}>
                    {FONTS[draft.body].label}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BODY_FONT_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    <span style={{ fontFamily: FONTS[key].varName }}>
                      {FONTS[key].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>

          <Row label="Appearance">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={draft.mode === "light" ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => setField("mode", "light")}
              >
                <SunIcon className="size-4" /> Light
              </Button>
              <Button
                type="button"
                variant={draft.mode === "dark" ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => setField("mode", "dark")}
              >
                <MoonIcon className="size-4" /> Dark
              </Button>
            </div>
          </Row>
        </div>

        <Separator />

        <div className="flex flex-col gap-2 p-4">
          <div className="bg-muted/50 text-muted-foreground rounded-md border px-3 py-2 text-center font-mono text-xs">
            --preset {presetLabel(draft)}
          </div>
          <Button variant="outline" className="gap-2" onClick={shuffle}>
            <DicesIcon className="size-4" /> Shuffle
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={reset} disabled={!dirty}>
              Reset
            </Button>
            <Button onClick={apply} disabled={!dirty}>
              {dirty ? "Apply" : "Applied"}
            </Button>
          </div>
          <Button variant="secondary" className="gap-2" onClick={getCode}>
            <CodeIcon className="size-4" /> Get Code
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
