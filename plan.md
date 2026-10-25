# Plan: Push notifications (Expo Push + Supabase Edge Function)

> After approval, this plan is copied verbatim to `plan.md` in the project root for the implementing model.

## Context
ShiftLoom has no notifications yet: `app/notifications.tsx` is a placeholder, and the worker Home bell (`app/(tabs)/index.tsx` ~line 42) has no unread indicator. Admins have no bell at all. Two events must reach people's phones and an in-app list:
1. **Job cancelled:** when an admin cancels a job (`cancelJobByAdmin` in `src/services/jobService.ts` sets `jobs.status='cancelled'` and `cancel_reason`), every worker with an accepted slot gets "Taj Banquets on 26 Oct was cancelled: Weather".
2. **Unfilled slots soon:** for any open job starting within 3 days that still has empty slots, the admin who created it gets one alert, e.g. "Drivers 2/3, Chefs 0/1 filled".

## Goal
Both events produce a push notification on every device where the user is logged in, plus an in-app notification. A red dot on the bell (top right of the worker Home and admin Home headers) shows unread items. Tapping a notification (push or list item) marks it read and opens that job's detail screen, which shows its cancelled state and reason.

## Decisions already made (do not reopen)
- **Delivery:** Expo Push Service, called from a Supabase Edge Function `send-push`. No direct FCM/APNs calls.
- **Single delivery path:** the database only writes rows to a `notifications` table. A Supabase **Database Webhook** on `notifications` INSERT calls `send-push`. Both events reuse this path. The in-app list reads the same rows.
- **Cancel recipients:** only workers with `user_jobs.status = 'accepted'` on that job. Not workers who saved the job, and not workers who cancelled their own slot.
- **Unfilled alert:** sent **once per job** (a unique index de-duplicates). Checked daily at **9:00 AM IST** (`30 3 * * *` UTC) by `pg_cron`. Applies only to jobs with `status = 'open'` (`closed` already means full) and `job_date` from today to today + 3 days (IST).
- **Unread state:** each notification has its own read state (`read_at`). Tapping one marks it read. The list has "Mark all as read". The dot shows while `unreadCount > 0`.
- **Permission prompt:** after login, the first Home visit shows an explainer card with **Enable** / **Not now**. Enable triggers the OS prompt. "Not now" is remembered in AsyncStorage (already installed). Never ask cold at launch.
- **Retention:** the same daily cron deletes notifications older than 30 days.
- **Multiple devices:** a `push_tokens` table, one row per device token. The token is removed on logout and when Expo reports `DeviceNotRegistered`.
- **No realtime subscription:** the unread count refreshes when the app returns to the foreground, when a push arrives while the app is open, and when the notifications screen opens.
- **Supabase access:** the agent **can** reach project `pfydskpdaxzyupktozcr` ("shiftLoom", ap-south-1) through the Supabase MCP tools (`mcp__plugin_supabase_supabase__*`). The agent does every Supabase step itself (Part B). The user does only the Firebase/EAS credentials (Part A) and pastes one Expo access token.

## Part A: Push credentials (the user does this; the agent can't access Firebase or EAS)

### A1. Push credentials (one time)
1. `npm i -g eas-cli`, then `eas login` and `eas init`. This writes `expo.extra.eas.projectId` into `app.json`; commit it.
2. In the Firebase console (free, no billing), create a project and add an Android app with package `com.shivamchandr65.shiftLoom`. Download `google-services.json` to the project root.
3. In Firebase, go to Project settings → Service accounts → **Generate new private key** (a JSON file). Then run `eas credentials` → Android → Google Service Account → **FCM V1** and upload that JSON. Keep it out of git.
4. Optional but recommended: on expo.dev, go to Account → Access tokens and create a token with **Enhanced push security** turned on. Paste it to the agent, which stores it as the `EXPO_ACCESS_TOKEN` Edge Function secret in B4.

The agent must **ask the user to confirm A1 is done** before step 1 (config) and before the end-to-end Verification. Part B can run before A1 is finished.

## Part B: Supabase backend (the agent does this through the Supabase MCP tools)
Project ID for every call: `pfydskpdaxzyupktozcr`. Before each write, tell the user in one line what is about to change. Writes to the live project can't be undone with a click.

