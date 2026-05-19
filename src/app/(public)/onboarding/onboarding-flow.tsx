'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { AccentColor } from '@/lib/accent/presets'
import { markOnboardingComplete } from '@/lib/onboarding/actions'
import { WelcomeStep } from '@/components/onboarding/welcome-step'
import { AccentStep } from '@/components/onboarding/accent-step'
import { TourModal } from '@/components/onboarding/tour-modal'
import { ProgressBar } from '@/components/onboarding/progress-bar'

export type OnboardingData = {
  name: string
  email: string
  accent: AccentColor
  orgName: string | null
  role: 'owner' | 'admin' | 'member'
  inviterName: string | null
  appsCount: number
}

type Step = 1 | 2 | 3

export function OnboardingFlow({ data }: { data: OnboardingData }) {
  const [step, setStep] = useState<Step>(1)
  const router = useRouter()

  async function finishOnboarding() {
    try {
      await markOnboardingComplete()
      router.push('/app')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cerrar el onboarding')
    }
  }

  return (
    <div className="flex-1 flex flex-col" data-accent-root data-accent={data.accent}>
      <div className="flex-1">
        {step === 1 && (
          <WelcomeStep data={data} onContinue={() => setStep(2)} onSkip={finishOnboarding} />
        )}
        {step === 2 && (
          <AccentStep
            initialAccent={data.accent}
            onBack={() => setStep(1)}
            onContinue={() => setStep(3)}
            onSkip={finishOnboarding}
          />
        )}
        {step === 3 && (
          <TourModal mode="onboarding" onClose={finishOnboarding} onSkip={finishOnboarding} />
        )}
      </div>
      <ProgressBar step={step} />
    </div>
  )
}
