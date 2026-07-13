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

  it('reports a capsule frame centered in its slot once item and content are laid out', () => {
    const onCapsuleFrame = jest.fn()
    const { getByTestId } = render(
      <TabBarButton focused={false} onPress={jest.fn()} onCapsuleFrame={onCapsuleFrame} testID="tab-item">
        <Text>Today</Text>
      </TabBarButton>
    )
    fireEvent(getByTestId('tab-item'), 'layout', {
      nativeEvent: { layout: { x: 12, y: 0, width: 90, height: 64 } },
    })
    expect(onCapsuleFrame).not.toHaveBeenCalled()
    fireEvent(getByTestId('tab-button-content'), 'layout', {
      nativeEvent: { layout: { x: 10, y: 8, width: 70, height: 48 } },
    })
    expect(onCapsuleFrame).toHaveBeenCalledWith({ x: 22, width: 70, height: 48 })
  })

  it('re-reports the frame when the item slot moves', () => {
    const onCapsuleFrame = jest.fn()
    const { getByTestId } = render(
      <TabBarButton focused={false} onPress={jest.fn()} onCapsuleFrame={onCapsuleFrame} testID="tab-item">
        <Text>Week</Text>
      </TabBarButton>
    )
    fireEvent(getByTestId('tab-button-content'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 60, height: 44 } },
    })
    fireEvent(getByTestId('tab-item'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 80, height: 64 } },
    })
    fireEvent(getByTestId('tab-item'), 'layout', {
      nativeEvent: { layout: { x: 100, y: 0, width: 80, height: 64 } },
    })
    expect(onCapsuleFrame).toHaveBeenNthCalledWith(1, { x: 10, width: 60, height: 44 })
    expect(onCapsuleFrame).toHaveBeenNthCalledWith(2, { x: 110, width: 60, height: 44 })
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
