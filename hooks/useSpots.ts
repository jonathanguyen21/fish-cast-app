import { useSpotsStore } from '../store/spotsStore'
import { useAuthStore } from '../store/authStore'
import { saveSpot, deleteSpot } from '../services/spotsService'
import type { Spot } from '../types/spot'

export function useSpots() {
  const spots = useSpotsStore(s => s.spots)
  const activeSpot = useSpotsStore(s => s.activeSpot)
  const activeSpotId = useSpotsStore(s => s.activeSpotId)
  const _addSpot = useSpotsStore(s => s.addSpot)
  const _removeSpot = useSpotsStore(s => s.removeSpot)
  const _updateSpot = useSpotsStore(s => s.updateSpot)
  const setActiveSpot = useSpotsStore(s => s.setActiveSpot)
  const userId = useAuthStore(s => s.session)?.user.id ?? null

  const addSpot = (spot: Spot) => {
    _addSpot(spot)
    if (userId) saveSpot(userId, spot).catch(() => {})
  }

  const removeSpot = (id: string) => {
    _removeSpot(id)
    if (userId) deleteSpot(id).catch(() => {})
  }

  const updateSpot = (id: string, partial: Partial<Omit<Spot, 'id'>>) => {
    _updateSpot(id, partial)
    if (userId) {
      const updated = useSpotsStore.getState().spots.find(s => s.id === id)
      if (updated) saveSpot(userId, updated).catch(() => {})
    }
  }

  return { spots, activeSpot, activeSpotId, addSpot, removeSpot, updateSpot, setActiveSpot }
}
