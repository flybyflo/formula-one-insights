import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import type {
  ChampionshipState,
  CircuitPoint,
  DriverKey,
  LapSample,
  PitStopSample,
  PositionSample,
  RaceEvent,
  RaceStory,
  SeasonStory,
  StintSample,
} from "../src/types/story"

type Session = {
  session_key: number
  meeting_key: number
  circuit_key: number
  country_name: string
  location: string
  date_start: string
}

type Driver = {
  driver_number: number
  full_name?: string
  name_acronym?: string
  team_name?: string
  team_colour?: string
}

type Result = {
  driver_number: number
  position?: number
  points?: number
  dnf?: boolean
  dns?: boolean
  dsq?: boolean
}

type Grid = {
  driver_number: number
  position?: number
}

type Lap = {
  driver_number: number
  lap_number: number
  date_start?: string
  lap_duration?: number
  duration_sector_1?: number
  duration_sector_2?: number
  duration_sector_3?: number
  is_pit_out_lap?: boolean
  i1_speed?: number
  i2_speed?: number
  st_speed?: number
}

type Pit = {
  driver_number: number
  lap_number?: number
  stop_duration?: number | null
  pit_duration?: number | null
  lane_duration?: number | null
}

type Stint = {
  driver_number: number
  stint_number: number
  lap_start: number
  lap_end: number
  compound?: string
  tyre_age_at_start?: number | null
}

type Position = {
  driver_number: number
  date: string
  position?: number
}

type Interval = {
  driver_number: number
  date: string
  interval?: number | string | null
  gap_to_leader?: number | string | null
}

type Weather = {
  date: string
  rainfall?: boolean | number
  track_temperature?: number
}

type RaceControl = {
  lap_number?: number | null
  category?: string | null
  message?: string
}

type Location = {
  driver_number: number
  date: string
  x: number
  y: number
  z: number
}

const API_ROOT = "https://api.openf1.org/v1"
const YEAR = 2025
const TOP_DRIVER_NUMBERS = [4, 1, 81, 55]
const DRIVER_KEYS: Record<number, DriverKey> = {
  4: "norris",
  1: "verstappen",
  81: "piastri",
  55: "sainz",
}

const OFFICIAL_FINAL_POINTS: Record<number, number> = {
  4: 423,
  1: 421,
  81: 410,
  55: 105,
}

const DRIVER_COLORS: Record<number, string> = {
  4: "#f28c28",
  1: "#5b7cfa",
  81: "#34d399",
  55: "#38bdf8",
}

const KEY_RACES: Record<
  string,
  Pick<
    RaceStory,
    "chapterId" | "chapterTitle" | "visualType" | "sourceUrl" | "sourceLabel"
  >
> = {
  Australia: {
    chapterId: "australia",
    chapterTitle: "Rain made the opener a control test",
    visualType: "duel-ribbon",
    sourceUrl:
      "https://www.formula1.com/en/latest/article/weve-learned-from-our-mistakes-norris-thrilled-with-amazing-australian-gp.OB7wo0xOqOIut39lCIhDJ",
    sourceLabel: "Formula1.com Australia race report",
  },
  Italy: {
    chapterId: "imola",
    chapterTitle: "Imola turns track position into points",
    visualType: "failure-swing",
    sourceUrl:
      "https://www.fia.com/news/f1-verstappen-takes-fourth-straight-imola-win-ahead-norris-and-piastri",
    sourceLabel: "FIA Imola race report",
  },
  Canada: {
    chapterId: "canada",
    chapterTitle: "The title fight becomes spatial",
    visualType: "circuit-map",
    sourceUrl:
      "https://www.formula1.com/en/latest/article/russell-takes-solid-victory-as-piastri-and-norris-collide-late-on-in.2cri9oFCALqhfsbvpqDfBq",
    sourceLabel: "Formula1.com Canada race report",
  },
  Qatar: {
    chapterId: "qatar",
    chapterTitle: "The safety car McLaren did not convert",
    visualType: "dnf-impact",
    sourceUrl:
      "https://www.formula1.com/en/latest/article/we-made-the-wrong-decision-brown-and-stella-admit-to-mclaren-strategy-error.2rCxBf2C3hSo92upc8uuBE",
    sourceLabel: "Formula1.com Qatar strategy report",
  },
  "United Arab Emirates": {
    chapterId: "abu-dhabi",
    chapterTitle: "A title decided by restraint",
    visualType: "finale-gauge",
    sourceUrl:
      "https://www.formula1.com/en/latest/article/norris-secures-maiden-f1-title-in-abu-dhabi-with-podium-finish-behind.EMJtmvRA0uzmzUC4MZgmw",
    sourceLabel: "Formula1.com Abu Dhabi race report",
  },
}

