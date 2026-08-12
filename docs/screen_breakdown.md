# ShiftLoom — Screen & Component Breakdown

> Blueprint for all screens and components to build. Reference this during development.

---

## Navigation Architecture

```
app/
├── _layout.tsx                         # Root layout (auth check → route to user/admin)
├── (auth)/
│   ├── _layout.tsx                     # Auth stack layout
│   ├── login.tsx                       # Login
│   ├── signup.tsx                      # Signup
│   ├── forgot-password.tsx             # Forgot Password
│   └── onboarding.tsx                  # Onboarding (multi-step)
├── (user)/
│   ├── _layout.tsx                     # User stack layout
│   ├── (tabs)/
│   │   ├── _layout.tsx                 # User tab bar
│   │   ├── index.tsx                   # Jobs Feed (Home)
│   │   ├── my-jobs.tsx                 # My Shifts
│   │   ├── notifications.tsx           # Notifications
│   │   └── profile.tsx                 # Profile
│   ├── job/
│   │   └── [id].tsx                    # Job Detail
│   └── edit-profile.tsx                # Edit Profile
├── (admin)/
│   ├── _layout.tsx                     # Admin stack layout
│   ├── (tabs)/
│   │   ├── _layout.tsx                 # Admin tab bar
│   │   ├── index.tsx                   # Dashboard
│   │   ├── jobs.tsx                    # Manage Jobs
│   │   ├── verifications.tsx           # Pending Verifications
│   │   ├── notifications.tsx           # Notifications
│   │   └── settings.tsx                # Settings
│   ├── job/
│   │   ├── [id].tsx                    # Admin Job Detail
│   │   ├── create.tsx                  # Create Job
│   │   └── [id]/
│   │       └── edit.tsx                # Edit Job
│   └── user/
│       └── [id].tsx                    # User Detail (verification)
├── map.tsx                             # Map View (modal)
└── support.tsx                         # Support / Help
```

---

## Screen Inventory (21 Screens)

### Auth Flow (4 screens)

#### 1. Login — `app/(auth)/login.tsx`
| Component | Description |
|-----------|-------------|
| `AppLogo` | Brand logo |
| `TextInput` | Email address |
| `PasswordInput` | Password with show/hide toggle |
| `PrimaryButton` | "Log In" |
| `Divider` | "or" separator |
| `OTPLoginButton` | "Log in with Email OTP" |
| `TextLink` | "Forgot Password?" |
| `TextLink` | "Don't have an account? Sign Up" |
| `ErrorBanner` | Login error messages |
| `LoadingOverlay` | During auth request |

#### 2. Signup — `app/(auth)/signup.tsx`
| Component | Description |
|-----------|-------------|
| `AppLogo` | Brand logo |
| `TextInput` | Full name |
| `TextInput` | Email |
| `PasswordInput` | Password |
| `PasswordInput` | Confirm password |
| `PrimaryButton` | "Create Account" |
| `TextLink` | "Already have an account? Log In" |
| `ErrorBanner` | Validation errors |
| `TermsCheckbox` | "I agree to Terms & Conditions" |

> No admin signup — admins are created directly in Supabase.

#### 3. Forgot Password — `app/(auth)/forgot-password.tsx`
| Component | Description |
|-----------|-------------|
| `ScreenHeader` | Back arrow + "Reset Password" |
| `TextInput` | Email address |
| `PrimaryButton` | "Send Reset Link" |
| `SuccessMessage` | "Check your email for a reset link" |

#### 4. Onboarding (Multi-Step) — `app/(auth)/onboarding.tsx`
| Component | Description |
|-----------|-------------|
| `StepIndicator` | Progress bar (step 1/2/3) |
| **Step 1 — Personal Info** | |
| `AvatarPicker` | Profile photo |
| `TextInput` | Full name |
| `TextInput` | Address |
| `DatePicker` | Date of birth |
| **Step 2 — Role Selection** | |
| `RoleCard` | Selectable: Driver 🚗, Steward 🍽️, Chef 👨🍳 |
| `RoleCardGrid` | Grid of 3 `RoleCard` (single select) |
| `RoleInfoText` | Role requirements description |
| **Step 3 — Document Upload** | |
| `DocumentUploadCard` | Upload per doc type (ID proof, address proof) |
| `DriverLicenseUpload` | Conditional — only if role = Driver |
| `DocumentUploadList` | Dynamic list based on role |
| `RequestVerificationButton` | "Submit for Verification" |
| `PrimaryButton` | "Next" / "Complete Setup" |
| `BackButton` | Previous step |

