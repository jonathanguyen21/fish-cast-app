import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useRef } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import AsyncStorage from '@react-native-async-storage/async-storage'
import 'react-native-reanimated'
import { Colors } from '../theme/colors'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useSpotsStore } from '../store/spotsStore'
import { DEFAULT_SPOTS } from '../data/defaultSpots'
import { resolveNearestStation } from '../services/noaaStationService'
import { detectRegion } from '../data/species'
import { fetchSpots, saveAllSpots } from '../services/spotsService'
import { settingsFromMetadata, saveSettings } from '../services/settingsService'
import { useSettingsStore } from '../store/settingsStore'

export { ErrorBoundary } from 'expo-router'

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="warning-outline" size={56} color={Colors.warning} style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' }}>Something went wrong</Text>
          <Text style={{ fontSize: 14, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' }}>Restart the app to continue</Text>
          <TouchableOpacity
            style={{ marginTop: 24, backgroundColor: Colors.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={{ color: Colors.background, fontWeight: '700', fontSize: 15 }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )
    }
    return this.props.children
  }
}

export const unstable_settings = { initialRouteName: '(tabs)' }

SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 30, retry: 2 },
  },
})

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'fishcast-query-cache',
})

export default function RootLayout() {
  const [loaded, error] = useFonts({})
  const setSession = useAuthStore(s => s.setSession)
  const userId = useAuthStore(s => s.session)?.user.id ?? null
  const spots = useSpotsStore(s => s.spots)
  const addSpot = useSpotsStore(s => s.addSpot)
  const setSpots = useSpotsStore(s => s.setSpots)
  const setAllSettings = useSettingsStore(s => s.setAll)
  const hasSeeded = useRef(false)
  const spotsRef = useRef(spots)
  useEffect(() => { spotsRef.current = spots }, [spots])

  useEffect(() => { if (error) throw error }, [error])
  useEffect(() => { if (loaded) SplashScreen.hideAsync() }, [loaded])
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    }).catch(() => {})
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        const uid = session.user.id
        fetchSpots(uid).then(remoteSpots => {
          if (remoteSpots.length > 0) {
            setSpots(remoteSpots)
          } else {
            const local = spotsRef.current
            if (local.length > 0) {
              saveAllSpots(uid, local).catch(() => {})
            }
          }
        }).catch(() => {})
        const s = settingsFromMetadata(session.user.user_metadata ?? {})
        if (s) setAllSettings(s)
      }
    })
    return () => subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!userId) return
    return useSettingsStore.subscribe((state) => {
      saveSettings(state).catch(() => {})
    })
  }, [userId])

  useEffect(() => {
    if (hasSeeded.current || spots.length > 0) return
    hasSeeded.current = true
    DEFAULT_SPOTS.forEach(async (s) => {
      const stationId = s.type === 'saltwater'
        ? await resolveNearestStation(s.lat, s.lng)
        : null
      addSpot({
        id: `default-${s.name.replace(/\s+/g, '-').toLowerCase()}`,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        type: s.type,
        stationId,
        region: detectRegion(s.lat, s.lng),
      })
    })
  }, [])

  if (!loaded) return null

  return (
    <AppErrorBoundary>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister, maxAge: 24 * 60 * 60 * 1000 }}
    >
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="spot/new" options={{ title: 'Add Spot', presentation: 'modal' }} />
        <Stack.Screen name="species/[id]" options={{ title: 'Species Detail', presentation: 'modal' }} />
        <Stack.Screen
          name="detail/wind"
          options={{ title: 'Wind Detail', presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="detail/pressure"
          options={{ title: 'Pressure Detail', presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="detail/swell"
          options={{ title: 'Swell Detail', presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="detail/airtemp"
          options={{ title: 'Air Temp', presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="detail/sky"
          options={{ title: 'Sky & Rain', presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="detail/moon"
          options={{ title: 'Moon & Solunar', presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="detail/sun"
          options={{ title: 'Sun', presentation: 'modal', headerShown: false }}
        />
      </Stack>
    </PersistQueryClientProvider>
    </AppErrorBoundary>
  )
}
