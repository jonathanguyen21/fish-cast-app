export interface WindData {
  speed: number
  gusts: number
  direction: number
  directionLabel: string
  unit: string
}

export interface TideEvent {
  type: 'high' | 'low'
  time: string
  height: number
}

export type TidePhase = 'incoming' | 'outgoing' | 'slack'

export interface TideData {
  current: { height: number; rising: boolean; unit: string }
  next: { type: 'high' | 'low'; time: string; height: number }
  events: TideEvent[]
  hourlyCurve: number[]
  phase: TidePhase
}

export interface AirData {
  temp: number
  high: number
  low: number
  humidity: number
  unit: string
}

export interface PressureData {
  value: number
  trend: 'rising' | 'falling' | 'stable'
  rate: 'slow' | 'fast' | 'normal'
  unit: string
}

export interface SwellData {
  height: number
  period: number
  direction: number
  directionLabel: string
  unit: string
}

export interface SkyData {
  condition: 'Clear' | 'Partly Cloudy' | 'Overcast' | 'Light Rain' | 'Heavy Rain'
  rainChance: number
  icon: 'clear' | 'partly-cloudy' | 'overcast' | 'light-rain' | 'heavy-rain'
}

export interface SunData {
  sunrise: string
  sunset: string
}

export interface MoonData {
  phase: string
  illumination: number
  majorPeriods: { start: string; end: string }[]
  minorPeriods: { start: string; end: string }[]
}

export interface HourlyScore {
  hour: string
  score: number
}

export interface DayForecast {
  date: string
  dayLabel: string
  peakScore: number
  scoreLabel: string
  peakWindow: { start: string; end: string }
}

export interface ConditionsData {
  fishingScore: number
  scoreLabel: string
  bestWindow: { start: string; end: string; score: number }
  wind: WindData
  tide: TideData | null
  water: { temp: number; unit: string }
  air: AirData
  pressure: PressureData
  swell: SwellData | null
  sky: SkyData
  sun: SunData
  moon: MoonData
  hourlyScores: HourlyScore[]
}
