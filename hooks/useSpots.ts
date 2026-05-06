import { useSpotsStore } from '../store/spotsStore'

export function useSpots() {
  const spots = useSpotsStore(s => s.spots)
  const activeSpot = useSpotsStore(s => s.activeSpot)
  const activeSpotId = useSpotsStore(s => s.activeSpotId)
  const addSpot = useSpotsStore(s => s.addSpot)
  const removeSpot = useSpotsStore(s => s.removeSpot)
  const setActiveSpot = useSpotsStore(s => s.setActiveSpot)
  return { spots, activeSpot, activeSpotId, addSpot, removeSpot, setActiveSpot }
}
