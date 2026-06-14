export type DriverKey = "norris" | "verstappen" | "piastri" | "sainz"

export type DriverStory = {
  key: DriverKey
  number: number
  name: string
  acronym: string
  team: string
  color: string
  finalPoints: number
}

export type ChampionshipState = Record<DriverKey, number>

export type LapSample = {
  driver: DriverKey
  lap: number
  lapTime: number | null
  s1: number | null
  s2: number | null
  s3: number | null
  speed: number | null
  compound: string | null
  tyreAge: number | null
  pitOut: boolean
  rainfall: boolean
  trackTemp: number | null
}

export type StintSample = {
  driver: DriverKey
  stint: number
  compound: string
  startLap: number
  endLap: number
  tyreAgeStart: number | null
  avgLap: number | null
  avgS1: number | null
  avgS2: number | null
  avgS3: number | null
}

export type PitStopSample = {
  driver: DriverKey
  lap: number
  stopDuration: number | null
  pitDuration: number | null
  outLapDelta: number | null
}

export type PositionSample = {
  driver: DriverKey
  lap: number
  position: number
}

export type GapSample = {
  lap: number
  driver: DriverKey
  interval: number | null
  gapToLeader: number | null
}

export type CircuitPoint = {
  x: number
  y: number
  lap?: number
  driver?: DriverKey
}

export type RaceEvent = {
  lap: number | null
  category: string | null
  message: string
}

export type ChapterData = {
  championshipBefore: ChampionshipState
  championshipAfter: ChampionshipState
  pointDelta: ChampionshipState
  lapSeries?: LapSample[]
  stints?: StintSample[]
  pitStops?: PitStopSample[]
  positionSeries?: PositionSample[]
  gapSeries?: GapSample[]
  circuitMap?: {
    path: CircuitPoint[]
    traces: Record<DriverKey, CircuitPoint[]>
    incident: CircuitPoint | null
  }
  events?: RaceEvent[]
}

export type RaceStory = {
  round: number
  sessionKey: number
  meetingKey: number
  circuitKey: number
  country: string
  location: string
  date: string
  label: string
  summary: string
  isKeyRace: boolean
  chapterId?: string
  chapterTitle?: string
  visualType?:
    | "duel-ribbon"
    | "failure-swing"
    | "dnf-impact"
    | "shockwave"
    | "finale-gauge"
    | "circuit-map"
  sourceUrl?: string
  sourceLabel?: string
  chapterData?: ChapterData
  metrics: {
    pitStops: number
    incidents: number
    dnfs: number
    pointSwing: number
    fastestLap?: number
    cleanPaceSpread?: number
  }
  driverResults: Record<
    DriverKey,
    {
      position: number | null
      points: number
      cumulativePoints: number
      grid: number | null
      dnf: boolean
      medianLap: number | null
      bestSpeed: number | null
    }
  >
}

export type SeasonStory = {
  generatedAt: string
  season: number
  title: string
  subtitle: string
  dataSources: string[]
  drivers: DriverStory[]
  races: RaceStory[]
  summaryBands: {
    title: string
    raceRange: [number, number]
    text: string
  }[]
}
