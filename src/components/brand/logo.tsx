type LogoVariant = 'brand' | 'mono'

type Props = {
  variant?: LogoVariant
  size?: number
  className?: string
  title?: string
}

const BRAND = {
  q1: '#D4A017',
  q2: '#0F1B3D',
  q3: '#B5AC9E',
  q4: '#9F968A',
  stroke: 'rgba(15,27,61,0.55)',
  strokeWidth: 1.5,
}

const MONO_VARS = {
  q1: 'var(--logo-q1)',
  q2: 'var(--logo-q2)',
  q3: 'var(--logo-q3)',
  q4: 'var(--logo-q4)',
  stroke: 'var(--logo-stroke)',
  strokeWidth: 2.5,
}

export function MegacorpLogo({
  variant = 'mono',
  size = 40,
  className,
  title = 'MEGACORP',
}: Props) {
  const c = variant === 'brand' ? BRAND : MONO_VARS
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-label={title}
      className={className}
      role="img"
    >
      <path d="M50 6 a44 44 0 0 1 44 44 H50 Z" fill={c.q1} />
      <path d="M50 50 H94 a44 44 0 0 1 -44 44 Z" fill={c.q2} />
      <path d="M50 50 H6 a44 44 0 0 0 44 44 Z" fill={c.q3} />
      <path d="M50 6 a44 44 0 0 0 -44 44 H50 Z" fill={c.q4} />
      <circle
        cx="50"
        cy="50"
        r="44"
        fill="none"
        stroke={c.stroke}
        strokeWidth={c.strokeWidth}
      />
      <line
        x1="6"
        y1="50"
        x2="94"
        y2="50"
        stroke={c.stroke}
        strokeWidth={c.strokeWidth}
      />
      <line
        x1="50"
        y1="6"
        x2="50"
        y2="94"
        stroke={c.stroke}
        strokeWidth={c.strokeWidth}
      />
    </svg>
  )
}
