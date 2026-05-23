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
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export async function maybeScheduleFishingAlert(
  conditions: ConditionsData,
  spotName: string,
  spotId: string,
  threshold: number
): Promise<void> {
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

export async function scheduleWindowReminder(
  spotName: string,
  windowStart: string,
  windowEnd: string,
  score: number
): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') return false

  function parseStart(t: string): Date | null {
    const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (!m) return null
    let h = parseInt(m[1])
    const min = parseInt(m[2])
    if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
    if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
    const d = new Date()
    d.setHours(h, min, 0, 0)
    return d
  }

  const startDate = parseStart(windowStart)
  if (!startDate) return false
  const reminderTime = new Date(startDate.getTime() - 30 * 60 * 1000)
  if (reminderTime <= new Date()) return false

  await Notifications.cancelAllScheduledNotificationsAsync()
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🎣 Best window opens in 30min at ${spotName}`,
      body: `Score ${score} · ${windowStart}–${windowEnd} · Get your gear ready`,
      sound: true,
    },
    trigger: { date: reminderTime, type: Notifications.SchedulableTriggerInputTypes.DATE },
  })
  return true
}
