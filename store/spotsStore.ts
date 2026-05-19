import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Spot } from '../types/spot'

interface SpotsState {
  spots: Spot[]
  activeSpotId: string | null
  activeSpot: Spot | null
  addSpot: (spot: Spot) => void
  removeSpot: (id: string) => void
  setActiveSpot: (id: string) => void
  setSpots: (spots: Spot[]) => void
  clear: () => void
}

export const useSpotsStore = create<SpotsState>()(
  persist(
    (set, get) => ({
      spots: [],
      activeSpotId: null,
      activeSpot: null,
      addSpot: (spot) => set(state => {
        const newState = {
          spots: [...state.spots, spot],
          activeSpotId: state.activeSpotId ?? spot.id,
        }
        return {
          ...newState,
          activeSpot: newState.spots.find(s => s.id === newState.activeSpotId) ?? null,
        }
      }),
      removeSpot: (id) => set(state => {
        const spots = state.spots.filter(s => s.id !== id)
        const activeSpotId = state.activeSpotId === id
          ? (spots[0]?.id ?? null)
          : state.activeSpotId
        return {
          spots,
          activeSpotId,
          activeSpot: spots.find(s => s.id === activeSpotId) ?? null,
        }
      }),
      setActiveSpot: (id) => set(state => ({
        activeSpotId: id,
        activeSpot: state.spots.find(s => s.id === id) ?? null,
      })),
      setSpots: (spots) => set(state => {
        const activeSpotId = spots.some(s => s.id === state.activeSpotId)
          ? state.activeSpotId
          : (spots[0]?.id ?? null)
        return {
          spots,
          activeSpotId,
          activeSpot: spots.find(s => s.id === activeSpotId) ?? null,
        }
      }),
      clear: () => set({ spots: [], activeSpotId: null, activeSpot: null }),
    }),
    {
      name: 'fishcast-spots',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
