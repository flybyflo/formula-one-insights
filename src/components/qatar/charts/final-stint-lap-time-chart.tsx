import * as React from "react"

import { extent } from "d3-array"
import { scaleLinear } from "d3-scale"
import { curveMonotoneX, line } from "d3-shape"

import { CompactDriverLegend, PanelTitle } from "@/components/qatar/charts/shared"
import {
  driverCode,
  driverColor,
  formatSeconds,
  qatarLapMax,
  type QatarChartProps,
} from "@/components/qatar/charts/helpers"

export function FinalStintLapTimeChart({ race, drivers }: QatarChartProps) {
  const laps = (race.chapterData?.lapSeries ?? []).filter((lap) => typeof lap.lapTime === "number")
  const pits = race.chapterData?.pitStops ?? []
  const lapMax = qatarLapMax(race)
  const lateWindow = laps.filter((lap) => lap.lap >= 33 && !lap.pitOut && (lap.lapTime ?? 0) < 95)
  const finalPaceDrivers = drivers.filter((driver) => driver.key !== "sainz")
  const lateTimeExtent = extent(lateWindow, (lap) => lap.lapTime ?? 0) as [number, number]
  const lateTimeY = scaleLinear()
    .domain([
      Math.floor((lateTimeExtent[0] ?? 82) / 2) * 2,
      Math.ceil((lateTimeExtent[1] ?? 91) / 2) * 2,
    ])
    .range([276, 76])
  const lateX = scaleLinear().domain([33, lapMax]).range([82, 710])
  const lateLine = line<{ lap: number; lapTime?: number }>()
    .x((sample) => lateX(sample.lap))
    .y((sample) => lateTimeY(sample.lapTime ?? 0))
    .curve(curveMonotoneX)
  const [hoverLap, setHoverLap] = React.useState<number | null>(null)
  const activeHoverLap = hoverLap === null ? null : Math.min(lapMax, Math.max(33, hoverLap))
  const hoverX = activeHoverLap === null ? null : lateX(activeHoverLap)
  const hoverSamples =
    activeHoverLap === null
      ? []
      : finalPaceDrivers.flatMap((driver) => {
          const sample = lateWindow.find((lap) => lap.driver === driver.key && lap.lap === activeHoverLap)
          return sample && typeof sample.lapTime === "number" ? [{ driver, lapTime: sample.lapTime }] : []
        })
  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const bounds = event.currentTarget.getBoundingClientRect()
      const viewX = ((event.clientX - bounds.left) / bounds.width) * 760
      if (viewX < 82 || viewX > 710) {
        setHoverLap(null)
        return
      }
      setHoverLap(Math.round(Math.min(lapMax, Math.max(33, lateX.invert(viewX)))))
    },
    [lapMax, lateX]
  )

  return (
    <svg
      className="race-lens race-lens-large interactive-chart"
      viewBox="0 0 760 330"
      role="img"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHoverLap(null)}
    >
      <title>Qatar final stint lap-time comparison</title>
      <PanelTitle
        x={34}
        y={30}
        title="Final stint: McLaren has pace, not track position"
        subtitle="x = lap, y = green-flag lap time. Pit-out laps are marked separately."
      />
      <CompactDriverLegend drivers={finalPaceDrivers} x={548} y={30} />
      {[82, 86, 90].map((tick) => (
        <g key={tick} className="grid-line">
          <line x1="82" x2="710" y1={lateTimeY(tick)} y2={lateTimeY(tick)} />
          <text x="46" y={lateTimeY(tick) + 4}>
            {tick}s
          </text>
        </g>
      ))}
      {[33, 42, 44, 57].map((lap) => (
        <text key={lap} x={lateX(lap)} y="306" textAnchor="middle">
          L{lap}
        </text>
      ))}
      {pits
        .filter((pit) => pit.lap >= 33)
        .map((pit) => (
          <line key={`${pit.driver}-${pit.lap}`} x1={lateX(pit.lap)} x2={lateX(pit.lap)} y1="74" y2="282" className="pit-cut">
            <title>
              {driverCode(drivers, pit.driver)} pit on lap {pit.lap}
            </title>
          </line>
        ))}
      {finalPaceDrivers.map((driver) => {
        const series = lateWindow
          .filter((lap) => lap.driver === driver.key && typeof lap.lapTime === "number")
          .map((lap) => ({ lap: lap.lap, lapTime: lap.lapTime ?? undefined }))
        return (
          <g key={driver.key}>
            <path
              d={lateLine(series) ?? undefined}
              fill="none"
              stroke={driverColor(drivers, driver.key)}
              strokeWidth="2.5"
            />
            {series
              .filter((sample) => [42, 44, 57].includes(sample.lap))
              .map((sample) => (
                <circle
                  key={`${driver.key}-${sample.lap}`}
                  cx={lateX(sample.lap)}
                  cy={lateTimeY(sample.lapTime ?? 0)}
                  r="4"
                  fill={driver.color}
                >
                  <title>
                    {driver.acronym} lap {sample.lap}: {formatSeconds(sample.lapTime ?? 0)}s
                  </title>
                </circle>
              ))}
          </g>
        )
      })}
      {activeHoverLap !== null && hoverX !== null ? (
        <g className="chart-hover-layer">
          <line x1={hoverX} x2={hoverX} y1="74" y2="282" className="chart-hover-line" />
          {hoverSamples.map(({ driver, lapTime }) => (
            <circle key={driver.key} cx={hoverX} cy={lateTimeY(lapTime)} r="5" fill={driver.color} className="chart-hover-dot" />
          ))}
          <g transform={`translate(${Math.min(548, Math.max(94, hoverX + 14))} 88)`}>
            <rect width="178" height="78" rx="6" className="chart-hover-panel" />
            <text x="12" y="20" className="chart-hover-title">
              L{activeHoverLap} pace
            </text>
            {hoverSamples.map(({ driver, lapTime }, index) => (
              <g key={driver.key} transform={`translate(12 ${42 + index * 15})`}>
                <circle r="3.5" cy="-4" fill={driver.color} />
                <text x="11" className="chart-hover-label">
                  {driver.acronym}
                </text>
                <text x="154" textAnchor="end" className="chart-hover-value">
                  {formatSeconds(lapTime)}s
                </text>
              </g>
            ))}
          </g>
        </g>
      ) : null}
    </svg>
  )
}
