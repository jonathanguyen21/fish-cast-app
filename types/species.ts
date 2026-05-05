export type SpeciesTier = 'free' | 'pro'
export type WaterType = 'saltwater' | 'freshwater'
export type TimeOfDay = 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night'
export type TidePreference = 'incoming' | 'outgoing' | 'any'

export interface Species {
  id: string
  common_name: string
  scientific_name: string
  region: import('./spot').Region
  type: WaterType
  tier: SpeciesTier
  months_present: number[]
  months_peak: number[]
  water_temp_f: { min: number; max: number; peak_min: number; peak_max: number }
  preferred_tide: TidePreference
  preferred_time_of_day: TimeOfDay[]
  migration_notes: string
  tips: string
}

export interface SpeciesScore {
  species: Species
  score: number
  status: 'Peak Season' | 'Active' | 'Present' | 'Inactive'
  waterTempMatch: string
  tideMatch: string
  timeMatch: string
}
