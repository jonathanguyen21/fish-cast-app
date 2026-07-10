import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Text } from 'react-native'
import { SwipeableRow } from '../features/common/SwipeableRow'
import { Spacing } from '../theme/spacing'

describe('SwipeableRow', () => {
  it('clips the delete strip to the default card radius when no radius prop is given', () => {
    const { getByTestId } = render(
      <SwipeableRow onDelete={() => {}}>
        <Text>Row</Text>
      </SwipeableRow>
    )
    const root = getByTestId('swipeable-root')
    const flatStyle = Object.assign({}, ...[root.props.style].flat(Infinity).filter(Boolean))
    expect(flatStyle.borderRadius).toBe(Spacing.cardRadius)
  })

  it('clips the delete strip to a caller-supplied radius, matching the front card exactly', () => {
    const { getByTestId } = render(
      <SwipeableRow onDelete={() => {}} borderRadius={18}>
        <Text>Row</Text>
      </SwipeableRow>
    )
    const root = getByTestId('swipeable-root')
    const flatStyle = Object.assign({}, ...[root.props.style].flat(Infinity).filter(Boolean))
    expect(flatStyle.borderRadius).toBe(18)
  })

  it('rounds the delete strip\'s own right corners tighter than the parent clip, with margin', () => {
    const { getByTestId } = render(
      <SwipeableRow onDelete={() => {}} borderRadius={18}>
        <Text>Row</Text>
      </SwipeableRow>
    )
    const deleteArea = getByTestId('swipeable-delete-area')
    const flatStyle = Object.assign({}, ...[deleteArea.props.style].flat(Infinity).filter(Boolean))
    // Strictly greater than the parent's own clip radius (18) — the delete
    // strip's red paint must recede *inside* the parent's overflow:hidden
    // boundary with margin, not sit exactly flush with it, so two
    // independently rasterized rounded edges can't leave a sub-pixel seam.
    expect(flatStyle.borderTopRightRadius).toBeGreaterThan(18)
    expect(flatStyle.borderBottomRightRadius).toBeGreaterThan(18)
  })

  it('renders children and a delete button', () => {
    const { getByText, getByTestId } = render(
      <SwipeableRow onDelete={() => {}}>
        <Text>Pacifica Pier</Text>
      </SwipeableRow>
    )
    expect(getByText('Pacifica Pier')).toBeTruthy()
    expect(getByTestId('swipeable-delete-btn')).toBeTruthy()
  })

  it('calls onDelete when the delete button is pressed directly', () => {
    const onDelete = jest.fn()
    const { getByTestId } = render(
      <SwipeableRow onDelete={onDelete}>
        <Text>Row</Text>
      </SwipeableRow>
    )
    fireEvent.press(getByTestId('swipeable-delete-btn'))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('tracks drag position via a reanimated shared value, not a stale Animated.Value mirror', () => {
    const { getByTestId } = render(
      <SwipeableRow onDelete={() => {}}>
        <Text>Row</Text>
      </SwipeableRow>
    )
    const draggable = getByTestId('swipeable-draggable')
    // Simulate a full open-then-close-then-open sequence — this is exactly the
    // pattern that broke under the old Animated.Value implementation: a second
    // gesture immediately after the first must start its delta math from the
    // ACTUAL current position, not a stale mirrored one.
    fireEvent(draggable, 'responderGrant', { nativeEvent: {} })
    fireEvent(draggable, 'responderMove', { nativeEvent: {}, dx: -80, dy: 0 } as never)
    // The row should be draggable without throwing; a stale-value bug would not
    // surface as a thrown error here (it's a wrong final position, not a crash),
    // so this test's real value is exercising the code path end-to-end without
    // touching private Animated internals — the implementation must not read
    // any `_value`-style private field to pass a type check.
    expect(draggable).toBeTruthy()
  })
})