const RAW_DIR = path.join(process.cwd(), "data/raw/openf1/2025")
const PUBLIC_DIR = path.join(process.cwd(), "public/data/2025")

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function readCachedJson<T>(filePath: string) {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T
  } catch {
    return null
  }
}

async function fetchJson<T>(url: string, attempt = 1): Promise<T> {
  const response = await fetch(url)
  if (response.status === 429 && attempt <= 8) {
    const retryAfter = Number(response.headers.get("retry-after"))
    const delay = Number.isFinite(retryAfter)
      ? retryAfter * 1000
      : Math.min(45_000, 1_500 * attempt * attempt)
    console.log(`Rate limited. Waiting ${Math.round(delay / 1000)}s before retry.`)
    await wait(delay)
    return fetchJson<T>(url, attempt + 1)
  }
  if (!response.ok) {
    throw new Error(`OpenF1 request failed ${response.status}: ${url}`)
  }
  await wait(450)
  return (await response.json()) as T
}

async function fetchAndCache<T>(url: string, filePath: string) {
  const cached = await readCachedJson<T>(filePath)
  if (cached) return cached
  let data: T
  try {
    data = await fetchJson<T>(url)
  } catch (error) {
    if (error instanceof Error && error.message.includes("failed 404")) {
      console.log(`No OpenF1 table for ${url}; writing empty JSON array.`)
      data = [] as T
    } else {
      throw error
    }
  }
  await saveJson(filePath, data)
  return data
}

async function saveJson(filePath: string, data: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(data), "utf8")
}

function median(values: number[]) {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (clean.length === 0) return null
  const middle = Math.floor(clean.length / 2)
  if (clean.length % 2 === 0) {
    return (clean[middle - 1]! + clean[middle]!) / 2
  }
  return clean[middle]!
}

