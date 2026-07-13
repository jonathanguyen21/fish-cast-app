import { useCallback, useEffect, useRef, useState } from 'react';
import { Tabs } from 'expo-router';
import { LayoutChangeEvent, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, interpolate, withSpring, withTiming } from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors } from '../../theme/colors';
import { Accent, Glass, Radii, Type } from '../../theme/tokens';
import { TAB_BAR_HEIGHT, TAB_BAR_SIDE_MARGIN, TAB_BAR_BOTTOM_GAP } from '../../theme/tabBar';
import { TabBarButton, MINIMIZE_ICON_SCALE, MINIMIZE_ICON_OPACITY } from '../../features/tabs/TabBarButton';
import { nearestTabIndex, capsuleLeftForPointer } from '../../features/tabs/tabBarDrag';
import type { CapsuleFrame } from '../../features/tabs/tabBarDrag';
import { tabBarMinimized } from '../../theme/tabBarVisibility';

// Dark warm ink for content sitting on an Accent.warm fill — same pairing as
// WeekDayCard's "best day" tag.
const ACTIVE_INK = '#3A2A16';

// Inactive icon+label color. Deliberately a near-white (not the palette's
// #64748B textTertiary): the bar floats over anything from a night sky to a
// bright midday gradient, so per Apple's Liquid Glass guidance the bar's own
// dark material (blur + scrim below) guarantees a dark base and the text on
// it stays light — legibility never depends on what's behind the glass.
const INACTIVE_COLOR = 'rgba(231,240,250,0.72)';

