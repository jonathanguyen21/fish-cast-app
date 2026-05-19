import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Node.js < 22 has no native WebSocket. Provide a no-op stub so Supabase's
// Realtime client initialises without throwing. Realtime is unused in this app.
const WS: typeof WebSocket = typeof globalThis.WebSocket !== 'undefined'
  ? globalThis.WebSocket
  : (class NoopWS {
      static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3
      readyState = 3
      constructor(_: string) {}
      close() {}
      send() {}
      addEventListener() {}
      removeEventListener() {}
      dispatchEvent() { return true }
    } as unknown as typeof WebSocket)

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
    })
