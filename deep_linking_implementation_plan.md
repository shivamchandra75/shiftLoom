# Plan: Deep links for shared shifts (Android App Links)

For the implementing model (Sonnet). Work top to bottom. Tick the checklist at the end as you go.
Read "How to verify and correct your own work" before you start, and apply it after every step.

## Context
The job details screen (`app/job/[id].tsx`) has a share button, but it only sends plain text with no link (line 85). The receiver can't open the shift.

## Goal
1. Sharing a shift sends an `https` link that is tappable in WhatsApp, SMS and similar apps.
2. Tapping the link opens that shift's details screen in the app. This works when the app is **closed**, in the background, or already open.
3. The shift opens only if it includes the receiver's role. Example: a driver shares a shift with a chef. If the shift has a chef role, it opens. If not, the chef sees **"This job doesn't include your role"** and none of the shift's details.

## Decisions already made (do not reopen)
- **Branch:** all work happens on `feat/deep-linking`. It already exists and is checked out. Never commit to `main`.
- **Link format:** `https://shiftloom.expo.app/job/<job uuid>`. A custom scheme link (`shiftloom://...`) is not used for sharing, because chat apps don't make it tappable.
- **Android only.** `app.json` has no `ios.bundleIdentifier`, and iOS was out of scope for push too. On iPhone the link opens the web page. See "Out of scope".
- **Hosting:** Expo Hosting free tier, serving a tiny static folder `link-site/`. The full web app is not deployed.
- **Logged-out or mid-onboarding receiver:** they log in or finish onboarding first, then land on the shared shift automatically.
- **Admin receiver:** goes to `/admin-job/[id]`. The role check applies to workers only.
- **Role check runs in two places:** on the screen (what the user asked for), and in the database (so a role can't be bypassed through the API). Both are required.
- **No new dependencies.** `expo-router`, `expo-linking` and `expo-constants` are already installed. `react-native`'s `Share` stays.
- **The share text no longer contains a wage.** Wages differ per role, so the sender's wage would mislead a receiver with a different role.

## Facts verified on 2026-11-04 (no need to re-check, except where marked)
| Fact | Evidence |
|---|---|
| `scheme: "shiftloom"` is set and `shiftloom://` is in the Android manifest | `app.json`, `android/app/src/main/AndroidManifest.xml` |
| Expo Router maps any incoming URL path to a route, with no linking config | Expo docs, "Customizing links" |
| `android.intentFilters` with `autoVerify: true` plus `/.well-known/assetlinks.json` is the App Links setup | Expo docs, "Android App Links" |
| Android package is `com.shivamchandr65.shiftLoom` | `app.json` |
| `unstable_settings.anchor: '(tabs)'` is set, so a deep link keeps a screen to go back to | `app/_layout.tsx:19`, Expo docs "Router settings" |
| `router.replace(href, { withAnchor: true })` exists in the installed version | `node_modules/expo-router/build/global-state/routing.d.ts:42`, `imperative-api.d.ts:45` |
| `eas deploy` has `--prod`, `--export-dir`, `--dev-domain`, `--dry-run` | `npx eas-cli@latest deploy --help` |
| `jobs` and `job_roles` can be read by any logged-in user. `users` rows can be read only by their owner (and admins) | live `pg_policies` |
| **`user_jobs` insert only checks `auth.uid() = user_id`.** Any role can accept any job, including cancelled ones | live `pg_policies` |
| Column types: `users.role`, `job_roles.role`, `user_jobs.role`, `jobs.status` are `text`. `jobs.job_date` is `date` | live `information_schema` |
| Supabase project ID is `pfydskpdaxzyupktozcr` | `plan.md` |

**Expo docs warning:** the public docs now describe a newer SDK than this project's SDK 54. For any API not listed above, check the types in `node_modules/` first.

## Problems in today's code that this plan must fix
Don't trust the old `plan.md` checklist. Read the code. These were confirmed by reading it:
1. **Wrong-role accept bug:** `app/job/[id].tsx:49` falls back to `job.jobRoles[0]`. A chef opening a driver-only job would accept it **as a driver**.
2. **Job not found on cold start:** the screen reads only from store lists (`jobList`, `savedJobList`, `userJobList`), which are empty or filtered. `fetchJobById` from the old plan was **never added**, so a link would show "Shift not found". The same is true of a push tap on an unloaded job.
3. **Stale accepted state:** Home never calls `getUserJobs`, only the My shifts tab does. So an already-accepted shift opened from a link shows "Accept offer", then fails with a duplicate error.
4. **Unavailable shifts can be accepted:** the screen never checks `job.status` or the date. A link can sit in a chat for weeks, so it can reach cancelled, closed or past shifts. The cancelled banner from the old plan also doesn't exist.
5. **Guard drops links:** `NavigationGuard` in `app/_layout.tsx` sends logged-out users to login and forgets the job. It also sends admins on `/job/x` to `/(admin)`.
6. **Back with no history:** `TopAppBarSmall` calls `router.back()` (`components/ui/TopAppBar.tsx:18`), which fails when the deep link is the only screen.
7. **`android/` is out of date by design:** it is gitignored and generated. `npx expo run:android` does **not** copy new `app.json` intent filters into it. See Part A and "Gotchas".

## Part A: Link hosting and verification (the user does what needs their accounts)

**Global `eas` is too old:** it is 16.0.1 and `eas.json` requires `>= 27.2.0`. Always run `npx eas-cli@latest`, never bare `eas`.

### A1. Create the static site (agent)
Create these files. **Do not** put them in `public/`, and do not run `expo export`.

`link-site/client/.well-known/assetlinks.json` (the `client/` folder mirrors an Expo export's `dist/client`; the dry run only lists files under it as hosted assets, verified 2026-11-04):
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.shivamchandr65.shiftLoom",
      "sha256_cert_fingerprints": ["REPLACE_WITH_EAS_SHA256", "REPLACE_WITH_DEBUG_SHA256"]
    }
  }
]
```

`link-site/client/index.html` and `link-site/client/+not-found.html`: the same small static page, with the title "ShiftLoom", the line "Open this shift in the ShiftLoom app on your Android phone. Don't have the app yet? Ask your ShiftLoom contact for it." and no scripts. People see this page only when the app isn't installed, or on iPhone or desktop. This page is a website, so `src/theme/tokens.js` rules don't apply. Keep inline CSS minimal.

### A2. Get the fingerprints
- **EAS key (user):** run `npx eas-cli@latest credentials -p android`, choose the `preview` profile, and copy `SHA256 Fingerprint`. If no keystore exists yet, the first EAS build creates one, so do step 6 first and return here. Ask the user to paste the value. It is a public fingerprint, not a secret.
- **Debug key (agent):**
```bash
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA256
```
- Put both values into `assetlinks.json`. Format: uppercase hex with colons.
- If the app later ships through Google Play, add Play's App Signing fingerprint too. The app-signing key differs from the upload key.

### A3. Deploy (user, because it needs their Expo login)
First the agent checks that the dotfolder gets packaged:
```bash
npx eas-cli@latest deploy --export-dir link-site --dry-run
```
Run `tar xzOf deploy.tar.gz assets.json` and confirm `client/.well-known/assetlinks.json` is listed (the tarball holds only manifests, the files upload separately). Delete `deploy.tar.gz` afterwards. Then the user runs:
```bash
npx eas-cli@latest deploy --prod --export-dir link-site --dev-domain shiftloom
```

**If `shiftloom` is taken, or `eas deploy` rejects the folder:** stop and tell the user. This path is not yet verified, because `eas deploy` is built for Expo exports. Don't invent a workaround. Options to offer: another subdomain (update every place in "Host used in 3 places"), or a free static host that serves `/.well-known`, such as Cloudflare Pages. Supabase Edge Functions cannot do this, because their URLs live under `/functions/v1/`, not the domain root.

**Host used in 3 places:** `app.json` intent filter, `APP_LINK_ORIGIN` in `src/lib/utils.ts`, and the deploy URL. They must match exactly.

*Done when:*
```bash
curl -sI https://shiftloom.expo.app/.well-known/assetlinks.json
```
returns `200` with `content-type: application/json`, with no redirect. `curl -s` shows the real fingerprints. `https://shiftloom.expo.app/job/test` returns the page rather than a blank error. Android rejects `assetlinks.json` if it redirects or has the wrong content type.

