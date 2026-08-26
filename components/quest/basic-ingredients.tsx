'use client'

import { Check, CheckSquare, Square } from 'lucide-react'
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
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-xs transition-all ${
            allSelected
              ? 'border-primary bg-primary text-primary-foreground shadow-[0_2px_0_0_var(--secondary-foreground)]'
              : 'border-border bg-muted text-muted-foreground hover:border-primary/40 hover:text-foreground'
          }`}
        >
          {allSelected ? (
            <CheckSquare aria-hidden="true" className="size-3.5" />
          ) : (
            <Square aria-hidden="true" className="size-3.5" />
          )}
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
                    : 'border-border bg-muted text-muted-foreground hover:bg-card'
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
        선택 {selected.length} / {BASIC_INGREDIENTS.length} (0개 선택도 가능해요)
      </p>
    </SectionCard>
  )
}

