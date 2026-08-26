'use client'

import { Check } from 'lucide-react'
import { BASIC_INGREDIENTS } from '@/lib/quest-data'
import { SectionCard } from './section-card'

type Props = {
  selected: string[]
  onToggle: (name: string) => void
  onSelectAll: () => void
}

export function BasicIngredients({ selected, onToggle, onSelectAll }: Props) {
  const allSelected = selected.length === BASIC_INGREDIENTS.length

  return (
    <SectionCard
      step={1}
      title="🧂 집에 있는 기본 재료를 체크해주세요!"
      description="평소 집에 있는 재료만 골라주세요."
      action={
        <button
          type="button"
          onClick={onSelectAll}
          aria-pressed={allSelected}
          className="flex items-center gap-1 rounded-full border border-primary/40 bg-secondary px-3 py-2 font-display text-xs text-secondary-foreground transition-colors hover:bg-primary/20"
        >
          <Check aria-hidden="true" className="size-3.5" />
          대부분 있어요
        </button>
      }
    >
      <ul className="flex flex-wrap gap-2">
        {BASIC_INGREDIENTS.map((item) => {
          const active = selected.includes(item.name)
          return (
            <li key={item.name}>
              <button
                type="button"
                onClick={() => onToggle(item.name)}
                aria-pressed={active}
                className={`flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-all active:scale-95 ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground shadow-[0_3px_0_0_var(--secondary-foreground)]'
                    : 'border-border bg-muted text-muted-foreground'
                }`}
              >
                <span aria-hidden="true">{item.emoji}</span>
                {item.name}
                {active ? <Check aria-hidden="true" className="size-3.5" /> : null}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        선택 {selected.length} / {BASIC_INGREDIENTS.length}
      </p>
    </SectionCard>
  )
}