### B0. Pre-flight checks (read-only)
1. Run `list_tables` (schemas `["public"]`, `verbose: true`) and `list_migrations`.
2. Confirm the earlier migrations are live:
   - **`20261021000000_admin_role.sql`:** `users.role` allows `'admin'`, and the functions `public.is_admin` and `public.create_job` exist.
   - **`20261023000000_user_documents.sql`:** the `public.user_documents` table exists.
   - **`20261024000000_admin_verification.sql`:** `public.review_documents` exists.

   Check functions with `execute_sql`: `select proname from pg_proc where pronamespace = 'public'::regnamespace;`.
3. If any are missing, stop and ask the user whether to apply them first with `apply_migration`, using the file content verbatim. Notifications depend on `is_admin` and `jobs.created_by`.
4. Run `list_extensions`. Note whether `pg_cron`, `pg_net` and `supabase_vault` are enabled.

*Done when:* the user has been shown a short status list (applied or missing) and has confirmed any fixes.

### B1. Extensions
Use `apply_migration`, name `enable_cron_and_net`:
`create extension if not exists pg_cron; create extension if not exists pg_net;`

*Done when:* `list_extensions` shows both as installed.

### B2. Notifications schema
Use `apply_migration`, name `notifications`, with the SQL below. Also save it as `supabase/migrations/20261025000000_notifications.sql` in the repo.

*Done when:* `list_tables` shows `notifications` and `push_tokens` with RLS on, and `select jobname, schedule from cron.job;` returns `unfilled-slot-alerts | 30 3 * * *`.
```sql
-- Device push tokens (one row per device)
create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
drop policy if exists "Users manage own push tokens" on public.push_tokens;
create policy "Users manage own push tokens" on public.push_tokens
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- In-app notifications; every insert is also pushed by the send-push webhook
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('job_cancelled', 'unfilled_slots')),
  title text not null,
  body text not null,
  job_id uuid references public.jobs(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
-- "once per job" for the admin alert
create unique index if not exists notifications_unfilled_once_idx
  on public.notifications (job_id, user_id) where type = 'unfilled_slots';

alter table public.notifications enable row level security;
drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users mark own notifications read" on public.notifications;
create policy "Users mark own notifications read" on public.notifications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Clients may only change read_at; rows are created by the triggers/cron below
revoke insert, update, delete on public.notifications from authenticated, anon;
grant update (read_at) on public.notifications to authenticated;

-- Event 1: job cancelled -> notify accepted workers
create or replace function public.notify_job_cancelled()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    insert into public.notifications (user_id, type, title, body, job_id)
    select uj.user_id, 'job_cancelled',
           'Shift cancelled',
           new.company_name || ' on ' || to_char(new.job_date::date, 'DD Mon') || ' was cancelled'
             || coalesce(': ' || nullif(trim(new.cancel_reason), ''), '.'),
           new.id
    from public.user_jobs uj
    where uj.job_id = new.id and uj.status = 'accepted';
  end if;
  return new;
end; $$;
drop trigger if exists jobs_notify_cancelled on public.jobs;
create trigger jobs_notify_cancelled after update of status on public.jobs
  for each row execute function public.notify_job_cancelled();

-- Event 2: open jobs within 3 days (IST) with empty slots -> notify creator once
create or replace function public.enqueue_unfilled_slot_alerts()
returns void language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  insert into public.notifications (user_id, type, title, body, job_id)
  select j.created_by, 'unfilled_slots',
         'Slots still open: ' || j.company_name,
         to_char(j.job_date::date, 'DD Mon') || ' · ' || string_agg(
           initcap(r.role) || 's ' || coalesce(f.filled, 0) || '/' || r.total_slots, ', ' order by r.role),
         j.id
  from public.jobs j
  join public.job_roles r on r.job_id = j.id
  left join (select job_id, role, count(*) filled from public.user_jobs
             where status = 'accepted' group by job_id, role) f
    on f.job_id = j.id and f.role = r.role
  where j.status = 'open' and j.created_by is not null
    and j.job_date::date between today and today + 3
  group by j.id, j.created_by, j.company_name, j.job_date
  having bool_or(coalesce(f.filled, 0) < r.total_slots)
  on conflict do nothing;

  delete from public.notifications where created_at < now() - interval '30 days';
end; $$;
revoke all on function public.enqueue_unfilled_slot_alerts() from public, anon, authenticated;

-- Daily at 09:00 IST (03:30 UTC). Enable the pg_cron extension first: Database -> Extensions.
select cron.unschedule('unfilled-slot-alerts') where exists (select 1 from cron.job where jobname = 'unfilled-slot-alerts');
select cron.schedule('unfilled-slot-alerts', '30 3 * * *', 'select public.enqueue_unfilled_slot_alerts()');

notify pgrst, 'reload schema';
```

