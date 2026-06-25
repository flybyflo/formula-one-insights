import { ChampionshipStandingBlock } from "@/components/qatar/championship-standing"
import { FinalStintLapTimeChart } from "@/components/qatar/charts/final-stint-lap-time-chart"
import { GapToVerstappenChart } from "@/components/qatar/charts/gap-to-verstappen-chart"
import { PositionRestackChart } from "@/components/qatar/charts/position-restack-chart"
import { TyreLimitChart } from "@/components/qatar/charts/tyre-limit-chart"
import {
  CHAPTER_CLASS,
  CHAPTER_EYEBROW_CLASS,
  CHAPTER_HEADING_CLASS,
  CHAPTER_TEXT_CLASS,
  EYEBROW_CLASS,
  QATAR_INSIGHT_CLASS,
} from "@/components/qatar/constants"
import { DriverStrip } from "@/components/qatar/driver-strip"
import { QatarLapTimeline } from "@/components/qatar/qatar-lap-timeline"
import { SafetyCarCallMap } from "@/components/qatar/safety-car-call-map"
import { TopPositionStackedChart } from "@/components/qatar/top-position-stacked-chart"
import type { RaceStory, SeasonStory } from "@/types/story"

type QatarDashboardProps = {
  story: SeasonStory
  race: RaceStory
}

