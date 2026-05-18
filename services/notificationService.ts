import * as Notifications from 'expo-notifications'
import type { ConditionsData } from '../types/conditions'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

let lastNotifiedSpotId: string | null = null
let lastNotifiedDate: string | null = null

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export async function maybeScheduleFishingAlert(
  conditions: ConditionsData,
  spotName: string,
  spotId: string,
  threshold: number
): Promise<void> {
  const key = `${spotId}-${todayKey()}`
  if (lastNotifiedSpotId === spotId && lastNotifiedDate === todayKey()) return

  if (conditions.fishingScore < threshold) return

  const { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') return

  lastNotifiedSpotId = spotId
  lastNotifiedDate = todayKey()

  const { start, end, score } = conditions.bestWindow
  const windowStr = `${start}–${end}`
  const body = `Score ${score} · Best window ${windowStr}`

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Great fishing at ${spotName} today`,
      body,
      sound: true,
    },
    trigger: null,
  })
}
