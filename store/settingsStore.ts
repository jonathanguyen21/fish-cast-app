import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface SettingsState {
  tempUnit: 'F' | 'C'
  speedUnit: 'mph' | 'kts'
  lengthUnit: 'ft' | 'm'
  alertThreshold: number
  alertsEnabled: boolean
  isPro: boolean
  setTempUnit: (u: 'F' | 'C') => void
  setSpeedUnit: (u: 'mph' | 'kts') => void
  setLengthUnit: (u: 'ft' | 'm') => void
  setAlertThreshold: (n: number) => void
  setAlertsEnabled: (v: boolean) => void
  setIsPro: (v: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      tempUnit: 'F',
      speedUnit: 'mph',
      lengthUnit: 'ft',
      alertThreshold: 70,
      alertsEnabled: false,
      isPro: false,
      setTempUnit: (tempUnit) => set({ tempUnit }),
      setSpeedUnit: (speedUnit) => set({ speedUnit }),
      setLengthUnit: (lengthUnit) => set({ lengthUnit }),
      setAlertThreshold: (alertThreshold) => set({ alertThreshold }),
      setAlertsEnabled: (alertsEnabled) => set({ alertsEnabled }),
      setIsPro: (isPro) => set({ isPro }),
    }),
    {
      name: 'fishcast-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
