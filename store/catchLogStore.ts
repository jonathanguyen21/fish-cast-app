import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface CatchEntry {
  id: string
  date: string          // 'YYYY-MM-DD'
  time: string          // 'HH:MM'
  spotId: string
  spotName: string
  species: string
  weight?: number       // lbs
  length?: number       // inches
  note?: string
  fishingScore?: number
  weather?: string
}

interface CatchLogState {
  entries: CatchEntry[]
  addEntry: (entry: Omit<CatchEntry, 'id'>) => void
  updateEntry: (id: string, patch: Partial<CatchEntry>) => void
  deleteEntry: (id: string) => void
}

export const useCatchLogStore = create<CatchLogState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) => set((s) => ({
        entries: [
          { ...entry, id: `catch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` },
          ...s.entries,
        ],
      })),
      updateEntry: (id, patch) => set((s) => ({
        entries: s.entries.map(e => e.id === id ? { ...e, ...patch } : e),
      })),
      deleteEntry: (id) => set((s) => ({
        entries: s.entries.filter(e => e.id !== id),
      })),
    }),
    {
      name: 'catch-log-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
