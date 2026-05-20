import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { CatchEntry } from '../types/catchLog'

interface LocalCatchLogState {
  entries: CatchEntry[]
  addEntry: (entry: Omit<CatchEntry, 'id'>) => void
  deleteEntry: (id: string) => void
  clearAll: () => void
}

export const useLocalCatchLogStore = create<LocalCatchLogState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) => set(state => ({
        entries: [
          { ...entry, id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}` },
          ...state.entries,
        ],
      })),
      deleteEntry: (id) => set(state => ({
        entries: state.entries.filter(e => e.id !== id),
      })),
      clearAll: () => set({ entries: [] }),
    }),
    {
      name: 'fishcast-local-catches',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
