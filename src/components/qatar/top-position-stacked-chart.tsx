import * as React from "react"

import { max } from "d3-array"
import { scaleBand, scaleLinear } from "d3-scale"

import {
  CHAPTER_EYEBROW_CLASS,
  CHAPTER_HEADING_CLASS,
  TITLE_DRIVER_KEYS,
} from "@/components/qatar/constants"
import type { SeasonStory } from "@/types/story"

const SEGMENTS = [
  { key: "wins", label: "wins", color: "#facc15" },
  { key: "second", label: "second", color: "#d1d5db" },
  { key: "third", label: "third", color: "#d0921f" },
] as const

export function TopPositionStackedChart({ story }: { story: SeasonStory }) {
  const [hoverDriverKey, setHoverDriverKey] = React.useState<string | null>(null)
  const titleDrivers = story.drivers.filter((driver) => TITLE_DRIVER_KEYS.includes(driver.key))
  const rows = titleDrivers.map((driver) => {
    const counts = story.races.reduce(
      (acc, race) => {
        const position = race.driverResults[driver.key]?.position
        if (position === 1) acc.wins += 1
        if (position === 2) acc.second += 1
        if (position === 3) acc.third += 1
        return acc
      },
      { wins: 0, second: 0, third: 0 }
    )
    return { driver, ...counts, total: counts.wins + counts.second + counts.third }
  })

  const width = 760
  const height = 270
  const x = scaleBand<string>()
    .domain(rows.map((row) => row.driver.acronym))
    .range([72, 690])
    .padding(0.34)
  const y = scaleLinear()
    .domain([0, max(rows, (row) => row.total) ?? 1])
    .nice()
    .range([220, 54])
  const hoverRow = rows.find((row) => row.driver.key === hoverDriverKey) ?? null
  const hoverX =
    hoverRow === null
      ? 0
      : Math.min(540, Math.max(86, (x(hoverRow.driver.acronym) ?? 72) + x.bandwidth() / 2 - 85))

  return (
    <section
      className="top-position-panel mt-[1.2rem] mb-2 grid w-[min(100%,760px)] gap-[0.7rem]"
      aria-label="Top three finishes by championship contender"
    >
      <p className={CHAPTER_EYEBROW_CLASS}>season shape</p>
      <h3 className={`${CHAPTER_HEADING_CLASS} m-0`}>Top-three finishes by contender</h3>
      <p className="m-0 max-w-[620px] text-[0.8rem] leading-[1.42] text-foreground">
        Every podium counted in a season this close. The stacked bars show how
        often each contender finished first, second or third in 2025. That
        steady run of results made a single 13-point swing decisive.
      </p>
      <div
        className="flex items-center gap-[1.7rem] pt-1 pl-[1.9rem] text-[0.66rem] leading-none font-[680] text-muted-foreground lowercase"
        aria-hidden="true"
      >
        {SEGMENTS.map((segment) => (
          <span key={segment.key} className="inline-flex items-center gap-[0.42rem]">
            <i className="h-[0.48rem] w-[0.48rem] rounded-full" style={{ background: segment.color }} />
            {segment.label}
          </span>
        ))}
      </div>
      <svg
        className="top-position-chart interactive-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        onPointerLeave={() => setHoverDriverKey(null)}
      >
        <title>Stacked top-three finishes for Norris, Verstappen and Piastri</title>
        {[0, 5, 10, 15].map((tick) => (
          <g key={tick} className="grid-line">
            <line x1="72" x2="690" y1={y(tick)} y2={y(tick)} />
            <text x="48" y={y(tick) + 4} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}
        {rows.map((row) => {
          let base = 0
          return (
            <g
              key={row.driver.key}
              onPointerEnter={() => setHoverDriverKey(row.driver.key)}
              onFocus={() => setHoverDriverKey(row.driver.key)}
              tabIndex={0}
              aria-label={`${row.driver.acronym}: ${row.total} top-three finishes`}
            >
              {SEGMENTS.map((segment) => {
                const value = row[segment.key]
                const yTop = y(base + value)
                const barHeight = y(base) - y(base + value)
                base += value
                return (
                  <rect
                    key={segment.key}
                    x={x(row.driver.acronym)}
                    y={yTop}
                    width={x.bandwidth()}
                    height={barHeight}
                    fill={segment.color}
                    opacity={hoverRow === null || hoverRow.driver.key === row.driver.key ? 1 : 0.28}
                  />
                )
              })}
              <text x={(x(row.driver.acronym) ?? 0) + x.bandwidth() / 2} y="252" textAnchor="middle">
                {row.driver.acronym}
              </text>
              <text x={(x(row.driver.acronym) ?? 0) + x.bandwidth() / 2} y={y(row.total) - 10} textAnchor="middle">
                {row.total}
              </text>
            </g>
          )
        })}
        {hoverRow !== null ? (
          <g className="chart-hover-layer" transform={`translate(${hoverX} 42)`}>
            <rect width="170" height="106" rx="6" className="chart-hover-panel" />
            <text x="12" y="20" className="chart-hover-title">
              {hoverRow.driver.acronym} podiums
            </text>
            {SEGMENTS.map((segment, index) => (
              <g key={`hover-${segment.key}`} transform={`translate(12 ${44 + index * 17})`}>
                <circle r="4" cy="-4" fill={segment.color} />
                <text x="12" className="chart-hover-label">
                  {segment.label}
                </text>
                <text x="146" textAnchor="end" className="chart-hover-value">
                  {hoverRow[segment.key]}
                </text>
              </g>
            ))}
            <text x="12" y="96" className="chart-hover-label">
              total
            </text>
            <text x="158" y="96" textAnchor="end" className="chart-hover-value">
              {hoverRow.total}
            </text>
          </g>
        ) : null}
      </svg>
    </section>
  )
}
