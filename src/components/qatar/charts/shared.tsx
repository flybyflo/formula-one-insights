import type { DriverStory } from "@/types/story"

export function PanelTitle({
  x,
  y,
  title,
  subtitle,
}: {
  x: number
  y: number
  title: string
  subtitle?: string
}) {
  return (
    <g className="panel-title" transform={`translate(${x} ${y})`}>
      <text className="panel-title-main" x="0" y="0">
        {title}
      </text>
      {subtitle ? (
        <text className="panel-title-sub" x="0" y="15">
          {subtitle}
        </text>
      ) : null}
    </g>
  )
}

export function CompactDriverLegend({
  drivers,
  x,
  y,
}: {
  drivers: DriverStory[]
  x: number
  y: number
}) {
  return (
    <g className="compact-driver-labels" transform={`translate(${x} ${y})`}>
      {drivers.map((driver, index) => (
        <g key={driver.key} transform={`translate(${index * 56} 0)`}>
          <circle r="4" fill={driver.color} />
          <text x="9" y="4">
            {driver.acronym}
          </text>
        </g>
      ))}
    </g>
  )
}
