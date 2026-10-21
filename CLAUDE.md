# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Actual state (overrides AGENTS.md placeholders where they differ)

ShiftLoom: a shift/job marketplace app (Expo SDK 54, React Native 0.81, React 19, Expo Router 6). Product spec lives in `app_requirements.md` and `docs/screen_breakdown.md`; colors in `colors.md`.

**Decided stack:** Zustand (state), NativeWind v4 + Tailwind 3 (styling, `className`), Supabase (auth + Postgres backend). No server-state library, no test runner installed yet.

## Commands

Scripts that exist: `npm start`, `npm run ios`, `npm run android`, `npm run web`, `npm run lint` (expo lint). Type-check with `npx tsc --noEmit`. There is **no `npm test`** — Jest/jest-expo is not set up.

## Architecture

- **Path alias:** `@/*` maps to the repo root, so imports look like `@/src/store/...`, `@/components/...`, `@/hooks/...`. Note `components/`, `hooks/`, `constants/` live at the root, not under `src/` (diverges from AGENTS.md §4).
- **Data flow:** screen → Zustand store (`src/store/useAuthStore.ts`, `src/store/useJobStore.ts`) → service (`src/services/*Service.ts`) → Supabase client (`src/lib/supabase.ts`). Services own Supabase queries and map snake_case DB rows to camelCase types (e.g. `formatDbJob` in `jobService.ts`); stores hold loading/error flags and call services.
- **Supabase tables in use:** `users`, `jobs`, `user_jobs` (applications, incl. cancellation reason), `saved_jobs`.
- **Auth/routing gate:** `app/_layout.tsx` calls `useAuthStore().initialize()` and renders nothing until initialized. `NavigationGuard` redirects: no user → `(auth)/login`; user missing `role`/`firstName` → `(user)/onboarding`; otherwise → `(tabs)`. New top-level routes must be added to `inAppGroup` there or the guard will bounce users away.
- **Routes:** `(auth)` login/signup, `(user)/onboarding`, `(tabs)` home/`my shifts`/saved/profile, `job/[id]` shift details, `notifications`. Note the tab file name contains a space: `app/(tabs)/my shifts.tsx`.
- **Env:** Supabase keys come from `.env.local` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`). There is no `.env.example` yet.
- `constants/mockJobs.ts` is legacy mock data; real data comes from Supabase.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