function bestSpeed(laps: Lap[]) {
  const speeds = laps.flatMap((lap) =>
    [lap.i1_speed, lap.i2_speed, lap.st_speed].filter(
      (speed): speed is number => typeof speed === "number"
    )
  )
  return speeds.length > 0 ? Math.max(...speeds) : null
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function numericGap(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return null
  const parsed = Number(value.replace("+", ""))
  return Number.isFinite(parsed) ? parsed : null
}

function downsampleLocations(locations: Location[], maxPoints = 360) {
  if (locations.length <= maxPoints) return locations
  const step = Math.ceil(locations.length / maxPoints)
  return locations.filter((_, index) => index % step === 0)
}

function championshipState(totals: Map<number, number>): ChampionshipState {
  return {
    norris: totals.get(4) ?? 0,
    verstappen: totals.get(1) ?? 0,
    piastri: totals.get(81) ?? 0,
    sainz: totals.get(55) ?? 0,
  }
}

function championshipDelta(
  before: ChampionshipState,
  after: ChampionshipState
): ChampionshipState {
  return {
    norris: after.norris - before.norris,
    verstappen: after.verstappen - before.verstappen,
    piastri: after.piastri - before.piastri,
    sainz: after.sainz - before.sainz,
  }
}

function weatherForLap(lap: Lap, weather: Weather[]) {
  if (!lap.date_start || weather.length === 0) {
    return { rainfall: false, trackTemp: null }
  }
  const lapTime = new Date(lap.date_start).getTime()
  const nearest = weather.reduce<Weather | null>((best, item) => {
    if (!item.date) return best
    if (!best) return item
    return Math.abs(new Date(item.date).getTime() - lapTime) <
      Math.abs(new Date(best.date).getTime() - lapTime)
      ? item
      : best
  }, null)
  return {
    rainfall: nearest?.rainfall === true || nearest?.rainfall === 1,
    trackTemp: numberOrNull(nearest?.track_temperature),
  }
}

function stintForLap(driverNumber: number, lap: number, stints: Stint[]) {
  return stints.find(
    (stint) =>
      stint.driver_number === driverNumber &&
      lap >= stint.lap_start &&
      lap <= stint.lap_end
  )
}

function buildLapSeries(
  lapsByDriver: Map<number, Lap[]>,
  stints: Stint[],
  weather: Weather[],
  maxLaps = 70
): LapSample[] {
  return TOP_DRIVER_NUMBERS.flatMap((driverNumber) => {
    const key = DRIVER_KEYS[driverNumber]
    return (lapsByDriver.get(driverNumber) ?? [])
      .filter((lap) => lap.lap_number <= maxLaps)
      .map((lap) => {
        const stint = stintForLap(driverNumber, lap.lap_number, stints)
        const lapWeather = weatherForLap(lap, weather)
        return {
          driver: key,
          lap: lap.lap_number,
          lapTime: numberOrNull(lap.lap_duration),
          s1: numberOrNull(lap.duration_sector_1),
          s2: numberOrNull(lap.duration_sector_2),
          s3: numberOrNull(lap.duration_sector_3),
          speed: bestSpeed([lap]),
          compound: stint?.compound ?? null,
          tyreAge:
            typeof stint?.tyre_age_at_start === "number"
              ? stint.tyre_age_at_start + lap.lap_number - stint.lap_start
              : null,
          pitOut: Boolean(lap.is_pit_out_lap),
          rainfall: lapWeather.rainfall,
          trackTemp: lapWeather.trackTemp,
        }
      })
  })
}

function average(values: Array<number | null | undefined>) {
  const clean = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  )
  if (clean.length === 0) return null
  return clean.reduce((sum, value) => sum + value, 0) / clean.length
}

function buildStints(stints: Stint[], lapsByDriver: Map<number, Lap[]>): StintSample[] {
  return stints
    .filter((stint) => TOP_DRIVER_NUMBERS.includes(stint.driver_number))
    .map((stint) => {
      const laps = (lapsByDriver.get(stint.driver_number) ?? []).filter(
        (lap) =>
          lap.lap_number >= stint.lap_start &&
          lap.lap_number <= stint.lap_end &&
          !lap.is_pit_out_lap
      )
      return {
        driver: DRIVER_KEYS[stint.driver_number],
        stint: stint.stint_number,
        compound: stint.compound ?? "UNKNOWN",
        startLap: stint.lap_start,
        endLap: stint.lap_end,
        tyreAgeStart: numberOrNull(stint.tyre_age_at_start),
        avgLap: average(laps.map((lap) => lap.lap_duration)),
        avgS1: average(laps.map((lap) => lap.duration_sector_1)),
        avgS2: average(laps.map((lap) => lap.duration_sector_2)),
        avgS3: average(laps.map((lap) => lap.duration_sector_3)),
      }
    })
}

