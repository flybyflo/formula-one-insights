import type { DriverKey } from "@/types/story"

export const TITLE_DRIVER_KEYS: DriverKey[] = ["norris", "verstappen", "piastri"]

export const EYEBROW_CLASS =
  "m-0 text-[0.72rem] font-[620] uppercase tracking-[0.08em] text-muted-foreground"

export const CHAPTER_EYEBROW_CLASS =
  "m-0 text-[0.58rem] font-[620] uppercase tracking-[0.06em] text-muted-foreground"

export const CHAPTER_CLASS =
  "chapter grid min-h-[72svh] max-w-[860px] content-center gap-4 border-b border-foreground/10 py-16"

export const QATAR_INSIGHT_CLASS = `${CHAPTER_CLASS} qatar-insights content-start py-12`

export const CHAPTER_HEADING_CLASS =
  "max-w-[680px] text-[clamp(1.55rem,2.25vw,2.35rem)] leading-[1.02] font-[650] tracking-normal"

export const CHAPTER_TEXT_CLASS =
  "max-w-[620px] text-[clamp(0.72rem,0.82vw,0.8rem)] leading-[1.42] text-foreground"
