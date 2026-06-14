import type { SeasonStory } from "@/types/story"

export async function loadSeasonStory() {
  const baseUrl = import.meta.env.BASE_URL
  const storyUrl = `${baseUrl.replace(/\/$/, "")}/data/2025/season-story.json?v=${Date.now()}`
  const response = await fetch(storyUrl, {
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(
      "Missing precomputed story data. Run `pnpm data:fetch` before opening the dashboard."
    )
  }

  return (await response.json()) as SeasonStory
}
