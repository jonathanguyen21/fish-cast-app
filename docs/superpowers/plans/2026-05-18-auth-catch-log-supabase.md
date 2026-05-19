# Auth + Catch Log Cloud Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase email/password auth and replace the local AsyncStorage catch log with a cloud-synced Supabase table.

**Architecture:** A new `lib/supabase.ts` client is the single source of truth for all Supabase calls. Auth state lives in `store/authStore.ts` (Zustand, not persisted — Supabase manages its own session via AsyncStorage). Catch log data is fetched/mutated via TanStack Query in `hooks/useCatchLog.ts`, backed by `services/catchLogService.ts`. `store/catchLogStore.ts` is removed entirely.

**Tech Stack:** `@supabase/supabase-js`, Supabase Auth, Supabase Postgres (RLS), TanStack Query v5, Zustand v5, Expo Router v6

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `lib/supabase.ts` | Supabase client singleton |
| Create | `types/catchLog.ts` | `CatchEntry` type (moved from catchLogStore) |
| Create | `store/authStore.ts` | Auth session state + sign in/up/out actions |
| Modify | `app/_layout.tsx` | Subscribe to `onAuthStateChange`, seed session |
| Create | `services/catchLogService.ts` | `fetchCatches`, `addCatch`, `deleteCatch` |
| Create | `hooks/useCatchLog.ts` | TanStack Query hooks for catch log |
| Create | `features/auth/AuthModal.tsx` | Reusable sign-in / sign-up sheet |
| Modify | `app/(tabs)/catchlog.tsx` | Gate "Log Catch" behind auth, use `useCatchLog` |
| Modify | `app/(tabs)/settings.tsx` | Add Account section (signed-in email + sign out / sign-in button) |
| Delete | `store/catchLogStore.ts` | Replaced by Supabase service + hook |
| Modify | `__tests__/catchLogStore.test.ts` | Replace with `catchLogService` tests |

---

## Task 1: Install `@supabase/supabase-js`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
npm install @supabase/supabase-js
```

Expected output: added `@supabase/supabase-js` to `node_modules`, `package.json` updated.

- [ ] **Step 2: Verify install**

```bash
node -e "require('@supabase/supabase-js'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @supabase/supabase-js"
```

---

## Task 2: Create Supabase client

**Files:**
- Create: `lib/supabase.ts`

- [ ] **Step 1: Create `lib/supabase.ts`**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

- [ ] **Step 2: Verify TypeScript is happy**

```bash
npx tsc --noEmit 2>&1 | grep -v "spots.tsx"
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add Supabase client"
```

---

## Task 3: Create Supabase `catch_entries` table

Run this SQL in the Supabase dashboard → SQL Editor for your project.

- [ ] **Step 1: Run table + RLS migration**

```sql
create table if not exists public.catch_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  time text not null,
  spot_id text not null,
  spot_name text not null,
  species text not null,
  weight float8,
  length float8,
  note text,
  fishing_score int4,
  created_at timestamptz not null default now()
);

alter table public.catch_entries enable row level security;

create policy "Users can read own catches"
  on public.catch_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own catches"
  on public.catch_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own catches"
  on public.catch_entries for delete
  using (auth.uid() = user_id);
```

- [ ] **Step 2: Verify in Supabase dashboard**

Go to Table Editor → `catch_entries`. Confirm the table exists with the columns above and RLS is enabled.

---

## Task 4: Create `CatchEntry` type + `authStore`

**Files:**
- Create: `types/catchLog.ts`
- Create: `store/authStore.ts`

- [ ] **Step 1: Create `types/catchLog.ts`**

```typescript
export interface CatchEntry {
  id: string
  date: string
  time: string
  spotId: string
  spotName: string
  species: string
  weight?: number
  length?: number
  note?: string
  fishingScore?: number
}
```

- [ ] **Step 2: Create `store/authStore.ts`**

```typescript
import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  session: Session | null
  setSession: (session: Session | null) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },
  signUp: async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    set({ session: null })
  },
}))
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "spots.tsx"
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add types/catchLog.ts store/authStore.ts
git commit -m "feat: add CatchEntry type and authStore"
```

---

## Task 5: Wire auth listener in `_layout.tsx`

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Add auth listener to `RootLayout`**

Add these imports at the top of `app/_layout.tsx`:

```typescript
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
```

Add this `useEffect` inside `RootLayout`, after the existing `useEffect` hooks:

```typescript
const setSession = useAuthStore(s => s.setSession)

useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session)
  })
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session)
  })
  return () => subscription.unsubscribe()
}, [])
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "spots.tsx"
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: wire Supabase auth state listener in root layout"
```

---

## Task 6: Create `catchLogService.ts`

**Files:**
- Create: `services/catchLogService.ts`

- [ ] **Step 1: Create `services/catchLogService.ts`**

```typescript
import { supabase } from '../lib/supabase'
import type { CatchEntry } from '../types/catchLog'

type DbRow = {
  id: string
  date: string
  time: string
  spot_id: string
  spot_name: string
  species: string
  weight: number | null
  length: number | null
  note: string | null
  fishing_score: number | null
}

function rowToEntry(row: DbRow): CatchEntry {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    spotId: row.spot_id,
    spotName: row.spot_name,
    species: row.species,
    weight: row.weight ?? undefined,
    length: row.length ?? undefined,
    note: row.note ?? undefined,
    fishingScore: row.fishing_score ?? undefined,
  }
}

export async function fetchCatches(userId: string): Promise<CatchEntry[]> {
  const { data, error } = await supabase
    .from('catch_entries')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('time', { ascending: false })

  if (error) throw error
  return (data as DbRow[]).map(rowToEntry)
}

export async function addCatch(
  userId: string,
  entry: Omit<CatchEntry, 'id'>
): Promise<CatchEntry> {
  const { data, error } = await supabase
    .from('catch_entries')
    .insert({
      user_id: userId,
      date: entry.date,
      time: entry.time,
      spot_id: entry.spotId,
      spot_name: entry.spotName,
      species: entry.species,
      weight: entry.weight ?? null,
      length: entry.length ?? null,
      note: entry.note ?? null,
      fishing_score: entry.fishingScore ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return rowToEntry(data as DbRow)
}

export async function deleteCatch(id: string): Promise<void> {
  const { error } = await supabase
    .from('catch_entries')
    .delete()
    .eq('id', id)

  if (error) throw error
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "spots.tsx"
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add services/catchLogService.ts
git commit -m "feat: add catchLogService with Supabase CRUD"
```

---

## Task 7: Create `useCatchLog` hook

**Files:**
- Create: `hooks/useCatchLog.ts`

- [ ] **Step 1: Create `hooks/useCatchLog.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert } from 'react-native'
import { useAuthStore } from '../store/authStore'
import { fetchCatches, addCatch, deleteCatch } from '../services/catchLogService'
import type { CatchEntry } from '../types/catchLog'

export function useCatchLog() {
  const session = useAuthStore(s => s.session)
  const userId = session?.user.id ?? null
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['catches', userId],
    queryFn: () => fetchCatches(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const addMutation = useMutation({
    mutationFn: (entry: Omit<CatchEntry, 'id'>) => addCatch(userId!, entry),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catches', userId] }),
    onError: () => Alert.alert('Error', 'Could not save catch. Please try again.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCatch(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catches', userId] }),
    onError: () => Alert.alert('Error', 'Could not delete catch. Please try again.'),
  })

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    addEntry: addMutation.mutate,
    deleteEntry: deleteMutation.mutate,
    isSignedIn: !!userId,
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "spots.tsx"
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/useCatchLog.ts
git commit -m "feat: add useCatchLog TanStack Query hook"
```

---

## Task 8: Create `AuthModal`

**Files:**
- Create: `features/auth/AuthModal.tsx`

- [ ] **Step 1: Create `features/auth/AuthModal.tsx`**

```typescript
import React, { useState } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { useAuthStore } from '../../store/authStore'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

interface Props {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AuthModal({ visible, onClose, onSuccess }: Props) {
  const { signIn, signUp } = useAuthStore()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(null)
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password)
      } else {
        await signUp(email.trim(), password)
      }
      setEmail('')
      setPassword('')
      onSuccess()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setEmail('')
    setPassword('')
    setError(null)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={Colors.textTertiary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={Colors.background} />
              : <Text style={styles.buttonText}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(null) }}
          >
            <Text style={styles.toggleText}>
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.toggleLink}>{mode === 'signin' ? 'Sign up' : 'Sign in'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.screenPad },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  cancel: { fontSize: 15, color: Colors.accent },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textTertiary, marginBottom: 6, marginTop: Spacing.md },
  input: {
    backgroundColor: Colors.card, borderRadius: 10,
    padding: Spacing.md, color: Colors.textPrimary, fontSize: 15,
  },
  error: { color: Colors.warning, fontSize: 13, marginTop: Spacing.sm },
  button: {
    backgroundColor: Colors.accent, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: Spacing.lg,
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: Colors.background },
  toggleRow: { alignItems: 'center', marginTop: Spacing.lg },
  toggleText: { fontSize: 14, color: Colors.textSecondary },
  toggleLink: { color: Colors.accent, fontWeight: '600' },
})
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "spots.tsx"
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add features/auth/AuthModal.tsx
git commit -m "feat: add AuthModal (sign in / sign up sheet)"
```

---

## Task 9: Update `catchlog.tsx`

**Files:**
- Modify: `app/(tabs)/catchlog.tsx`

- [ ] **Step 1: Replace the file contents**

Replace the entire file with the following. Key changes: import `useCatchLog` instead of `useCatchLogStore`; import `CatchEntry` from `types/catchLog`; add `AuthModal` and `showAuthModal` state; "Log Catch" button opens auth modal when not signed in.

```typescript
import React, { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCatchLog } from '../../hooks/useCatchLog'
import { AuthModal } from '../../features/auth/AuthModal'
import { useSpots } from '../../hooks/useSpots'
import { scoreColor } from '../../features/score/scoringEngine'
import type { CatchEntry } from '../../types/catchLog'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'
import { Typography } from '../../theme/typography'