### A3. Edge Function `send-push` (the agent writes the code; the user deploys it)
- Create `supabase/functions/send-push/index.ts` in the repo (code spec in step 3).
- Set secrets: `supabase secrets set PUSH_WEBHOOK_SECRET=<random 32+ chars> EXPO_ACCESS_TOKEN=<from A1.4>`. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.
- Deploy: `supabase functions deploy send-push --no-verify-jwt --project-ref pfydskpdaxzyupktozcr`. The webhook authenticates with the shared secret instead of a user JWT.

### A4. Database Webhook
In the dashboard, go to Database → Webhooks → Create:
- Name `notifications-push`, table `public.notifications`, events **Insert** only.
- Type **Supabase Edge Functions** → `send-push`, method POST.
- Add header `x-webhook-secret: <same PUSH_WEBHOOK_SECRET>`.

## Decisions for the client
- Libraries already installed: `expo-notifications`, `expo-device`, `expo-constants`, `@react-native-async-storage/async-storage`. **No new dependencies.**
- Expo Go cannot receive remote push on Android (SDK 53+), so this only works in the dev build. Adding the `expo-notifications` plugin and `google-services.json` means a **rebuild** (`npx expo run:android`).

## Files to change
| File | Change |
|---|---|
| `app.json` | Add the `"expo-notifications"` plugin, `android.googleServicesFile: "./google-services.json"`, and `extra.eas.projectId` (from `eas init`). |
| `.gitignore` | Add `google-services.json`. |
| `supabase/migrations/20261025000000_notifications.sql` | **New**, the SQL from A2 verbatim. |
| `supabase/functions/send-push/index.ts` | **New** Edge Function (step 3). |
| `src/lib/pushNotifications.ts` | **New**: `setNotificationHandler`, `registerForPush(userId)`, `unregisterPush()`, `getPermissionStatus()`. |
| `src/services/notificationService.ts` | **New**: `fetchNotifications`, `fetchUnreadCount`, `markRead(id)`, `markAllRead()`. Uses the same snake_case → camelCase mapping style as `jobService.ts`. |
| `src/store/useNotificationStore.ts` | **New** Zustand store: `items`, `unreadCount`, `isLoading`, `error`, `refresh()`, `refreshCount()`, `markRead()`, `markAllRead()`. Same pattern as `useJobStore.ts`. |
| `components/NotificationBell.tsx` | **New**: bell button with a red dot when `unreadCount > 0`. `accessibilityLabel` "Notifications, N unread". Pushes `/notifications`. |
| `components/PushPermissionCard.tsx` | **New**: explainer card ("Get alerts when a shift changes" or, for admins, "...when a job needs workers") with Enable / Not now. Hidden once permission is granted or denied, or after "Not now" (AsyncStorage key `push-prompt-dismissed`). |
| `app/(tabs)/index.tsx` | Replace the bell `Pressable` (~line 42) with `<NotificationBell />`; render `<PushPermissionCard />` under the header. |
| `app/(admin)/index.tsx` | Put the title row ("My Jobs", line ~69) in a `flex-row justify-between` with `<NotificationBell />` on the right; add `<PushPermissionCard />`. |
| `app/notifications.tsx` | Replace the placeholder with the list (step 6). |
| `app/_layout.tsx` | Call `setNotificationHandler` at module level. On login with permission granted: call `registerForPush`. Add a listener for tapped notifications (step 5), refresh the count on AppState `active`, and add `'notifications'` to `inAdminGroup` (admins currently get bounced). |
| `src/store/useAuthStore.ts` | In `logout` (line ~201), call `unregisterPush()` **before** `signOut()`, because RLS needs the session to delete the token row. |
| `src/services/jobService.ts` | Add `fetchJobById(id)`: `jobs.select('*, job_roles(*)').eq('id', id).single()` mapped with `formatDbJob`. |
| `app/job/[id].tsx` | Line 40 uses `jobList.find(...)`. Fall back to `fetchJobById(id)` when the job isn't in the store, since a notification can open a job that isn't loaded. Show a red banner "This shift was cancelled: {cancelReason}" when `job.status === 'cancelled'`, and hide the accept/cancel bottom bar. |
| `app/admin-job/[id].tsx` | Same fallback: it uses `adminJobList`/`savedJobList`; use `fetchJobById` when the job is missing. It already shows `Cancelled: {reason}`. |

