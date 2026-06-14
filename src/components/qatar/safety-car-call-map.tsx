import type { DriverStory, DriverKey } from "@/types/story"

const TRACK_PATH = "M 85.4 151.0 L 79.5 144.9 L 72.9 138.0 L 66.8 131.7 L 57.7 122.3 L 49.1 113.5 L 42.7 107.1 L 35.9 100.2 L 31.3 95.5 L 22.3 86.8 L 18.3 82.6 L 13.8 77.1 L 12.0 72.3 L 14.7 67.5 L 19.4 65.3 L 25.3 64.4 L 33.2 65.4 L 43.7 69.1 L 49.8 71.5 L 57.4 74.3 L 64.5 76.6 L 70.5 77.3 L 78.9 75.2 L 82.0 73.0 L 83.7 68.2 L 83.6 64.7 L 83.4 59.1 L 83.2 54.8 L 85.0 48.4 L 91.9 42.1 L 99.2 37.2 L 106.3 32.7 L 114.5 27.5 L 124.7 21.1 L 140.0 12.5 L 146.2 12.0 L 153.7 13.2 L 160.5 16.0 L 167.8 20.6 L 171.0 25.2 L 169.7 30.4 L 162.0 35.2 L 151.4 41.2 L 141.4 47.6 L 137.5 51.0 L 136.1 53.8 L 137.8 56.1 L 141.1 57.0 L 144.6 57.0 L 149.5 56.2 L 155.1 55.0 L 163.1 53.2 L 171.7 51.0 L 182.4 48.1 L 194.2 45.2 L 202.0 43.6 L 210.0 43.5 L 219.3 47.9 L 220.8 51.1 L 219.5 54.6 L 216.1 57.2 L 206.9 62.6 L 202.2 66.6 L 198.0 71.4 L 194.7 76.8 L 190.0 82.9 L 179.2 86.5 L 167.1 88.1 L 157.5 89.1 L 150.1 90.8 L 145.9 95.5 L 147.7 99.4 L 152.4 102.8 L 156.8 105.2 L 162.4 107.5 L 175.5 111.5 L 187.6 113.6 L 197.1 114.3 L 211.1 114.2 L 223.1 113.5 L 243.1 112.1 L 267.7 113.1 L 276.1 117.3 L 283.6 124.4 L 288.0 131.8 L 285.6 138.1 L 281.6 142.1 L 276.2 146.6 L 268.1 152.8 L 260.4 154.8 L 249.7 154.4 L 242.3 153.6 L 227.0 151.5 L 214.7 150.1 L 203.0 149.2 L 190.8 151.9 L 182.7 158.9 L 176.0 167.3 L 171.8 172.5 L 167.2 177.8 L 160.3 185.5 L 152.9 193.2 L 148.3 196.3 L 140.4 198.0 L 133.3 197.2 L 126.6 193.8 L 119.6 186.8 L 114.9 181.7 L 104.6 171.1 L 97.7 163.9 L 92.5 158.4 L 86.8 152.5 Z"

const SAFETY_CAR_CALL_POSITIONS: Record<DriverKey, { x: number; y: number }> = {
  piastri: { x: 165.8, y: 88.2 },
  verstappen: { x: 195.2, y: 75.9 },
  norris: { x: 207.3, y: 62.3 },
  sainz: { x: 214, y: 44.6 },
}

type MapPoint = { x: number; y: number }

function parseTrackPoints(pathD: string): MapPoint[] {
  const points: MapPoint[] = []
  const pattern = /([ML])\s*([\d.-]+)\s+([\d.-]+)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(pathD))) {
    points.push({ x: Number(match[2]), y: Number(match[3]) })
  }
  return points
}

function snapToTrackPath(point: MapPoint, trackPoints: MapPoint[]): MapPoint {
  let best: MapPoint | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index < trackPoints.length; index += 1) {
    const start = trackPoints[index]!
    const end = trackPoints[(index + 1) % trackPoints.length]!
    const dx = end.x - start.x
    const dy = end.y - start.y
    const lengthSquared = dx * dx + dy * dy
    const projection =
      lengthSquared === 0
        ? 0
        : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared))
    const snapped = {
      x: start.x + projection * dx,
      y: start.y + projection * dy,
    }
    const distanceSquared = (point.x - snapped.x) ** 2 + (point.y - snapped.y) ** 2
    if (distanceSquared < bestDistance) {
      bestDistance = distanceSquared
      best = snapped
    }
  }

  return best ?? point
}

const TRACK_POINTS = parseTrackPoints(TRACK_PATH)
const VERSTAPPEN_PIT_ENTRY_POSITION = snapToTrackPath({ x: 101.7, y: 163.8 }, TRACK_POINTS)
const SAFETY_CAR_CALL_TIME = new Date("2025-11-30T16:13:01.000Z")
const VERSTAPPEN_PIT_ENTRY_TIME = new Date("2025-11-30T16:13:50.702Z")
const DECISION_WINDOW_SECONDS = (VERSTAPPEN_PIT_ENTRY_TIME.getTime() - SAFETY_CAR_CALL_TIME.getTime()) / 1000

const DRIVER_ORDER: DriverKey[] = ["norris", "verstappen", "piastri", "sainz"]

export function SafetyCarCallMap({ drivers }: { drivers: DriverStory[] }) {
  const orderedDrivers = DRIVER_ORDER.flatMap((key) => drivers.find((driver) => driver.key === key) ?? [])

  return (
    <svg className="race-lens safety-car-call-map" viewBox="0 0 640 400" role="img">
      <title>Qatar track positions when the Safety Car was called</title>
      <text x="28" y="30" className="safety-car-map-title">
        Safety Car call: {DECISION_WINDOW_SECONDS.toFixed(1)}s to decide
      </text>
      <text x="28" y="49" className="safety-car-map-subtitle">
        From race control at 16:13:01 UTC to Verstappen reaching pit entry.
      </text>

      <g transform="translate(34 76) scale(1.28)">
        <path d={TRACK_PATH} className="safety-car-track" />
        {orderedDrivers.map((driver) => {
          const position = SAFETY_CAR_CALL_POSITIONS[driver.key]
          return (
            <g key={driver.key} transform={`translate(${position.x} ${position.y})`} className="safety-car-map-driver">
              <circle r="3.2" fill={driver.color} />
            </g>
          )
        })}
        <g
          transform={`translate(${VERSTAPPEN_PIT_ENTRY_POSITION.x} ${VERSTAPPEN_PIT_ENTRY_POSITION.y})`}
          className="safety-car-pit-position"
        >
          <path d="M -4 -4 L 4 4 M 4 -4 L -4 4" />
        </g>
      </g>

      {orderedDrivers.map((driver, index) => (
          <g key={`label-${driver.key}`} transform={`translate(510 ${88 + index * 30})`} className="safety-car-map-label">
            <circle r="5" fill={driver.color} />
            <text x="18" y="5">
              {driver.acronym}
            </text>
          </g>
      ))}
      <g transform="translate(510 208)" className="safety-car-map-label">
        <g className="safety-car-pit-position">
          <path d="M -5 -5 L 5 5 M 5 -5 L -5 5" />
        </g>
        <text x="18" y="5">
          VER pit entry
        </text>
      </g>
    </svg>
  )
}
