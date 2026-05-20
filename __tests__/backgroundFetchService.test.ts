import { registerFishingAlertTask, FISHING_ALERT_TASK } from '../services/backgroundFetchService'

const mockGetStatusAsync = jest.fn()
const mockRegisterTaskAsync = jest.fn()
const mockIsTaskRegisteredAsync = jest.fn()

jest.mock('expo-background-fetch', () => ({
  getStatusAsync: (...args: unknown[]) => mockGetStatusAsync(...args),
  registerTaskAsync: (...args: unknown[]) => mockRegisterTaskAsync(...args),
  BackgroundFetchResult: { NewData: 1, NoData: 2, Failed: 3 },
  // Inline — jest.mock factories are hoisted before const declarations
  BackgroundFetchStatus: { Available: 1, Restricted: 2, Denied: 3 },
}))

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: (...args: unknown[]) => mockIsTaskRegisteredAsync(...args),
}))

// Prevent actual service imports from running in test environment
jest.mock('../services/noaaService', () => ({ fetchNoaaData: jest.fn() }))
jest.mock('../services/nwsService', () => ({ fetchNwsData: jest.fn() }))
jest.mock('../services/marineService', () => ({ fetchMarineData: jest.fn() }))
jest.mock('../services/solunarService', () => ({ calculateSolunar: jest.fn() }))
jest.mock('../services/scoringService', () => ({ buildConditionsData: jest.fn() }))
jest.mock('../services/notificationService', () => ({ maybeScheduleFishingAlert: jest.fn() }))

describe('registerFishingAlertTask', () => {
  beforeEach(() => jest.clearAllMocks())

  it('does not register when status is Restricted', async () => {
    mockGetStatusAsync.mockResolvedValue(2) // Restricted
    await registerFishingAlertTask()
    expect(mockRegisterTaskAsync).not.toHaveBeenCalled()
  })

  it('does not register when status is Denied', async () => {
    mockGetStatusAsync.mockResolvedValue(3) // Denied
    await registerFishingAlertTask()
    expect(mockRegisterTaskAsync).not.toHaveBeenCalled()
  })

  it('skips registration if task is already registered', async () => {
    mockGetStatusAsync.mockResolvedValue(1) // Available
    mockIsTaskRegisteredAsync.mockResolvedValue(true)
    await registerFishingAlertTask()
    expect(mockRegisterTaskAsync).not.toHaveBeenCalled()
  })

  it('registers task when available and not yet registered', async () => {
    mockGetStatusAsync.mockResolvedValue(1) // Available
    mockIsTaskRegisteredAsync.mockResolvedValue(false)
    mockRegisterTaskAsync.mockResolvedValue(undefined)
    await registerFishingAlertTask()
    expect(mockRegisterTaskAsync).toHaveBeenCalledWith(
      FISHING_ALERT_TASK,
      expect.objectContaining({
        minimumInterval: 60 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      })
    )
  })
})
