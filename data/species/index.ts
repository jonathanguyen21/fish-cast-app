import type { Region } from '../../types/spot'
import type { Species, WaterType } from '../../types/species'
import { westCoastSpecies } from './westCoast'
import { northeastSpecies } from './northeast'
import { southeastSpecies } from './southeast'
import { freshwaterSpecies } from './freshwater'

export function getSpeciesForRegion(lat: number, lng: number, spotType: WaterType): Species[] {
  // Spot type wins over geography: a lake in California is still freshwater
  if (spotType === 'freshwater') return freshwaterSpecies
  const region = detectRegion(lat, lng)
  switch (region) {
    case 'west_coast': return westCoastSpecies
    case 'southeast': return southeastSpecies
    case 'northeast': return northeastSpecies
    case 'freshwater': return [] // saltwater spot outside covered coasts — no data yet
  }
}

export function detectRegion(lat: number, lng: number): Region {
  if (lng <= -117 && lat >= 32 && lat <= 49) return 'west_coast'
  // Gulf of Mexico + South Atlantic (Texas through the Carolinas)
  if (lat >= 24 && lat <= 35 && lng >= -98 && lng <= -75) return 'southeast'
  // Mid-Atlantic through Maine
  if (lat > 35 && lng >= -82) return 'northeast'
  return 'freshwater'
}