const COMMON_SPECIES = [
  'Bass', 'Striped Bass', 'Rockfish', 'Halibut', 'Salmon',
  'Trout', 'Redfish', 'Snook', 'Flounder', 'Bluegill',
  'Catfish', 'Crappie', 'Walleye', 'Pike', 'Perch',
]

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function CatchStats({ entries }: { entries: CatchEntry[] }) {
  const total = entries.length
  const withScore = entries.filter(e => e.fishingScore != null)
  const avgScore = withScore.length
    ? Math.round(withScore.reduce((s, e) => s + e.fishingScore!, 0) / withScore.length)
    : null
  const speciesCounts: Record<string, number> = {}
  entries.forEach(e => { speciesCounts[e.species] = (speciesCounts[e.species] ?? 0) + 1 })
  const topSpecies = Object.entries(speciesCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  return (
    <View style={styles.statsCard}>
      <View style={styles.statItem}>
        <Ionicons name="fish-outline" size={18} color={Colors.accent} />
        <Text style={styles.statValue}>{total}</Text>
        <Text style={styles.statLabel}>Catches</Text>
      </View>
      {avgScore !== null && (
        <View style={styles.statItem}>
          <Ionicons name="speedometer-outline" size={18} color={Colors.accent} />
          <Text style={styles.statValue}>{avgScore}</Text>
          <Text style={styles.statLabel}>Avg Score</Text>
        </View>
      )}
      {topSpecies && (
        <View style={[styles.statItem, { flex: 1 }]}>
          <Ionicons name="star-outline" size={18} color={Colors.accent} />
          <Text style={styles.statValue} numberOfLines={1}>{topSpecies}</Text>
          <Text style={styles.statLabel}>Top Species</Text>
        </View>
      )}
    </View>
  )
}

function CatchCard({ entry, onDelete }: { entry: CatchEntry; onDelete: () => void }) {
  return (
    <View style={styles.catchCard}>
      <View style={styles.catchHeader}>
        <Text style={styles.catchSpecies}>{entry.species}</Text>
        <TouchableOpacity onPress={() => Alert.alert('Delete', 'Remove this catch?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: onDelete },
        ])} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={16} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.catchSpot}>{entry.spotName} · {formatDate(entry.date)} at {entry.time}</Text>
      <View style={styles.catchStats}>
        {entry.weight != null && (
          <View style={styles.catchStat}>
            <Text style={styles.catchStatValue}>{entry.weight} <Text style={styles.catchStatUnit}>lbs</Text></Text>
          </View>
        )}
        {entry.length != null && (
          <View style={styles.catchStat}>
            <Text style={styles.catchStatValue}>{entry.length} <Text style={styles.catchStatUnit}>in</Text></Text>
          </View>
        )}
        {entry.fishingScore != null && (
          <View style={styles.catchStat}>
            <Text style={[styles.catchStatValue, { color: scoreColor(entry.fishingScore) }]}>{entry.fishingScore}</Text>
            <Text style={styles.catchStatUnit}> score</Text>
          </View>
        )}
      </View>
      {entry.note ? <Text style={styles.catchNote}>{entry.note}</Text> : null}
    </View>
  )
}

