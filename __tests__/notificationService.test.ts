import type { ConditionsData } from '../types/conditions'

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}))

import * as Notifications from 'expo-notifications'
import { maybeScheduleFishingAlert } from '../services/notificationService'

function makeConditions(score: number): ConditionsData {
  return {
    fishingScore: score,
    scoreLabel: 'Good',
    bestWindow: { start: '10:00 AM', end: '1:00 PM', score },
    wind: { speed: 10, gusts: 14, direction: 225, directionLabel: 'SW', unit: 'mph' },
    windHourly: [],
    airHourly: [],
    swellHourly: null,
    tide: null,
    water: { temp: 60, unit: '°F' },
    air: { temp: 62, high: 67, low: 55, humidity: 72, unit: '°F' },
    pressure: { value: 30.05, trend: 'stable', rate: 'normal', unit: 'inHg', readings: [] },
    swell: null,
    sky: { condition: 'Overcast', rainChance: 10, icon: 'overcast' },
    sun: { sunrise: '6:08 AM', sunset: '7:52 PM' },
    moon: { phase: 'Waxing Gibbous', illumination: 72, majorPeriods: [], minorPeriods: [] },
    hourlyScores: [],
    tidePhasesByHour: {},
    scoreBreakdown: { pressure: 15, solunar: 14, tide: 0, wind: 13, waterTemp: 8, sky: 10 },
  }
}

const getPermissions = Notifications.getPermissionsAsync as jest.Mock
const scheduleNotif = Notifications.scheduleNotificationAsync as jest.Mock

describe('maybeScheduleFishingAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not schedule when score is below threshold', async () => {
    getPermissions.mockResolvedValue({ status: 'granted' })
    await maybeScheduleFishingAlert(makeConditions(65), 'Bodega Bay', 'spot_below', 70)
    expect(scheduleNotif).not.toHaveBeenCalled()
  })

  it('does not schedule when permission is not granted', async () => {
    getPermissions.mockResolvedValue({ status: 'denied' })
    await maybeScheduleFishingAlert(makeConditions(85), 'Bodega Bay', 'spot_denied', 70)
    expect(scheduleNotif).not.toHaveBeenCalled()
  })

  it('schedules when score meets threshold and permission granted', async () => {
    getPermissions.mockResolvedValue({ status: 'granted' })
    await maybeScheduleFishingAlert(makeConditions(80), 'Bodega Bay', 'spot_fire', 70)
    expect(scheduleNotif).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: expect.stringContaining('Bodega Bay'),
        }),
        trigger: null,
      })
    )
  })

  it('notification body includes best window info', async () => {
    getPermissions.mockResolvedValue({ status: 'granted' })
    await maybeScheduleFishingAlert(makeConditions(82), 'Tomales Bay', 'spot_body', 70)
    const call = scheduleNotif.mock.calls[0][0]
    expect(call.content.body).toContain('10:00 AM')
    expect(call.content.body).toContain('1:00 PM')
  })

  it('does not schedule twice for same spot on same day', async () => {
    getPermissions.mockResolvedValue({ status: 'granted' })
    await maybeScheduleFishingAlert(makeConditions(85), 'Half Moon Bay', 'spot_dedup', 70)
    await maybeScheduleFishingAlert(makeConditions(85), 'Half Moon Bay', 'spot_dedup', 70)
    expect(scheduleNotif).toHaveBeenCalledTimes(1)
  })

  it('fires when score equals threshold (not strictly above)', async () => {
    getPermissions.mockResolvedValue({ status: 'granted' })
    await maybeScheduleFishingAlert(makeConditions(70), 'Stinson Beach', 'spot_exact', 70)
    expect(scheduleNotif).toHaveBeenCalled()
  })
})
