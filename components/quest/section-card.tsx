import type { ReactNode } from 'react'

type SectionCardProps = {
  step: number
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

export function SectionCard({ step, title, description, action, children }: SectionCardProps) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-[0_4px_0_0_var(--border)]">
      <header className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm text-primary-foreground"
        >
          {step}
        </span>
        <div className="flex-1">
          <h2 className="font-display text-lg leading-snug text-balance">
            <span className="sr-only">{`${step}단계. `}</span>
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function ErrorHint({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="mt-3 flex items-start gap-2 rounded-2xl bg-destructive/10 px-3 py-2.5 text-sm leading-relaxed font-medium text-destructive"
    >
      <span aria-hidden="true">⚠️</span>
      <span>{children}</span>
    </p>
  )
}
