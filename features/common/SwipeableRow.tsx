import React, { useRef } from 'react'
import { Animated, PanResponder, View, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

const ACTION_WIDTH = 76

interface SwipeableRowProps {
  onDelete: () => void
  children: React.ReactNode
}

export function SwipeableRow({ onDelete, children }: SwipeableRowProps) {
  const translateX = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(1)).current
  const startVal = useRef(0)

  function snapTo(value: number) {
    Animated.spring(translateX, { toValue: value, useNativeDriver: true, bounciness: 0 }).start()
  }

  function handleDelete() {
    Animated.parallel([
      Animated.timing(translateX, { toValue: -300, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onDelete())
  }

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 6 && Math.abs(gs.dx) > Math.abs(gs.dy),
    onPanResponderGrant: () => {
      startVal.current = (translateX as any)._value || 0
    },
    onPanResponderMove: (_, gs) => {
      translateX.setValue(Math.max(-ACTION_WIDTH, Math.min(0, startVal.current + gs.dx)))
    },
    onPanResponderRelease: (_, gs) => {
      const current = startVal.current + gs.dx
      snapTo(current < -ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0)
    },
    onPanResponderTerminate: () => snapTo(0),
  })).current

  return (
    <View style={styles.root}>
      <View style={styles.deleteArea}>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      <Animated.View
        style={{ transform: [{ translateX }], opacity }}
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
