import type { ConditionsData } from '../types/conditions'
import type { DayForecast } from '../types/conditions'
import type { Spot } from '../types/spot'

export const MOCK_SPOT: Spot = {
  id: 'spot_1',
  name: 'Bodega Bay',
  lat: 38.33,
  lng: -123.05,
  type: 'saltwater',
  stationId: '9415020',
  region: 'west_coast',
}

export const MOCK_CONDITIONS: ConditionsData = {
  fishingScore: 82,
  scoreLabel: 'Great day to fish',
  bestWindow: { start: '2:00 PM', end: '5:00 PM', score: 91 },
  wind: { speed: 8, gusts: 14, direction: 225, directionLabel: 'SW', unit: 'mph' },
  windHourly: [],
  tide: {
    current: { height: 3.2, rising: true, unit: 'ft' },
    next: { type: 'high', time: '3:42 PM', height: 5.1 },
    events: [
      { type: 'low', time: '9:18 AM', height: 0.3 },
      { type: 'high', time: '3:42 PM', height: 5.1 },
      { type: 'low', time: '9:55 PM', height: 0.8 },
      { type: 'high', time: '4:12 AM', height: 4.6 },
    ],
    hourlyCurve: [0.8,0.5,0.3,0.5,1.1,1.9,2.8,3.6,4.3,4.8,5.0,5.1,
                  4.9,4.5,3.8,3.0,2.2,1.5,1.0,0.8,0.9,1.3,1.9,2.7],
    phase: 'incoming',
  },
  water: { temp: 57, unit: '°F' },
  air: { temp: 62, high: 67, low: 52, humidity: 78, unit: '°F' },
  pressure: { value: 30.02, trend: 'falling', rate: 'slow', unit: 'inHg', readings: [] },
  swell: { height: 4.5, period: 12, direction: 290, directionLabel: 'WNW', unit: 'ft' },
  sky: { condition: 'Partly Cloudy', rainChance: 15, icon: 'partly-cloudy' },
  sun: { sunrise: '6:12 AM', sunset: '7:58 PM' },
  moon: {
    phase: 'Waxing Gibbous',
    illumination: 78,
    majorPeriods: [{ start: '2:15 PM', end: '4:15 PM' }, { start: '2:45 AM', end: '4:45 AM' }],
    minorPeriods: [{ start: '8:30 AM', end: '9:30 AM' }, { start: '9:00 PM', end: '10:00 PM' }],
  },
  hourlyScores: [
    { hour: '5AM', score: 65 }, { hour: '6AM', score: 72 },
    { hour: '7AM', score: 68 }, { hour: '8AM', score: 55 },
    { hour: '9AM', score: 48 }, { hour: '10AM', score: 42 },
    { hour: '11AM', score: 38 }, { hour: '12PM', score: 45 },
    { hour: '1PM', score: 58 }, { hour: '2PM', score: 78 },
    { hour: '3PM', score: 91 }, { hour: '4PM', score: 88 },
    { hour: '5PM', score: 82 }, { hour: '6PM', score: 75 },
    { hour: '7PM', score: 70 }, { hour: '8PM', score: 62 },
  ],
}

export const MOCK_FORECAST: DayForecast[] = [
  { date: '2026-05-04', dayLabel: 'Today', peakScore: 82, scoreLabel: 'Great day to fish', peakWindow: { start: '2 PM', end: '5 PM' } },
  { date: '2026-05-05', dayLabel: 'Tue', peakScore: 71, scoreLabel: 'Great day to fish', peakWindow: { start: '3 PM', end: '6 PM' } },
  { date: '2026-05-06', dayLabel: 'Wed', peakScore: 58, scoreLabel: 'Decent — pick your window', peakWindow: { start: '6 AM', end: '9 AM' } },
  { date: '2026-05-07', dayLabel: 'Thu', peakScore: 44, scoreLabel: 'Tough but possible', peakWindow: { start: '7 AM', end: '9 AM' } },
  { date: '2026-05-08', dayLabel: 'Fri', peakScore: 67, scoreLabel: 'Decent — pick your window', peakWindow: { start: '4 PM', end: '7 PM' } },
  { date: '2026-05-09', dayLabel: 'Sat', peakScore: 88, scoreLabel: 'Great day to fish', peakWindow: { start: '7 AM', end: '10 AM' } },
  { date: '2026-05-10', dayLabel: 'Sun', peakScore: 79, scoreLabel: 'Great day to fish', peakWindow: { start: '5 PM', end: '8 PM' } },
]
