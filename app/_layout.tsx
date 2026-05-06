import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import AsyncStorage from '@react-native-async-storage/async-storage'
import 'react-native-reanimated'
import { Colors } from '../theme/colors'

export { ErrorBoundary } from 'expo-router'

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

  useEffect(() => { if (error) throw error }, [error])
  useEffect(() => { if (loaded) SplashScreen.hideAsync() }, [loaded])

  if (!loaded) return null

  return (
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
      </Stack>
    </PersistQueryClientProvider>
  )
}