---

### User Screens (6 screens)

#### 5. Jobs Feed (Home Tab) — `app/(user)/(tabs)/index.tsx`
| Component | Description |
|-----------|-------------|
| `ScreenHeader` | "Available Shifts" + greeting |
| `VerificationPendingBanner` | ⚠️ Shown if unverified — blocks apply |
| `FilterChips` | "Today", "This Week", "All" |
| `JobCard` | Company, date/time, location, wage (₹/shift), slots ("2/5"), role badge |
| `JobCardList` | FlatList of `JobCard` |
| `ClashIndicator` | ⚠️ on cards with time clash |
| `EmptyState` | "No shifts available for your role" |
| `LoadingSkeletons` | Loading placeholders |
| `ErrorState` | Network error + retry |

> Only **Open** jobs with unfilled slots for user's role are shown.

#### 6. Job Detail — `app/(user)/job/[id].tsx`
| Component | Description |
|-----------|-------------|
| `ScreenHeader` | Back + company name |
| `CompanyHeader` | Company name (large) |
| `TimingDisplay` | 📅 "12 June, Thursday · 5:00 PM – 8:00 PM" |
| `WageDisplay` | 💰 "₹700 per shift" |
| `LocationDisplay` | 📍 Address text |
| `MapPreview` | Map thumbnail → full map |
| `OpenInMapsButton` | Google Maps / Apple Maps |
| `RoleBadge` | User's matching role |
| `SlotCounter` | "3/5 slots filled" + progress bar |
| `ClashWarning` | 🚫 Blocks accept if clash |
| `UnverifiedBlocker` | 🔒 Disables accept if unverified |
| **Sticky Bottom Bar** | |
| `CallSupportButton` | 📞 Opens phone dialer |
| `AcceptButton` | ✅ "Accept Shift" (primary CTA) |
| `ConfirmationBottomSheet` | Accept confirmation prompt |

#### 7. My Shifts (Tab) — `app/(user)/(tabs)/my-jobs.tsx`
| Component | Description |
|-----------|-------------|
| `ScreenHeader` | "My Shifts" |
| `SegmentedControl` | Upcoming / Completed / Cancelled |
| `AcceptedJobCard` | Company, date/time, status, countdown, location link |
| `AcceptedJobCardList` | FlatList per segment |
| `DeclineButton` | "Decline" (enabled ≥ 2 days before start) |
| `DeclineDisabledTooltip` | "Cannot decline within 2 days" |
| `DeclineConfirmationModal` | Decline confirmation prompt |
| `EmptyState` | Per-tab empty states |

#### 8. Notifications (Tab) — `app/(user)/(tabs)/notifications.tsx`
| Component | Description |
|-----------|-------------|
| `ScreenHeader` | "Notifications" |
| `NotificationItem` | Icon + title + body + timestamp + read/unread |
| `NotificationList` | FlatList |
| `EmptyState` | "No notifications yet" |

**User notification types:** New matching job, accepted job cancelled (with reason), shift starting tomorrow.

#### 9. Profile (Tab) — `app/(user)/(tabs)/profile.tsx`
| Component | Description |
|-----------|-------------|
| `ProfileHeader` | Avatar + name + role badge + verification badge |
| `ProfileInfoSection` | Name, email, phone, address, DOB |
| `RoleDisplay` | Current role + "Change Role" |
| `ChangeRoleModal` | Role picker + re-verification warning |
| `DocumentStatusSection` | Docs with status (Pending ⏳ / Verified ✅ / Rejected ❌) |
| `RequestVerificationButton` | Submit for review |
| `ReUploadButton` | Per rejected document |
| `EditProfileButton` | Navigate to edit |
| `LogoutButton` | Destructive logout |
| `AppVersion` | Version text |

#### 10. Edit Profile — `app/(user)/edit-profile.tsx`
| Component | Description |
|-----------|-------------|
| `ScreenHeader` | Back + "Edit Profile" |
| `AvatarPicker` | Change photo |
| `TextInput` | Name, address |
| `DatePicker` | DOB |
| `DocumentUploadCard` | Re-upload documents |
| `DriverLicenseUpload` | Conditional (Driver only) |
| `SaveButton` | "Save Changes" |
| `DiscardChangesModal` | Unsaved changes prompt |

---

### Admin Screens (9 screens)

