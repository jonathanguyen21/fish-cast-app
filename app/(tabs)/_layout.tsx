import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors } from '../../theme/colors';
import { Glass } from '../../theme/tokens';

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
// height (via useBottomTabBarHeight()) to keep from being hidden under it.
function TabBarBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        intensity={Platform.OS === 'android' ? 80 : 40}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.hairline} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: styles.tabBar,
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
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
  },
  hairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Glass.stroke,
  },
});
