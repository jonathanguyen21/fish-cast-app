import { supabase } from '../lib/supabase'
import type { SpeciesAlert } from '../store/settingsStore'

export type StoredSettings = {
  tempUnit: 'F' | 'C'
  speedUnit: 'mph' | 'kts'
  lengthUnit: 'ft' | 'm'
  alertThreshold: number
  alertsEnabled: boolean
  isPro: boolean
  speciesAlerts: Record<string, SpeciesAlert>
}

export function settingsFromMetadata(meta: Record<string, unknown>): StoredSettings | null {
  if (!meta?.tempUnit) return null
  return {
    tempUnit: (meta.tempUnit as StoredSettings['tempUnit']) ?? 'F',
    speedUnit: (meta.speedUnit as StoredSettings['speedUnit']) ?? 'mph',
    lengthUnit: (meta.lengthUnit as StoredSettings['lengthUnit']) ?? 'ft',
    alertThreshold: (meta.alertThreshold as number) ?? 70,
    alertsEnabled: (meta.alertsEnabled as boolean) ?? false,
    isPro: (meta.isPro as boolean) ?? false,
    speciesAlerts: (meta.speciesAlerts as Record<string, SpeciesAlert>) ?? {},
  }
}

export async function saveSettings(settings: StoredSettings): Promise<void> {
  const { error } = await supabase.auth.updateUser({ data: settings })
  if (error) throw error
}
