import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import { SpeciesDetail } from '../../features/species/SpeciesDetail'
import type { SpeciesScore } from '../../types/species'

export default function SpeciesDetailScreen() {
  const { data } = useLocalSearchParams<{ id: string; data: string }>()

  if (!data) return null

  const speciesScore: SpeciesScore = JSON.parse(data)

  return <SpeciesDetail speciesScore={speciesScore} />
}
