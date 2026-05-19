import { act, renderHook } from '@testing-library/react-native'
import { useSettingsStore } from '../store/settingsStore'

describe('settingsStore.units', () => {
  beforeEach(() => {
    useSettingsStore.setState({ tempUnit: 'F', speedUnit: 'mph', lengthUnit: 'ft' })
  })

  it('defaults to imperial units', () => {
    expect(useSettingsStore.getState().tempUnit).toBe('F')
    expect(useSettingsStore.getState().speedUnit).toBe('mph')
    expect(useSettingsStore.getState().lengthUnit).toBe('ft')
  })

  it('setTempUnit toggles to C', () => {
    const { result } = renderHook(() => useSettingsStore())
    act(() => { result.current.setTempUnit('C') })
    expect(result.current.tempUnit).toBe('C')
  })

  it('setSpeedUnit toggles to kts', () => {
    const { result } = renderHook(() => useSettingsStore())
    act(() => { result.current.setSpeedUnit('kts') })
    expect(result.current.speedUnit).toBe('kts')
  })

  it('setLengthUnit toggles to m', () => {
    const { result } = renderHook(() => useSettingsStore())
    act(() => { result.current.setLengthUnit('m') })
    expect(result.current.lengthUnit).toBe('m')
  })
})

describe('settingsStore.alerts', () => {
  beforeEach(() => {
    useSettingsStore.setState({ alertThreshold: 70, alertsEnabled: false })
  })

  it('setAlertThreshold updates threshold', () => {
    const { result } = renderHook(() => useSettingsStore())
    act(() => { result.current.setAlertThreshold(80) })
    expect(result.current.alertThreshold).toBe(80)
  })

  it('setAlertsEnabled enables alerts', () => {
    const { result } = renderHook(() => useSettingsStore())
    act(() => { result.current.setAlertsEnabled(true) })
    expect(result.current.alertsEnabled).toBe(true)
  })
})

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
