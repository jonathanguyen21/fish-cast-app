import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Node.js < 22 has no native WebSocket. During Expo web static rendering the
// app is evaluated in Node, where Supabase's Realtime client throws at
// construction unless it can find a WebSocket. Realtime is unused in this app,
// so install a no-op stub on globalThis when none exists. Supabase's WebSocket
// detection checks globalThis.WebSocket first (before its Node-version guard),
// so this makes construction succeed regardless of how the transport option is
// threaded through the browser vs. node builds. On a real device or browser a
// native WebSocket already exists, so the stub is never installed.
class NoopWebSocket {
  static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3
  readyState = 3
  constructor(_: string) {}
  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true }
}

if (typeof globalThis.WebSocket === 'undefined') {
  ;(globalThis as { WebSocket: unknown }).WebSocket = NoopWebSocket
}

const WS = globalThis.WebSocket

// When Supabase env vars are absent (local dev without backend), create a
// placeholder client so imports don't crash. Auth calls will fail gracefully.
export const supabase = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: { transport: WS },
    })
  : createClient('https://placeholder.supabase.co', 'placeholder', {
      auth: { storage: AsyncStorage, autoRefreshToken: false, persistSession: false },
      realtime: { transport: WS },
    })