## Part B: Database (the agent does this through Supabase MCP tools)
Before the write, tell the user in one line what will change. The change applies to the live project.

### B1. Role check on accept
Use `apply_migration`, name `user_jobs_role_check`, on project `pfydskpdaxzyupktozcr`. Also save the same SQL as `supabase/migrations/20261104000000_user_jobs_role_check.sql`.

```sql
-- A worker can only accept an open, upcoming job that has their own role.
drop policy if exists "Users can apply for jobs" on public.user_jobs;
create policy "Users can apply for jobs" on public.user_jobs
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and role = (select u.role from public.users u where u.id = auth.uid())
    and exists (
      select 1
      from public.job_roles r
      join public.jobs j on j.id = r.job_id
      where r.job_id = user_jobs.job_id
        and r.role = user_jobs.role
        and j.status = 'open'
        and j.job_date >= (now() at time zone 'Asia/Kolkata')::date
    )
  );
```

*Done when:* `select policyname, with_check from pg_policies where tablename = 'user_jobs' and cmd = 'INSERT';` shows the new check. Then run the two tests in "Verification → Database".

Do not write test rows into live data without telling the user, and delete any you create.

## Files to change
| File | Change |
|---|---|
| `link-site/**` | **New.** Part A. |
| `supabase/migrations/20261104000000_user_jobs_role_check.sql` | **New.** Part B. |
| `app.json` | Add `android.intentFilters`. Step 1. |
| `src/lib/utils.ts` | Add `APP_LINK_ORIGIN`, `jobShareUrl`, `isPastDate`. Step 2. |
| `src/services/jobService.ts` | Add `fetchJobById`. Map the RLS error in `applyForJob`. Step 3. |
| `app/job/[id].tsx` | Share link, data loading, role gate, unavailable states, safe back. Steps 4 and 5. |
| `app/admin-job/[id].tsx` | Share link, job fallback, safe back. Step 6. |
| `app/_layout.tsx` | Keep the job through login and onboarding, and route admins. Step 7. |
| `CLAUDE.md` | Short note. Step 9. |

