# VibeCast

**Ambient video casting for your TV, powered by auto-curation.**

VibeCast is a self-hosted web app that automatically discovers, curates, and casts YouTube videos to your Chromecast. Define concepts like "nature documentaries" or "space exploration", and VibeCast keeps your TV playing a rotating mix of quality content — no manual searching required.

## Features

- **Auto-Curation** — AI-powered pipeline discovers and queues videos matching your configured concepts
- **Concept Mixing** — rotates through multiple concepts across pipeline runs for variety
- **Chromecast Integration** — discovers devices via mDNS and casts with full playback control
- **Queue Management** — add, reorder, remove, and monitor videos in the playback queue
- **Watch History** — tracks played videos to avoid repeats (7-day TTL)
- **Real-Time Updates** — SSE-based live status for playback, queue, and curation state
- **LLM-Optional** — works with or without an OpenAI API key (falls back to direct search)
- **Web UI** — responsive dashboard for configuration and monitoring

## Prerequisites

- **Node.js** 20+
- **yt-dlp** — [install instructions](https://github.com/yt-dlp/yt-dlp#installation)
- **ffmpeg** — required by yt-dlp for video processing
- **OpenAI API key** (optional) — enables smart concept selection, query generation, and content filtering

## Quick Start (Local)

```bash
# Clone and install
git clone <repo-url> && cd vibe-cast
npm install

# Optional: set OpenAI key for LLM-powered curation
echo "OPENAI_API_KEY=sk-..." > .env.local

# Start development server
npm run dev
# App runs on http://localhost:3001
```

Open the web UI, configure your concepts, and enable auto-curation. VibeCast will start discovering and queuing videos automatically.

## Docker Setup

```bash
# Build the image
docker build -t vibecast .

# Run with docker-compose (recommended)
docker compose up -d
```

The app will be available on port 3000.

To pass your OpenAI key, either export it in your shell or create a `.env` file:

```bash
export OPENAI_API_KEY=sk-...
docker compose up -d
```

### mDNS / Chromecast Discovery Constraint

Docker deployment with Chromecast discovery **only works on Linux** with `network_mode: host`.

On macOS and Windows, Docker Desktop runs containers inside a Linux VM that cannot bridge mDNS multicast traffic to the host network. This means `bonjour-service` won't discover Chromecast devices. For macOS/Windows, run VibeCast natively with `npm run dev` or `npm start`.

## Configuration

Settings are managed through the web UI or the `/api/config` endpoint.

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `concepts` | string[] | `[]` | Content themes to search for (e.g. "nature", "space exploration") |
| `queueSize` | number | `5` | Target number of videos to keep in the queue |
| `quality` | string | `"best"` | Video quality preference for downloads |
| `curateEnabled` | boolean | `false` | Enable/disable the auto-curation pipeline |

Config persists in `data/config.json`.

## How Auto-Curation Works

1. **Check** — every 30 seconds, checks if the queue is below `queueSize`
2. **Pick Concept** — LLM selects the next concept considering variety, time of day, and season (or round-robin without LLM)
3. **Generate Queries** — LLM creates 3-5 YouTube search queries for the concept
4. **Search** — runs queries through yt-dlp, filters by duration (2min–4hrs), excludes history and live streams
5. **Metadata** — fetches full metadata for top 15 candidates
6. **Curate** — LLM reviews candidates for quality and safety (or passes all through without LLM)
7. **Add to Queue** — adds 1 approved video per run (when multiple concepts exist) for concept mixing

When only one concept is configured, multiple videos can be added per run to fill the queue faster.

All LLM calls are logged with model, prompts, responses, and token usage for debugging.

## Architecture

- **Server Singletons** — `castManager`, `queueManager`, `configManager`, `historyManager`, `autoCurator` persist via `globalThis` across HMR reloads
- **SSE** — `/api/cast/status` streams real-time updates for playback, queue, config, and curation state
- **React Context** — `CastStatusProvider` distributes server state to client components
- **Event-Driven** — modules communicate via `EventEmitter` for loose coupling

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/video/info` | Fetch YouTube video metadata |
| GET | `/api/video/stream/[id]` | Stream downloaded MP4 with range support |
| GET | `/api/cast/devices` | Discover Chromecast devices on network |
| POST | `/api/cast/play` | Start playing a queue item on Chromecast |
| POST | `/api/cast/control` | Playback controls (pause, play, stop, seek, volume, skip) |
| GET, POST, PUT, DELETE | `/api/cast/queue` | Queue CRUD: list, add, reorder, remove, clear played |
| GET | `/api/cast/status` | SSE stream of all real-time updates |
| GET | `/api/cast/test` | Auto-discover TV and cast a test video |
| GET, PUT | `/api/config` | Get/update app configuration |
| GET, POST | `/api/curation` | Curation status; start/stop/trigger pipeline |
| GET, DELETE | `/api/history` | View or clear watch history |
| GET, PUT | `/api/settings/apikey` | Check/update OpenAI API key |

## Project Structure

```
src/
  app/
    api/
      cast/       — Chromecast control, queue, status SSE, playback
      config/     — App configuration
      curation/   — Auto-curation control
      history/    — Watch history
      settings/   — API key management
      video/      — Video info and streaming
    page.tsx      — Main dashboard UI
  lib/
    auto-curator.ts   — Pipeline orchestrator (check, fill, concept mixing)
    cast-manager.ts   — Chromecast connection and playback
    config-manager.ts — Config persistence and events
    curator.ts        — LLM integration (concept picker, query gen, curation)
    history-manager.ts — Watch history with TTL
    queue-manager.ts  — In-memory video queue with download management
    yt-search.ts      — YouTube search via yt-dlp
    ytdlp.ts          — yt-dlp download wrapper
  types/
    video.ts, cast.ts, config.ts — TypeScript type definitions
data/               — Persistent JSON files (gitignored)
downloads/          — Downloaded MP4 files (gitignored)
```
