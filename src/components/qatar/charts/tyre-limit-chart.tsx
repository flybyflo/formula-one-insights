import * as React from "react"

import { scaleLinear } from "d3-scale"

import { PanelTitle } from "@/components/qatar/charts/shared"
import {
  COMPOUND_COLOR,
  driverCode,
  qatarLapMax,
  qatarSafetyCarLap,
  type QatarChartProps,
} from "@/components/qatar/charts/helpers"

const SAFE_TYRE_LIMIT = 25
const FIRST_MEDIUM_STINT_COLOR = "#ffe066"

function stintColor(compound: string, stintIndex: number) {
  if (compound === "MEDIUM" && stintIndex === 0) return FIRST_MEDIUM_STINT_COLOR
  return COMPOUND_COLOR[compound] ?? COMPOUND_COLOR.UNKNOWN
}

export function TyreLimitChart({ race, drivers }: QatarChartProps) {
  const stints = race.chapterData?.stints ?? []
  const safetyCarLap = qatarSafetyCarLap(race)
  const lapMax = qatarLapMax(race)
  const x = scaleLinear().domain([1, lapMax]).range([96, 710])
  const [hoverLap, setHoverLap] = React.useState<number | null>(null)
  const activeHoverLap = hoverLap === null ? null : Math.min(lapMax, Math.max(1, hoverLap))
  const hoverX = activeHoverLap === null ? null : x(activeHoverLap)
  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const bounds = event.currentTarget.getBoundingClientRect()
      const viewX = ((event.clientX - bounds.left) / bounds.width) * 760
      if (viewX < 82 || viewX > 724) {
        setHoverLap(null)
        return
      }
      setHoverLap(Math.round(Math.min(lapMax, Math.max(1, x.invert(viewX)))))
    },
    [lapMax, x]
  )

  return (
    <>
      <svg
        className="race-lens race-lens-large interactive-chart"
        viewBox="0 0 760 280"
        role="img"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverLap(null)}
      >
        <title>Qatar tyre limit pressure timeline</title>
        <PanelTitle
          x={34}
          y={20}
          title="The 25-lap limit boxes McLaren in"
          subtitle="Each bar is one stint; red caps mark the allowed maximum."
        />
        <rect
          x={x(safetyCarLap) - 9}
          y="76"
          width="18"
          height="184"
          className="safety-car-band tyre-limit-safety-car-band"
        />
        <line
          x1={x(safetyCarLap)}
          x2={x(safetyCarLap)}
          y1="76"
          y2="260"
          className="tyre-limit-safety-car-line"
        />
        <g className="callout-label" transform={`translate(${x(safetyCarLap)} 80)`}>
          <line x1="0" x2="42" y1="0" y2="-10" />
          <text x="48" y="-8">
            Safety Car window
          </text>
        </g>
        {drivers.map((driver, index) => {
          const y = 100 + index * 46
          const driverStints = stints.filter((stint) => stint.driver === driver.key)
          return (
            <g key={driver.key}>
              <text x="34" y={y + 5}>
                {driver.acronym}
              </text>
              <line x1={x(1)} x2={x(lapMax)} y1={y} y2={y} className="muted-baseline" />
              {driverStints.map((stint, stintIndex) => {
                const deadline = Math.min(stint.startLap + SAFE_TYRE_LIMIT - 1, lapMax)
                return (
                  <g key={`${driver.key}-${stintIndex}`}>
                    <line
                      x1={x(stint.startLap)}
                      x2={x(stint.endLap)}
                      y1={y}
                      y2={y}
                      className="stint-bar"
                      stroke={stintColor(stint.compound, stintIndex)}
                    >
                      <title>
                        {driver.acronym} {stint.compound.toLowerCase()} stint, laps {stint.startLap}-{stint.endLap}
                      </title>
                    </line>
                    <line x1={x(deadline)} x2={x(deadline)} y1={y - 16} y2={y + 16} className="limit-cap">
                      <title>
                        {driverCode(drivers, driver.key)} tyre-life cap: lap {deadline}
                      </title>
                    </line>
                  </g>
                )
              })}
            </g>
          )
        })}
        {activeHoverLap !== null && hoverX !== null ? (
          <g className="chart-hover-layer">
            <line x1={hoverX} x2={hoverX} y1="70" y2="264" className="chart-hover-line" />
            {drivers.map((driver, index) => {
              const y = 100 + index * 46
              const stint = stints.find((item) => item.driver === driver.key && item.startLap <= activeHoverLap && item.endLap >= activeHoverLap)
              return stint ? <circle key={driver.key} cx={hoverX} cy={y} r="5" fill={driver.color} className="chart-hover-dot" /> : null
            })}
            <g transform={`translate(${Math.min(548, Math.max(104, hoverX + 14))} 78)`}>
              <rect width="178" height="94" rx="6" className="chart-hover-panel" />
              <text x="12" y="20" className="chart-hover-title">
                L{activeHoverLap} tyre state
              </text>
              {drivers.slice(0, 4).map((driver, index) => {
                const stint = stints.find((item) => item.driver === driver.key && item.startLap <= activeHoverLap && item.endLap >= activeHoverLap)
                const deadline = stint ? Math.min(stint.startLap + SAFE_TYRE_LIMIT - 1, lapMax) : null
                return (
                  <g key={driver.key} transform={`translate(12 ${40 + index * 13})`}>
                    <circle r="3.5" cy="-4" fill={driver.color} />
                    <text x="11" className="chart-hover-label">
                      {driver.acronym}
                    </text>
                    <text x="154" textAnchor="end" className="chart-hover-value">
                      {stint ? `${stint.compound.slice(0, 3)} cap L${deadline}` : "-"}
                    </text>
                  </g>
                )
              })}
            </g>
          </g>
        ) : null}
      </svg>
      <p className="chart-bridge">
        Each red cap is the latest lap a stint can legally run. By skipping lap
        7, McLaren has to stop later at full racing speed, paying the ~22s
        green-flag penalty Verstappen dodged behind the Safety Car.
      </p>
    </>
  )
}
