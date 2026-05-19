type Props = { step: 1 | 2 | 3 }

export function ProgressBar({ step }: Props) {
  return (
    <div className="h-1 bg-muted/40 grid grid-cols-3">
      <div className={step >= 1 ? 'bg-brand-accent' : ''} />
      <div className={step >= 2 ? 'bg-brand-accent' : ''} />
      <div className={step >= 3 ? 'bg-brand-accent' : ''} />
    </div>
  )
}
