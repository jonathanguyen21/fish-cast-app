import React, { useState } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { useAuthStore } from '../../store/authStore'
import { Colors } from '../../theme/colors'
import { Spacing } from '../../theme/spacing'

interface Props {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AuthModal({ visible, onClose, onSuccess }: Props) {
  const { signIn, signUp } = useAuthStore()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError(null)
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password)
      } else {
        await signUp(email.trim(), password)
      }
      setEmail('')
      setPassword('')
      onSuccess()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setEmail('')
    setPassword('')
    setError(null)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={Colors.textTertiary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={Colors.background} />
              : <Text style={styles.buttonText}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(null) }}
          >
            <Text style={styles.toggleText}>
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.toggleLink}>{mode === 'signin' ? 'Sign up' : 'Sign in'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.screenPad },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  cancel: { fontSize: 15, color: Colors.accent },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textTertiary, marginBottom: 6, marginTop: Spacing.md },
  input: {
    backgroundColor: Colors.card, borderRadius: 10,
    padding: Spacing.md, color: Colors.textPrimary, fontSize: 15,
  },
  error: { color: Colors.warning, fontSize: 13, marginTop: Spacing.sm },
  button: {
    backgroundColor: Colors.accent, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: Spacing.lg,
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: Colors.background },
  toggleRow: { alignItems: 'center', marginTop: Spacing.lg },
  toggleText: { fontSize: 14, color: Colors.textSecondary },
  toggleLink: { color: Colors.accent, fontWeight: '600' },
})
