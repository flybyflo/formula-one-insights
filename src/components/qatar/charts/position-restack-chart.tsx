import * as React from "react"

import { scaleLinear, scalePoint } from "d3-scale"
import { curveBumpX, line } from "d3-shape"

import { PanelTitle } from "@/components/qatar/charts/shared"
import {
  driverCode,
  driverColor,
  DRIVER_ORDER,
  formatSeconds,
  type QatarChartProps,
} from "@/components/qatar/charts/helpers"
import type { DriverKey } from "@/types/story"

const SNAPSHOTS = [
  { id: "before", lap: 24, label: "Before stops" },
  { id: "mclaren", lap: 30, label: "McLaren stop cost" },
  { id: "reset", lap: 33, label: "After VER stop" },
] as const

const ORDER_LABELS = ["1st", "2nd", "3rd", "4th"]

function latestGapAtLap(gaps: NonNullable<QatarChartProps["race"]["chapterData"]>["gapSeries"], driver: DriverKey, lap: number) {
  return gaps?.filter((sample) => sample.driver === driver && sample.lap === lap && sample.gapToLeader !== null).at(-1)
    ?.gapToLeader
}

export function PositionRestackChart({ race, drivers }: QatarChartProps) {
  const gaps = race.chapterData?.gapSeries ?? []
  const snapshots = SNAPSHOTS.map((snapshot) => {
    const entries = DRIVER_ORDER.flatMap((driver) => {
      const gap = latestGapAtLap(gaps, driver, snapshot.lap)
      return typeof gap === "number" ? [{ driver, gap }] : []
    })
      .sort((a, b) => a.gap - b.gap)
      .map((entry, index) => ({ ...entry, order: index + 1 }))

    return { ...snapshot, entries }
  })
  const snapshotById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]))
  const x = scalePoint<(typeof SNAPSHOTS)[number]["id"]>()
    .domain(SNAPSHOTS.map((snapshot) => snapshot.id))
    .range([118, 642])
    .padding(0.2)
  const y = scaleLinear().domain([4, 1]).range([198, 86])
  const bumpLine = line<{ x: number; y: number }>()
    .x((point) => point.x)
    .y((point) => point.y)
    .curve(curveBumpX)
  const [hoverSnapshotId, setHoverSnapshotId] = React.useState<(typeof SNAPSHOTS)[number]["id"] | null>(null)
  const activeSnapshot = hoverSnapshotId === null ? null : snapshotById.get(hoverSnapshotId) ?? null
  const activeX = activeSnapshot === null ? null : x(activeSnapshot.id) ?? null
  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const bounds = event.currentTarget.getBoundingClientRect()
      const viewX = ((event.clientX - bounds.left) / bounds.width) * 760
      if (viewX < 70 || viewX > 690) {
        setHoverSnapshotId(null)
        return
      }
      const nearest = snapshots.reduce((best, snapshot) => {
        const distance = Math.abs((x(snapshot.id) ?? 0) - viewX)
        return distance < best.distance ? { id: snapshot.id, distance } : best
      }, { id: snapshots[0]!.id, distance: Number.POSITIVE_INFINITY })
      setHoverSnapshotId(nearest.id)
    },
    [snapshots, x]
  )

  return (
    <>
      <svg
        className="race-lens race-lens-large interactive-chart"
        viewBox="0 0 760 250"
        role="img"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverSnapshotId(null)}
      >
        <title>Qatar road-order snapshots through the forced-stop restack</title>
        <PanelTitle
          x={16}
          y={30}
          title="Restack: McLaren lose the road"
          subtitle="Columns show the order among these four cars. Small text is gap to the race leader."
        />
        {[1, 2, 3, 4].map((position) => (
          <g key={position} className="grid-line">
            <line x1="82" x2="690" y1={y(position)} y2={y(position)} />
            <text x="58" y={y(position) + 4} textAnchor="end">
              {ORDER_LABELS[position - 1]}
            </text>
          </g>
        ))}
        {snapshots.map((snapshot) => (
          <g key={snapshot.id} transform={`translate(${x(snapshot.id) ?? 0} 0)`}>
            <line x1="0" x2="0" y1="70" y2="212" className="muted-baseline" />
            <text y="226" textAnchor="middle">
              L{snapshot.lap}
            </text>
            <text y="240" textAnchor="middle" className="callout-label-text">
              {snapshot.label}
            </text>
          </g>
        ))}
        {DRIVER_ORDER.map((driver) => {
          const points = snapshots.flatMap((snapshot) => {
            const entry = snapshot.entries.find((item) => item.driver === driver)
            const pointX = x(snapshot.id)
            return entry && typeof pointX === "number" ? [{ x: pointX, y: y(entry.order), entry, snapshot }] : []
          })
          if (points.length === 0) return null

          const color = driverColor(drivers, driver)
          const startPoint = points[0]!
          const endPoint = points.at(-1)!

          return (
            <g key={`restack-driver-${driver}`}>
              <path
                d={bumpLine(points) ?? undefined}
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.9"
              />
              {points.map((point) => (
                <circle
                  key={`${driver}-${point.snapshot.id}`}
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill={color}
                  stroke="var(--background)"
                  strokeWidth="2"
                />
              ))}
              <text x={startPoint.x - 14} y={startPoint.y + 4} textAnchor="end" className="bump-driver-label" fill={color}>
                {driverCode(drivers, driver)}
              </text>
              <text x={endPoint.x + 14} y={endPoint.y + 4} className="bump-driver-label" fill={color}>
                {endPoint.entry.gap < 0.05 ? "lead" : `+${endPoint.entry.gap.toFixed(1)}s`}
              </text>
            </g>
          )
        })}
        <g className="callout-label" transform={`translate(${x("reset") ?? 0} 68)`}>
          <line x1="0" x2="-28" y1="0" y2="-14" />
          <text x="-34" y="-13" textAnchor="end">
            Verstappen still P1
          </text>
        </g>
        {activeSnapshot !== null && activeX !== null ? (
          <g className="chart-hover-layer">
            <line x1={activeX} x2={activeX} y1="68" y2="212" className="chart-hover-line" />
            {activeSnapshot.entries.map((entry) => (
              <circle
                key={entry.driver}
                cx={activeX}
                cy={y(entry.order)}
                r="5"
                fill={driverColor(drivers, entry.driver)}
                className="chart-hover-dot"
              />
            ))}
            <g transform={`translate(${Math.min(540, Math.max(84, activeX + 18))} 76)`}>
              <rect width="186" height="102" rx="6" className="chart-hover-panel" />
              <text x="12" y="20" className="chart-hover-title">
                L{activeSnapshot.lap} order
              </text>
              {activeSnapshot.entries.map((entry, index) => (
                <g key={entry.driver} transform={`translate(12 ${40 + index * 14})`}>
                  <circle r="3.5" cy="-4" fill={driverColor(drivers, entry.driver)} />
                  <text x="11" className="chart-hover-label">
                    {index + 1}. {driverCode(drivers, entry.driver)}
                  </text>
                  <text x="162" textAnchor="end" className="chart-hover-value">
                    {entry.gap < 0.05 ? "leader" : `+${formatSeconds(entry.gap)}s`}
                  </text>
                </g>
              ))}
            </g>
          </g>
        ) : null}
      </svg>
      <p className="chart-bridge">
        The forced stops are only half the damage. The running order is
        reshuffled in Verstappen’s favour before the final sprint even begins.
      </p>
    </>
  )
}
