import { act, renderHook } from '@testing-library/react-native'
import { useSettingsStore } from '../store/settingsStore'

describe('settingsStore.speciesAlerts', () => {
  beforeEach(() => {
    useSettingsStore.setState({ speciesAlerts: {}, alertThreshold: 70 })
  })

  it('starts with empty speciesAlerts', () => {
    expect(useSettingsStore.getState().speciesAlerts).toEqual({})
  })

  it('setSpeciesAlert persists a new entry with defaults from global threshold', () => {
    const { result } = renderHook(() => useSettingsStore())
    act(() => { result.current.setSpeciesAlert('sp_a', { enabled: true }) })
    expect(result.current.speciesAlerts['sp_a']).toEqual({ threshold: 70, enabled: true })
  })

  it('setSpeciesAlert merges partial updates without losing existing fields', () => {
    const { result } = renderHook(() => useSettingsStore())
    act(() => { result.current.setSpeciesAlert('sp_a', { enabled: true, threshold: 80 }) })
    act(() => { result.current.setSpeciesAlert('sp_a', { enabled: false }) })
    expect(result.current.speciesAlerts['sp_a']).toEqual({ threshold: 80, enabled: false })
  })

  it('clearSpeciesAlert removes the entry', () => {
    const { result } = renderHook(() => useSettingsStore())
    act(() => { result.current.setSpeciesAlert('sp_a', { enabled: true }) })
    act(() => { result.current.clearSpeciesAlert('sp_a') })
    expect(result.current.speciesAlerts['sp_a']).toBeUndefined()
  })
})
