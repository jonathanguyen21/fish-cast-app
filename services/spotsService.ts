import { supabase } from '../lib/supabase'
import type { Spot, SpotType, Region } from '../types/spot'

type DbRow = {
  id: string
  user_id: string
  name: string
  lat: number
  lng: number
  type: string
  station_id: string | null
  region: string | null
}

function rowToSpot(row: DbRow): Spot {
  return {
    id: row.id,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    type: row.type as SpotType,
    stationId: row.station_id,
    region: (row.region ?? 'west_coast') as Region,
  }
}

function spotToRow(userId: string, spot: Spot) {
  return {
    id: spot.id,
    user_id: userId,
    name: spot.name,
    lat: spot.lat,
    lng: spot.lng,
    type: spot.type,
    station_id: spot.stationId,
    region: spot.region,
  }
}

export async function fetchSpots(userId: string): Promise<Spot[]> {
  const { data, error } = await supabase
    .from('spots')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as DbRow[]).map(rowToSpot)
}

export async function saveSpot(userId: string, spot: Spot): Promise<void> {
  const { error } = await supabase.from('spots').upsert(spotToRow(userId, spot))
  if (error) throw error
}

export async function deleteSpot(id: string): Promise<void> {
  const { error } = await supabase.from('spots').delete().eq('id', id)
  if (error) throw error
}

export async function saveAllSpots(userId: string, spots: Spot[]): Promise<void> {
  if (spots.length === 0) return
  const { error } = await supabase.from('spots').upsert(spots.map(s => spotToRow(userId, s)))
  if (error) throw error
}
