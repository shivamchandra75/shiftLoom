
# AGENTS.md

Instructions for AI coding agents (Claude Code, Cursor, Codex, etc.) working in this repository.
This is a **living document** — update it as real decisions get made (navigation, state
management, backend, etc.). Sections marked `[PLACEHOLDER]` should be edited once decided
and the placeholder note removed.

---
# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

## 1. Project Overview

- **Name:** [PLACEHOLDER — project name]
- **Purpose:** [PLACEHOLDER — one or two sentences on what this app does]
- **Stack:** Expo (managed workflow), React Native, TypeScript, npm
- **Status:** Greenfield project, built from scratch

---

## 2. Ground Rules — Read Before Doing Anything

These exist specifically to stop the agent from guessing. If any rule below can't be followed
because information is missing, **stop and ask**, or say explicitly that something is unverified,
rather than presenting a guess as fact.

1. **Never assume a package is installed.** Check `package.json` `dependencies`/`devDependencies`
   before importing anything. If it's not there, either install it properly (see §5) or ask first.
2. **Never invent file paths, component names, exports, or props.** Use the file explorer /
   `view` / `grep` to confirm the actual project structure before referencing it in code or in
   an explanation.
3. **Use `npx expo install <package>` instead of `npm install <package>`** for any package that
   touches native code. Expo resolves the version that matches the current SDK — plain `npm
   install` can pull an incompatible version and silently break the build.
4. **Don't assume a native module works in Expo Go.** Some packages require a custom dev client
   (`expo-dev-client`) and won't run in the plain Expo Go app. If adding a package that needs
   native code, say so explicitly and confirm whether a dev-client rebuild is expected.
5. **Don't guess Expo/React Native API signatures.** These APIs change across SDK versions.
   Check the installed version (`package.json`, or the type defs under `node_modules/expo-*`)
   or current Expo docs rather than recalling from memory.
6. **Never fabricate environment variable names.** Check `.env.example` / `app.config.ts` for
   the real keys. If a variable doesn't exist yet, add it to `.env.example` too.
7. **Only reference npm scripts that actually exist** in `package.json`. If a needed script
   (e.g. `lint`, `test`) doesn't exist, propose adding it rather than assuming it's there.
8. **Don't silently add new dependencies.** Flag any new dependency and briefly justify it
   before installing.
9. **Keep changes scoped.** Don't refactor unrelated files while completing a task.
10. **This project uses npm only.** Never generate or commit a `yarn.lock` or `pnpm-lock.yaml`.

---

## 3. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Expo (managed workflow) | Check exact SDK version in `package.json` / `app.json` — it will drift as the project evolves |
| Language | TypeScript (strict mode) | No `any` without a comment justifying it |
| Package manager | npm | Do not mix with yarn/pnpm |
| Routing/Navigation | Expo Router (recommended default) | `[PLACEHOLDER]` — update if React Navigation is used directly instead |
| State (local/global) | `[PLACEHOLDER]` — e.g. Zustand, Context+useReducer | Not yet decided — check package.json before assuming one is in use |
| Server/remote state | `[PLACEHOLDER]` — e.g. TanStack Query | Not yet decided |
| Styling | `[PLACEHOLDER]` — e.g. StyleSheet.create, NativeWind | Not yet decided |
| Testing | Jest + `jest-expo` + React Native Testing Library | Standard for Expo projects |
| Backend/API | `[PLACEHOLDER]` | Fill in once known |

---

## 4. Project Structure

```
.
├── app/                    # Expo Router routes (file-based routing)
│   ├── (tabs)/
│   ├── _layout.tsx
│   └── ...
├── src/
│   ├── components/         # Reusable, presentational components
│   ├── hooks/               # Custom hooks (useX naming)
│   ├── lib/                 # Utilities, API clients, helpers
│   ├── store/                # State management
│   ├── types/                # Shared TypeScript types
│   └── constants/
├── assets/                  # Images, fonts
├── app.json / app.config.ts
├── package.json
├── tsconfig.json
├── .env.example
└── AGENTS.md
```

