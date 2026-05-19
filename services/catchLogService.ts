import { supabase } from '../lib/supabase'
import type { CatchEntry } from '../types/catchLog'

type DbRow = {
  id: string
  date: string
  time: string
  spot_id: string
  spot_name: string
  species: string
  weight: number | null
  length: number | null
  note: string | null
  fishing_score: number | null
}

function rowToEntry(row: DbRow): CatchEntry {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    spotId: row.spot_id,
    spotName: row.spot_name,
    species: row.species,
    weight: row.weight ?? undefined,
    length: row.length ?? undefined,
    note: row.note ?? undefined,
    fishingScore: row.fishing_score ?? undefined,
  }
}

export async function fetchCatches(userId: string): Promise<CatchEntry[]> {
  const { data, error } = await supabase
    .from('catch_entries')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('time', { ascending: false })

  if (error) throw error
  return (data as DbRow[]).map(rowToEntry)
}

export async function addCatch(
  userId: string,
  entry: Omit<CatchEntry, 'id'>
): Promise<CatchEntry> {
  const { data, error } = await supabase
    .from('catch_entries')
    .insert({
      user_id: userId,
      date: entry.date,
      time: entry.time,
      spot_id: entry.spotId,
      spot_name: entry.spotName,
      species: entry.species,
      weight: entry.weight ?? null,
      length: entry.length ?? null,
      note: entry.note ?? null,
      fishing_score: entry.fishingScore ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return rowToEntry(data as DbRow)
}

export async function deleteCatch(id: string): Promise<void> {
  const { error } = await supabase
    .from('catch_entries')
    .delete()
    .eq('id', id)

  if (error) throw error
}
