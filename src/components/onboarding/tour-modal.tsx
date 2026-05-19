'use client'

type Props = {
  mode: 'onboarding' | 'help'
  onClose: () => void
  onSkip: () => void
}

export function TourModal({ mode, onClose, onSkip }: Props) {
  return (
    <div className="p-12">
      <div>Tour stub — mode {mode}</div>
      <button onClick={onClose}>terminar</button>
      <button onClick={onSkip}>saltar</button>
    </div>
  )
}
