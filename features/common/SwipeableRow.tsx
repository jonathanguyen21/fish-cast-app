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
}

export function SwipeableRow({ onDelete, children }: SwipeableRowProps) {
  const translateX = useSharedValue(0)
  const opacity = useSharedValue(1)
  const startVal = useRef(0)

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
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 6 && Math.abs(gs.dx) > Math.abs(gs.dy),
    onPanResponderGrant: () => {
      startVal.current = translateX.value
    },
    onPanResponderMove: (_, gs) => {
      translateX.value = Math.max(-ACTION_WIDTH, Math.min(0, startVal.current + gs.dx))
    },
    onPanResponderRelease: (_, gs) => {
      const current = startVal.current + gs.dx
      snapTo(current < -ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0)
    },
    onPanResponderTerminate: () => snapTo(0),
  })).current

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }))

  return (
    <View style={styles.root}>
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
  root: { overflow: 'hidden', borderRadius: Spacing.cardRadius },
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
