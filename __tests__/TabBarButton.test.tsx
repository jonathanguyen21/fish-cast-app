import React from 'react'
import { Text } from 'react-native'
import { render, fireEvent } from '@testing-library/react-native'
import { TabBarButton } from '../features/tabs/TabBarButton'

describe('TabBarButton', () => {
  it('renders its children', () => {
    const { getByText } = render(
      <TabBarButton onPress={jest.fn()}>
        <Text>Today</Text>
      </TabBarButton>
    )
    expect(getByText('Today')).toBeTruthy()
  })

  it('fires onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <TabBarButton onPress={onPress}>
        <Text>Week</Text>
      </TabBarButton>
    )
    fireEvent.press(getByText('Week'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('does not throw on press-in / press-out (shimmer + scale animation)', () => {
    const { getByText } = render(
      <TabBarButton onPress={jest.fn()}>
        <Text>Species</Text>
      </TabBarButton>
    )
    const label = getByText('Species')
    expect(() => {
      fireEvent(label, 'pressIn')
      fireEvent(label, 'pressOut')
    }).not.toThrow()
  })
})