## Ordered steps
1. **Config:** edit `app.json` and `.gitignore` (the user supplies `google-services.json` and runs `eas init`).
   *Done when:* `npx expo config --type public` shows `extra.eas.projectId` and the `expo-notifications` plugin.
2. **Migration file:** create `supabase/migrations/20261025000000_notifications.sql` with the A2 SQL verbatim.
   *Done when:* the file exists and the user confirms it ran without errors.
3. **Edge Function** `supabase/functions/send-push/index.ts` (Deno):
   - Reject with 401 unless the `x-webhook-secret` header equals `Deno.env.get("PUSH_WEBHOOK_SECRET")`.
   - Read the body `{ type: "INSERT", record }`, then load `push_tokens` where `user_id = record.user_id` using a `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` client (`npm:@supabase/supabase-js@2`).
   - If there are no tokens, return 200 `{ sent: 0 }`.
   - POST to `https://exp.host/--/api/v2/push/send` with header `Authorization: Bearer ${EXPO_ACCESS_TOKEN}` (only if set). Send an array of up to 100 messages: `{ to, title: record.title, body: record.body, sound: "default", channelId: "default", data: { notificationId: record.id, jobId: record.job_id, type: record.type } }`.
   - For each ticket with `details.error === "DeviceNotRegistered"`, delete that token.
   - Return 200 with counts. Log Expo errors but still return 200, so the webhook doesn't retry-storm.
   *Done when:* the user's dashboard "Test" of the function with a sample record returns 200, and the function logs show the Expo response.
4. **Registration** (`src/lib/pushNotifications.ts`):
   - `registerForPush(userId)`:
     1. Return early if `!Device.isDevice`.
     2. On Android, create channel `default` with `importance: MAX`.
     3. Request permission; return if it isn't granted.
     4. Get the token with `getExpoPushTokenAsync({ projectId: Constants.expoConfig?.extra?.eas?.projectId })`.
     5. Upsert `{ token, user_id, platform: Platform.OS, updated_at }` into `push_tokens` (`onConflict: "token"`).
     6. Keep the token in a module-level variable.
   - `unregisterPush()`: delete that token row.
   - Call `registerForPush` from the permission card's Enable button, and from `_layout.tsx` when the user is logged in and permission is already granted (tokens can rotate).
   *Done when:* after Enable on a device, a row appears in `push_tokens`, and logging out removes it.
5. **Handling taps** (`app/_layout.tsx`):
   - Use `Notifications.useLastNotificationResponse()`. This also covers a cold start from a tap.
   - When a new response arrives, read `data.notificationId` and `data.jobId`, call `markRead(notificationId)`, and route admins to `/admin-job/[id]` and workers to `/job/[id]`.
   - Guard against handling the same response twice (keep a ref of the last handled id).
   - Also add a `Notifications.addNotificationReceivedListener` that calls `refreshCount()`.
   *Done when:* tapping a push with the app killed, in the background, or in the foreground opens the right job screen and the dot updates.
