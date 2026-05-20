import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { OnboardingModal } from '../features/common/OnboardingModal'

describe('OnboardingModal', () => {
  it('does not render when not visible', () => {
    const { queryByText } = render(<OnboardingModal visible={false} onDone={jest.fn()} />)
    expect(queryByText('Your Fishing Score')).toBeNull()
  })

  it('shows step 1 content on open', () => {
    const { getByText } = render(<OnboardingModal visible={true} onDone={jest.fn()} />)
    expect(getByText('Your Fishing Score')).toBeTruthy()
    expect(getByText('Next')).toBeTruthy()
  })

  it('advances to step 2 on Next press', () => {
    const { getByText } = render(<OnboardingModal visible={true} onDone={jest.fn()} />)
    fireEvent.press(getByText('Next'))
    expect(getByText('Solunar Periods')).toBeTruthy()
  })

  it('advances to step 3 on second Next press', () => {
    const { getByText } = render(<OnboardingModal visible={true} onDone={jest.fn()} />)
    fireEvent.press(getByText('Next'))
    fireEvent.press(getByText('Next'))
    expect(getByText('Add Your First Spot')).toBeTruthy()
  })

  it('shows "Let\'s Fish" button on last step', () => {
    const { getByText } = render(<OnboardingModal visible={true} onDone={jest.fn()} />)
    fireEvent.press(getByText('Next'))
    fireEvent.press(getByText('Next'))
    expect(getByText("Let's Fish")).toBeTruthy()
  })

  it('calls onDone when Last step completes', () => {
    const onDone = jest.fn()
    const { getByText } = render(<OnboardingModal visible={true} onDone={onDone} />)
    fireEvent.press(getByText('Next'))
    fireEvent.press(getByText('Next'))
    fireEvent.press(getByText("Let's Fish"))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('calls onDone when Skip is tapped', () => {
    const onDone = jest.fn()
    const { getByText } = render(<OnboardingModal visible={true} onDone={onDone} />)
    fireEvent.press(getByText('Skip'))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('Skip works from any step', () => {
    const onDone = jest.fn()
    const { getByText } = render(<OnboardingModal visible={true} onDone={onDone} />)
    fireEvent.press(getByText('Next'))
    fireEvent.press(getByText('Skip'))
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})