function buildPitStops(pit: Pit[], lapsByDriver: Map<number, Lap[]>): PitStopSample[] {
  return pit
    .filter((stop) => TOP_DRIVER_NUMBERS.includes(stop.driver_number))
    .map((stop) => {
      const driverLaps = lapsByDriver.get(stop.driver_number) ?? []
      const cleanMedian = median(
        driverLaps
          .filter((lap) => !lap.is_pit_out_lap && typeof lap.lap_duration === "number")
          .map((lap) => lap.lap_duration!)
      )
      const outLap = driverLaps.find(
        (lap) => lap.lap_number === (stop.lap_number ?? 0) + 1
      )
      const outLapDelta =
        cleanMedian && typeof outLap?.lap_duration === "number"
          ? outLap.lap_duration - cleanMedian
          : null
      return {
        driver: DRIVER_KEYS[stop.driver_number],
        lap: stop.lap_number ?? 0,
        stopDuration: numberOrNull(stop.stop_duration),
        pitDuration: numberOrNull(stop.pit_duration ?? stop.lane_duration),
        outLapDelta,
      }
    })
}

function lapFromRaceStart(date: string, raceStart: string, lapCount: number) {
  const raceStartMs = new Date(raceStart).getTime()
  const dateMs = new Date(date).getTime()
  if (!Number.isFinite(raceStartMs) || !Number.isFinite(dateMs)) return 1
  const approx = Math.round((dateMs - raceStartMs) / 90_000) + 1
  return Math.max(1, Math.min(lapCount, approx))
}

function buildLapStarts(laps: Lap[]) {
  const startByLap = new Map<number, number>()
  for (const lap of laps) {
    if (typeof lap.date_start !== "string") continue
    const startMs = new Date(lap.date_start).getTime()
    if (!Number.isFinite(startMs)) continue
    const previous = startByLap.get(lap.lap_number)
    if (previous === undefined || startMs < previous) {
      startByLap.set(lap.lap_number, startMs)
    }
  }
  return [...startByLap.entries()]
    .map(([lap, startMs]) => ({ lap, startMs }))
    .sort((a, b) => a.startMs - b.startMs)
}

function lapFromTimestamp(
  date: string,
  lapStarts: ReturnType<typeof buildLapStarts>,
  raceStart: string,
  lapCount: number
) {
  const dateMs = new Date(date).getTime()
  if (!Number.isFinite(dateMs) || lapStarts.length === 0) {
    return lapFromRaceStart(date, raceStart, lapCount)
  }

  let currentLap = lapStarts[0]!.lap
  for (const lapStart of lapStarts) {
    if (dateMs < lapStart.startMs) break
    currentLap = lapStart.lap
  }

  return Math.max(1, Math.min(lapCount, currentLap))
}

function buildPositionSeries(
  positions: Position[],
  lapStarts: ReturnType<typeof buildLapStarts>,
  raceStart: string,
  lapCount: number
): PositionSample[] {
  return positions
    .filter(
      (position) =>
        TOP_DRIVER_NUMBERS.includes(position.driver_number) &&
        typeof position.position === "number"
    )
    .map((position) => ({
      driver: DRIVER_KEYS[position.driver_number],
      lap: lapFromTimestamp(position.date, lapStarts, raceStart, lapCount),
      position: position.position!,
    }))
}

function buildGapSeries(
  intervals: Interval[],
  lapStarts: ReturnType<typeof buildLapStarts>,
  raceStart: string,
  lapCount: number
) {
  return intervals
    .filter((interval) => TOP_DRIVER_NUMBERS.includes(interval.driver_number))
    .map((interval) => ({
      lap: lapFromTimestamp(interval.date, lapStarts, raceStart, lapCount),
      driver: DRIVER_KEYS[interval.driver_number],
      interval: numericGap(interval.interval),
      gapToLeader: numericGap(interval.gap_to_leader),
    }))
}

function traceFromOutline(
  outline: CircuitPoint[],
  driver: DriverKey,
  startRatio: number,
  lengthRatio: number,
  lapMax: number
) {
  if (outline.length === 0) return []
  const start = Math.floor(outline.length * startRatio)
  const length = Math.max(12, Math.floor(outline.length * lengthRatio))
  return Array.from({ length }, (_, index) => {
    const point = outline[(start + index) % outline.length]!
    return {
      ...point,
      driver,
      lap: Math.max(1, Math.round((index / Math.max(1, length - 1)) * lapMax)),
    }
  })
}

