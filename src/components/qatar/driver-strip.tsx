import type { DriverStory, RaceStory } from "@/types/story"

type DriverStripProps = {
  race: RaceStory
  drivers: DriverStory[]
}

export function DriverStrip({ race, drivers }: DriverStripProps) {
  return (
    <div className="driver-strip flex flex-wrap gap-x-[1.15rem] gap-y-[0.7rem] text-[0.9rem] text-foreground">
      {drivers.map((driver) => (
        <span key={driver.key} className="inline-flex min-w-0 items-center gap-2">
          <i className="h-[0.7rem] w-[0.7rem] rounded-full" style={{ background: driver.color }} />
          {driver.acronym} · P{race.driverResults[driver.key]?.position ?? "DNF"} ·{" "}
          {race.driverResults[driver.key]?.points ?? 0} pts
        </span>
      ))}
    </div>
  )
}
