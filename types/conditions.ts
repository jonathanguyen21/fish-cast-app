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
  readings: number[]
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

export interface HourlyWind {
  hour: number
  speed: number
  directionLabel: string
}

export interface ScoreFactor {
  key: 'pressure' | 'solunar' | 'tide' | 'wind' | 'waterTemp' | 'sky'
  label: string
  points: number
  max: number
  note: string
}

export interface ScoreBreakdown {
  total: number
  factors: ScoreFactor[]
  scaled: boolean
  capNote: string | null
}

export interface HourlyScore {
  hour: string
  hourIndex: number
  score: number
  breakdown?: ScoreBreakdown
}

export interface DayForecast {
  date: string                      // 'YYYY-MM-DD'
  dayLabel: string                  // 'Today', 'Thu', ...
  peakScore: number
  scoreLabel: string
  peakWindow: { start: string; end: string }
  hourlyScores: HourlyScore[]       // 24 entries
  tideEvents: TideEvent[]
  sun: SunData
  moon: MoonData
}

export interface ConditionsData {
  fishingScore: number
  scoreLabel: string
  currentBreakdown: ScoreBreakdown
  bestWindow: { start: string; end: string; score: number; passed?: boolean }
  wind: WindData
  windHourly: HourlyWind[]
  tide: TideData | null
  water: { temp: number; unit: string; estimated: boolean }
  air: AirData
  pressure: PressureData
  swell: SwellData | null
  sky: SkyData
  sun: SunData
  moon: MoonData
  hourlyScores: HourlyScore[]
}
