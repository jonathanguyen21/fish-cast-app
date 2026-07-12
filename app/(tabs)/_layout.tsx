import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme/colors';
import { Glass } from '../../theme/tokens';
import { TAB_BAR_HEIGHT, TAB_BAR_SIDE_MARGIN, TAB_BAR_BOTTOM_GAP } from '../../theme/tabBar';

type TabName = 'Today' | 'Week' | 'Species' | 'Spots';

const ICONS: Record<TabName, { focused: keyof typeof Ionicons.glyphMap; default: keyof typeof Ionicons.glyphMap }> = {
  Today: { focused: 'sunny', default: 'sunny-outline' },
  Week: { focused: 'calendar', default: 'calendar-outline' },
  Species: { focused: 'fish', default: 'fish-outline' },
  Spots: { focused: 'location', default: 'location-outline' },
};

function TabIcon({ name, focused }: { name: TabName; focused: boolean }) {
  const icon = focused ? ICONS[name].focused : ICONS[name].default;
  return (
    <Ionicons
      name={icon}
      size={24}
      color={focused ? Colors.accent : Colors.textTertiary}
    />
  );
}

// "Liquid glass" tab bar: a real frosted blur (not just a translucent tint)
// requires content to actually render BEHIND the bar for the blur to sample
// from, so the bar is taken out of normal layout flow (position: absolute)
// and each screen's own scroll content pads its bottom by the bar's real
// height + the margin below it (TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP +
// insets.bottom) to keep from being hidden under it.
function TabBarBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
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
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarStyle = {
    ...styles.tabBar,
    bottom: TAB_BAR_BOTTOM_GAP + insets.bottom,
  };

  return (
    <Tabs
      screenOptions={{
        tabBarStyle,
        tabBarBackground: () => <TabBarBackground />,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textTertiary,
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.textPrimary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon name="Today" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="week"
        options={{
          title: 'Week',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon name="Week" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="species"
        options={{
          title: 'Species',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon name="Species" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="spots"
        options={{
          title: 'Spots',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon name="Spots" focused={focused} />,
        }}
      />
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
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Glass.strokeStrong,
    overflow: 'hidden',
    elevation: 0,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT * 0.5,
  },
});
