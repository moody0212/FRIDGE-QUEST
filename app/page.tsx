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
  type RescueItem,
  SAMPLE_QUESTS,
} from '@/lib/quest-data'

const INITIAL_ITEMS: RescueItem[] = [
  { id: 'r1', name: '양배추', status: 'soft' },
  { id: 'r2', name: '계란', status: 'fresh' },
  { id: 'r3', name: '두부', status: 'fresh' },
]

type Phase = 'idle' | 'loading' | 'success' | 'failure'

export default function Page() {
  const [basics, setBasics] = useState<string[]>(['김치', '대파', '마늘', '간장', '식용유'])
  const [items, setItems] = useState<RescueItem[]>(INITIAL_ITEMS)
  const [cookTime, setCookTime] = useState<CookTime>('20')
  const [phase, setPhase] = useState<Phase>('idle')
  const [questIndex, setQuestIndex] = useState(0)
  const [countError, setCountError] = useState(false)
  const [statusError, setStatusError] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)

  const toggleBasic = (name: string) =>
    setBasics((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]))

  const selectAllBasics = () =>
    setBasics((prev) =>
      prev.length === BASIC_INGREDIENTS.length ? [] : BASIC_INGREDIENTS.map((i) => i.name),
    )

  const addItem = (name: string) =>
    setItems((prev) => [...prev, { id: `${Date.now()}`, name, status: null }])

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id))

  const setStatus = (id: string, status: FreshnessKey) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)))

  const runQuest = (fail = false) => {
    const tooFew = items.length < 2
    const missingStatus = items.some((i) => i.status === null)
    setCountError(tooFew)
    setStatusError(!tooFew && missingStatus)
    if (tooFew || missingStatus) {
      setPhase('idle')
      return
    }

    setPhase('loading')
    window.setTimeout(() => {
      setPhase(fail ? 'failure' : 'success')
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 1600)
  }

  const reroll = () => {
    setQuestIndex((prev) => (prev + 1) % SAMPLE_QUESTS.length)
    setPhase('loading')
    window.setTimeout(() => setPhase('success'), 1000)
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
        countError={countError}
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
          {loading ? '🤖 냉장고 분석 중...' : '⚔️ 오늘의 QUEST 생성'}
        </button>
        <p className="mt-2.5 text-center text-xs text-muted-foreground">
          AI가 냉장고를 분석해 가장 적합한 요리를 찾아드려요.
        </p>
      </div>

      <div ref={resultRef} className="scroll-mt-4">
        {phase === 'success' ? (
          <QuestResult quest={SAMPLE_QUESTS[questIndex]} onReroll={reroll} />
        ) : null}
        {phase === 'failure' ? <QuestFailure onRetry={() => runQuest()} /> : null}
        {loading ? (
          <div className="rounded-3xl border border-dashed border-primary/50 bg-card p-8 text-center">
            <p className="animate-pulse font-display text-base">🤖 냉장고 분석 중...</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              구조가 급한 재료부터 찾고 있어요
            </p>
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
