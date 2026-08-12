# ShiftLoom — App Requirements (v1)

> Last updated: 2026-08-11

---

## 1. Overview

ShiftLoom is a shift-based job management app. **Admins** post shift jobs, **Users** (workers) see job postings filtered by their role, accept or decline shifts, and get paid per shift. The app runs on a single codebase with role-based UI routing.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React Native (Expo — managed workflow) |
| Backend | Supabase (free tier) — Postgres, Auth, Storage, Edge Functions, Realtime |
| State management | Zustand |
| Auth | Email + Password AND Email OTP (both via Supabase Auth) |
| Language | TypeScript (strict mode) |
| Package manager | npm |
| Routing | Expo Router (file-based) |

---

## 3. User Types

### Admin
- Created directly in Supabase backend (no in-app admin signup)
- Manages jobs, verifies users, configures support number

### User (Worker)
- Signs up through the app
- Must select **exactly 1 role** during onboarding (can change later — triggers re-verification)
- **Fixed roles:** Driver 🚗, Steward 🍽️, Chef 👨🍳
- Cannot apply to jobs until verified by admin

---

## 4. Job Lifecycle

### States
| State | Meaning |
|---|---|
| **Open** | Job is posted, required number of people have NOT all accepted yet |
| **Closed** | All slots are filled (required people have accepted) |
| **Completed** | Job is done |
| **Cancelled** | Job is cancelled by admin |

### State Transitions
```
Open → Closed → Completed
Open → Closed → Cancelled
Open → Cancelled
```

### Job Data
- Company name
- Location (address + map coordinates, selected via map picker)
- Timing: date + day + start time – end time (e.g., 12-JUNE, Thursday, 5:00 PM – 8:00 PM)
- Roles with per-role slot count and wage:
  - e.g., 3 Drivers (₹700/shift), 2 Stewards (₹2000/shift), 1 Chef (₹2500/shift)
- Wage is always **per shift**, currency is always **INR (₹)**
- Status (Open / Closed / Completed / Cancelled)
- Cancel reason (if cancelled)

---

## 5. User Features

### Job Feed
- User **only sees job postings that include their role** and have unfilled slots (Open state only)
- Jobs with clashing timings show a warning indicator (cannot accept)
  - Clash example: Job1 (12-JUNE, 4:40 PM – 8:40 PM) and Job2 (12-JUNE, 5:00 PM – 7:00 PM)
- Can see available slot count per job
- Can see job wage (₹/shift)
- **Unverified users see a banner** and cannot apply to any jobs

### Job Detail
- View full job details: company, timing, location, wage, slots
- View job location on a map preview (tappable for full map)
- Open location in Google Maps / Apple Maps
- **Sticky bottom bar** with:
  - "Call Support" button (opens phone dialer with admin-configured number)
  - "Accept Shift" button (primary CTA)
- Accept blocked if:
  - Job clashes with an already-accepted shift
  - User is not verified
- Confirmation prompt before accepting

### Accepting & Declining
- User can accept a job → immediately reflected in slot count
- User can decline (cancel) an accepted job **only if ≥ 2 days before the job start date**
- If within 2 days of start, decline button is disabled with explanation

### My Shifts
- List of accepted jobs, segmented: Upcoming / Completed / Cancelled
- Each card shows: company, date/time, status, countdown, quick location link

### Notifications (Push)
- New job posted matching their role
- Accepted job cancelled by admin (with reason shown)
- Shift starting tomorrow reminder

### Profile
- Setup during onboarding: name, address, DOB, photo, role, documents
- Can edit profile info after setup
- Can change role (Driver ↔ Steward ↔ Chef) — **triggers re-verification**
  - Role change may require different documents (e.g., driver license for Driver)
- View document verification status (Pending / Verified / Rejected)
- Re-upload rejected documents
- Request verification after uploading documents
- Logout

---

## 6. Admin Features

### Dashboard
- Overview stats: active jobs, filled today, pending verifications
- Recent jobs list with status
- Quick action: "Post New Job"

### Post a Job
- Job form:
  - Company name
  - Location (text + pick on map)
  - Date (calendar picker)
  - Time range (start + end time pickers)
  - Roles: select role (Driver/Steward/Chef) + count + wage (₹/shift). Can add multiple role rows.
- Job is created in **Open** state by default

### Manage Jobs
- List all jobs segmented: Open / Closed / Completed / Cancelled
- Search by company name
- Tap a job → admin job detail view

### Admin Job Detail
- View full job info + status
- See per-role slot breakdown (e.g., "Drivers: 2/3", "Stewards: 1/2", "Chefs: 1/1 ✅")
- See list of accepted workers with name, avatar, role, phone (tappable)
- Edit job (navigate to edit form)
- Cancel job:
  - Only at **Open** or **Closed** state
  - Only **≥ 2 days before job start date**
  - Must select a reason: predefined chips ("Weather", "Client cancelled", "Insufficient staff", "Venue unavailable") OR type custom reason
  - All accepted workers are notified with the reason

### Edit a Job
- Same form as create, pre-populated
- Warning: "Workers who already accepted will be notified of changes"

### User Verification
- Admin sees a list of users with pending verification requests
- Tap → view user detail screen with profile info + uploaded documents
- Can view each document (full-screen preview)
- Can **Verify** (marks user as verified — user can now apply to jobs)
- Can **Reject** (user must re-upload documents and re-request verification)
- Admin **cannot** remove or reject a user who has already accepted a job
- Admin **cannot** change a user's role

### Notifications (Push)
- All slots filled for a job
- User requested verification
- Job starting tomorrow with unfilled slots

### Settings
- Edit customer support phone number (only admin can see/edit this)
- Admin profile info
- Logout

---

## 7. Document Verification Flow

1. User uploads required documents during onboarding or profile edit
   - All users: ID proof, address proof
   - Drivers: additional driver license document
2. User taps "Request Verification" → status becomes **Pending**
3. Admin sees user in Pending Verifications list
4. Admin taps → views user detail + documents
5. Admin either:
   - **Verifies** → status becomes **Verified** → user can apply to jobs
   - **Rejects** → status becomes **Rejected** → user must re-upload and re-request
6. Unverified users see a banner on home screen and cannot accept any job

---

## 8. Authentication

- **Email + Password** login and signup (via Supabase Auth)
- **Email OTP** login (via Supabase Auth)
- Forgot password flow (sends reset email)
- No admin signup in app — admins are created directly in Supabase

---

## 9. Common Features

- Push notifications (via Expo Notifications + Supabase Edge Functions)
- Support / Help screen with admin-configured phone number
- Map integration for job locations
- Role-based UI routing (same app, different tab bars for admin vs user)

---

## 10. Business Rules Summary

| Rule | Detail |
|---|---|
| Clash detection | User cannot accept a job that overlaps in time with an already-accepted job |
| Decline window | User can decline ≥ 2 days before job start date |
| Cancel window (admin) | Admin can cancel ≥ 2 days before job start date, at Open or Closed state |
| Cancel reason | Required — predefined chips or custom text |
| Unverified block | Unverified users cannot apply to any job |
| Role change | Triggers re-verification; may require new documents |
| Wage format | Per shift, INR (₹) only |
| Roles | Fixed: Driver, Steward, Chef (user picks 1, can change) |
| Admin creation | Backend only, no in-app signup |
