import * as React from "react"

import { QatarDashboard } from "@/components/qatar/qatar-dashboard"
import { loadSeasonStory } from "@/lib/story-data"
import type { SeasonStory } from "@/types/story"

function MissingData({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string
  title: string
  detail?: string
}) {
  return (
    <main className="missing-data">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {detail ? <p>{detail}</p> : null}
      {eyebrow !== "loading local JSON" ? <code>pnpm data:fetch</code> : null}
    </main>
  )
}

function App() {
  const [story, setStory] = React.useState<SeasonStory | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    loadSeasonStory().then(setStory).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : "Data failed to load.")
    })
  }, [])

  if (error) {
    return (
      <MissingData
        eyebrow="precomputed data missing"
        title="Run the OpenF1 regeneration script first."
        detail={error}
      />
    )
  }

  if (!story) {
    return <MissingData eyebrow="loading local JSON" title="Preparing the 2025 season journey." />
  }

  const qatar = story.races.find((race) => race.chapterId === "qatar")

  if (!qatar) {
    return (
      <MissingData
        eyebrow="qatar data missing"
        title="Run the OpenF1 regeneration script first."
      />
    )
  }

  return <QatarDashboard story={story} race={qatar} />
}

export default App
