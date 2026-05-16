# Urinal Protocol Game — Replit Guide

## Overview

**Urinal Protocol** is a humorous social decision puzzle web game where players must choose the most socially appropriate urinal based on bathroom etiquette rules. The game features:

- A **level-based progression system** (up to 500 levels) that gradually introduces new characters and mechanics.
- A **deterministic rule engine** with hard-fail rules, primary rules, and secondary tie-breakers.
- **8 unique characters** (Boss, Perv, Janitor, Phone Guy, Chatterbox, Caution Cone, Mirror Guy, Kid) that each impose different zone constraints on the player.
- **Lego minifig visual style** — all characters and urinals are rendered as SVG-based Lego figures.
- A **highscores leaderboard** backed by a PostgreSQL database.
- A **GitHub integration** via Replit's connectors SDK that allows pushing the project to a GitHub repo.

The app is a full-stack TypeScript monorepo: React frontend served via Vite, Express backend, and PostgreSQL via Drizzle ORM.

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend Architecture

- **Framework:** React 18 with TypeScript, using Vite as the build tool.
- **Routing:** `wouter` (lightweight client-side routing). Only two routes: `/` (Game) and a 404 fallback.
- **State Management:** React `useState`/`useEffect` hooks for local game state. `@tanstack/react-query` for server data (highscores, GitHub user/repos).
- **UI Components:** shadcn/ui component library built on Radix UI primitives, styled with Tailwind CSS.
- **Animation:** `framer-motion` for all transitions, character reactions, and game feedback.
- **Audio:** Web Audio API — synthesised 8-bit background music (`AudioProvider.tsx`) + priority-based sound system with ambient hum, hover-intent timing (150ms delay), lock-in click, character sounds, and dynamic ambient dipping on failure.
- **Theming:** Dual theme. Game UI uses a dark premium indie design (`--pp-bg #15192A`, `--pp-surface #1E2338`, `--pp-blue #5B7CF7`). LandingPage retains Lego-themed aesthetic (`lego-wall`, `lego-baseplate-yellow`, etc.). Design system defined in `client/src/index.css` with CSS custom properties prefixed `--pp-`. `theme.json` set to `dark` appearance, `#5B7CF7` primary.
- **Fonts:** Google Fonts — Bangers (headers), Nunito (body).

**Key frontend files:**
- `client/src/pages/Game.tsx` — top-level game page; manages landing vs. gameplay phase.
- `client/src/pages/LandingPage.tsx` — avatar selection and name entry.
- `client/src/components/UrinalGame.tsx` — core game loop, state, and orchestration.
- `client/src/lib/ruleEngine.ts` — deterministic rule evaluation (hard-fail, primary, secondary tiers).
- `client/src/lib/gameRules.ts` — level generation and `checkSelection` wrappers.
- `client/src/lib/characterSystem.ts` — character zone definitions, behavior timing, quip lines.
- `client/src/components/LegoMinifig.tsx` — SVG-based Lego minifig renderer (shared by all characters).
- `client/src/components/CharacterDisplay.tsx` — unified character renderer with idle/hover/reaction animation states.

### Backend Architecture

- **Framework:** Express.js with TypeScript, running via `tsx` in development and compiled ESM in production.
- **Structure:** Single `server/index.ts` entry point, routes registered in `server/routes.ts`, storage abstracted via `server/storage.ts`.
- **Dev Server:** Vite middleware integrated into Express for HMR in development (`server/vite.ts`).
- **Build:** Vite builds the frontend to `dist/public`; esbuild bundles the server to `dist/index.js`.

**API Endpoints:**
- `GET /api/game/highscores` — fetch top 20 scores ordered by score descending.
- `POST /api/game/highscores` — save a new highscore (requires `playerName` and `score`).
- `GET /api/github/user` — get the authenticated GitHub user (via Replit connector).
- `GET /api/github/repos` — list the user's GitHub repositories.
- `POST /api/github/push` — push the current project files to a GitHub repo.

### Game Logic Architecture

The rule engine uses a strict three-tier priority system:

1. **Hard Fail rules** — selecting occupied/blocked urinals, or choosing a primary-violating urinal when a valid alternative exists. Always fail immediately.
2. **Primary rules** — must be avoided if a safer alternative exists (unclean urinal, adjacent to Boss, within Perv range ±2, occupied adjacency, Phone Guy zone ±1, Chatterbox zone ±2, pattern enforcement).
3. **Secondary rules** — tie-breakers only, never cause failure (prefer edges, maximise distance, checkerboard pattern when not enforced).

**Scoring tiers:** 100 (perfect), 80 (strong), 60 (acceptable), 10–20 (forced compromise), 0 (fail), +50 (hold-it-in bonus).

**Level progression:**
- Phase 0 (levels 1–9): Basic spacing only.
- Phase 1 (levels 10–100): One new mechanic introduced every 10 levels.
- Phase 2 (levels 101–500): All mechanics combined with increasing complexity.

Levels are validated before being presented to guarantee they are always solvable (no impossible states).

### Data Storage

- **Database:** PostgreSQL via `@neondatabase/serverless` (Neon serverless driver) + Drizzle ORM.
- **Schema** (`shared/schema.ts`):
  - `users` table: `id`, `username`, `password` (basic user model, mostly placeholder).
  - `highscores` table: `id`, `playerName`, `score`.
- **Drizzle config:** `drizzle.config.ts` points to `./shared/schema.ts`, outputs migrations to `./migrations`.
- **Connection:** `server/db.ts` uses `node-postgres` Pool with `DATABASE_URL` environment variable.
- To push schema changes: `npm run db:push`.

### Authentication

No user authentication is implemented. The `users` table and storage methods exist as scaffolding but are not used. Highscores are saved by player-entered name only (no login required).

### Path Aliases

- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`

Configured in both `tsconfig.json` and `vite.config.ts`.

---

## External Dependencies

### Core Runtime
| Package | Purpose |
|---|---|
| `express` | HTTP server and API routing |
| `drizzle-orm` + `drizzle-kit` | ORM and schema/migration tooling |
| `@neondatabase/serverless` | Neon PostgreSQL serverless driver |
| `pg` (node-postgres) | PostgreSQL pool (used in `server/db.ts`) |
| `vite` + `@vitejs/plugin-react` | Frontend build tooling and dev server |
| `tsx` | Run TypeScript server files directly in dev |
| `esbuild` | Bundle server for production |

### Frontend Libraries
| Package | Purpose |
|---|---|
| `react` + `react-dom` | UI framework |
| `wouter` | Client-side routing |
| `@tanstack/react-query` | Server state and data fetching |
| `framer-motion` | Animations and transitions |
| `tailwindcss` | Utility-first CSS |
| `@radix-ui/*` | Accessible UI primitives (shadcn/ui) |
| `class-variance-authority` + `clsx` + `tailwind-merge` | Class composition utilities |
| `react-hook-form` + `@hookform/resolvers` + `zod` | Form handling and validation |
| `date-fns` | Date utilities |
| `lucide-react` | Icon set |

### Replit-Specific Integrations
| Package | Purpose |
|---|---|
| `@replit/connectors-sdk` | Proxy calls to GitHub API via Replit OAuth connector |
| `@replit/vite-plugin-shadcn-theme-json` | Sync `theme.json` with shadcn CSS variables |
| `@replit/vite-plugin-runtime-error-modal` | Show runtime errors as overlay in dev |
| `@replit/vite-plugin-cartographer` | Replit dev tooling (dev-only) |

### GitHub Integration
- Uses `@replit/connectors-sdk` (`ReplitConnectors`) to proxy GitHub REST API calls.
- Requires a GitHub OAuth connection configured in the Replit environment.
- `server/github.ts` handles: get authenticated user, list repos, collect project files, push to GitHub (create/update repo, commit files via GitHub Contents API).
- No `GITHUB_TOKEN` env var needed directly — the Replit connector handles auth transparently.

### Environment Variables Required
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon or standard Postgres) |

### Audio Assets
Preloaded MP3 files expected in the public directory:
- `/success.mp3`
- `/failure.mp3`
- `/pissing.mp3`

Background music is synthesised entirely via Web Audio API — no audio file needed.