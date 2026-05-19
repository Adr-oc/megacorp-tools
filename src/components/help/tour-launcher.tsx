'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { TourModal } from '@/components/onboarding/tour-modal'

export function TourLauncher() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition"
        aria-label="Reabrir tour"
        title="Reabrir tour"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {open && <TourModal mode="help" onClose={() => setOpen(false)} onSkip={() => setOpen(false)} />}
    </>
  )
}
