'use client'

import { ChevronDown, X } from 'lucide-react'
import { useState } from 'react'
import { FRESHNESS, type FreshnessKey, type RescueItem } from '@/lib/quest-data'
import { ErrorHint, SectionCard } from './section-card'

type Props = {
  items: RescueItem[]
  onAdd: (name: string) => void
  onRemove: (id: string) => void
  onStatusChange: (id: string, status: FreshnessKey) => void
  countErrorType: 'none' | 'empty' | 'one'
  statusError: boolean
}

export function RescueIngredients({
  items,
  onAdd,
  onRemove,
  onStatusChange,
  countErrorType,
  statusError,
}: Props) {
  const [value, setValue] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  const submit = () => {
    const name = value.trim()
    if (!name) return

    // 1. 20자 초과 검증
    if (name.length > 20) {
      setInputError('❗ 재료 이름은 20자 이내로 입력해주세요.')
      return
    }

    // 2. 최대 10개 제한 검증
    if (items.length >= 10) {
      setInputError('❗ 냉털 재료는 최대 10개까지 입력할 수 있어요.')
      return
    }

    // 3. 중복 재료 검증
    if (items.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      setInputError('❗ 이미 추가된 재료예요.')
      return
    }

    setInputError(null)
    onAdd(name)
    setValue('')
  }

  return (
    <SectionCard
      step={2}
      title="🧊 오늘 냉털하고 싶은 재료는?"
      description="버리기 전에 구조하고 싶은 재료를 2개 이상 알려주세요."
    >
      <div className="flex min-w-0 gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (inputError) setInputError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault()
              submit()
            }
          }}
          maxLength={30}
          aria-label="냉털 재료 이름"
          placeholder="예: 양배추, 계란, 두부"
          className={`min-h-12 min-w-0 flex-1 rounded-2xl border bg-muted px-4 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary focus:bg-card ${
            inputError ? 'border-destructive' : 'border-input'
          }`}
        />
        <button
          type="button"
          onClick={submit}
          className="min-h-12 shrink-0 rounded-2xl bg-primary px-4 font-display text-sm text-primary-foreground shadow-[0_3px_0_0_var(--secondary-foreground)] transition-transform active:translate-y-0.5 active:shadow-none"
        >
          + 추가
        </button>
      </div>

      {inputError ? <ErrorHint>{inputError}</ErrorHint> : null}

      {items.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border bg-muted/60 px-4 py-6 text-center text-sm text-muted-foreground">
          아직 구조 대상이 없어요 🫥
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {items.map((item) => {
            const status = item.status ? FRESHNESS[item.status] : null
            const isMissing = statusError && item.status === null
            return (
              <li
                key={item.id}
                className={`rounded-2xl border bg-muted/50 p-3 pl-4 transition-colors ${
                  isMissing ? 'border-destructive/80 bg-destructive/5' : 'border-border'
                }`}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="min-w-0 max-w-full break-words font-display text-base">{item.name}</span>
                  {status ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.tone}`}
                    >
                      {status.emoji} {status.short}
                    </span>
                  ) : (
                    <span className="rounded-full bg-border/70 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      상태 미정
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    aria-label={`${item.name} 삭제`}
                    className="ml-auto flex size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </div>
                <div className="relative mt-2.5">
                  <select
                    value={item.status ?? ''}
                    onChange={(e) => onStatusChange(item.id, e.target.value as FreshnessKey)}
                    aria-label={`${item.name} 상태 선택`}
                    className={`min-h-11 w-full appearance-none rounded-xl border bg-card pr-9 pl-3 text-sm font-medium outline-none focus:border-primary ${
                      item.status
                        ? 'border-border'
                        : isMissing
                          ? 'border-destructive text-destructive font-semibold'
                          : 'border-warning text-muted-foreground'
                    }`}
                  >
                    <option value="" disabled>
                      상태를 선택하세요
                    </option>
                    {(Object.keys(FRESHNESS) as FreshnessKey[]).map((key) => (
                      <option key={key} value={key}>
                        {FRESHNESS[key].emoji} {FRESHNESS[key].label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {countErrorType === 'empty' ? (
        <ErrorHint>❗ 냉털할 식재료를 2개 이상 입력해주세요.</ErrorHint>
      ) : null}
      {countErrorType === 'one' ? (
        <ErrorHint>❗ 재료가 하나 더 필요해요! 냉털 식재료를 2개 이상 입력해주세요.</ErrorHint>
      ) : null}
      {statusError ? <ErrorHint>❗ 모든 냉털 식재료의 상태를 선택해주세요.</ErrorHint> : null}
    </SectionCard>
  )
}