interface FormState {
  species: string
  weight: string
  length: string
  note: string
  score: string
}

export default function CatchLogScreen() {
  const insets = useSafeAreaInsets()
  const { entries, addEntry, deleteEntry, isSignedIn } = useCatchLog()
  const { activeSpot } = useSpots()
  const [showModal, setShowModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [form, setForm] = useState<FormState>({ species: '', weight: '', length: '', note: '', score: '' })
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false)

  const today = useMemo(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }, [])

  const nowTime = useMemo(() => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }, [showModal])

  function handleLogCatchPress() {
    if (!isSignedIn) {
      setShowAuthModal(true)
    } else {
      setShowModal(true)
    }
  }

  function handleAdd() {
    if (!form.species.trim()) {
      Alert.alert('Species required', 'Please enter what you caught.')
      return
    }
    addEntry({
      date: today,
      time: nowTime,
      spotId: activeSpot?.id ?? 'unknown',
      spotName: activeSpot?.name ?? 'Unknown Spot',
      species: form.species.trim(),
      weight: form.weight ? parseFloat(form.weight) : undefined,
      length: form.length ? parseFloat(form.length) : undefined,
      note: form.note.trim() || undefined,
      fishingScore: form.score ? parseInt(form.score, 10) : undefined,
    })
    setForm({ species: '', weight: '', length: '', note: '', score: '' })
    setShowModal(false)
  }

  const grouped = useMemo(() => {
    const map: Record<string, CatchEntry[]> = {}
    for (const e of entries) {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [entries])

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Catch Log</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleLogCatchPress}>
          <Ionicons name="add" size={16} color={Colors.background} />
          <Text style={styles.addButtonText}>Log Catch</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {entries.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="fish-outline" size={56} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No catches logged yet</Text>
            <Text style={styles.emptyHint}>Tap "Log Catch" after a successful trip to track your catches over time.</Text>
          </View>
        ) : (
          <>
            {entries.length >= 3 && <CatchStats entries={entries} />}
            {grouped.map(([date, dayEntries]) => (
              <View key={date}>
                <Text style={styles.dayLabel}>{formatDate(date)}</Text>
                {dayEntries.map(e => (
                  <CatchCard key={e.id} entry={e} onDelete={() => deleteEntry(e.id)} />
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => { setShowAuthModal(false); setShowModal(true) }}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log a Catch</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="close" size={18} color={Colors.textSecondary} />
                <Text style={styles.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Species *</Text>
            <TouchableOpacity
              style={styles.speciesInput}
              onPress={() => setShowSpeciesPicker(v => !v)}
            >
              <Text style={form.species ? styles.speciesValue : styles.speciesPlaceholder}>
                {form.species || 'What did you catch?'}
              </Text>
              <Ionicons name={showSpeciesPicker ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
            {showSpeciesPicker && (
              <View style={styles.speciesList}>
                {COMMON_SPECIES.map(sp => (
                  <TouchableOpacity key={sp} style={styles.speciesOption} onPress={() => {
                    setForm(f => ({ ...f, species: sp }))
                    setShowSpeciesPicker(false)
                  }}>
                    <Text style={[styles.speciesOptionText, form.species === sp && { color: Colors.accent }]}>{sp}</Text>
                  </TouchableOpacity>
                ))}
                <TextInput
                  style={styles.speciesCustomInput}
                  placeholder="Or type a custom species..."
                  placeholderTextColor={Colors.textTertiary}
                  value={COMMON_SPECIES.includes(form.species) ? '' : form.species}
                  onChangeText={v => setForm(f => ({ ...f, species: v }))}
                  onSubmitEditing={() => setShowSpeciesPicker(false)}
                />
              </View>
            )}

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Weight (lbs)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 4.5"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  value={form.weight}
                  onChangeText={v => setForm(f => ({ ...f, weight: v }))}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Length (in)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 18"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  value={form.length}
                  onChangeText={v => setForm(f => ({ ...f, length: v }))}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Fishing Score (0–100)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 72"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="number-pad"
                  value={form.score}
                  onChangeText={v => setForm(f => ({ ...f, score: v }))}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder="Bait used, depth, spot details..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={3}
              value={form.note}
              onChangeText={v => setForm(f => ({ ...f, note: v }))}
            />

            <View style={styles.spotRow}>
              <Text style={styles.spotLabel}>Spot: </Text>
              <Text style={styles.spotValue}>{activeSpot?.name ?? 'No active spot'}</Text>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleAdd}>
              <Text style={styles.submitButtonText}>Save Catch</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPad, paddingVertical: Spacing.md,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  addButton: {
    backgroundColor: Colors.accent, borderRadius: 20,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  addButtonText: { fontSize: 14, fontWeight: '700', color: Colors.background },
  content: { paddingHorizontal: Spacing.screenPad, paddingBottom: Spacing.xl },
  empty: { alignItems: 'center', marginTop: 80, gap: Spacing.sm },
  emptyText: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  emptyHint: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  dayLabel: { fontSize: 13, fontWeight: '600', color: Colors.textTertiary, marginTop: Spacing.md, marginBottom: Spacing.xs },
  catchCard: {
    backgroundColor: Colors.card, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  catchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  catchSpecies: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  catchSpot: { fontSize: 12, color: Colors.textTertiary, marginBottom: 8 },
  catchStats: { flexDirection: 'row', gap: Spacing.md, marginBottom: 4 },
  catchStat: { flexDirection: 'row', alignItems: 'baseline' },
  catchStatValue: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  catchStatUnit: { fontSize: 11, color: Colors.textSecondary },
  catchNote: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalContent: { padding: Spacing.screenPad, paddingBottom: 60 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  modalClose: { fontSize: 14, color: Colors.accent },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textTertiary, marginBottom: 6, marginTop: Spacing.md },
  input: {
    backgroundColor: Colors.card, borderRadius: 10, padding: Spacing.md,
    color: Colors.textPrimary, fontSize: 15,
  },
  noteInput: { minHeight: 80, textAlignVertical: 'top' },
  speciesInput: {
    backgroundColor: Colors.card, borderRadius: 10, padding: Spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  speciesValue: { fontSize: 15, color: Colors.textPrimary },
  speciesPlaceholder: { fontSize: 15, color: Colors.textTertiary },
  statsCard: {
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    padding: Spacing.md, marginBottom: Spacing.md, flexDirection: 'row', gap: Spacing.md,
  },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textTertiary },
  speciesList: {
    backgroundColor: Colors.card, borderRadius: 10, marginTop: 4,
    overflow: 'hidden',
  },
  speciesOption: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surface },
  speciesOptionText: { fontSize: 15, color: Colors.textPrimary },
  speciesCustomInput: {
    padding: Spacing.md, color: Colors.textPrimary, fontSize: 15,
    borderTopWidth: 1, borderTopColor: Colors.surface,
  },
  row: { flexDirection: 'row', gap: Spacing.md },
  halfField: { flex: 1 },
  spotRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: Spacing.lg, padding: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: 10,
  },
  spotLabel: { fontSize: 13, color: Colors.textTertiary },
  spotValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  submitButton: {
    backgroundColor: Colors.accent, borderRadius: Spacing.cardRadius,
    paddingVertical: 16, alignItems: 'center', marginTop: Spacing.lg,
  },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: Colors.background },
})
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "spots.tsx"
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/catchlog.tsx
git commit -m "feat: gate catch log behind auth, use Supabase-backed useCatchLog"
```

---

## Task 10: Update `settings.tsx` with Account section

**Files:**
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: Add imports**

Add to the imports block at the top of `app/(tabs)/settings.tsx`:

```typescript
import { useAuthStore } from '../../store/authStore'
import { AuthModal } from '../../features/auth/AuthModal'
```

- [ ] **Step 2: Add state and store access inside `SettingsScreen`**

Add after the existing `useSettingsStore` destructure:

```typescript
const session = useAuthStore(s => s.session)
const signOut = useAuthStore(s => s.signOut)
const [showAuthModal, setShowAuthModal] = useState(false)
```

- [ ] **Step 3: Add Account section to JSX**

Add this block immediately before the `<Text style={[Typography.sectionTitle, styles.sectionSpacer]}>Subscription</Text>` line:

```typescript
<Text style={[Typography.sectionTitle, styles.sectionSpacer]}>Account</Text>
{session ? (
  <View style={styles.card}>
    <View style={styles.row}>
      <Ionicons name="person-outline" size={16} color={Colors.textSecondary} style={{ marginRight: Spacing.sm }} />
      <Text style={[styles.rowLabel, { flex: 1 }]} numberOfLines={1}>{session.user.email}</Text>
      <TouchableOpacity onPress={() => signOut().catch(() => {})}>
        <Text style={{ color: Colors.warning, fontSize: 14, fontWeight: '600' }}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  </View>
) : (
  <TouchableOpacity style={styles.card} onPress={() => setShowAuthModal(true)}>
    <View style={styles.row}>
      <Ionicons name="log-in-outline" size={16} color={Colors.accent} style={{ marginRight: Spacing.sm }} />
      <Text style={[styles.rowLabel, { color: Colors.accent }]}>Sign In</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.accent} />
    </View>
  </TouchableOpacity>
)}
```

- [ ] **Step 4: Add `AuthModal` to JSX**

Add this just before the closing `</ScrollView>` tag (before the `<Modal visible={showFeatureModal}...` block):

```typescript
<AuthModal
  visible={showAuthModal}
  onClose={() => setShowAuthModal(false)}
  onSuccess={() => setShowAuthModal(false)}
/>
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "spots.tsx"
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add app/\(tabs\)/settings.tsx
git commit -m "feat: add Account section to Settings (sign in / sign out)"
```

---

## Task 11: Replace `catchLogStore` test + delete store

**Files:**
- Modify: `__tests__/catchLogStore.test.ts` → rename to `__tests__/catchLogService.test.ts`
- Delete: `store/catchLogStore.ts`

- [ ] **Step 1: Replace the test file**

Delete `__tests__/catchLogStore.test.ts` and create `__tests__/catchLogService.test.ts`:

```typescript
import { fetchCatches, addCatch, deleteCatch } from '../services/catchLogService'

const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockDelete = jest.fn()

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      delete: mockDelete,
    })),
  },
}))