#### 11. Dashboard (Home Tab) — `app/(admin)/(tabs)/index.tsx`
| Component | Description |
|-----------|-------------|
| `ScreenHeader` | "Dashboard" + greeting |
| `StatCard` | "Active Jobs", "Filled Today", "Pending Verifications" |
| `StatCardRow` | Horizontal scroll |
| `RecentJobsList` | 3–5 recent jobs with status |
| `RecentJobItem` | Company + date + status + slot fill |
| `QuickPostButton` | "Post New Job" CTA |
| `PendingVerificationAlert` | "X users awaiting verification" |

#### 12. Manage Jobs (Tab) — `app/(admin)/(tabs)/jobs.tsx`
| Component | Description |
|-----------|-------------|
| `ScreenHeader` | "Manage Jobs" |
| `SegmentedControl` | Open / Closed / Completed / Cancelled |
| `SearchBar` | Search by company name |
| `AdminJobCard` | Company, date/time, per-role slots, status badge |
| `AdminJobCardList` | FlatList per segment |
| `FAB` | "+" → Create Job |
| `EmptyState` | Per-tab |

#### 13. Admin Job Detail — `app/(admin)/job/[id].tsx`
| Component | Description |
|-----------|-------------|
| `ScreenHeader` | Back + company name + edit icon |
| `JobStatusBadge` | Open / Closed / Completed / Cancelled |
| `JobInfoSection` | Timing, location, map |
| `MapPreview` | Tappable → full map |
| `SlotBreakdownCard` | Per-role breakdown |
| `RoleSlotRow` | "🚗 Drivers: 2/3" with progress |
| `AcceptedUsersSection` | "Accepted Workers" header |
| `AcceptedUserItem` | Avatar + name + role + phone |
| `AcceptedUsersList` | Grouped by role |
| `EditJobButton` | Edit form (Open/Closed only) |
| `CancelJobButton` | Cancel (Open/Closed, ≥ 2d before start) |
| `CancelJobModal` | Reason chips + custom text + confirm |
| `CancelDisabledTooltip` | "Cannot cancel within 2 days" |

#### 14. Create Job — `app/(admin)/job/create.tsx`
| Component | Description |
|-----------|-------------|
| `ScreenHeader` | "Post New Job" |
| `TextInput` | Company name |
| `LocationPicker` | Address + "Pick on Map" |
| `MapPickerModal` | Full-screen map pin drop |
| `DatePicker` | Calendar selector |
| `TimeRangePicker` | Start + end time |
| `SectionHeader` | "Roles & Slots" |
| `RoleSlotInput` | Role dropdown + count stepper + wage (₹) |
| `RoleSlotList` | List of role rows |
| `AddRoleButton` | "+ Add Role" (max 3) |
| `RemoveRoleButton` | "×" remove row |
| `FormValidationErrors` | Per-field errors |
| `PostJobButton` | "Post Job" CTA |
| `LoadingOverlay` | During submission |

#### 14b. Edit Job — `app/(admin)/job/[id]/edit.tsx`
Same as Create Job, pre-populated. Additional:
| Component | Description |
|-----------|-------------|
| `SaveChangesButton` | Replaces "Post Job" |
| `EditWarningBanner` | "Workers already accepted will be notified" |

#### 15. Pending Verifications (Tab) — `app/(admin)/(tabs)/verifications.tsx`
| Component | Description |
|-----------|-------------|
| `ScreenHeader` | "Verifications" |
| `SegmentedControl` | Pending / Verified / Rejected |
| `VerificationUserCard` | Avatar + name + role + date + "Review →" |
| `VerificationUserList` | FlatList |
| `EmptyState` | "No pending verifications" |
| `PendingCountBadge` | Tab bar badge |

#### 16. Notifications (Admin Tab) — `app/(admin)/(tabs)/notifications.tsx`
Same structure as user notifications.

**Admin notification types:** Slots filled, user requested verification, unfilled job starting tomorrow.

#### 17. Settings (Tab) — `app/(admin)/(tabs)/settings.tsx`
| Component | Description |
|-----------|-------------|
| `ScreenHeader` | "Settings" |
| `SupportNumberEditor` | Current number + edit inline |
| `AdminProfileSection` | Admin name, email |
| `LogoutButton` | Logout |
| `AppVersion` | Version text |

