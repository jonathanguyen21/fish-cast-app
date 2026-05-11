import '@testing-library/jest-native/extend-expect'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
)

jest.mock('react-native-maps', () => {
  const { View } = require('react-native')
  return {
    __esModule: true,
    default: View,
    Marker: View,
  }
})

jest.mock('react-native-svg', () => {
  const { View } = require('react-native')
  return {
    Svg: View, Path: View, Circle: View, G: View, Defs: View,
    LinearGradient: View, Stop: View, Line: View, Text: View,
    Rect: View, Polyline: View,
  }
})
