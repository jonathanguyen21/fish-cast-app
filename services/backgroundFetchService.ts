import * as BackgroundFetch from 'expo-background-fetch'
import * as TaskManager from 'expo-task-manager'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { fetchNoaaData } from './noaaService'
import { fetchNwsData } from './nwsService'
import { fetchMarineData } from './marineService'
import { calculateSolunar } from './solunarService'
import { buildConditionsData } from './scoringService'
import { maybeScheduleFishingAlert } from './notificationService'
import type { Spot } from '../types/spot'

export const FISHING_ALERT_TASK = 'fishing-alert-check'

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Must be defined at module top level — TaskManager requires this
TaskManager.defineTask(FISHING_ALERT_TASK, async () => {
  try {
    const [spotsRaw, settingsRaw] = await Promise.all([
      AsyncStorage.getItem('fishcast-spots'),
      AsyncStorage.getItem('fishcast-settings'),
    ])

    if (!spotsRaw || !settingsRaw) {
      return BackgroundFetch.BackgroundFetchResult.NoData
    }

    const spotsState = JSON.parse(spotsRaw)
    const settingsState = JSON.parse(settingsRaw)

    // Zustand persist wraps state: { state: {...}, version: ... }
    const spots: Spot[] = spotsState?.state?.spots ?? []
    const activeSpotId: string | null = spotsState?.state?.activeSpotId ?? null
    const alertsEnabled: boolean = settingsState?.state?.alertsEnabled ?? false
    const alertThreshold: number = settingsState?.state?.alertThreshold ?? 70

    if (!alertsEnabled) return BackgroundFetch.BackgroundFetchResult.NoData

    const spot: Spot | null =
      (activeSpotId ? spots.find(s => s.id === activeSpotId) : null) ?? spots[0] ?? null
    if (!spot) return BackgroundFetch.BackgroundFetchResult.NoData

    const now = new Date()
    const today = localDateKey(now)

    const [noaaResult, nwsResult, marineResult] = await Promise.allSettled([
      fetchNoaaData(spot),
      fetchNwsData(spot),
      fetchMarineData(spot),
    ])

    const solunar = calculateSolunar(spot.lat, spot.lng, now)

    const conditions = buildConditionsData(
      today,
      noaaResult.status === 'fulfilled' ? noaaResult.value : null,
      nwsResult.status === 'fulfilled' ? nwsResult.value?.byDay ?? null : null,
      marineResult.status === 'fulfilled' ? marineResult.value : null,
      solunar,
      spot,
      now,
    )

    await maybeScheduleFishingAlert(conditions, spot.name, spot.id, alertThreshold)
    return BackgroundFetch.BackgroundFetchResult.NewData
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed
  }
})

export async function registerFishingAlertTask(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync()
  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    return
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(FISHING_ALERT_TASK)
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(FISHING_ALERT_TASK, {
      minimumInterval: 60 * 60, // 1 hour in seconds
      stopOnTerminate: false,
      startOnBoot: true,
    })
  }
}
