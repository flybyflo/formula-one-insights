import { max } from "d3-array"

import type { DriverKey, DriverStory, GapSample, PositionSample, RaceStory } from "@/types/story"

export const DRIVER_ORDER: DriverKey[] = ["norris", "verstappen", "piastri", "sainz"]

export const COMPOUND_COLOR: Record<string, string> = {
  SOFT: "#f43f5e",
  MEDIUM: "#facc15",
  HARD: "#d1d5db",
  INTERMEDIATE: "#22c55e",
  WET: "#38bdf8",
  UNKNOWN: "#94a3b8",
}

export type QatarChartProps = {
  race: RaceStory
  drivers: DriverStory[]
}

export function driverColor(drivers: DriverStory[], key: DriverKey) {
  return drivers.find((driver) => driver.key === key)?.color ?? "#94a3b8"
}

export function driverCode(drivers: DriverStory[], key: DriverKey) {
  return drivers.find((driver) => driver.key === key)?.acronym ?? key.slice(0, 3).toUpperCase()
}

export function formatSeconds(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "-"
}

export function formatSigned(value: number) {
  if (!Number.isFinite(value)) return "-"
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`
}

export function formatGapToReference(value: number) {
  if (!Number.isFinite(value)) return "-"
  if (Math.abs(value) < 0.05) return "level"
  return value > 0 ? `${formatSigned(value)}s behind` : `${formatSigned(value)}s ahead`
}

export function qatarSafetyCarLap(race: RaceStory) {
  return race.chapterData?.events?.find((event) => /SAFETY CAR DEPLOYED/i.test(event.message))?.lap ?? 7
}

export function qatarLapMax(race: RaceStory) {
  return max(race.chapterData?.stints ?? [], (stint) => stint.endLap) ?? 57
}

export function buildPositionWindow(samples: PositionSample[], startLap: number, endLap: number) {
  const laps = Array.from(new Set(samples.map((sample) => sample.lap)))
    .filter((lap) => lap >= startLap && lap <= endLap)
    .sort((a, b) => a - b)

  return DRIVER_ORDER.map((driver) => {
    const values = laps
      .map((lap) => {
        const sample = samples.find((item) => item.driver === driver && item.lap === lap)
        return sample ? { lap, position: sample.position } : null
      })
      .filter((sample): sample is { lap: number; position: number } => sample !== null)

    return { driver, values }
  }).filter((series) => series.values.length > 0)
}

export function buildRelativeGapSeries(samples: GapSample[], referenceDriver: DriverKey) {
  const laps = Array.from(new Set(samples.map((sample) => sample.lap))).sort((a, b) => a - b)

  return DRIVER_ORDER.map((driver) => {
    const values = laps
      .map((lap) => {
        const sample = samples.find((item) => item.driver === driver && item.lap === lap)
        const reference = samples.find((item) => item.driver === referenceDriver && item.lap === lap)
        if (!sample || !reference || sample.gapToLeader === null || reference.gapToLeader === null) return null

        return {
          lap,
          value: sample.gapToLeader - reference.gapToLeader,
        }
      })
      .filter((sample): sample is { lap: number; value: number } => sample !== null)

    return { driver, values }
  }).filter((series) => series.values.length > 0)
}
