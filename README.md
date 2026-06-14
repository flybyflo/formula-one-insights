# Formula One Insights

Interactive scrollytelling visualization for Assignment 3. The project follows
the 2025 Formula One drivers' championship and focuses on the Qatar Grand Prix:
the lap-7 Safety Car, Lusail's 25-lap tyre limit, and the strategy swing that
kept the title fight open until Abu Dhabi.

Hosted version: https://flybyflo.github.io/formula-one-insights/

## What It Shows

- A scroll-linked Qatar position timeline.
- The track positions when the Safety Car was called.
- Championship standings before and after Qatar.
- Tyre-limit, restack, pace, and gap charts for the key race phases.

## Run Locally

```bash
pnpm install
pnpm dev
```

Then open the local URL printed by Vite.

## Build

```bash
pnpm build
```

The production build is written to `dist/`.

## Data

The browser loads preprocessed JSON from:

```text
public/data/2025/season-story.json
public/data/2025/track-traces.json
```

The app does not call OpenF1 at runtime. To regenerate the data:

```bash
pnpm data:fetch
```

That script writes raw OpenF1 API responses to `data/raw/openf1/2025` and
derived browser data to `public/data/2025`. The raw folder is intentionally
ignored because it is large and reproducible from the script.

## Tech

- React
- TypeScript
- Vite
- D3 scales and SVG charts