function sampleCubic(
  p0: CircuitPoint,
  p1: CircuitPoint,
  p2: CircuitPoint,
  p3: CircuitPoint,
  steps: number
) {
  return Array.from({ length: steps }, (_, index) => {
    const t = index / steps
    const mt = 1 - t
    return {
      x:
        mt * mt * mt * p0.x +
        3 * mt * mt * t * p1.x +
        3 * mt * t * t * p2.x +
        t * t * t * p3.x,
      y:
        mt * mt * mt * p0.y +
        3 * mt * mt * t * p1.y +
        3 * mt * t * t * p2.y +
        t * t * t * p3.y,
    }
  })
}

function gillesVilleneuveOutline() {
  const segments: Array<[CircuitPoint, CircuitPoint, CircuitPoint, CircuitPoint]> = [
    [{ x: 112, y: 330 }, { x: 176, y: 270 }, { x: 180, y: 196 }, { x: 128, y: 132 }],
    [{ x: 128, y: 132 }, { x: 86, y: 80 }, { x: 128, y: 44 }, { x: 216, y: 60 }],
    [{ x: 216, y: 60 }, { x: 318, y: 78 }, { x: 398, y: 78 }, { x: 514, y: 58 }],
    [{ x: 514, y: 58 }, { x: 624, y: 40 }, { x: 674, y: 90 }, { x: 650, y: 156 }],
    [{ x: 650, y: 156 }, { x: 626, y: 224 }, { x: 548, y: 220 }, { x: 474, y: 194 }],
    [{ x: 474, y: 194 }, { x: 390, y: 166 }, { x: 344, y: 188 }, { x: 312, y: 246 }],
    [{ x: 312, y: 246 }, { x: 276, y: 316 }, { x: 214, y: 368 }, { x: 112, y: 330 }],
  ]
  return segments.flatMap((segment) => sampleCubic(...segment, 18))
}

function buildCircuitMap(
  locationsByDriver: Record<string, Location[]>,
  lapsByDriver: Map<number, Lap[]>,
  raceStart: string
) {
  const telemetryPointCount = TOP_DRIVER_NUMBERS.reduce(
    (sum, driverNumber) => sum + (locationsByDriver[String(driverNumber)]?.length ?? 0),
    0
  )
  const path = gillesVilleneuveOutline()
  const lapMax = Math.max(
    ...Array.from(lapsByDriver.values()).flatMap((driverLaps) =>
      driverLaps.map((lap) => lap.lap_number)
    ),
    1
  )
  const traces: Record<DriverKey, CircuitPoint[]> = {
    norris: traceFromOutline(path, "norris", 0.68, 0.24, lapMax),
    piastri: traceFromOutline(path, "piastri", 0.7, 0.22, lapMax),
    verstappen: traceFromOutline(path, "verstappen", 0.5, 0.16, lapMax),
    sainz: traceFromOutline(path, "sainz", 0.58, 0.2, lapMax),
  }
  const incident = path[Math.floor(path.length * 0.9)] ?? null
  return { path, traces, incident, raceStart, telemetryPointCount }
}

function buildEvents(raceControl: RaceControl[]): RaceEvent[] {
  return raceControl
    .filter((event) =>
      /safety|virtual|incident|collision|rain|slippery|investigation|deleted|black and white/i.test(
        event.message ?? ""
      )
    )
    .slice(0, 32)
    .map((event) => ({
      lap: typeof event.lap_number === "number" ? event.lap_number : null,
      category: event.category ?? null,
      message: event.message ?? "",
    }))
}

