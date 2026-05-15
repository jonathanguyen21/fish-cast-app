import { StyleSheet } from 'react-native'
import { Colors } from './colors'
import { Spacing } from './spacing'

export const cardStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Spacing.cardRadius,
    padding: Spacing.md,
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
})
