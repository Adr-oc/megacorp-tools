type Props = {
  name: string
  email: string
  orgName: string | null
  role: string
  inviterName: string | null
  appsCount: number
}

function initials(name: string, email: string): string {
  const base = name?.trim() || email
  const parts = base.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'U'
}

export function AccountCard({ name, email, orgName, role, inviterName, appsCount }: Props) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-5">
      <div className="text-[10px] uppercase tracking-[0.16em] font-mono text-muted-foreground">Tu cuenta</div>
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-md bg-brand-accent text-brand-accent-foreground flex items-center justify-center font-mono font-bold">
          {initials(name, email)}
        </div>
        <div>
          <div className="font-semibold">{name || email}</div>
          <div className="text-xs text-muted-foreground">{email}</div>
        </div>
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Organización</dt>
        <dd>{orgName ?? '—'}</dd>
        <dt className="text-muted-foreground">Rol</dt>
        <dd><code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted">{role}</code></dd>
        {inviterName && (
          <>
            <dt className="text-muted-foreground">Invitado por</dt>
            <dd>{inviterName}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Apps disponibles</dt>
        <dd>{appsCount}</dd>
      </dl>
    </div>
  )
}
