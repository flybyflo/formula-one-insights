import * as React from "react"

import { max } from "d3-array"
import { scaleLinear } from "d3-scale"
import { curveMonotoneY, line } from "d3-shape"

import type { DriverKey, SeasonStory } from "@/types/story"

const QATAR_STEPS = [
  { id: "fork", lap: 7, label: "Safety car" },
  { id: "limit", lap: 25, label: "Tyre limit" },
  { id: "restack", lap: 32, label: "Reset" },
  { id: "points", lap: 57, label: "Result" },
] as const

const MAP_WIDTH = 700
const MAP_HEIGHT = 1120
const ACTIVE_PROBE_RATIO = 0.42
const CHART_LEFT = 112
const CHART_RIGHT = 564
const CHART_TOP = 112
const CHART_BOTTOM = MAP_HEIGHT - 56
const DRIVER_LABEL_X = 72

function formatGap(gap: number | null | undefined) {
  return typeof gap === "number" ? `${gap.toFixed(1)}s` : "n/a"
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function interpolate(start: number, end: number, progress: number) {
  return start + (end - start) * progress
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function QatarLapTimeline({ story }: { story: SeasonStory }) {
  const qatarRace = story.races.find((race) => race.chapterId === "qatar")
  const [qatarLap, setQatarLap] = React.useState(7)
  const [hoverLap, setHoverLap] = React.useState<number | null>(null)
  const revealClipId = React.useId().replace(/:/g, "")

  React.useEffect(() => {
    if (!qatarRace?.chapterData || prefersReducedMotion()) return

    let frame: number | null = null

    const update = () => {
      frame = null
      const probeY = window.innerHeight * ACTIVE_PROBE_RATIO
      const measured = QATAR_STEPS.flatMap((step) => {
        const element = document.querySelector<HTMLElement>(`[data-qatar-step="${step.id}"]`)
        if (!element) return []
        const rect = element.getBoundingClientRect()
        const anchorOffset = step.id === "fork" ? rect.height * 0.72 : 0
        return [{ scrollY: window.scrollY + rect.top + anchorOffset - probeY, lap: step.lap as number }]
      })

      if (measured.length === 0) return

      measured.sort((a, b) => a.scrollY - b.scrollY)
      const current = window.scrollY
      const first = measured[0]!
      const last = measured.at(-1)!

      if (current <= first.scrollY) {
        setQatarLap(first.lap)
        return
      }

      if (current >= last.scrollY) {
        setQatarLap(last.lap)
        return
      }

      for (let index = 0; index < measured.length - 1; index += 1) {
        const start = measured[index]!
        const end = measured[index + 1]!
        if (current >= start.scrollY && current <= end.scrollY) {
          const progress = clamp((current - start.scrollY) / (end.scrollY - start.scrollY), 0, 1)
          setQatarLap(interpolate(start.lap, end.lap, progress))
          return
        }
      }
    }

    const schedule = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(update)
    }

    schedule()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)

    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [qatarRace?.chapterData])

  if (!qatarRace?.chapterData) return null

  const chapterData = qatarRace.chapterData
  const width = MAP_WIDTH
  const height = MAP_HEIGHT
  const lapMax = max(chapterData.stints ?? [], (stint) => stint.endLap) ?? 57
  const lapY = scaleLinear().domain([1, lapMax]).range([CHART_TOP, CHART_BOTTOM])
  const effectiveQatarLap = prefersReducedMotion() ? lapMax : qatarLap
  const revealY = lapY(clamp(effectiveQatarLap, 1, lapMax))
  const qatarDrivers = story.drivers.filter((driver) =>
    (["piastri", "verstappen", "sainz", "norris"] as DriverKey[]).includes(driver.key)
  )
  const qatarDriverKeys = new Set(qatarDrivers.map((driver) => driver.key))
  const gapByLapDriver = new Map<string, number>()
  for (const gap of chapterData.gapSeries ?? []) {
    if (qatarDriverKeys.has(gap.driver) && typeof gap.gapToLeader === "number") {
      gapByLapDriver.set(`${gap.driver}-${gap.lap}`, gap.gapToLeader)
    }
  }
  const positionByLapDriver = new Map<string, number>()
  for (const position of chapterData.positionSeries ?? []) {
    if (qatarDriverKeys.has(position.driver)) {
      positionByLapDriver.set(`${position.driver}-${position.lap}`, position.position)
    }
  }
  const gapMax = Math.ceil((max([...gapByLapDriver.values()]) ?? 30) / 5) * 5
  const gapX = scaleLinear().domain([0, gapMax]).range([CHART_LEFT, CHART_RIGHT])
  const gapLine = line<{ lap: number; gap: number }>()
    .x((sample) => gapX(sample.gap))
    .y((sample) => lapY(sample.lap))
    .curve(curveMonotoneY)
  const activeQatarStep =
    [...QATAR_STEPS].reverse().find((step) => step.lap <= effectiveQatarLap) ?? QATAR_STEPS[0]
  const activeHoverLap = hoverLap === null ? null : clamp(hoverLap, 1, lapMax)
  const hoverY = activeHoverLap === null ? null : lapY(activeHoverLap)
  const hoverSamples =
    activeHoverLap === null
      ? []
      : qatarDrivers.flatMap((driver) => {
          const gap = gapByLapDriver.get(`${driver.key}-${activeHoverLap}`)
          if (typeof gap !== "number") return []
          return [
            {
              driver,
              gap,
              position: positionByLapDriver.get(`${driver.key}-${activeHoverLap}`),
            },
          ]
        })
  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const svg = event.currentTarget
      const bounds = svg.getBoundingClientRect()
      const viewY = ((event.clientY - bounds.top) / bounds.height) * height
      if (viewY < CHART_TOP || viewY > CHART_BOTTOM || viewY > revealY) {
        setHoverLap(null)
        return
      }
      setHoverLap(Math.round(clamp(lapY.invert(viewY), 1, lapMax)))
    },
    [height, lapMax, lapY, revealY]
  )

  return (
    <figure className="journey-map qatar-lap-map" aria-label="Qatar lap strategy timeline">
      <span className="sr-only" aria-live="polite">
        Qatar race story step: {activeQatarStep.label}
      </span>
      <svg
        className="interactive-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverLap(null)}
      >
        <title>Qatar race-position timeline with Safety Car and tyre-limit context</title>
        <defs>
          <clipPath id={revealClipId}>
            <rect
              x={CHART_LEFT - 14}
              y={CHART_TOP - 14}
              width={CHART_RIGHT - CHART_LEFT + 28}
              height={Math.max(0, revealY - CHART_TOP + 14)}
            />
          </clipPath>
        </defs>
        <text x="42" y="42" className="lap-map-title">
          Qatar position timeline
        </text>
        <rect
          x={CHART_LEFT}
          y={lapY(1)}
          width={CHART_RIGHT - CHART_LEFT}
          height={Math.max(0, revealY - lapY(1))}
          className="lap-progress-fill"
        />
        {[0, 5, 10, 20, gapMax]
          .filter((tick, index, ticks) => tick >= 0 && tick <= gapMax && ticks.indexOf(tick) === index)
          .map((tick) => (
            <g key={`lap-time-axis-${tick}`} className="lap-time-axis">
              <line x1={gapX(tick)} x2={gapX(tick)} y1={CHART_TOP - 14} y2={CHART_BOTTOM} />
              <text x={gapX(tick)} y={CHART_TOP - 32} textAnchor="middle">
                {tick}s
              </text>
            </g>
          ))}
        {[1, 7, 25, 32, 44, lapMax].map((lap) => (
          <g key={`qatar-axis-${lap}`} className="lap-axis" transform={`translate(${CHART_LEFT} ${lapY(lap)})`}>
            <line x1="0" x2={CHART_RIGHT - CHART_LEFT} />
            <text x="-12" y="4" textAnchor="end">
              L{lap}
            </text>
          </g>
        ))}
        <text x={CHART_RIGHT} y={CHART_TOP - 50} textAnchor="end" className="lap-map-subtitle">
          Gap to leader
        </text>
        <rect x={CHART_LEFT} y={lapY(7) - 8} width={CHART_RIGHT - CHART_LEFT} height="16" className="safety-car-band">
          <title>Safety Car lap 7. Verstappen stops; McLaren stay out.</title>
        </rect>
        <g className="lap-map-callout pit-callout" transform={`translate(${gapX(gapByLapDriver.get("verstappen-7") ?? 0)} ${lapY(7)})`}>
          <line x1="10" x2="42" y1="-8" y2="-26" />
          <text x="48" y="-26">
            VER pits
          </text>
        </g>
        {qatarDrivers.map((driver, driverIndex) => (
          <g key={`qatar-lap-time-${driver.key}`}>
            <text
              x={DRIVER_LABEL_X}
              y={lapY(1) - 22 + driverIndex * 16}
              textAnchor="end"
              className="lap-lane-label"
              style={{ fill: driver.color }}
            >
              {driver.acronym}
            </text>
            <g clipPath={`url(#${revealClipId})`}>
              <path
                className="qatar-lap-trace"
                d={
                  gapLine(
                    [...gapByLapDriver.entries()]
                      .flatMap(([key, gap]) => {
                        const [sampleDriver, sampleLap] = key.split("-")
                        return sampleDriver === driver.key ? [{ lap: Number(sampleLap), gap }] : []
                      })
                      .sort((a, b) => a.lap - b.lap)
                  ) ?? undefined
                }
                fill="none"
                stroke={driver.color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
            {[1, 7, 25, 32, 44, lapMax]
              .flatMap((lap) => {
                const gap = gapByLapDriver.get(`${driver.key}-${lap}`)
                return typeof gap === "number" ? [{ lap, gap }] : []
              })
              .map((sample) => (
                <circle
                  key={`qatar-map-lap-${driver.key}-${sample.lap}`}
                  className="qatar-lap-marker"
                  cx={gapX(sample.gap)}
                  cy={lapY(sample.lap)}
                  r="3.5"
                  fill={driver.color}
                  opacity={sample.lap <= effectiveQatarLap ? 1 : 0.24}
                >
                  <title>
                    {driver.acronym} lap {sample.lap}: {formatGap(sample.gap)} behind leader.
                  </title>
                </circle>
              ))}
            {(chapterData.pitStops ?? [])
              .filter((stop) => stop.driver === driver.key)
              .map((stop) => (
                <g
                  key={`qatar-map-pit-${driver.key}-${stop.lap}`}
                  transform={`translate(${gapX(gapByLapDriver.get(`${driver.key}-${stop.lap}`) ?? 0)} ${lapY(stop.lap)})`}
                >
                  <line x1="-18" x2="18" className="pit-cut" />
                  <circle
                    r="4.5"
                    fill={driver.color}
                    className="qatar-pit-marker"
                    opacity={stop.lap <= effectiveQatarLap ? 1 : 0.25}
                  />
                  <title>
                    {driver.acronym} pit lap {stop.lap}: pit lane {stop.pitDuration?.toFixed(2) ?? "n/a"}s.
                  </title>
                </g>
              ))}
          </g>
        ))}
        <line x1={CHART_LEFT - 30} x2="582" y1={revealY} y2={revealY} className="lap-progress-cursor" />
        {QATAR_STEPS.map((step) => (
          <g key={`step-${step.id}`} transform={`translate(588 ${lapY(step.lap)})`}>
            <circle r="6" className={step.lap <= effectiveQatarLap ? "step-dot active" : "step-dot"} />
            <text x="16" y="4" className="lap-map-subtitle">
              {step.label}
            </text>
          </g>
        ))}
        {activeHoverLap !== null && hoverY !== null ? (
          <g className="qatar-hover-readout">
            <line x1={CHART_LEFT - 30} x2="582" y1={hoverY} y2={hoverY} className="qatar-hover-line" />
            <text x={CHART_LEFT - 38} y={hoverY + 4} textAnchor="end" className="qatar-hover-lap">
              L{activeHoverLap}
            </text>
            {hoverSamples.map(({ driver, gap }) => (
              <g key={`qatar-hover-dot-${driver.key}`}>
                <circle
                  cx={gapX(gap)}
                  cy={hoverY}
                  r="5"
                  fill={driver.color}
                  className="qatar-hover-dot"
                />
              </g>
            ))}
            <g transform={`translate(${CHART_RIGHT - 128} ${Math.max(CHART_TOP + 8, Math.min(hoverY - 72, CHART_BOTTOM - 112))})`}>
              <rect width="170" height="104" rx="6" className="qatar-hover-panel" />
              <text x="12" y="20" className="qatar-hover-title">
                L{activeHoverLap} spacing
              </text>
              {hoverSamples.map(({ driver, gap }, index) => (
                <g key={`qatar-hover-label-${driver.key}`} transform={`translate(12 ${42 + index * 16})`}>
                  <circle r="4" cy="-4" fill={driver.color} />
                  <text x="12" className="qatar-hover-driver">
                    {driver.acronym}
                  </text>
                  <text x="146" textAnchor="end" className="qatar-hover-time">
                    +{formatGap(gap)}
                  </text>
                </g>
              ))}
            </g>
          </g>
        ) : null}
      </svg>
    </figure>
  )
}
