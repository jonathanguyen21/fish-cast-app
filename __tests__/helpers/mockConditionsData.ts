import type { ConditionsData } from '../../types/conditions'

const mockConditionsData: ConditionsData = {
  fishingScore: 72,
  scoreLabel: 'Great day to fish',
  bestWindow: { start: '2:00 PM', end: '5:00 PM', score: 85 },
  wind: { speed: 8, gusts: 12, direction: 225, directionLabel: 'SW', unit: 'mph' },
  windHourly: [
    { hour: 6, speed: 5, gusts: 8, direction: 200, directionLabel: 'SSW' },
    { hour: 7, speed: 6, gusts: 9, direction: 205, directionLabel: 'SSW' },
    { hour: 8, speed: 7, gusts: 10, direction: 210, directionLabel: 'SSW' },
    { hour: 9, speed: 8, gusts: 12, direction: 215, directionLabel: 'SW' },
    { hour: 10, speed: 9, gusts: 13, direction: 220, directionLabel: 'SW' },
    { hour: 11, speed: 10, gusts: 15, direction: 225, directionLabel: 'SW' },
    { hour: 12, speed: 11, gusts: 16, direction: 225, directionLabel: 'SW' },
    { hour: 13, speed: 12, gusts: 18, direction: 230, directionLabel: 'SW' },
    { hour: 14, speed: 13, gusts: 19, direction: 230, directionLabel: 'SW' },
    { hour: 15, speed: 12, gusts: 17, direction: 225, directionLabel: 'SW' },
    { hour: 16, speed: 10, gusts: 15, direction: 220, directionLabel: 'SW' },
    { hour: 17, speed: 8, gusts: 12, direction: 215, directionLabel: 'SSW' },
  ],
  airHourly: [],
  swellHourly: null,
  tide: {
    current: { height: 3.2, rising: true, unit: 'ft' },
    next: { type: 'high', time: '3:42 PM', height: 5.1 },
    events: [
      { type: 'low', time: '9:15 AM', height: 0.4 },
      { type: 'high', time: '3:42 PM', height: 5.1 },
    ],
    hourlyCurve: [2.1, 1.8, 1.5, 1.2, 1.0, 1.1, 1.4, 1.9, 2.5, 3.1, 3.6, 4.0, 4.3, 4.5, 4.6, 4.5, 4.2, 3.7, 3.1, 2.5, 2.0, 1.7, 1.6, 1.8],
    phase: 'incoming',
  },
  water: { temp: 58, unit: '°F', estimated: false },
  air: { temp: 62, high: 67, low: 55, humidity: 72, unit: '°F' },
  pressure: { value: 30.05, trend: 'falling', rate: 'slow', unit: 'inHg', readings: [30.18, 30.05] },
  swell: null,
  sky: { condition: 'Overcast', rainChance: 10, icon: 'overcast' },
  sun: { sunrise: '6:08 AM', sunset: '7:52 PM', goldenHourMorning: '6:38 AM', goldenHourEvening: '7:22 PM' },
  moon: {
    phase: 'Waxing Gibbous',
    illumination: 72,
    majorPeriods: [{ start: '2:00 PM', end: '3:00 PM' }],
    minorPeriods: [{ start: '8:00 AM', end: '9:00 AM' }],
  },
  hourlyScores: [],
  tidePhasesByHour: {},
  scoreBreakdown: { pressure: 25, solunar: 14, tide: 15, wind: 13, waterTemp: 8, sky: 10 },
}

export default mockConditionsData
