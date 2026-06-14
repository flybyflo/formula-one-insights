import * as React from "react"

import { extent } from "d3-array"
import { scaleLinear } from "d3-scale"
import { curveLinear, line } from "d3-shape"

import { CompactDriverLegend, PanelTitle } from "@/components/qatar/charts/shared"
import {
  buildRelativeGapSeries,
  driverCode,
  driverColor,
  formatGapToReference,
  qatarLapMax,
  type QatarChartProps,
} from "@/components/qatar/charts/helpers"

export function GapToVerstappenChart({ race, drivers }: QatarChartProps) {
  const gaps = (race.chapterData?.gapSeries ?? []).filter((gap) => typeof gap.gapToLeader === "number")
  const pits = race.chapterData?.pitStops ?? []
  const lapMax = qatarLapMax(race)
  const gapWindow = buildRelativeGapSeries(
    gaps.filter((gap) => gap.lap >= 33),
    "verstappen"
  )
  const gapValues = gapWindow.flatMap((series) => series.values.map((sample) => sample.value))
  const gapExtent = extent(gapValues) as [number, number]
  const gapMin = Math.min(-10, Math.floor((gapExtent[0] ?? -10) / 5) * 5)
  const gapMax = Math.max(30, Math.ceil((gapExtent[1] ?? 30) / 5) * 5)
  const gapX = scaleLinear().domain([33, lapMax]).range([82, 710])
  const gapY = scaleLinear().domain([gapMin, gapMax]).range([72, 206])
  const gapLine = line<{ lap: number; value: number }>()
    .x((sample) => gapX(sample.lap))
    .y((sample) => gapY(sample.value))
    .curve(curveLinear)
  const [hoverLap, setHoverLap] = React.useState<number | null>(null)
  const activeHoverLap = hoverLap === null ? null : Math.min(lapMax, Math.max(33, hoverLap))
  const hoverX = activeHoverLap === null ? null : gapX(activeHoverLap)
  const hoverSamples =
    activeHoverLap === null
      ? []
      : gapWindow.flatMap((series) => {
          const sample = series.values.find((value) => value.lap === activeHoverLap)
          return sample ? [{ driver: series.driver, value: sample.value }] : []
        })
  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const bounds = event.currentTarget.getBoundingClientRect()
      const viewX = ((event.clientX - bounds.left) / bounds.width) * 760
      if (viewX < 82 || viewX > 710) {
        setHoverLap(null)
        return
      }
      setHoverLap(Math.round(Math.min(lapMax, Math.max(33, gapX.invert(viewX)))))
    },
    [gapX, lapMax]
  )

  return (
    <svg
      className="race-lens race-lens-large interactive-chart"
      viewBox="0 0 760 250"
      role="img"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHoverLap(null)}
    >
      <title>Qatar gap-to-Verstappen ribbon for the final sprint</title>
      <PanelTitle
        x={34}
        y={30}
        title="Final sprint: the gap to Verstappen never collapses"
        subtitle="x = lap, y = signed seconds to Verstappen. Above zero means behind."
      />
      <CompactDriverLegend drivers={drivers} x={522} y={30} />
      {[-10, 0, 10, 20, 30]
        .filter((tick) => tick >= gapMin && tick <= gapMax)
        .map((tick) => (
          <g key={tick} className="grid-line">
            <line x1="82" x2="710" y1={gapY(tick)} y2={gapY(tick)} />
            <text x="46" y={gapY(tick) + 4}>
              {tick}s
            </text>
          </g>
        ))}
      <line x1="82" x2="710" y1={gapY(0)} y2={gapY(0)} className="drs-line" />
      {[33, 42, 44, 57].map((lap) => (
        <text key={lap} x={gapX(lap)} y="232" textAnchor="middle">
          L{lap}
        </text>
      ))}
      {pits
        .filter((pit) => pit.lap >= 33)
        .map((pit) => (
          <line key={`${pit.driver}-${pit.lap}`} x1={gapX(pit.lap)} x2={gapX(pit.lap)} y1="70" y2="210" className="pit-cut">
            <title>
              {driverCode(drivers, pit.driver)} pit on lap {pit.lap}
            </title>
          </line>
        ))}
      {gapWindow.map((series) => (
        <g key={series.driver}>
          <path
            d={gapLine(series.values) ?? undefined}
            fill="none"
            stroke={driverColor(drivers, series.driver)}
            strokeWidth={series.driver === "verstappen" ? 3 : 2.5}
            opacity={series.driver === "verstappen" ? 0.55 : 0.95}
          />
          {series.values
            .filter((sample) => [33, 42, 44, 57].includes(sample.lap))
            .map((sample) => (
              <circle
                key={`${series.driver}-${sample.lap}`}
                cx={gapX(sample.lap)}
                cy={gapY(sample.value)}
                r="4"
                fill={driverColor(drivers, series.driver)}
              >
                <title>
                  {driverCode(drivers, series.driver)} lap {sample.lap}: {formatGapToReference(sample.value)}
                </title>
              </circle>
            ))}
        </g>
      ))}
      {activeHoverLap !== null && hoverX !== null ? (
        <g className="chart-hover-layer">
          <line x1={hoverX} x2={hoverX} y1="70" y2="210" className="chart-hover-line" />
          {hoverSamples.map((sample) => (
            <circle
              key={sample.driver}
              cx={hoverX}
              cy={gapY(sample.value)}
              r="5"
              fill={driverColor(drivers, sample.driver)}
              className="chart-hover-dot"
            />
          ))}
          <g transform={`translate(${Math.min(548, Math.max(94, hoverX + 14))} 82)`}>
            <rect width="178" height="88" rx="6" className="chart-hover-panel" />
            <text x="12" y="20" className="chart-hover-title">
              L{activeHoverLap} vs VER
            </text>
            {hoverSamples.slice(0, 4).map((sample, index) => (
              <g key={sample.driver} transform={`translate(12 ${40 + index * 13})`}>
                <circle r="3.5" cy="-4" fill={driverColor(drivers, sample.driver)} />
                <text x="11" className="chart-hover-label">
                  {driverCode(drivers, sample.driver)}
                </text>
                <text x="154" textAnchor="end" className="chart-hover-value">
                  {formatGapToReference(sample.value)}
                </text>
              </g>
            ))}
          </g>
        </g>
      ) : null}
    </svg>
  )
}