export function QatarDashboard({ story, race }: QatarDashboardProps) {
  return (
    <main className="qatar-dashboard min-h-[100svh] bg-background text-foreground">
      <section className="hero grid min-h-[76svh] content-end gap-[1.3rem] border-b border-foreground/10 p-[clamp(2rem,6vw,6rem)] pb-[clamp(3rem,8vw,7rem)]">
        <p className={EYEBROW_CLASS}>
          Assignment 3 custom visualization · Qatar GP 2025
        </p>
        <h1 className="max-w-[980px] text-[clamp(3.3rem,10vw,8.7rem)] leading-[0.88] font-[640] tracking-normal max-[560px]:text-[clamp(3rem,17vw,5rem)]">
          Qatar’s strategy trap
        </h1>
        <p className="max-w-[680px] text-[clamp(1.05rem,2vw,1.35rem)] leading-[1.45] text-foreground">
          How a lap-7 Safety Car,{" "}
          <a
            className="text-foreground underline decoration-[0.08em] underline-offset-[0.18em] hover:text-muted-foreground"
            href="https://www.fia.com/system/files/decision-document/2025_qatar_grand_prix_-_event_notes_-_pirelli_preview_v2.pdf"
          >
            Lusail’s 25-lap tyre limit
          </a>
          , and Verstappen’s lap-32 second stop pushed the 2025 title fight on
          to the final round.
        </p>
        <DriverStrip race={race} drivers={story.drivers} />
      </section>

      <div className="story-layout grid [grid-template-columns:minmax(360px,44vw)_minmax(0,1fr)] items-start gap-[clamp(1.5rem,4vw,5rem)] p-[clamp(1.2rem,4vw,4rem)] max-[920px]:block max-[920px]:p-4">
        <aside className="sticky-map sticky top-0 grid h-[100svh] place-items-center max-[920px]:relative max-[920px]:h-auto">
          <QatarLapTimeline story={story} />
        </aside>

        <div className="chapters py-[8svh_10svh] max-[920px]:pt-0">
          <section
            className={`${CHAPTER_CLASS} qatar-opening`}
            data-chapter-id="qatar"
            data-qatar-step="fork"
          >
            <p className={CHAPTER_EYEBROW_CLASS}>
              round {race.round} · {race.location}
            </p>
            <h2 className="max-w-[680px] text-[clamp(2rem,3.3vw,3.45rem)] leading-[1.02] font-[650] tracking-normal">
              {race.chapterTitle}
            </h2>
            <p className={CHAPTER_TEXT_CLASS}>{race.summary}</p>
            <p className={CHAPTER_TEXT_CLASS}>
              Pace did not decide Qatar. Timing did. A normal green-flag stop at
              Lusail costs over 20 seconds, but the lap-7 Safety Car slowed the
              whole field and opened a heavily discounted pit window for anyone
              willing to take it.
            </p>
            <p className={CHAPTER_TEXT_CLASS}>
              Verstappen pitted at once. McLaren held both cars out for track
              position, but Lusail’s 25-lap stint cap meant Piastri and Norris
              still had to stop soon, at full racing speed, with no Safety Car
              to soften the cost.
            </p>
            <SafetyCarCallMap drivers={story.drivers} />
            <ChampionshipStandingBlock
              race={race}
              drivers={story.drivers}
              mode="before"
            />
          </section>

          <section className={QATAR_INSIGHT_CLASS} data-qatar-step="limit">
            <p className={CHAPTER_EYEBROW_CLASS}>constraint</p>
            <h2 className={CHAPTER_HEADING_CLASS}>
              Why staying out was never a real option.
            </h2>
            <p className={CHAPTER_TEXT_CLASS}>
              Verstappen’s lap-7 stop costs almost nothing because the field is
              already slow. McLaren cannot copy it, and the 25-lap tyre cap also
              blocks them from running long: their mediums are spent by lap 25,
              so Piastri stops on lap 24 and Norris on lap 25, both at full
              racing speed.
            </p>
            <div className="qatar-stack">
              <TyreLimitChart race={race} drivers={story.drivers} />
            </div>
          </section>

          <section className={QATAR_INSIGHT_CLASS} data-qatar-step="restack">
            <p className={CHAPTER_EYEBROW_CLASS}>restack</p>
            <h2 className={CHAPTER_HEADING_CLASS}>
              Lap 32: Verstappen pits again into clean air.
            </h2>
            <p className={CHAPTER_TEXT_CLASS}>
              By lap 30, with the McLarens’ stops done, Verstappen has cycled
              back into the lead and both papaya cars are shuffled behind Sainz.
              His own second stop on lap 32 has no Safety Car behind it, just a
              2-stop made cheap by the earlier freebie. It temporarily puts the
              McLarens back ahead on the road, but Verstappen has banked the
              stop they still owe.
            </p>
            <div className="qatar-stack">
              <PositionRestackChart race={race} drivers={story.drivers} />
            </div>
          </section>

          <section className={QATAR_INSIGHT_CLASS} data-qatar-step="points">
            <p className={CHAPTER_EYEBROW_CLASS}>consequence</p>
            <h2 className={CHAPTER_HEADING_CLASS}>
              The pace is there, but the track position is gone.
            </h2>
            <p className={CHAPTER_TEXT_CLASS}>
              The McLarens are actually the fastest cars on track at the end,
              but the gap is already too large to matter. Verstappen wins for 25
              points, Piastri takes 18, and with Sainz holding P3, Norris banks
              just 12 from fourth.
            </p>
            <div className="qatar-stack">
              <GapToVerstappenChart race={race} drivers={story.drivers} />
              <p className="chart-bridge">
                After Norris exits from his lap-44 stop, the only question is
                whether either McLaren can reel Verstappen back in. They never
                do: Piastri crosses the line 8.0s behind, with Norris a place
                further adrift.
              </p>
              <p className="chart-bridge">
                And it is not a pace problem. On the closing hard stint both
                McLarens lap up to ~0.9s quicker than Verstappen.
              </p>
              <FinalStintLapTimeChart race={race} drivers={story.drivers} />
              <p className="chart-bridge">
                But they spend that stint chasing from up to 20s back. The race
                was decided in the pit windows, not on the road.
              </p>
            </div>
            <ChampionshipStandingBlock
              race={race}
              drivers={story.drivers}
              mode="after"
            />
            <p className={CHAPTER_TEXT_CLASS}>
              One afternoon cuts Norris’s buffer over Verstappen from 25 points
              down to 12 and sends the title to a winner-takes-most Abu Dhabi
              finale. In a season decided by margins this fine, a single
              strategy call was worth a championship.
            </p>
            <TopPositionStackedChart story={story} />
            {race.sourceUrl ? (
              <a
                className="w-fit text-[0.88rem] text-foreground underline underline-offset-[0.3em]"
                href={race.sourceUrl}
              >
                {race.sourceLabel ?? "Qatar source"}
              </a>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  )
}