Don't touch anything else. No `+native-intent.tsx` is needed, since the URL path already equals the route path.

## Ordered steps
Commit after each step on `feat/deep-linking` using Conventional Commits, for example `feat: add job share link`. Run `npx tsc --noEmit` before each commit.

### 1. Intent filter (`app.json`)
Inside `expo.android`, add:
```json
"intentFilters": [
  {
    "action": "VIEW",
    "autoVerify": true,
    "data": [{ "scheme": "https", "host": "shiftloom.expo.app", "pathPrefix": "/job/" }],
    "category": ["BROWSABLE", "DEFAULT"]
  }
]
```
Only `/job/` is claimed, so `/.well-known` and other paths stay on the web.

*Done when:* `npx expo config --type public | grep -A8 intentFilters` shows it.

### 2. Helpers (`src/lib/utils.ts`)
```ts
// Must match the host in app.json intentFilters and the deployed link-site.
export const APP_LINK_ORIGIN = "https://shiftloom.expo.app";
export const jobShareUrl = (jobId: string) => `${APP_LINK_ORIGIN}/job/${jobId}`;

// True when the job's date is before today (device time).
export function isPastDate(jobDateStr: string): boolean {
  if (!jobDateStr) return false;
  const [year, month, day] = jobDateStr.split('-').map(Number);
  const now = new Date();
  return new Date(year, month - 1, day) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
```
Don't use an env var. This isn't a secret, and `.env.local` isn't available in EAS builds.

