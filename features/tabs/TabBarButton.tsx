import React, { useRef } from 'react'
import { Pressable, StyleSheet, LayoutChangeEvent } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate } from 'react-native-reanimated'
import { Radii } from '../../theme/tokens'
import { tabBarMinimized } from '../../theme/tabBarVisibility'
import type { CapsuleFrame } from './tabBarDrag'

// Approximates SwiftUI's .glassEffect(.interactive()) — a brief scale-down
// plus a light shimmer flash on press, since RN has no native glass-touch
// response to draw on.
const PRESS_SCALE = 0.88
const PRESS_SHIMMER_OPACITY = 0.3

// Icons dim in sync with the bar's own minimize animation (see
// theme/tabBarVisibility.ts) — deliberately opacity-only, not also scaled:
// see the file-level comment in app/(tabs)/_layout.tsx for why a shrinking
// minimize turned out to cause real device rendering artifacts. Exported so
// the bar's shared sliding capsule (app/(tabs)/_layout.tsx) dims in
// lockstep with the icon it sits behind.
export const MINIMIZE_ICON_OPACITY = 0.7

interface TabBarButtonProps {
  focused: boolean
  onPress: () => void
  onLongPress?: () => void
  // Reports where the active-tab capsule should sit for THIS tab, in the
  // items row's coordinate space — fires once both the item slot and its
  // centered content have been laid out. The warm capsule itself is no
  // longer drawn here; it's a single shared indicator in the tab bar that
  // slides between these reported frames.
  onCapsuleFrame?: (frame: CapsuleFrame) => void
  accessibilityLabel?: string
  testID?: string
  children: React.ReactNode
}

export function TabBarButton({ focused, onPress, onLongPress, onCapsuleFrame, accessibilityLabel, testID, children }: TabBarButtonProps) {
  const scale = useSharedValue(1)
  const shimmer = useSharedValue(0)
  const itemLayout = useRef<{ x: number; width: number } | null>(null)
  const contentSize = useRef<{ width: number; height: number } | null>(null)

  const scaleStyle = useAnimatedStyle(() => {
    const minimizeOpacity = interpolate(tabBarMinimized.value, [0, 1], [1, MINIMIZE_ICON_OPACITY])
    return {
      transform: [{ scale: scale.value }],
      opacity: minimizeOpacity,
    }
  })
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value,
  }))

  function reportFrame() {
    if (!itemLayout.current || !contentSize.current || !onCapsuleFrame) return
    const { x, width } = itemLayout.current
    const { width: contentWidth, height } = contentSize.current
    // Content is centered inside the flex item, so the capsule frame hugs
    // the icon+label rather than filling the whole slot.
    onCapsuleFrame({ x: x + (width - contentWidth) / 2, width: contentWidth, height })
  }

  function handleItemLayout(e: LayoutChangeEvent) {
    const { x, width } = e.nativeEvent.layout
    itemLayout.current = { x, width }
    reportFrame()
  }

  function handleContentLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout
    contentSize.current = { width, height }
    reportFrame()
  }

  function handlePressIn() {
    scale.value = withTiming(PRESS_SCALE, { duration: 100 })
    shimmer.value = withTiming(PRESS_SHIMMER_OPACITY, { duration: 100 })
  }
  function handlePressOut() {
    scale.value = withTiming(1, { duration: 180 })
    shimmer.value = withTiming(0, { duration: 220 })
  }

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLayout={handleItemLayout}
      style={styles.item}
    >
      <Animated.View testID="tab-button-content" onLayout={handleContentLayout} style={[styles.capsule, scaleStyle]}>
        <Animated.View testID="tab-button-shimmer" pointerEvents="none" style={[styles.shimmer, shimmerStyle]} />
        {children}
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  capsule: {
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radii.pill,
    backgroundColor: '#ffffff',
  },
})
