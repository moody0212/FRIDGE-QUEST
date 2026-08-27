'use client'

import { useRef, useState } from 'react'
import { BasicIngredients } from '@/components/quest/basic-ingredients'
import { CookTimeSelect } from '@/components/quest/cook-time'
import { QuestHero } from '@/components/quest/quest-hero'
import { QuestFailure, QuestResult } from '@/components/quest/quest-result'
import { QuestLoading } from '@/components/quest/quest-loading'
import { RescueIngredients } from '@/components/quest/rescue-ingredients'
import {
  BASIC_INGREDIENTS,
  type CookTime,
  type FreshnessKey,
  type Quest,
  type RescueItem,
} from '@/lib/quest-data'

type Phase = 'idle' | 'loading' | 'success' | 'failure'

export default function QuestPage() {
  const [basics, setBasics] = useState<string[]>([])
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

    setPhase('loading')
    setIsTimeout(false)
    setErrorMessage(null)

    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
    timeoutTimerRef.current = setTimeout(() => setIsTimeout(true), 10000)

    try {
      if (forceFail) throw new Error('강제 테스트 실패')

      const response = await fetch('/api/quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basics, items, cookTime }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '퀘스트 생성 실패')
      }

      const questData: Quest = await response.json()
      setCurrentQuest(questData)
      setPhase('success')
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (err: unknown) {
      console.error(err)
      setPhase('failure')
      setErrorMessage(err instanceof Error ? err.message : '일시적인 오류가 발생했습니다.')
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
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
          previousRecipeName: currentQuest.dish,
          previousCookingMethod: currentQuest.cookingMethod,
          previousRescuedIngredients: currentQuest.rescuedIngredients,
          previousFailedIngredients: currentQuest.failedIngredients,
          priorityIngredients: currentQuest.failedIngredients,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '퀘스트 생성에 문제가 생겼어요. 다시 시도해주세요.')
      }

      setCurrentQuest(await response.json())
    } catch (err) {
      console.error('Reroll failed:', err)
      setErrorMessage(err instanceof Error ? err.message : '퀘스트 생성에 문제가 생겼어요. 다시 시도해주세요.')
      setPhase('failure')
    } finally {
      setIsRerolling(false)
    }
  }

  const loading = phase === 'loading'

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col gap-4 px-4 pb-16">
      {loading ? (
        <QuestLoading isTimeout={isTimeout} />
      ) : (
        <>
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
              onClick={() => runQuest()}
              className="min-h-16 w-full rounded-3xl bg-primary font-display text-xl text-primary-foreground shadow-[0_6px_0_0_var(--secondary-foreground)] transition-all active:translate-y-1 active:shadow-[0_2px_0_0_var(--secondary-foreground)]"
            >
              ⚔️ QUEST 생성
            </button>
            <p className="mt-2.5 text-center text-xs text-muted-foreground">
              AI가 냉장고를 분석해 가장 적합한 요리를 찾아드려요.
            </p>
          </div>

          <div ref={resultRef} className="scroll-mt-4">
            {phase === 'success' && currentQuest ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
                <QuestResult quest={currentQuest} allItems={items} onReroll={reroll} isRerolling={isRerolling} />
              </div>
            ) : null}
            {phase === 'failure' ? (
              <QuestFailure onRetry={() => runQuest()} message={errorMessage ?? undefined} />
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
        </>
      )}
    </main>
  )
}