### 3. Service (`src/services/jobService.ts`)
Add next to `fetchJobs`:
```ts
export async function fetchJobById(id: string): Promise<Job | null> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*, job_roles(*), user_jobs(status)")
    .eq("id", id)
    .maybeSingle();

  if (error?.code === "22P02") return null; // a malformed id in a link isn't a server failure
  if (error) throw error;
  return data ? formatDbJob(data) : null;
}
```
`user_jobs(status)` gives the admin screen its `filledSlots`. Workers only see their own rows, and the worker screen doesn't use that field.

In `applyForJob`, add after the `23505` check:
```ts
if (error.code === "42501") {
  throw new Error("This shift is no longer available for your role.");
}
```
*Self-check:* the "wrong role" DB test must give code `42501`. If it doesn't, use the code you actually observed.

### 4. Share link (`app/job/[id].tsx`)
Replace line 85:
```ts
const share = () =>
  Share.share({ message: `Shift at ${job.companyName} on ${formatLongDate(job.date)}. Open it in ShiftLoom:\n${jobShareUrl(job.id)}` }).catch(() => {});
```
Keep the URL in `message`. Android ignores the `url` field. `formatInr` stays imported, since line 180 uses it.

### 5. Job screen loading, role gate and states (`app/job/[id].tsx`)
Add at the top of the component. All hooks must come before any early `return`:
```ts
const { ..., getUserJobs, getSavedJobs } = useJobStore();
const [fetchedJob, setFetchedJob] = useState<Job | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [loadError, setLoadError] = useState("");

const load = useCallback(() => {
  setIsLoading(true);
  setLoadError("");
  fetchJobById(id)
    .then(setFetchedJob)
    .catch((e) => setLoadError(e?.message === "Network request failed" ? "No internet connection. Try again." : e?.message || "Couldn't load this shift."))
    .finally(() => setIsLoading(false));
}, [id]);

useEffect(load, [load]);

// A cold-start link skips Home and My shifts, so booked and saved state must load here.
useEffect(() => {
  if (!user?.id) return;
  getUserJobs(user.id);
  getSavedJobs(user.id);
}, [user?.id, getUserJobs, getSavedJobs]);

const leave = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));
```
Change line 34 so fresh data wins, and an old result never shows for a new id:
```ts
const storeJob = jobList.find((j) => j.id === id) ?? savedJobList.find((j) => j.id === id) ?? application?.job;
const job = (fetchedJob?.id === id ? fetchedJob : null) ?? storeJob;
```

Replace the `if (!job)` block with these, **in this order**:
```tsx
if (!job && isLoading) {
  return (
    <Screen>
      <TopAppBarSmall onLeadingPress={leave} />
      <ActivityIndicator className="py-12" color={colors.primary} />
    </Screen>
  );
}
if (!job && loadError) {
  return (
    <Screen>
      <TopAppBarSmall onLeadingPress={leave} />
      <EmptyState icon="cloud_off" title="Couldn't load this shift" body={loadError} actionLabel="Try again" onAction={load} />
    </Screen>
  );
}
if (!job) {
  return (
    <Screen>
      <TopAppBarSmall onLeadingPress={leave} />
      <EmptyState icon="event_busy" title="Shift not found" body="It may have been removed or cancelled." actionLabel="Go back" onAction={leave} />
    </Screen>
  );
}

// Shared links can reach any shift. Show nothing about it unless it has this worker's role.
if (user?.role && !job.jobRoles.some((r) => r.role === user.role)) {
  return (
    <Screen>
      <TopAppBarSmall onLeadingPress={leave} />
      <EmptyState
        icon="block"
        title="This job doesn't include your role"
        body={`This shift has no ${user.role} slots. Your Home tab shows the shifts open to you.`}
        actionLabel="Go to Home"
        onAction={() => router.replace("/(tabs)")}
      />
    </Screen>
  );
}
```
- Check `block` renders in the Material Symbols font (`components/ui/Icon.tsx`). Pick an existing name if it doesn't.
- Change line 49 to `const roleDetail = job.jobRoles.find((r) => r.role === user?.role);`. The gate guarantees a match, and removing the fallback ends bug 1. The code after it already handles `roleDetail` being undefined.
- Pass `onLeadingPress={leave}` to the main `TopAppBarSmall` too.

