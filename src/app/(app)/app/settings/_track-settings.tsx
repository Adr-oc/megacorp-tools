'use client'

import { useEffect } from 'react'
import { addRecent } from '@/lib/recents/client'

export function TrackSettings() {
  useEffect(() => {
    addRecent('settings')
  }, [])
  return null
}
