# Auth + Catch Log Cloud Sync — Design Spec

Date: 2026-05-18

## Overview

Add Supabase email/password authentication to FishCast. Gate the "Log Catch" action behind sign-in. Replace the local AsyncStorage catch log with a cloud-synced Supabase table, so catches persist across devices and reinstalls.

---

## Architecture & Auth

- **`lib/supabase.ts`** — initializes the Supabase client using `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Uses `AsyncStorage` as the session storage adapter for React Native.
- **`store/authStore.ts`** — Zustand store (not persisted — Supabase manages its own session). Holds `session: Session | null` and exposes:
  - `signIn(email, password)` — wraps `supabase.auth.signInWithPassword`
  - `signUp(email, password)` — wraps `supabase.auth.signUp`
  - `signOut()` — wraps `supabase.auth.signOut`
  - `setSession(session)` — called from a top-level auth listener
- The root `_layout.tsx` subscribes to `supabase.auth.onAuthStateChange` and calls `setSession` to keep the store in sync.
- Auth method: email + password only. No OAuth or magic link.

---

## Catch Log Data Layer

**Supabase table: `catch_entries`**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | primary key, default `gen_random_uuid()` |
| `user_id` | `uuid` | FK → `auth.users`, not null |
| `date` | `text` | `YYYY-MM-DD` |
| `time` | `text` | `HH:MM` |
| `spot_id` | `text` | |
| `spot_name` | `text` | |
| `species` | `text` | not null |
| `weight` | `float8` | nullable |
| `length` | `float8` | nullable |
| `note` | `text` | nullable |
| `fishing_score` | `int4` | nullable |
| `created_at` | `timestamptz` | default `now()` |

**Row Level Security:** enabled. Policy: `user_id = auth.uid()` for SELECT, INSERT, UPDATE, DELETE.

**`services/catchLogService.ts`** — pure async functions:
- `fetchCatches(userId)` → `CatchEntry[]`
- `addCatch(entry)` → `CatchEntry`
- `deleteCatch(id)` → `void`

**`hooks/useCatchLog.ts`** — TanStack Query wrapper:
- `useQuery(['catches', userId])` — fetches when signed in, disabled when `userId` is null
- `useMutation` for add and delete, with `invalidateQueries` on success

**`catchLogStore.ts` is removed.** The `CatchEntry` type moves to `types/catchLog.ts` so both the service and UI can import it without a circular dependency.

**Migration:** Existing local catches in AsyncStorage are not migrated. Users start with a clean log on first sign-in.

---

## UI Changes

### `features/auth/AuthModal.tsx`
- `presentationStyle="pageSheet"` modal, reusable
- Two modes toggled inline: **Sign In** / **Create Account**
- Fields: email, password
- Shows inline error messages (e.g. "Invalid credentials", "Email already in use")
- Accepts an `onSuccess` callback, called after successful auth

### `app/(tabs)/catchlog.tsx`
- Reads `session` from `useAuthStore()`
- If signed out: tapping "Log Catch" opens `AuthModal`. On success, `AuthModal` closes and the log form opens automatically.
- If signed in: existing flow unchanged. `useCatchLog` provides entries.

### `app/(tabs)/settings.tsx`
- New **Account** section rendered above Subscription:
  - **Signed in:** shows account email + "Sign Out" button
  - **Signed out:** shows a "Sign In" button that opens `AuthModal`

---

## Error Handling

- Network errors on fetch: TanStack Query retries (default), shows existing loading/error states
- Auth errors: displayed inline in `AuthModal` — no `Alert` dialogs
- Insert/delete failures: `useMutation` `onError` shows an `Alert`

---

## What's Not In Scope

- OAuth (Google, Apple)
- Magic link / passwordless
- Migrating existing local AsyncStorage catches
- Offline catch logging
- Password reset flow (can be added later via Supabase's built-in email reset)
