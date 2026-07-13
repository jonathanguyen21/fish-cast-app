import { useAnimatedScrollHandler, useSharedValue, withTiming } from 'react-native-reanimated'
import { tabBarMinimized } from '../theme/tabBarVisibility'
import { nextMinimizeState, INITIAL_SCROLL_MINIMIZE_STATE } from '../features/tabs/tabBarScroll'

const MINIMIZE_ANIM_MS = 220

// Drives the shared tabBarMinimized value from a screen's own scroll
// position. Each tab screen calls this once and passes the result to its
// Animated.ScrollView's onScroll prop.
export function useTabBarScrollHandler() {
  const state = useSharedValue(INITIAL_SCROLL_MINIMIZE_STATE)

  return useAnimatedScrollHandler({
    onScroll: (event) => {
      const next = nextMinimizeState(state.value, event.contentOffset.y)
      if (next.target !== state.value.target) {
        tabBarMinimized.value = withTiming(next.target, { duration: MINIMIZE_ANIM_MS })
      }
      state.value = next
    },
  })
}