Replace the start of the bottom bar chain (lines 91 onward), keeping the existing branches:
```ts
const isUnavailable = job.status !== "open" || isPastDate(job.date);

if (job.status === "cancelled") {
  hint = job.cancelReason ? `Cancelled: ${job.cancelReason}` : "This shift was cancelled";
  hintColor = "error";
  action = <Button label="Shift cancelled" disabled />;
} else if (isCancelled) {
  // unchanged
} else if (isAccepted && canCancel) {
  // unchanged
} else if (isAccepted) {
  // unchanged
} else if (isUnavailable) {
  hint = "This shift is no longer available";
  action = <Button label="Unavailable" disabled />;
} else if (!user?.isVerified) {
  // unchanged
} else {
  // unchanged
}
```
The cancelled branch must be first, so a booked worker can't "Cancel shift" on a job that's already cancelled.

Imports to add: `useCallback`, `useEffect`, `ActivityIndicator`, `colors` from `@/src/theme/tokens`, `fetchJobById` and `Job` from `@/src/services/jobService`, and `isPastDate`, `jobShareUrl` from `@/src/lib/utils`.

### 6. Admin screen (`app/admin-job/[id].tsx`)
- Share text: use the same message shape as step 4, so admins share working links too.
- Job fallback: when `adminJobList` and `savedJobList` have no match, fetch it. Add `fetchedJob` state and a `fetchJobById(id)` call. Add loading and error handling the same way as step 5, using the existing `isLoading` / `error` pattern where you can. The screen's early `Shift not found` return must wait for the fetch to finish.
- Back: `onLeadingPress={() => (router.canGoBack() ? router.back() : router.replace("/(admin)"))}` on each `TopAppBarSmall`. Add `useRouter` if it's missing.

This also fixes push taps on admin jobs that aren't loaded.

### 7. Keep the link through login, onboarding and admin routing (`app/_layout.tsx`)
Change only `NavigationGuard`. Import `usePathname` from `expo-router`, and `useRef` from `react`.
```ts
const pathname = usePathname();
// Survives the trip through login/onboarding. NavigationGuard stays mounted for that whole time.
// shortcut: in memory only, so a link is lost if the app is killed mid-signup. Move to AsyncStorage if that happens.
const pendingJobId = useRef<string | null>(null);

useEffect(() => {
  const inAuthGroup = segments[0] === '(auth)';
  const inOnboarding = segments[1] === 'onboarding';
  const inAppGroup = /* unchanged */;
  const inAdminGroup = /* unchanged */;
  const linkedJobId = pathname.match(/^\/job\/([^/]+)$/)?.[1] ?? null;
  const takePending = () => {
    const id = pendingJobId.current;
    pendingJobId.current = null;
    return id;
  };

  if (!user && !inAuthGroup) {
    pendingJobId.current = linkedJobId ?? pendingJobId.current;
    router.replace('/(auth)/login');
  } else if (user?.role === 'admin') {
    if (!inAdminGroup) {
      const id = linkedJobId ?? takePending();
      router.replace(id ? { pathname: '/admin-job/[id]', params: { id } } : '/(admin)');
    }
  } else if (user && (!user.role || !user.firstName) && !inOnboarding) {
    pendingJobId.current = linkedJobId ?? pendingJobId.current;
    router.replace('/(user)/onboarding');
  } else if (user && user.role && user.firstName && !inAppGroup) {
    const id = takePending();
    if (id) router.replace({ pathname: '/job/[id]', params: { id } }, { withAnchor: true });
    else router.replace('/(tabs)');
  }
}, [user, segments, pathname]);
```
A logged-in worker on `/job/x` hits no branch, so nothing redirects them. That is the normal, intended path. `usePushNotifications(user?.id)` stays where it is.

