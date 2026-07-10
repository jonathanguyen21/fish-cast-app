import React, { useRef } from 'react'
import { PanResponder, View, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

const ACTION_WIDTH = 76

interface SwipeableRowProps {
  onDelete: () => void
  children: React.ReactNode
  // Must match the front card's own borderRadius exactly — the delete strip
  // behind it is clipped to this same radius via overflow:hidden, and any
  // mismatch leaves a sliver of red visible at the corners where the front
  // card's (differently-rounded) corner and this clip mask disagree.
  // Defaults to the legacy Spacing.cardRadius so existing callers that
  // haven't migrated to the newer Radii.card token keep their exact current
  // appearance.
  borderRadius?: number
}

export function SwipeableRow({ onDelete, children, borderRadius = Spacing.cardRadius }: SwipeableRowProps) {
  const translateX = useSharedValue(0)
  const opacity = useSharedValue(1)
  const startVal = useRef(0)
  const dragging = useRef(false)

  function snapTo(value: number) {
    translateX.value = withSpring(value, { damping: 20, stiffness: 200 })
  }

  function handleDelete() {
    translateX.value = withTiming(-300, { duration: 220 })
    opacity.value = withTiming(0, { duration: 220 }, (finished) => {
      if (finished) runOnJS(onDelete)()
    })
  }

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 6 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.2,
    onMoveShouldSetPanResponderCapture: (_, gs) => Math.abs(gs.dx) > 6 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.2,
    onPanResponderGrant: () => {
      dragging.current = true
      startVal.current = translateX.value
    },
    onPanResponderMove: (_, gs) => {
      translateX.value = Math.max(-ACTION_WIDTH, Math.min(0, startVal.current + gs.dx))
    },
    onPanResponderRelease: (_, gs) => {
      dragging.current = false
      const current = startVal.current + gs.dx
      snapTo(current < -ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0)
    },
    onPanResponderTerminate: () => {
      dragging.current = false
      snapTo(0)
    },
    // Without this, the parent FlatList/ScrollView can forcibly reclaim the
    // responder mid-drag (a well-known RN gesture gotcha) once it decides the
    // touch looks scroll-like, which snaps the row back closed via
    // onPanResponderTerminate above — this is what made the swipe feel like
    // it "didn't register" and needed a second attempt. Refusing termination
    // once we've already recognized a horizontal drag keeps the gesture ours
    // until the finger lifts.
    onPanResponderTerminationRequest: () => !dragging.current,
    // Android: stop the underlying ScrollView from becoming the responder in
    // parallel while we're actively tracking this gesture.
    onShouldBlockNativeResponder: () => true,
  })).current

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }))

  return (
    <View testID="swipeable-root" style={[styles.root, { borderRadius }]}>
      <View style={styles.deleteArea}>
        <TouchableOpacity
          testID="swipeable-delete-btn"
          style={styles.deleteBtn}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      <Animated.View
        testID="swipeable-draggable"
        style={animatedStyle}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  deleteArea: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
