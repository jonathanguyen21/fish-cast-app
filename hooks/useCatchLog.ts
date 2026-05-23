import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert } from 'react-native'
import { useAuthStore } from '../store/authStore'
import { useLocalCatchLogStore } from '../store/localCatchLogStore'
import { fetchCatches, addCatch, updateCatch, deleteCatch } from '../services/catchLogService'
import type { CatchEntry } from '../types/catchLog'

export function useCatchLog() {
  const session = useAuthStore(s => s.session)
  const userId = session?.user.id ?? null
  const queryClient = useQueryClient()

  const localStore = useLocalCatchLogStore()

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

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Omit<CatchEntry, 'id'>> }) => updateCatch(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catches', userId] }),
    onError: () => Alert.alert('Error', 'Could not update catch. Please try again.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCatch(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catches', userId] }),
    onError: () => Alert.alert('Error', 'Could not delete catch. Please try again.'),
  })

  if (!userId) {
    return {
      entries: localStore.entries,
      isLoading: false,
      isError: false,
      addEntry: localStore.addEntry,
      updateEntry: (id: string, patch: Partial<Omit<CatchEntry, 'id'>>) => localStore.updateEntry(id, patch),
      deleteEntry: localStore.deleteEntry,
      isSignedIn: false,
      isLocal: true,
    }
  }

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    addEntry: addMutation.mutate,
    updateEntry: (id: string, patch: Partial<Omit<CatchEntry, 'id'>>) => updateMutation.mutate({ id, patch }),
    deleteEntry: deleteMutation.mutate,
    isSignedIn: true,
    isLocal: false,
  }
}
