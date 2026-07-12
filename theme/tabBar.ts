// Floating tab bar dimensions, shared between app/(tabs)/_layout.tsx (which
// renders the bar) and each tab screen (which needs to pad its scrollable
// content clear of it). Kept in their own dependency-free module rather than
// exported from _layout.tsx itself — that file pulls in expo-blur, and
// nothing that just needs these three numbers should have to drag a native
// view manager into its module graph (including plain-logic test files that
// happen to import a screen for an unrelated pure function).
export const TAB_BAR_HEIGHT = 64
export const TAB_BAR_SIDE_MARGIN = 16
export const TAB_BAR_BOTTOM_GAP = 8
