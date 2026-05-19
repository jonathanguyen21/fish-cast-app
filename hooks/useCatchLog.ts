import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert } from 'react-native'
import { useAuthStore } from '../store/authStore'
import { fetchCatches, addCatch, deleteCatch } from '../services/catchLogService'
import type { CatchEntry } from '../types/catchLog'

export function useCatchLog() {
  const session = useAuthStore(s => s.session)
  const userId = session?.user.id ?? null
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['catches', userId],
    queryFn: () => fetchCatches(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const addMutation = useMutation({
    mutationFn: (entry: Omit<CatchEntry, 'id'>) => addCatch(userId!, entry),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catches', userId] }),
    onError: () => Alert.alert('Error', 'Could not save catch. Please try again.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCatch(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catches', userId] }),
    onError: () => Alert.alert('Error', 'Could not delete catch. Please try again.'),
  })

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    addEntry: addMutation.mutate,
    deleteEntry: deleteMutation.mutate,
    isSignedIn: !!userId,
  }
}
