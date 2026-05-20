import React from 'react'
import { View } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../theme/colors'
import { useSettingsStore } from '../../store/settingsStore'
import { OnboardingModal } from '../../features/common/OnboardingModal'

type TabName = 'Forecast' | 'Species' | 'Spots' | 'Log' | 'Settings'

const ICONS: Record<TabName, { focused: keyof typeof Ionicons.glyphMap; default: keyof typeof Ionicons.glyphMap }> = {
  Forecast: { focused: 'partly-sunny', default: 'partly-sunny-outline' },
  Species: { focused: 'fish', default: 'fish-outline' },
  Spots: { focused: 'location', default: 'location-outline' },
  Log: { focused: 'journal', default: 'journal-outline' },
  Settings: { focused: 'settings', default: 'settings-outline' },
}

function TabIcon({ name, focused }: { name: TabName; focused: boolean }) {
  const icon = focused ? ICONS[name].focused : ICONS[name].default
  return (
    <Ionicons
      name={icon}
      size={24}
      color={focused ? Colors.accent : Colors.textTertiary}
    />
  )
}

export default function TabLayout() {
  const onboardingComplete = useSettingsStore(s => s.onboardingComplete)
  const setOnboardingComplete = useSettingsStore(s => s.setOnboardingComplete)

  return (
    <View style={{ flex: 1 }}>
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
          name="catchlog"
          options={{
            title: 'Log',
            headerShown: false,
            tabBarIcon: ({ focused }) => <TabIcon name="Log" focused={focused} />,
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
      <OnboardingModal visible={!onboardingComplete} onDone={setOnboardingComplete} />
    </View>
  )
}
