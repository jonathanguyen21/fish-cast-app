import { makeMutable } from 'react-native-reanimated'

// 0 = fully expanded, 1 = minimized. A module-level shared value (not React
// context) so the tab bar — rendered by app/(tabs)/_layout.tsx, outside any
// individual screen's component tree — and each screen's own ScrollView can
// both read/write it without prop drilling across the navigator boundary.
export const tabBarMinimized = makeMutable<0 | 1>(0)