If the actual structure diverges from this (it will, over time), treat the real filesystem as
ground truth and update this section — don't keep coding against a stale diagram.

---

## 5. Commands

Verify these exist in `package.json` scripts before running; if one is missing, propose adding
it rather than assuming.

```bash
npx expo start              # start dev server
npx expo start -c           # start with cleared cache
npx expo install <package>  # add a package (Expo-SDK-aware version resolution)
npm install -D <package>    # add a pure dev dependency (no native code)
npx tsc --noEmit            # type-check
npm run lint                # lint (once ESLint is configured)
npm run format               # format (once Prettier is configured)
npm test                    # run tests
npx expo-doctor             # check for Expo/dependency compatibility issues
eas build --platform ios    # production build (requires EAS setup)
eas build --platform android
```

---

## 6. Coding Standards

- Functional components + hooks only. No class components.
- TypeScript strict mode. Avoid `any`; if unavoidable, add a comment explaining why.
- File naming: components `PascalCase.tsx` (one component per file), hooks `useThing.ts`,
  utilities `camelCase.ts`.
- Prefer named exports, except Expo Router route files, which require a default export.
- Use path aliases (e.g. `@/components/...`) via `tsconfig.json` `paths` instead of long
  relative imports (`../../../`).
- Keep components small; extract non-trivial logic into hooks.
- No inline styles beyond trivial one-off tweaks — use the project's chosen styling approach
  consistently once decided (see §3).
- Handle loading, error, and empty states explicitly for anything that fetches data — don't
  assume the happy path.
- always use MaterialCommunityIcons first when using expo vector icons.

---

## 7. Environment & Secrets

- Never commit `.env`. Only commit `.env.example` with placeholder values.
- Access config via `expo-constants` (`Constants.expoConfig.extra`) or env vars prefixed
  `EXPO_PUBLIC_` (supported directly via `process.env.EXPO_PUBLIC_*` in modern Expo SDKs).
- Anything prefixed `EXPO_PUBLIC_` is bundled into the client and **publicly visible** — never
  put real secrets (API secret keys, tokens) there. Those belong server-side.
- Never hardcode API keys or secrets directly in source files.

---

## 8. Testing

- Jest + `jest-expo` preset + React Native Testing Library.
- Co-locate tests next to the file under test (`Component.test.tsx`) or in `__tests__/`.
- Prioritize tests for logic-heavy hooks, utilities, and business logic over trivial
  presentational components. Don't chase 100% coverage for its own sake.
- Run the full suite (`npm test`) before considering a task complete.

---

## 9. Git / Commits / PRs

- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`.
- Keep commits and PRs small and focused on one concern.
- Never commit: `node_modules/`, `.expo/`, build artifacts, `.env`.
- Before opening a PR: run type-check, lint, and tests, and confirm they pass.

---

## 10. Things Agents Must NOT Do

- Don't run `npx expo prebuild` (which generates native `ios`/`android` folders) without
  explicit approval — it's a meaningful workflow change, not a routine step.
- Don't add a native module incompatible with Expo Go without flagging that a custom dev
  client rebuild is now required.
- Don't upgrade or downgrade the Expo SDK version without explicit instruction — SDK bumps
  touch many interdependent packages at once.
- Don't suppress TypeScript errors with `@ts-ignore` / `@ts-expect-error` without a comment
  explaining why it's needed.
- Don't introduce a second state-management or navigation library alongside an existing one.
- Don't mix package managers (npm vs yarn vs pnpm).

---

## 11. When Uncertain

- If a task needs information not present in the repo (backend API shape, design specs,
  business logic details), ask rather than inventing it.
- If a requested package or API's existence/behavior isn't clearly confirmed, check the npm
  registry or official Expo/React Native docs before assuming, and say what was verified.
- Prefer current official docs over memorized training data for Expo/React Native APIs —
  these ecosystems change quickly between SDK versions.
