import React from 'react'
import { Text } from 'react-native'
import { render, fireEvent } from '@testing-library/react-native'
import { TabBarButton } from '../features/tabs/TabBarButton'

describe('TabBarButton', () => {
  it('renders its children', () => {
    const { getByText } = render(
      <TabBarButton focused={false} onPress={jest.fn()}>
        <Text>Today</Text>
      </TabBarButton>
    )
    expect(getByText('Today')).toBeTruthy()
  })

  it('fires onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByText } = render(
      <TabBarButton focused={false} onPress={onPress}>
        <Text>Week</Text>
      </TabBarButton>
    )
    fireEvent.press(getByText('Week'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('fires onLongPress when long-pressed', () => {
    const onLongPress = jest.fn()
    const { getByText } = render(
      <TabBarButton focused={false} onPress={jest.fn()} onLongPress={onLongPress}>
        <Text>Spots</Text>
      </TabBarButton>
    )
    fireEvent(getByText('Spots'), 'longPress')
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('exposes the focused state to accessibility as a selected tab', () => {
    const { getByRole } = render(
      <TabBarButton focused onPress={jest.fn()}>
        <Text>Today</Text>
      </TabBarButton>
    )
    expect(getByRole('tab', { selected: true })).toBeTruthy()
  })

  it('does not throw on press-in / press-out (shimmer + scale animation)', () => {
    const { getByText } = render(
      <TabBarButton focused={false} onPress={jest.fn()}>
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
