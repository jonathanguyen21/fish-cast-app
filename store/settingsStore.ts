import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface SpeciesAlert {
  threshold: number
  enabled: boolean
}

interface SettingsState {
  tempUnit: 'F' | 'C'
  speedUnit: 'mph' | 'kts'
  lengthUnit: 'ft' | 'm'
  alertThreshold: number
  alertsEnabled: boolean
  isPro: boolean
  speciesAlerts: Record<string, SpeciesAlert>
  setTempUnit: (u: 'F' | 'C') => void
  setSpeedUnit: (u: 'mph' | 'kts') => void
  setLengthUnit: (u: 'ft' | 'm') => void
  setAlertThreshold: (n: number) => void
  setAlertsEnabled: (v: boolean) => void
  setIsPro: (v: boolean) => void
  setSpeciesAlert: (speciesId: string, alert: Partial<SpeciesAlert>) => void
  clearSpeciesAlert: (speciesId: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      tempUnit: 'F',
      speedUnit: 'mph',
      lengthUnit: 'ft',
      alertThreshold: 70,
      alertsEnabled: false,
      isPro: false,
      speciesAlerts: {},
      setTempUnit: (tempUnit) => set({ tempUnit }),
      setSpeedUnit: (speedUnit) => set({ speedUnit }),
      setLengthUnit: (lengthUnit) => set({ lengthUnit }),
      setAlertThreshold: (alertThreshold) => set({ alertThreshold }),
      setAlertsEnabled: (alertsEnabled) => set({ alertsEnabled }),
      setIsPro: (isPro) => set({ isPro }),
      setSpeciesAlert: (speciesId, partial) => {
        const existing = get().speciesAlerts[speciesId]
        const merged: SpeciesAlert = {
          threshold: partial.threshold ?? existing?.threshold ?? get().alertThreshold,
          enabled: partial.enabled ?? existing?.enabled ?? false,
        }
        set({ speciesAlerts: { ...get().speciesAlerts, [speciesId]: merged } })
      },
      clearSpeciesAlert: (speciesId) => {
        const next = { ...get().speciesAlerts }
        delete next[speciesId]
        set({ speciesAlerts: next })
      },
    }),
    {
      name: 'fishcast-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
