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
  const setActiveSpot = useSpotsStore(s => s.setActiveSpot)
  const userId = useAuthStore(s => s.session)?.user.id ?? null

  const addSpot = (spot: Spot) => {
    _addSpot(spot)
    if (userId) {
      saveSpot(userId, spot).catch(() => {})
    }
  }

  const removeSpot = (id: string) => {
    _removeSpot(id)
    if (userId) {
      deleteSpot(id).catch(() => {})
    }
  }

  return { spots, activeSpot, activeSpotId, addSpot, removeSpot, setActiveSpot }
}
