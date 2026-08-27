'use client'

import { useRef, useState } from 'react'
import { BasicIngredients } from '@/components/quest/basic-ingredients'
import { CookTimeSelect } from '@/components/quest/cook-time'
import { QuestHero } from '@/components/quest/quest-hero'
import { QuestFailure, QuestResult } from '@/components/quest/quest-result'
import { RescueIngredients } from '@/components/quest/rescue-ingredients'
import {
  BASIC_INGREDIENTS,
  type CookTime,
  type FreshnessKey,
  type Quest,
  type RescueItem,
} from '@/lib/quest-data'

const INITIAL_ITEMS: RescueItem[] = []

type Phase = 'idle' | 'loading' | 'success' | 'failure'

export default function Page() {
  const [basics, setBasics] = useState<string[]>(['김치', '대파', '마늘', '간장', '식용유'])
  const [items, setItems] = useState<RescueItem[]>([])
  const [cookTime, setCookTime] = useState<CookTime>('20')
  const [phase, setPhase] = useState<Phase>('idle')
  const [currentQuest, setCurrentQuest] = useState<Quest | null>(null)
  const [isRerolling, setIsRerolling] = useState(false)
  const [countErrorType, setCountErrorType] = useState<'none' | 'empty' | 'one'>('none')
  const [statusError, setStatusError] = useState(false)
  const [isTimeout, setIsTimeout] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const resultRef = useRef<HTMLDivElement>(null)
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null)

  const toggleBasic = (name: string) =>
    setBasics((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]))

  const selectAllBasics = () =>
    setBasics((prev) =>
      prev.length === BASIC_INGREDIENTS.length ? [] : BASIC_INGREDIENTS.map((i) => i.name),
    )

  const addItem = (name: string) => {
    setItems((prev) => [...prev, { id: `${Date.now()}`, name, status: null }])
    setCountErrorType('none')
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const setStatus = (id: string, status: FreshnessKey) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)))
    setStatusError(false)
  }

  const runQuest = async (forceFail = false) => {
    // 1. 유효성 검사
    if (items.length === 0) {
      setCountErrorType('empty')
      setStatusError(false)
      return
    }
    if (items.length === 1) {
      setCountErrorType('one')
      setStatusError(false)
      return
    }
    setCountErrorType('none')

    const hasUnsetStatus = items.some((i) => i.status === null)
    if (hasUnsetStatus) {
      setStatusError(true)
      return
    }
    setStatusError(false)

    // 2. 요청 시작 및 타이머 설정
    setPhase('loading')
    setIsTimeout(false)
    setErrorMessage(null)

    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
    timeoutTimerRef.current = setTimeout(() => {
      setIsTimeout(true)
    }, 10000)

    try {
      if (forceFail) {
        throw new Error('강제 테스트 실패')
      }

      const response = await fetch('/api/quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basics,
          items,
          cookTime,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '퀘스트 생성 실패')
      }

      const questData: Quest = await response.json()
      setCurrentQuest(questData)
      setPhase('success')

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (err: unknown) {
      console.error(err)
      setPhase('failure')
      setErrorMessage(err instanceof Error ? err.message : '일시적인 오류가 발생했습니다.')
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } finally {
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
    }
  }

  const reroll = async () => {
    if (!currentQuest) return
    setIsRerolling(true)
    try {
      const response = await fetch('/api/quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basics,
          items,
          cookTime,
          excludeDish: currentQuest.dish,
        }),
      })

      if (response.ok) {
        const questData: Quest = await response.json()
        setCurrentQuest(questData)
      }
    } catch (err) {
      console.error('Reroll failed:', err)
    } finally {
      setIsRerolling(false)
    }
  }

  const loading = phase === 'loading'

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col gap-4 px-4 pb-16">
      <QuestHero />

      <BasicIngredients selected={basics} onToggle={toggleBasic} onSelectAll={selectAllBasics} />

      <RescueIngredients
        items={items}
        onAdd={addItem}
        onRemove={removeItem}
        onStatusChange={setStatus}
        countErrorType={countErrorType}
        statusError={statusError}
      />

      <CookTimeSelect value={cookTime} onChange={setCookTime} />

      <div className="mt-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => runQuest()}
          className="min-h-16 w-full rounded-3xl bg-primary font-display text-xl text-primary-foreground shadow-[0_6px_0_0_var(--secondary-foreground)] transition-all active:translate-y-1 active:shadow-[0_2px_0_0_var(--secondary-foreground)] disabled:translate-y-1 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
        >
          {loading ? '🤖 냉장고 분석 중...' : '⚔️ QUEST 생성'}
        </button>
        <p className="mt-2.5 text-center text-xs text-muted-foreground">
          AI가 냉장고를 분석해 가장 적합한 요리를 찾아드려요.
        </p>
      </div>

      <div ref={resultRef} className="scroll-mt-4">
        {phase === 'success' && currentQuest ? (
          <QuestResult quest={currentQuest} allItems={items} onReroll={reroll} isRerolling={isRerolling} />
        ) : null}
        {phase === 'failure' ? (
          <QuestFailure onRetry={() => runQuest()} message={errorMessage ?? undefined} />
        ) : null}
        {loading ? (
          <div className="rounded-3xl border border-dashed border-primary/50 bg-card p-8 text-center shadow-sm">
            <p className="animate-pulse font-display text-base">🤖 냉장고 분석 중...</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              구조가 급한 재료부터 찾고 있어요
            </p>
            {isTimeout ? (
              <p className="mt-4 rounded-xl bg-warning/20 p-2.5 text-xs font-medium text-warning-foreground">
                ⏳ 요리 퀘스트 생성이 지연되고 있어요. 잠시만 더 기다려주세요...
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <footer className="mt-2 text-center">
        <button
          type="button"
          onClick={() => runQuest(true)}
          className="text-xs text-muted-foreground/70 underline underline-offset-4"
        >
          AI 실패 화면 미리보기
        </button>
      </footer>
    </main>
  )
}

