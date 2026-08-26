'use client'

import { COOK_TIMES, type CookTime } from '@/lib/quest-data'
import { SectionCard } from './section-card'

type Props = {
  value: CookTime
  onChange: (value: CookTime) => void
}

export function CookTimeSelect({ value, onChange }: Props) {
  return (
    <SectionCard step={3} title="⏱️ 얼마나 요리할 수 있나요?">
      <div role="radiogroup" aria-label="조리 가능 시간" className="grid grid-cols-3 gap-2">
        {COOK_TIMES.map((option) => {
          const active = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border text-sm font-medium transition-all active:scale-95 ${
                active
                  ? 'border-primary bg-secondary text-secondary-foreground shadow-[0_3px_0_0_var(--primary)]'
                  : 'border-border bg-muted text-muted-foreground'
              }`}
            >
              <span aria-hidden="true" className="text-xl">
                {option.emoji}
              </span>
              {option.label}
            </button>
          )
        })}
      </div>
    </SectionCard>
  )
}