*Self-check:* trace these by hand against the code before moving on. Logged-out link → login → job. New user link → signup → onboarding → job. Admin link → admin job. Worker with no link logs in → Home.

### 8. Build and test on a real device
**Expo Go can't test this.** Use an EAS build, which regenerates native code from `app.json` in the cloud:
```bash
npx eas-cli@latest build -p android --profile preview
```
The user runs this, or approves it, then installs the APK. If you need a local build instead, the local `android/` folder must be regenerated with `npx expo prebuild -p android --clean`, and AGENTS.md requires **asking the user first**.

Then finish A2 and A3 if the EAS fingerprint wasn't available before. After the site is live, reinstall the app, since Android verifies the domain at install time. Then run the "Verification" section.

### 9. Docs and graph
Add to `CLAUDE.md` under Architecture:
> **Deep links:** shared links are `https://shiftloom.expo.app/job/<id>`. Android App Links are verified by `link-site/.well-known/assetlinks.json` (deployed with `eas deploy --export-dir link-site`). `NavigationGuard` keeps the job through login/onboarding. Role is checked on `app/job/[id].tsx` and by the `user_jobs` insert RLS policy.

Then run `graphify update .`.

## How to verify and correct your own work

### Rules
1. **Evidence, not belief.** Tick a checklist item only after you have seen the result: command output, a query result, or the user's confirmation of device behaviour. Reading your own diff is not evidence.
2. **Say what you can't check.** You cannot tap a link on a phone. For device tests, give the user the exact steps and ask for the result. Never report one as passed on your own. An unticked item with a reason beats a false tick.
3. **Fix the root cause.** If a check fails, find out why before changing code. Never add a `setTimeout`, a retry, `@ts-ignore` or a second navigation call to make a symptom go away.
4. **Two strikes, then stop.** If the same check fails after two different fixes, stop and report what you tried, what you saw, and your best guess.
5. **Stop and ask when:** the host changes from the plan, you need a new dependency, you need `expo prebuild`, a live data write is outside Part B, or the code doesn't match this plan's line numbers *and* you can't tell what the plan meant. Line numbers drifting a little is normal. Match on the code shown.
6. **Fill small gaps yourself.** If the plan misses a detail that follows the repo's conventions (an import, a prop name), fill it in and mention it in your report. Check `AGENTS.md` for the rules. Don't fill gaps in product behaviour: ask.

### After every step
```bash
npx tsc --noEmit
```
```bash
npm run lint
```
Then run `git status` and confirm that only files from "Files to change" were touched, and that you're on `feat/deep-linking`. `android/` and `graphify-out/` are gitignored and must not appear. Compare against the baseline errors on `main` if a failure looks unrelated, and say so instead of fixing unrelated code.

### Gap-finding pass (after step 7, before testing)
Search for each of these and resolve anything you find:
- [ ] `grep -n "jobRoles\[0\]" app/job/\[id\].tsx` returns nothing.
- [ ] The host `shiftloom.expo.app` appears in `app.json` and `src/lib/utils.ts`, identically. `grep -rn "shiftloom.expo.app" app.json src`
- [ ] Every `TopAppBarSmall` in both job screens has a safe back.
- [ ] All hooks in `app/job/[id].tsx` sit above the first `return`.
- [ ] No hardcoded hex, no RN `Text`, and no new `@expo/vector-icons` in the new code (`AGENTS.md` §2).
- [ ] Loading, error, empty and role-mismatch states all exist on the job screen.
- [ ] No wage in either share message.
- [ ] Re-read the Goal section. Does each of its 3 points map to code you can point at?

