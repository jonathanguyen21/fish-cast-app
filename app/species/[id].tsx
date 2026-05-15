import React from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SpeciesDetail } from '../../features/species/SpeciesDetail'
import type { SpeciesScore } from '../../types/species'
import type { SpeciesHourlyScore } from '../../features/species/speciesHourlyScoring'

export default function SpeciesDetailScreen() {
  const router = useRouter()
  const { data, hourlyData } = useLocalSearchParams<{ id: string; data: string; hourlyData?: string }>()

  if (!data) return null

  const speciesScore: SpeciesScore = JSON.parse(data)
  const hourly: SpeciesHourlyScore[] | undefined = hourlyData ? JSON.parse(hourlyData) : undefined

  return (
    <SpeciesDetail
      speciesScore={speciesScore}
      hourly={hourly}
      onUpgrade={() => router.push('/settings')}
    />
  )
}