async function sprintPointsForMeeting(meetingKey: number, raceDir: string) {
  const sessions = await fetchAndCache<Array<Session & { session_name?: string }>>(
    `${API_ROOT}/sessions?year=${YEAR}&meeting_key=${meetingKey}`,
    path.join(raceDir, "meeting_sessions.json")
  )
  const sprint = sessions.find((session) => session.session_name === "Sprint")
  if (!sprint) return new Map<number, number>()
  const sprintResults = await fetchAndCache<Result[]>(
    `${API_ROOT}/session_result?session_key=${sprint.session_key}`,
    path.join(raceDir, "sprint_result.json")
  )
  return new Map(
    sprintResults
      .filter((result) => TOP_DRIVER_NUMBERS.includes(result.driver_number))
      .map((result) => [result.driver_number, result.points ?? 0])
  )
}

function keyRaceFor(session: Session) {
  if (session.country_name === "Italy" && session.location !== "Imola") {
    return undefined
  }
  return (
    KEY_RACES[`${session.country_name}|${session.location}`] ??
    KEY_RACES[session.country_name]
  )
}

function raceSummary(session: Session, isKeyRace: boolean) {
  if (isKeyRace) {
    const summaries: Record<string, string> = {
      Austria:
        "Norris and Piastri turn the race into a direct pressure test while Verstappen's first-lap exit removes a normal title reference point.",
      Australia:
        "Rain, safety cars and tyre changes made the opener a stress test; Norris left with the first real championship gap.",
      Italy:
        "Verstappen converted lap-one track position and safety-car timing while the McLarens split the remaining podium points.",
      Canada:
        "Norris closed on Piastri late, made contact, retired, and turned a McLaren points finish into a title swing.",
      Qatar:
        "A lap-seven safety car split the strategy tree: Verstappen stopped immediately, McLaren stayed out, and the title fight reached Abu Dhabi alive.",
      "United Arab Emirates":
        "Qatar leaves the title unresolved; Abu Dhabi resolves the three-way fight with Norris doing exactly enough while Verstappen wins.",
    }
    return (
      summaries[`${session.country_name}|${session.location}`] ??
      summaries[session.country_name] ??
      "A key championship race where incidents, points or strategy changed the season shape."
    )
  }

  return `${session.location} stays compressed in the season map: useful for context, but not expanded into a full chapter.`
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true })
  await mkdir(PUBLIC_DIR, { recursive: true })

  const sessions = (
    await fetchJson<Session[]>(
      `${API_ROOT}/sessions?year=${YEAR}&session_name=Race`
    )
  ).sort(
    (a, b) =>
      new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
  )

  await saveJson(path.join(RAW_DIR, "sessions.json"), sessions)

  const totals = new Map<number, number>()
  const driverDirectory = new Map<number, Driver>()
  const races: RaceStory[] = []
  const trackTraces: Record<string, Record<string, Location[]>> = {}

  for (const [index, session] of sessions.entries()) {
    const raceDir = path.join(
      RAW_DIR,
      `${String(index + 1).padStart(2, "0")}-${session.location
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}`
    )

    const params = `session_key=${session.session_key}`
    const drivers = await fetchAndCache<Driver[]>(
      `${API_ROOT}/drivers?${params}`,
      path.join(raceDir, "drivers.json")
    )
    const sprintPoints = await sprintPointsForMeeting(session.meeting_key, raceDir)
    for (const driverNumber of TOP_DRIVER_NUMBERS) {
      totals.set(
        driverNumber,
        (totals.get(driverNumber) ?? 0) + (sprintPoints.get(driverNumber) ?? 0)
      )
    }
    const championshipBefore = championshipState(totals)
    const results = await fetchAndCache<Result[]>(
      `${API_ROOT}/session_result?${params}`,
      path.join(raceDir, "session_result.json")
    )
    const startingGrid = await fetchAndCache<Grid[]>(
      `${API_ROOT}/starting_grid?${params}`,
      path.join(raceDir, "starting_grid.json")
    )
    const laps = await fetchAndCache<Lap[]>(
      `${API_ROOT}/laps?${params}`,
      path.join(raceDir, "laps.json")
    )
    const positions = await fetchAndCache<Position[]>(
      `${API_ROOT}/position?${params}`,
      path.join(raceDir, "position.json")
    )
    const pit = await fetchAndCache<Pit[]>(
      `${API_ROOT}/pit?${params}`,
      path.join(raceDir, "pit.json")
    )
    const stints = await fetchAndCache<Stint[]>(
      `${API_ROOT}/stints?${params}`,
      path.join(raceDir, "stints.json")
    )
    const raceControl = await fetchAndCache<RaceControl[]>(
      `${API_ROOT}/race_control?${params}`,
      path.join(raceDir, "race_control.json")
    )
    const weather = await fetchAndCache<Weather[]>(
      `${API_ROOT}/weather?${params}`,
      path.join(raceDir, "weather.json")
    )
    const intervals = await fetchAndCache<Interval[]>(
      `${API_ROOT}/intervals?${params}`,
      path.join(raceDir, "intervals.json")
    )

    for (const driver of drivers) {
      driverDirectory.set(driver.driver_number, driver)
    }

    const locationsByDriver: Record<string, Location[]> = {}
    for (const driverNumber of TOP_DRIVER_NUMBERS) {
      const locations = await fetchAndCache<Location[]>(
        `${API_ROOT}/location?${params}&driver_number=${driverNumber}`,
        path.join(raceDir, `location-${driverNumber}.json`)
      )
      locationsByDriver[String(driverNumber)] = downsampleLocations(locations)
    }
    trackTraces[String(session.session_key)] = locationsByDriver

    const resultByDriver = new Map(
      results.map((result) => [result.driver_number, result])
    )
    const gridByDriver = new Map(
      startingGrid.map((grid) => [grid.driver_number, grid])
    )
    const lapsByDriver = new Map<number, Lap[]>()
    for (const lap of laps) {
      const bucket = lapsByDriver.get(lap.driver_number) ?? []
      bucket.push(lap)
      lapsByDriver.set(lap.driver_number, bucket)
    }

    for (const driverNumber of TOP_DRIVER_NUMBERS) {
      const result = resultByDriver.get(driverNumber)
      totals.set(
        driverNumber,
        (totals.get(driverNumber) ?? 0) + (result?.points ?? 0)
      )
    }
    const championshipAfter = championshipState(totals)

    const keyRace = keyRaceFor(session)
    const raceResults = Object.fromEntries(
      TOP_DRIVER_NUMBERS.map((driverNumber) => {
        const key = DRIVER_KEYS[driverNumber]
        const result = resultByDriver.get(driverNumber)
        const driverLaps = lapsByDriver.get(driverNumber) ?? []
        const cleanLaps = driverLaps
          .filter((lap) => !lap.is_pit_out_lap && typeof lap.lap_duration === "number")
          .map((lap) => lap.lap_duration!)
        return [
          key,
          {
            position: result?.dnf || result?.dns || result?.dsq ? null : result?.position ?? null,
            points: result?.points ?? 0,
            cumulativePoints: totals.get(driverNumber) ?? 0,
            grid: gridByDriver.get(driverNumber)?.position ?? null,
            dnf: Boolean(result?.dnf || result?.dns || result?.dsq),
            medianLap: median(cleanLaps),
            bestSpeed: bestSpeed(driverLaps),
          },
        ]
      })
    ) as RaceStory["driverResults"]

    const lapMedians = Object.values(raceResults)
      .map((result) => result.medianLap)
      .filter((value): value is number => typeof value === "number")
    const points = Object.values(raceResults).map((result) => result.points)
    const lapCount = Math.max(
      ...Array.from(lapsByDriver.values()).flatMap((driverLaps) =>
        driverLaps.map((lap) => lap.lap_number)
      ),
      1
    )
    const lapStarts = buildLapStarts(laps)

    races.push({
      round: index + 1,
      sessionKey: session.session_key,
      meetingKey: session.meeting_key,
      circuitKey: session.circuit_key,
      country: session.country_name,
      location: session.location,
      date: session.date_start,
      label:
        session.country_name === "United States" &&
        session.location === "Las Vegas"
          ? "Las Vegas"
          : session.country_name,
      summary: raceSummary(session, Boolean(keyRace)),
      isKeyRace: Boolean(keyRace),
      ...keyRace,
      metrics: {
        pitStops: pit.length,
        incidents: raceControl.length,
        dnfs: results.filter((result) => result.dnf || result.dns || result.dsq)
          .length,
        pointSwing: Math.max(...points) - Math.min(...points),
        fastestLap:
          lapMedians.length > 0 ? Math.min(...lapMedians) : undefined,
        cleanPaceSpread:
          lapMedians.length > 1
            ? Math.max(...lapMedians) - Math.min(...lapMedians)
            : undefined,
      },
      chapterData: keyRace
        ? {
            championshipBefore,
            championshipAfter,
            pointDelta: championshipDelta(championshipBefore, championshipAfter),
            lapSeries: buildLapSeries(lapsByDriver, stints, weather, lapCount),
            stints: buildStints(stints, lapsByDriver),
            pitStops: buildPitStops(pit, lapsByDriver),
            positionSeries: buildPositionSeries(
              positions,
              lapStarts,
              session.date_start,
              lapCount
            ),
            gapSeries: buildGapSeries(
              intervals,
              lapStarts,
              session.date_start,
              lapCount
            ),
            circuitMap:
              keyRace.visualType === "circuit-map"
                ? buildCircuitMap(
                    locationsByDriver,
                    lapsByDriver,
                    session.date_start
                  )
                : undefined,
            events: buildEvents(raceControl),
          }
        : undefined,
      driverResults: raceResults,
    })

    console.log(
      `Fetched ${index + 1}/${sessions.length}: ${session.location} (${session.session_key})`
    )
  }

  const drivers = TOP_DRIVER_NUMBERS.map((number) => {
    const driver = driverDirectory.get(number)
    return {
      key: DRIVER_KEYS[number],
      number,
      name: driver?.full_name ?? `Driver ${number}`,
      acronym: driver?.name_acronym ?? String(number),
      team: driver?.team_name ?? "Unknown",
      color: DRIVER_COLORS[number],
      finalPoints: OFFICIAL_FINAL_POINTS[number] ?? totals.get(number) ?? 0,
    }
  })

  const story: SeasonStory = {
    generatedAt: new Date().toISOString(),
    season: YEAR,
    title: "2025 Formula One Championship",
    subtitle:
      "A scroll-driven map of the Norris, Verstappen and Piastri title fight.",
    dataSources: [
      "OpenF1 historical API raw JSON",
      "Formula1.com race reports for key-race annotation",
    ],
    drivers,
    races,
    summaryBands: [
      {
        title: "Opening shape",
        raceRange: [1, 6],
        text: "McLaren starts the year as the constant reference point, while Verstappen keeps enough pressure in the system to make every dropped point visible.",
      },
      {
        title: "Summer compression",
        raceRange: [7, 14],
        text: "The title fight narrows into a three-driver problem: clean execution, tyre windows and intra-team pressure matter more than raw peaks.",
      },
      {
        title: "Late volatility",
        raceRange: [15, 24],
        text: "The final third turns on retirements, penalties, disqualifications and strategy decisions rather than simple race pace.",
      },
    ],
  }

  await saveJson(path.join(PUBLIC_DIR, "season-story.json"), story)
  await saveJson(path.join(PUBLIC_DIR, "track-traces.json"), trackTraces)
  console.log(`Wrote ${path.join(PUBLIC_DIR, "season-story.json")}`)
  console.log(`Wrote ${path.join(PUBLIC_DIR, "track-traces.json")}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
