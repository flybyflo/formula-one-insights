import { CHAPTER_EYEBROW_CLASS, TITLE_DRIVER_KEYS } from "@/components/qatar/constants"
import type { DriverStory, RaceStory } from "@/types/story"

type ChampionshipStandingBlockProps = {
  race: RaceStory
  drivers: DriverStory[]
  mode: "before" | "after"
}

function driverSurname(driver: DriverStory) {
  const surname = driver.name.trim().split(/\s+/).at(-1)
  if (!surname) return driver.acronym
  return surname.charAt(0).toUpperCase() + surname.slice(1).toLowerCase()
}

export function ChampionshipStandingBlock({ race, drivers, mode }: ChampionshipStandingBlockProps) {
  const data = race.chapterData
  if (!data) return null

  const standings = TITLE_DRIVER_KEYS.map((key) => {
    const driver = drivers.find((item) => item.key === key)!
    const points = mode === "before" ? data.championshipBefore[key] : data.championshipAfter[key]
    return { driver, points, delta: data.pointDelta[key] }
  }).sort((a, b) => b.points - a.points)

  const leader = standings[0]!
  const maxPoints = leader.points || 1

  return (
    <section
      className="standing-block my-[0.8rem] mb-2 grid w-[min(100%,760px)] gap-[0.7rem]"
      aria-label={`Championship standings ${mode} Qatar`}
    >
      <p className={CHAPTER_EYEBROW_CLASS}>championship {mode === "before" ? "before Qatar" : "after Qatar"}</p>
      <div className="grid gap-[0.45rem] pt-[0.2rem]">
        {standings.map((row, index) => (
          <div
            key={row.driver.key}
            className="grid grid-cols-[1.2rem_7rem_minmax(0,1fr)_3.2rem_2.4rem] items-center gap-[0.65rem] text-[0.82rem] font-[680]"
          >
            <span className="text-[0.72rem] text-muted-foreground">{index + 1}</span>
            <span className="inline-flex items-center gap-[0.4rem]">
              <i className="h-[0.55rem] w-[0.55rem] rounded-full" style={{ background: row.driver.color }} />
              {driverSurname(row.driver)}
            </span>
            <span className="h-2 overflow-hidden rounded-full bg-foreground/10">
              <i
                className="block h-full rounded-[inherit]"
                style={{
                  width: `${Math.max(6, (row.points / maxPoints) * 100)}%`,
                  background: row.driver.color,
                }}
              />
            </span>
            <span className="text-right">{row.points}</span>
            {mode === "after" ? (
              <span className="text-[0.72rem] text-muted-foreground">+{row.delta}</span>
            ) : null}
          </div>
        ))}
      </div>
      <p className="m-0 max-w-[58ch] text-[0.75rem] leading-[1.42] text-foreground">
        {mode === "before"
          ? `${driverSurname(leader.driver)} leads the table, but Verstappen is close enough that one strategy swing can put the title back in play.`
          : `${driverSurname(leader.driver)} still leads, but Verstappen has cut the gap to ${leader.points - standings[1]!.points} points with one race to go.`}
      </p>
    </section>
  )
}