6. **Notifications screen** (`app/notifications.tsx`):
   - A `FlatList` of `items`, newest first. Each row shows an icon (`cancel` for `job_cancelled`, `account-alert-outline` for `unfilled_slots`), title, body (2 lines), and relative time via `getFormattedDate` from `src/lib/utils.ts`.
   - Unread rows have a `bg-secondary` background and a primary-colored dot.
   - Tapping a row calls `markRead` and navigates as in step 5.
   - The header has a right-hand "Mark all as read" action when `unreadCount > 0`.
   - Handle loading, empty ("You're all caught up"), error with Retry, and pull-to-refresh.
   *Done when:* every state renders and tapping navigates.
7. **Bell and permission card:** add the components and wire them into both Home screens.
   *Done when:* a worker and an admin each see the bell top right; the dot appears after a notification row is inserted and the app is brought to the foreground; the card shows once and stays dismissed after "Not now".
8. **Job detail fallbacks and cancelled banner** (see the files table).
   *Done when:* opening `/job/<cancelled-id>` from a notification shows the job with the cancel reason, even with an empty store.
9. **Update `CLAUDE.md`:** add `notifications` and `push_tokens` to the tables list, and a one-line note: "push = notifications INSERT → webhook → `send-push` Edge Function → Expo".
   Then run `graphify update .`.

## Constraints and gotchas
- **Never insert into `notifications` from the client.** Rows come only from the trigger and the cron function (security definer). Client grants allow updating `read_at` only.
- `jobs.job_date` may be `text`. The SQL casts it with `::date`; keep those casts.
- **Expo Go can't test push.** Use the dev build. The emulator needs a Google Play image to get an FCM token; a physical phone is easier.
- **Foreground display:** `setNotificationHandler` must return `shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false`. These are the SDK 54 field names; check `node_modules/expo-notifications/build/Notifications.types.d.ts` before writing.
- **NativeWind:** never toggle `shadow-*` classes conditionally. It remounts the component outside the navigation context and crashes (seen in `app/(admin)/verification.tsx`). Use a stable class list or `style` for the unread dot.
- **Icons:** use `MaterialCommunityIcons` (AGENTS.md). Keep the styling tokens from `tailwind.config.js`.
- Keep `_layout.tsx`'s `NavigationGuard` logic intact: only add `'notifications'` to `inAdminGroup`.
- **Logout order:** delete the token before `supabase.auth.signOut()`. If deletion fails, log the error and continue logging out. Never block logout.
- **Expo receipts:** the receipts endpoint is not polled (`shortcut:` comment in the function). Polling receipts later would catch delayed delivery errors.
- **Out of scope:** notifying on job edits, "shift tomorrow" reminders, verification-status pushes, iOS APNs setup, realtime subscriptions.

## Verification
- `npx tsc --noEmit` and `npm run lint` are clean for the new and changed files.
- **Cancel flow:** a worker accepts a job, then the admin cancels it. The worker's phone gets "Shift cancelled". The bell dot appears. Tapping opens `/job/<id>` with the cancelled banner and reason. The row turns read.
- **Admin alert:** create an open job dated tomorrow with empty slots. In the SQL editor, run `select public.enqueue_unfilled_slot_alerts();` and confirm the admin receives one push. Running it again sends nothing (unique index).
- **Security:** as a worker, `supabase.from('notifications').insert(...)` fails, and selecting returns only your own rows.
- **Token cleanup:** uninstall the app, trigger a notification, and confirm the `send-push` logs show `DeviceNotRegistered` and the token row is gone.
- **Data checks:** `select * from cron.job;` shows `unfilled-slot-alerts` at `30 3 * * *`. `select * from notifications order by created_at desc limit 5;` shows recent rows.

## Progress checklist
- [ ] A1 push credentials (user): eas init, Firebase, FCM V1 key uploaded
- [ ] A2 SQL migration run (user)
- [ ] 1 app.json + .gitignore config
- [ ] 2 migration file committed in repo
- [ ] 3 send-push Edge Function written; A3 deployed + secrets set (user)
- [ ] A4 Database Webhook created (user)
- [ ] 4 push registration + logout unregister
- [ ] 5 notification tap handling + count refresh
- [ ] 6 notifications screen
- [ ] 7 NotificationBell + PushPermissionCard on both Home screens
- [ ] 8 fetchJobById fallback + cancelled banner
- [ ] 9 CLAUDE.md updated, graphify update
- [ ] Rebuild dev build and run the Verification section
