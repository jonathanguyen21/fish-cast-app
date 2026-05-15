import { StyleSheet } from 'react-native'
import { Colors } from './colors'

export const Typography = StyleSheet.create({
  scoreNumber: {
    fontSize: 72,
    fontWeight: '800',
    fontVariant: ['tabular-nums'] as any,
    color: Colors.textPrimary,
  },
  h1: { fontSize: 24, fontWeight: '600', color: Colors.textPrimary },
  h2: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  h3: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  body: { fontSize: 14, fontWeight: '400', color: Colors.textPrimary },
  label: { fontSize: 12, fontWeight: '400', color: Colors.textTertiary },
  dataLarge: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'] as any,
    color: Colors.textPrimary,
  },
  dataMedium: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'] as any,
    color: Colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    marginBottom: 10,
  },
})
