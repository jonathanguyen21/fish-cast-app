import { useEffect, useMemo, useState } from 'react'
import { getSkyTheme } from '../theme/skyTheme'
import type { SkyTheme, SkyIcon } from '../theme/skyTheme'

// US centroid fallback so the hook always returns a usable theme pre-spot.
const FALLBACK_LAT = 39
const FALLBACK_LNG = -98

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseHour(t: string): number {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return 12
  let h = parseInt(m[1], 10)
  if (/pm/i.test(m[3]) && h !== 12) h += 12
  if (/am/i.test(m[3]) && h === 12) h = 0
  return h
}

export function resolveSkyDate(dateStr: string, repTime: string | undefined, now: Date): Date {
  if (dateStr === localDateKey(now)) return now
  const d = new Date(`${dateStr}T12:00:00`)
  d.setHours(repTime ? parseHour(repTime) : 12, 0, 0, 0)
  return d
}

export function useSkyTheme(
  spot: { lat: number; lng: number } | null,
  icon: SkyIcon | undefined,
  dateStr: string,
  repTime?: string,
): SkyTheme {
  const [now, setNow] = useState(() => new Date())
  const isToday = dateStr === localDateKey(now)

  useEffect(() => {
    if (!isToday) return
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [isToday])

  return useMemo(() => {
    const at = resolveSkyDate(dateStr, repTime, now)
    return getSkyTheme(at, spot?.lat ?? FALLBACK_LAT, spot?.lng ?? FALLBACK_LNG, icon)
  }, [spot?.lat, spot?.lng, icon, dateStr, repTime, now])
}
