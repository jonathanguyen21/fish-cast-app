import { StyleSheet } from 'react-native'

export const Radii = { card: 18, chip: 14, hero: 22, pill: 999 } as const

export const Glass = {
  fill: 'rgba(16,18,34,0.38)',
  fillStrong: 'rgba(16,18,34,0.50)',
  stroke: 'rgba(255,255,255,0.14)',
  strokeStrong: 'rgba(255,217,160,0.70)',
} as const

export const Accent = { warm: '#FFD9A0', warmDeep: '#E8A852' } as const

export const Fonts = {
  medium: 'Manrope_500Medium',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
} as const

// No 11px uppercase gray labels anywhere in this scale — that pattern is
// banned by the Golden Hour spec. Secondary text is 13px sentence case.
export const Type = StyleSheet.create({
  hero: { fontFamily: Fonts.extraBold, fontSize: 64, letterSpacing: -2, lineHeight: 68 },
  verdict: { fontFamily: Fonts.extraBold, fontSize: 22, letterSpacing: -0.5 },
  title: { fontFamily: Fonts.bold, fontSize: 16 },
  body: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  secondary: { fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18 },
  dataLg: { fontFamily: Fonts.extraBold, fontSize: 20, fontVariant: ['tabular-nums'] },
  chip: { fontFamily: Fonts.bold, fontSize: 12 },
})
