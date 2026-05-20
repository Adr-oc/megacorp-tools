'use client'

import { useEffect, useState } from 'react'

export type RecentApp = {
  appId: string
  visitedAt: number
}

const KEY = 'megatools:recents:v1'
const MAX = 8

export function loadRecents(): RecentApp[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (x): x is RecentApp =>
        x != null &&
        typeof x === 'object' &&
        typeof (x as RecentApp).appId === 'string' &&
        typeof (x as RecentApp).visitedAt === 'number',
    )
  } catch {
    return []
  }
}

export function addRecent(appId: string): void {
  if (typeof window === 'undefined') return
  const list = loadRecents().filter((r) => r.appId !== appId)
  list.unshift({ appId, visitedAt: Date.now() })
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
    window.dispatchEvent(new Event('megatools:recents'))
  } catch {
    // silencioso — privacy mode, quota, etc.
  }
}

export function useRecents(): RecentApp[] {
  const [list, setList] = useState<RecentApp[]>([])
  useEffect(() => {
    setList(loadRecents())
    const handler = () => setList(loadRecents())
    window.addEventListener('storage', handler)
    window.addEventListener('megatools:recents', handler)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('megatools:recents', handler)
    }
  }, [])
  return list
}

export function formatRelativeTime(ts: number, now: number = Date.now()): string {
  const diffMin = Math.floor((now - ts) / 60000)
  if (diffMin < 1) return 'ahora'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  return `hace ${diffD} d`
}