// Spring (not timing) for the capsule's slide/resize so tab changes read as
// one fluid morph — same tuning family as SwipeableRow's snap spring.
const CAPSULE_SPRING = { damping: 18, stiffness: 220 };

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
      {/* Fixed dark scrim on top of the blur — RN's own take on Apple's
          scroll edge effect: the bar's material itself guarantees a dark,
          contrasty base for the icons, because a dark-tinted blur alone
          washes out over a bright midday sky gradient. */}
      <View style={styles.scrim} pointerEvents="none" />
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
//
// The warm capsule is ONE shared indicator (not per-button backgrounds): it
// springs between the buttons' measured frames on tap, and during a
// horizontal drag on the bar it tracks the finger live and snaps to (and
// selects) the nearest tab on release — the segmented-control fluid-morph
// interaction from Apple's Liquid Glass adoption guide.
function GoldenHourTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const visible = state.routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => ICONS[route.name] !== undefined);
  const focusedVisible = visible.findIndex(v => v.index === state.index);

  const [frames, setFrames] = useState<(CapsuleFrame | null)[]>(() => visible.map(() => null));
  const capsuleX = useSharedValue(0);
  const capsuleW = useSharedValue(0);
  const capsuleShown = useSharedValue(0);
  const positioned = useRef(false);

  const handleCapsuleFrame = useCallback((i: number, frame: CapsuleFrame) => {
    setFrames(prev => {
      const existing = prev[i];
      if (
        existing &&
        Math.abs(existing.x - frame.x) < 0.5 &&
        Math.abs(existing.width - frame.width) < 0.5 &&
        Math.abs(existing.height - frame.height) < 0.5
      ) {
        return prev;
      }
      const next = prev.slice();
      next[i] = frame;
      return next;
    });
  }, []);

  const selectTab = (visibleIdx: number) => {
    const target = visible[visibleIdx];
    if (!target) return;
    const event = navigation.emit({
      type: 'tabPress',
      target: target.route.key,
      canPreventDefault: true,
    });
    if (state.index !== target.index && !event.defaultPrevented) {
      navigation.navigate(target.route.name, target.route.params);
    }
  };

  // PanResponder handlers are created once (useRef) but need current frames /
  // row geometry / navigation state, so those live in a ref refreshed every
  // render — the SwipeableRow pattern.
  const dragCtx = useRef({
    frames,
    focusedVisible,
    selectTab,
    rowWidth: 0,
    rowPageX: 0,
  });
  dragCtx.current.frames = frames;
  dragCtx.current.focusedVisible = focusedVisible;
  dragCtx.current.selectTab = selectTab;

  const rowRef = useRef<View>(null);
  const dragging = useRef(false);
  const dragZone = useRef(-1);

  function readyFrames(): CapsuleFrame[] | null {
    const f = dragCtx.current.frames;
    return f.length > 0 && f.every(Boolean) ? (f as CapsuleFrame[]) : null;
  }

  function settleTo(idx: number) {
    const frame = dragCtx.current.frames[idx];
    if (!frame) return;
    capsuleX.value = withSpring(frame.x, CAPSULE_SPRING);
    capsuleW.value = withSpring(frame.width, CAPSULE_SPRING);
  }

  function trackDrag(moveX: number) {
    const measured = readyFrames();
    if (!measured) return;
    const x = moveX - dragCtx.current.rowPageX;
    const zone = nearestTabIndex(x, measured);
    if (zone < 0) return;
    if (zone !== dragZone.current) {
      // Tick only when crossing INTO a new tab's zone, not on drag start.
      if (dragZone.current !== -1) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      dragZone.current = zone;
      capsuleW.value = withSpring(measured[zone].width, CAPSULE_SPRING);
    }
    // The x position tracks the finger directly (no spring) so the capsule
    // feels attached to it; only the width morphs on a spring.
    capsuleX.value = capsuleLeftForPointer(x, measured[zone].width, dragCtx.current.rowWidth);
  }

  function endDrag(moveX: number) {
    dragging.current = false;
    dragZone.current = -1;
    const measured = readyFrames();
    if (!measured) return;
    const idx = nearestTabIndex(moveX - dragCtx.current.rowPageX, measured);
    if (idx < 0) return;
    settleTo(idx);
    dragCtx.current.selectTab(idx);
  }

  function cancelDrag() {
    dragging.current = false;
    dragZone.current = -1;
    settleTo(dragCtx.current.focusedVisible);
  }

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    // Claim only clearly horizontal movement so plain taps still reach the
    // buttons' own Pressables.
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 6 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.2,
    onMoveShouldSetPanResponderCapture: (_, gs) => Math.abs(gs.dx) > 6 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.2,
    onPanResponderGrant: (_, gs) => {
      dragging.current = true;
      dragZone.current = -1;
      trackDrag(gs.moveX);
    },
    onPanResponderMove: (_, gs) => trackDrag(gs.moveX),
    onPanResponderRelease: (_, gs) => endDrag(gs.moveX),
    onPanResponderTerminate: () => cancelDrag(),
    onPanResponderTerminationRequest: () => !dragging.current,
    onShouldBlockNativeResponder: () => true,
  })).current;

  function handleRowLayout(e: LayoutChangeEvent) {
    dragCtx.current.rowWidth = e.nativeEvent.layout.width;
    // moveX arrives in window coordinates; the drag math runs in row
    // coordinates, so record where the row sits on screen.
    rowRef.current?.measureInWindow((x) => {
      dragCtx.current.rowPageX = x;
    });
  }

  useEffect(() => {
    const target = frames[focusedVisible];
    if (!target) return;
    if (!positioned.current) {
      // First measurement: place the capsule instantly (no cross-bar slide
      // on app launch), then fade it in.
      positioned.current = true;
      capsuleX.value = target.x;
      capsuleW.value = target.width;
      capsuleShown.value = withTiming(1, { duration: 150 });
      return;
    }
    capsuleX.value = withSpring(target.x, CAPSULE_SPRING);
    capsuleW.value = withSpring(target.width, CAPSULE_SPRING);
  }, [focusedVisible, frames, capsuleX, capsuleW, capsuleShown]);

  const capsuleHeight = frames.find(Boolean)?.height ?? 0;
  const capsuleStyle = useAnimatedStyle(() => {
    const minimizeScale = interpolate(tabBarMinimized.value, [0, 1], [1, MINIMIZE_ICON_SCALE]);
    const minimizeOpacity = interpolate(tabBarMinimized.value, [0, 1], [1, MINIMIZE_ICON_OPACITY]);
    return {
      width: capsuleW.value,
      opacity: capsuleShown.value * minimizeOpacity,
      transform: [{ translateX: capsuleX.value }, { scale: minimizeScale }],
    };
  });

  return (
    <View style={[styles.tabBar, { bottom: TAB_BAR_BOTTOM_GAP + insets.bottom }]}>
      <TabBarBackground />
      <View ref={rowRef} onLayout={handleRowLayout} style={styles.itemsRow} {...panResponder.panHandlers}>
        <Animated.View
          testID="tab-bar-capsule"
          pointerEvents="none"
          style={[
            styles.capsule,
            { height: capsuleHeight, top: (TAB_BAR_HEIGHT - capsuleHeight) / 2 },
            capsuleStyle,
          ]}
        />
        {visible.map(({ route, index }, visibleIdx) => {
          const icons = ICONS[route.name];
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = options.title ?? route.name;
          const color = focused ? ACTIVE_INK : INACTIVE_COLOR;

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TabBarButton
              key={route.key}
              focused={focused}
              onPress={() => selectTab(visibleIdx)}
              onLongPress={onLongPress}
              onCapsuleFrame={(frame) => handleCapsuleFrame(visibleIdx, frame)}
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
  // Horizontal inset is a margin, not padding: the sliding capsule inside is
  // absolutely positioned, and Yoga (native) offsets absolute children by
  // parent padding while CSS (web) doesn't — a margin keeps the buttons'
  // measured x and the capsule's translateX in the same coordinate space on
  // both platforms.
  itemsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  capsule: {
    position: 'absolute',
    left: 0,
    borderRadius: Radii.pill,
    backgroundColor: Accent.warm,
  },
  label: {
    marginTop: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,12,24,0.35)',
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
