import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';

type TabName = 'Forecast' | 'Species' | 'Spots' | 'Settings';

const ICONS: Record<TabName, { focused: keyof typeof Ionicons.glyphMap; default: keyof typeof Ionicons.glyphMap }> = {
  Forecast: { focused: 'partly-sunny', default: 'partly-sunny-outline' },
  Species: { focused: 'fish', default: 'fish-outline' },
  Spots: { focused: 'location', default: 'location-outline' },
  Settings: { focused: 'settings', default: 'settings-outline' },
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

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: Colors.background, borderTopColor: Colors.surface },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textTertiary,
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.textPrimary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Forecast',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon name="Forecast" focused={focused} />,
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
          tabBarIcon: ({ focused }) => <TabIcon name="Spots" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon name="Settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