#### 18. User Detail (Verification) — `app/(admin)/user/[id].tsx`
| Component | Description |
|-----------|-------------|
| `ScreenHeader` | Back + user name |
| `UserProfileHeader` | Avatar + name + role + verification status |
| `UserInfoSection` | Name, email, address, DOB |
| `DocumentReviewSection` | "Submitted Documents" |
| `DocumentReviewCard` | Doc type + thumbnail + status |
| `DocumentPreviewModal` | Full-screen doc viewer |
| `VerifyButton` | ✅ "Verify User" |
| `RejectButton` | ❌ "Reject" |
| `VerifyConfirmationModal` | Verify confirmation prompt |

---

### Shared Screens (2 screens)

#### 19. Map View (Modal) — `app/map.tsx`
| Component | Description |
|-----------|-------------|
| `MapView` | Full-screen map |
| `LocationPin` | Pin at job location |
| `LocationInfoCard` | Address + "Open in Maps" |
| `CloseButton` | Dismiss modal |

#### 20. Support / Help — `app/support.tsx`
| Component | Description |
|-----------|-------------|
| `ScreenHeader` | "Help & Support" |
| `SupportPhoneCard` | Phone number + tap-to-call |
| `EmailSupportCard` | Support email (if applicable) |

---

## Shared Component Library

### UI Primitives — `src/components/ui/`

| # | Component | Used In |
|---|-----------|--------|
| 1 | `PrimaryButton` | Every form & CTA |
| 2 | `SecondaryButton` | Cancel, secondary actions |
| 3 | `DestructiveButton` | Logout, cancel job, reject |
| 4 | `TextInput` | All forms |
| 5 | `PasswordInput` | Login, signup |
| 6 | `ScreenHeader` | Every screen |
| 7 | `TextLink` | Auth screens |
| 8 | `ErrorBanner` | All forms |
| 9 | `SuccessMessage` | Confirmations |
| 10 | `LoadingOverlay` | Mutations, auth |
| 11 | `LoadingSkeletons` | All lists |
| 12 | `EmptyState` | All lists |
| 13 | `ErrorState` | Network error + retry |
| 14 | `SegmentedControl` | My Jobs, Manage Jobs, Verifications |
| 15 | `Badge` / `StatusBadge` | Job state, role, verification |
| 16 | `Avatar` | Profile, user lists |
| 17 | `FAB` | Admin job list |
| 18 | `BottomSheet` / `ConfirmationModal` | Accept, decline, cancel, verify |
| 19 | `SearchBar` | Job lists |
| 20 | `FilterChips` | Job feed |
| 21 | `Divider` | Separators |
| 22 | `StickyBottomBar` | Job detail |

### Domain Components — `src/components/`

| # | Component | Used In |
|---|-----------|--------|
| 1 | `JobCard` | User jobs feed |
| 2 | `AcceptedJobCard` | My shifts |
| 3 | `AdminJobCard` | Admin manage jobs |
| 4 | `JobInfoRow` | Job detail (both) |
| 5 | `TimingDisplay` | Cards & detail |
| 6 | `WageDisplay` | Cards & detail |
| 7 | `LocationDisplay` | Cards & detail |
| 8 | `SlotCounter` | Cards & detail |
| 9 | `RoleSlotRow` | Admin job detail |
| 10 | `MapPreview` | Job detail |
| 11 | `OpenInMapsButton` | Detail, map modal |
| 12 | `RoleBadge` | Cards, detail, profile |
| 13 | `ClashIndicator` | Job card, detail |
| 14 | `VerificationPendingBanner` | User home |
| 15 | `NotificationItem` | Notifications |
| 16 | `ProfileHeader` | User profile |
| 17 | `UserProfileHeader` | Admin user detail |
| 18 | `DocumentUploadCard` | Onboarding, edit profile |
| 19 | `DocumentReviewCard` | Admin user detail |
| 20 | `DriverLicenseUpload` | Onboarding, edit profile |
| 21 | `RoleCard` | Onboarding |
| 22 | `RoleSlotInput` | Create/edit job |
| 23 | `StepIndicator` | Onboarding |
| 24 | `StatCard` | Admin dashboard |
| 25 | `AcceptedUserItem` | Admin job detail |
| 26 | `VerificationUserCard` | Admin verifications |
| 27 | `SupportPhoneCard` | Support, profile |
| 28 | `SupportNumberEditor` | Admin settings |
| 29 | `CancelReasonPicker` | Admin cancel modal |
| 30 | `CallSupportButton` | Job detail sticky bar |