### Troubleshooting
| Symptom | Likely cause | Check or fix |
|---|---|---|
| Link opens the browser, not the app | Domain not verified | `adb shell pm get-app-links com.shivamchandr65.shiftLoom` should show `verified`. If not, check `curl -sI` on `assetlinks.json` for redirects and content type, and that the fingerprint matches the **installed** build. Then force re-verify (below). Android can take 20+ seconds. |
| Worked on the dev build, fails on the preview build | Different signing key | Both fingerprints must be in `assetlinks.json`. |
| `pm get-app-links` shows no `shiftloom.expo.app` entry | Intent filter isn't in the installed build | The local `android/` wasn't regenerated. Use an EAS build. Inspect `AndroidManifest.xml` if local. |
| Cold start lands on Home | Guard ran with stale path, or the intent was dropped | Log `pathname` in the guard (remove it afterwards). Confirm the initial path is `/job/<id>`. |
| Cold start shows "Shift not found" | `fetchJobById` isn't being reached, or the error is swallowed | Read `adb logcat`. Query the id in SQL. |
| Infinite redirect or screen flicker | Guard branch keeps firing | Each branch must be a no-op once the user is at the target. Check `inAdminGroup` / `inAppGroup`. |
| Back button exits or errors after a cold link | No history | Check the `anchor`, `withAnchor`, and `leave()`. |
| Worker can't accept any job after the migration | Policy too strict | Check `select role from users` and `job_roles.role` for casing, and the job's `status` and `job_date`. To undo, restore the previous `with check (auth.uid() = user_id)` policy, after telling the user. |
| Accepted shift still shows "Accept offer" | `getUserJobs` didn't run | Check the step 5 effect and `user?.id`. |

Force Android to re-verify:
```bash
adb shell pm verify-app-links --re-verify com.shivamchandr65.shiftLoom
```

## Verification

### Automated (agent)
- `npx tsc --noEmit` and `npm run lint` show no new errors. No test runner exists, so don't add one.
- `npx expo config --type public` shows the intent filter.
- `curl` checks from A3 pass.

### Database (agent, with test rows removed afterwards)
Use the role-switching pattern in one transaction, so nothing is kept:
```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"<worker uuid>","role":"authenticated"}', true);
insert into public.user_jobs (job_id, user_id, role, status) values ('<job uuid>', '<worker uuid>', '<role>', 'accepted');
rollback;
```
- A worker inserting for a job **without** their role fails with `42501`.
- A worker inserting their own role on an open, upcoming job succeeds (it rolls back).
- A worker inserting on a cancelled job fails.

### Device (the user runs these on Android; ask for results)
Pick two test jobs in Supabase: **Job C** includes the chef role, **Job D** doesn't. Send the links through WhatsApp, or any chat app. For faster repeats:
```bash
adb shell am start -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d "https://shiftloom.expo.app/job/<job uuid>" com.shivamchandr65.shiftLoom
```

| # | App state | Who taps | Link | Expected |
|---|---|---|---|---|
| 1 | **Closed** (swiped away) | Chef, logged in | Job C | Shift details open directly |
| 2 | Background | Chef, logged in | Job C | Shift details open |
| 3 | Open, on another tab | Chef, logged in | Job C | Shift details open |
| 4 | **Closed** | Chef, logged in | Job D | "This job doesn't include your role". No company, wage or address shown |
| 5 | Open | Chef, logged in | Job D | Same as 4. "Go to Home" works |
| 6 | Closed | Logged out | Job C | Login, then Job C opens by itself |
| 7 | Closed | Logged out, wrong-role account | Job D | Login, then the role message |
| 8 | Closed | New signup | Job C | Signup, onboarding, then Job C if chef was chosen |
| 9 | Closed | Admin | Job C | Admin job screen, back goes to admin Home |
| 10 | Closed | Chef | Bad id, e.g. `/job/abc` | "Shift not found", no crash |
| 11 | Closed, airplane mode | Chef | Job C | Error state, "Try again" works once online |
| 12 | Any | Chef | Cancelled job with chef role | Opens, "Cancelled: reason", disabled button |
| 13 | Any | Chef | Past job with chef role | Opens, "no longer available" |
| 14 | Any | Chef who already accepted Job C | Job C | Shows "booked", not "Accept offer" |
| 15 | After #1 | Chef | Back button | Goes to Home, doesn't exit or error |
| 16 | Share | Driver, on any job | Tap share | Message has the link and no wage. Link is tappable in the chat app |
| 17 | App not installed | Anyone | Job C | Static page in the browser |
| 18 | Regression | Worker | Push notification tap, app closed | Opens the job |
| 19 | Regression | Worker, no link | Normal login | Goes to Home |

