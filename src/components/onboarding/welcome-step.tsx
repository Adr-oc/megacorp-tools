'use client'

import type { OnboardingData } from '@/app/(public)/onboarding/onboarding-flow'

type Props = { data: OnboardingData; onContinue: () => void; onSkip: () => void }

export function WelcomeStep({ data, onContinue, onSkip }: Props) {
  return (
    <div className="p-12">
      <div>Welcome stub — {data.name}</div>
      <button onClick={onContinue}>continuar</button>
      <button onClick={onSkip}>saltar</button>
    </div>
  )
}
