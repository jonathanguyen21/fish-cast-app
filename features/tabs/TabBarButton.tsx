import React from 'react'
import { Pressable, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs'

// Approximates SwiftUI's .glassEffect(.interactive()) — a brief scale-down
// plus a light shimmer flash on press, since RN has no native glass-touch
// response to draw on.
const PRESS_SCALE = 0.88
const PRESS_SHIMMER_OPACITY = 0.3

export function TabBarButton({ children, style, onPress, ref: _ref, ...rest }: BottomTabBarButtonProps) {
  const scale = useSharedValue(1)
  const shimmer = useSharedValue(0)

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value,
  }))

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
      {...rest}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={style}
    >
      <Animated.View style={[styles.inner, scaleStyle]}>
        <Animated.View testID="tab-button-shimmer" pointerEvents="none" style={[styles.shimmer, shimmerStyle]} />
        {children}
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  shimmer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 14,
    backgroundColor: '#ffffff',
  },
})
