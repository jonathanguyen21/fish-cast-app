import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ProWaitlistSheet } from '../components/ProWaitlistSheet'

describe('ProWaitlistSheet', () => {
  it('renders the coming-soon message when visible', () => {
    const { getByText } = render(<ProWaitlistSheet visible onClose={() => {}} />)
    expect(getByText('FishCast Pro is coming soon')).toBeTruthy()
    expect(getByText('• Full 7-day fishing forecast')).toBeTruthy()
  })

  it('calls onClose when the button is pressed', () => {
    const onClose = jest.fn()
    const { getByText } = render(<ProWaitlistSheet visible onClose={onClose} />)
    fireEvent.press(getByText('Got it'))
    expect(onClose).toHaveBeenCalled()
  })
})
