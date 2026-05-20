type Props = {
  label?: string
  children: React.ReactNode
}

export function SidebarSection({ label, children }: Props) {
  return (
    <div className="space-y-1">
      {label && (
        <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
      )}
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}