const MOCK_ROW = {
  id: 'abc-123',
  date: '2026-05-18',
  time: '08:00',
  spot_id: 'spot_1',
  spot_name: 'Bodega Bay',
  species: 'Halibut',
  weight: 4.5,
  length: 22,
  note: 'morning bite',
  fishing_score: 78,
}

describe('catchLogService', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetchCatches maps rows to CatchEntry', async () => {
    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [MOCK_ROW], error: null }),
        }),
      }),
    })
    const entries = await fetchCatches('user-1')
    expect(entries).toHaveLength(1)
    expect(entries[0].spotId).toBe('spot_1')
    expect(entries[0].fishingScore).toBe(78)
  })

  it('fetchCatches throws on error', async () => {
    mockSelect.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: null, error: new Error('db error') }),
        }),
      }),
    })
    await expect(fetchCatches('user-1')).rejects.toThrow('db error')
  })

  it('addCatch returns mapped entry', async () => {
    mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: MOCK_ROW, error: null }),
      }),
    })
    const entry = await addCatch('user-1', {
      date: '2026-05-18', time: '08:00',
      spotId: 'spot_1', spotName: 'Bodega Bay',
      species: 'Halibut', weight: 4.5, length: 22,
      note: 'morning bite', fishingScore: 78,
    })
    expect(entry.id).toBe('abc-123')
    expect(entry.species).toBe('Halibut')
  })

  it('deleteCatch throws on error', async () => {
    mockDelete.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: new Error('delete failed') }),
    })
    await expect(deleteCatch('abc-123')).rejects.toThrow('delete failed')
  })
})
```

- [ ] **Step 2: Delete `store/catchLogStore.ts`**

```bash
rm store/catchLogStore.ts
```

- [ ] **Step 3: Run the new tests**

```bash
npx jest __tests__/catchLogService.test.ts --no-coverage
```

Expected: 4 tests pass.

- [ ] **Step 4: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass (catchLogStore tests replaced, no regressions).

- [ ] **Step 5: Commit**

```bash
git add __tests__/catchLogService.test.ts
git rm store/catchLogStore.ts
git commit -m "refactor: replace catchLogStore with catchLogService tests, remove local store"
```
