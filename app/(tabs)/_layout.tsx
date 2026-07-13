import { Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, interpolate } from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors } from '../../theme/colors';
import { Glass, Type } from '../../theme/tokens';
import { TAB_BAR_HEIGHT, TAB_BAR_SIDE_MARGIN, TAB_BAR_BOTTOM_GAP } from '../../theme/tabBar';
import { TabBarButton } from '../../features/tabs/TabBarButton';
import { tabBarMinimized } from '../../theme/tabBarVisibility';

// Dark warm ink for content sitting on an Accent.warm fill — same pairing as
// WeekDayCard's "best day" tag.
const ACTIVE_INK = '#3A2A16';

// Keyed by route name; shelved routes (href: null) have no entry and are
// skipped by the custom bar below.
const ICONS: Record<string, { focused: keyof typeof Ionicons.glyphMap; default: keyof typeof Ionicons.glyphMap }> = {
  index: { focused: 'sunny', default: 'sunny-outline' },
  week: { focused: 'calendar', default: 'calendar-outline' },
  species: { focused: 'fish', default: 'fish-outline' },
  spots: { focused: 'location', default: 'location-outline' },
};

// "Liquid glass" tab bar: a real frosted blur (not just a translucent tint)
// requires content to actually render BEHIND the bar for the blur to sample
// from, so the bar is taken out of normal layout flow (position: absolute)
// and each screen's own scroll content pads its bottom by the bar's real
// height + the margin below it (TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP +
// insets.bottom) to keep from being hidden under it.
//
// The bar "minimizes" (shrinks + dims) on scroll-down and restores on
// scroll-up (theme/tabBarVisibility.ts + hooks/useTabBarScrollHandler.ts),
// approximating SwiftUI's .tabBarMinimizeBehavior(.onScrollDown). The blur,
// sheen, and border all live on one animated child inside the outer
// (unanimated, full-size) bar container — scaling that child down doesn't
// change the bar's real hit-region or layout, it just visually shrinks the
// glass pill toward its center. Items shrink in sync via the same shared
// value, read directly in TabBarButton.
const MINIMIZE_SCALE = 0.86;
const MINIMIZE_OPACITY = 0.55;

function TabBarBackground() {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(tabBarMinimized.value, [0, 1], [1, MINIMIZE_SCALE]);
    const opacity = interpolate(tabBarMinimized.value, [0, 1], [1, MINIMIZE_OPACITY]);
    return { transform: [{ scale }], opacity };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
      <BlurView
        intensity={Platform.OS === 'android' ? 80 : 50}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      {/* Soft sheen along the top curve — light catching the top of a glass
          surface — kept subtle (low opacity, no shader) per this app's
          existing "gradients only, no heavy effects" motion budget. */}
      <LinearGradient
        colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
        style={styles.sheen}
        pointerEvents="none"
      />
      <View style={styles.border} pointerEvents="none" />
    </Animated.View>
  );
}

// Fully custom bar instead of React Navigation's default: the default
// BottomTabBar pads its own content by insets.bottom INSIDE the bar, which
// crushes icon + label into the top of this fixed-64px floating pill on any
// device with a home indicator (web reports inset 0, so the bug hides in
// browser screenshots). Owning the row also lets the active item draw a warm
// capsule hugging its own icon + label, which the default bar's separate
// icon/label slots can't express.
function GoldenHourTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { bottom: TAB_BAR_BOTTOM_GAP + insets.bottom }]}>
      <TabBarBackground />
      <View style={styles.itemsRow}>
        {state.routes.map((route, index) => {
          const icons = ICONS[route.name];
          if (!icons) return null;
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = options.title ?? route.name;
          const color = focused ? ACTIVE_INK : Colors.textTertiary;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };
          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TabBarButton
              key={route.key}
              focused={focused}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            >
              <Ionicons name={focused ? icons.focused : icons.default} size={22} color={color} />
              <Text style={[Type.chip, styles.label, { color }]}>{label}</Text>
            </TabBarButton>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <GoldenHourTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.textPrimary,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', headerShown: false }} />
      <Tabs.Screen name="week" options={{ title: 'Week', headerShown: false }} />
      <Tabs.Screen name="species" options={{ title: 'Species', headerShown: false }} />
      <Tabs.Screen name="spots" options={{ title: 'Spots', headerShown: false }} />
      {/* Shelved route: reachable via router.push, hidden from the tab bar */}
      <Tabs.Screen name="catchlog" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: TAB_BAR_SIDE_MARGIN,
    right: TAB_BAR_SIDE_MARGIN,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  itemsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  label: {
    marginTop: 1,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT * 0.5,
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: 1,
    borderColor: Glass.strokeStrong,
  },
});
