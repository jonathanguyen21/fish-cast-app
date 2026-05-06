import type { Region } from '../../types/spot'
import type { Species } from '../../types/species'
import { westCoastSpecies } from './westCoast'
import { northeastSpecies } from './northeast'
import { southeastSpecies } from './southeast'
import { freshwaterSpecies } from './freshwater'

export function getSpeciesForRegion(lat: number, lng: number): Species[] {
  const region = detectRegion(lat, lng)
  switch (region) {
    case 'west_coast': return westCoastSpecies
    case 'northeast': return northeastSpecies
    case 'southeast': return southeastSpecies
    case 'freshwater': return freshwaterSpecies
  }
}

export function detectRegion(lat: number, lng: number): Region {
  if (lng < -114 && lat >= 32 && lat <= 49) return 'west_coast'
  if (lng > -82 && lat >= 24 && lat <= 31) return 'southeast'
  if (lng > -80 && lat > 35) return 'northeast'
  return 'freshwater'
}
