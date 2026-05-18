import React from 'react'
import { View, Text } from 'react-native'
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
import { useSpotsStore } from '../store/spotsStore'
import { DEFAULT_SPOTS } from '../data/defaultSpots'
import { resolveNearestStation } from '../services/noaaStationService'
import { detectRegion } from '../data/species'

export { ErrorBoundary } from 'expo-router'

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0B1622', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 64, marginBottom: 16, color: '#F59E0B' }}>⚠</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#F1F5F9', textAlign: 'center' }}>Something went wrong</Text>
          <Text style={{ fontSize: 14, color: '#94A3B8', marginTop: 8, textAlign: 'center' }}>Pull to refresh or restart the app</Text>
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
  const spots = useSpotsStore(s => s.spots)
  const addSpot = useSpotsStore(s => s.addSpot)
  const hasSeeded = useRef(false)

  useEffect(() => { if (error) throw error }, [error])
  useEffect(() => { if (loaded) SplashScreen.hideAsync() }, [loaded])
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