## Constraints and gotchas
- **Never change** `app/_layout.tsx` beyond `NavigationGuard` and its imports.
- **NativeWind:** never toggle `shadow-*` classes conditionally. It crashes (seen in `app/(admin)/verification.tsx`).
- **Icons and text:** use `Icon` and `Text` from `components/ui`, and tokens from `src/theme/tokens.js`.
- **Don't run `expo prebuild`** without the user's approval (`AGENTS.md` §5). `android/` is generated and gitignored, so don't hand-edit it to fix a missing filter.
- **Don't commit** `.env.local`, `google-services.json` changes, or the Firebase key file.
- **Commits stay on this branch.** Don't push or open a PR until the user asks.
- **Shared store flags:** `getUserJobs` sets the store-wide `isLoading` and `error`, so Home may flash its loader beneath the job screen. That is acceptable. Don't refactor the store.
- **Slot limits aren't enforced** by this plan, either on screen or in the database. A full-but-`open` job can still be accepted. That already happens today.

## Out of scope
- iOS Universal Links. These need a paid Apple Developer account, `ios.bundleIdentifier`, `ios.associatedDomains`, and an `apple-app-site-association` file in `link-site/.well-known/`.
- A smart "install the app" redirect or store link on the web page. The app has no store listing yet.
- Link tracking, expiring links, and previews (Open Graph tags).
- Remembering a link across an app kill during signup (`shortcut:` comment in step 7).

## Progress checklist
Tick only with evidence (see Rule 1). Record anything skipped, with the reason.

### Setup
- [ ] On branch `feat/deep-linking`, `main` untouched

### Part A: Hosting
- [ ] A1 `link-site/` created (`assetlinks.json`, `index.html`, `+not-found.html`)
- [ ] A2 EAS and debug fingerprints added to `assetlinks.json`
- [ ] A3 Dry-run tarball contains `.well-known/assetlinks.json`
- [ ] A3 Site deployed to production (user)
- [ ] A3 `curl` shows 200, `application/json`, no redirect, real fingerprints

### Part B: Database
- [ ] B1 Migration applied to live project
- [ ] B1 Migration file saved in repo
- [ ] Database tests pass (wrong role blocked, right role allowed, cancelled blocked)

### Code
- [ ] 1 `app.json` intent filter
- [ ] 2 `APP_LINK_ORIGIN`, `jobShareUrl`, `isPastDate`
- [ ] 3 `fetchJobById`, `42501` mapped in `applyForJob`
- [ ] 4 Worker share message has link, no wage
- [ ] 5 Job screen: fetch, booked/saved load, loading/error/not-found states
- [ ] 5 Job screen: role gate, `jobRoles[0]` fallback removed
- [ ] 5 Job screen: cancelled/unavailable states, safe back
- [ ] 6 Admin screen: share link, job fallback, safe back
- [ ] 7 Guard keeps job through login/onboarding, routes admins
- [ ] Hand traces in step 7 done
- [ ] Gap-finding pass complete
- [ ] `tsc` and `lint` show no new errors

### Build and device (user confirms)
- [ ] 8 EAS preview build installed
- [ ] `pm get-app-links` shows `shiftloom.expo.app` as `verified`
- [ ] Device tests 1 to 5 (app states and role check)
- [ ] Device tests 6 to 9 (login, signup, admin)
- [ ] Device tests 10 to 15 (edge cases and back)
- [ ] Device tests 16 and 17 (share and no app)
- [ ] Device tests 18 and 19 (regressions)

### Wrap-up
- [ ] 9 `CLAUDE.md` updated, `graphify update .` run
- [ ] Final report lists what was verified, what wasn't, and any deviation from this plan
