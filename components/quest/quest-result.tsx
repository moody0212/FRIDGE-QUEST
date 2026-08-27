'use client'

import { AlertTriangle, Sparkles, UtensilsCrossed } from 'lucide-react'
import type { Quest, RescueItem } from '@/lib/quest-data'

function Chip({ children, tone = 'plain' }: { children: string; tone?: 'plain' | 'good' | 'warn' | 'muted' }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        tone === 'good'
          ? 'bg-secondary text-secondary-foreground'
          : tone === 'warn'
            ? 'bg-warning/20 text-warning-foreground border border-warning/30'
            : tone === 'muted'
              ? 'bg-muted text-muted-foreground border border-border/50 opacity-80'
              : 'border border-border bg-card text-foreground'
      }`}
    >
      {children}
    </span>
  )
}

function Group({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h4 className="font-display text-sm text-muted-foreground">{title}</h4>
      <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

export function QuestResult({
  quest,
  allItems,
  onReroll,
  isRerolling,
}: {
  quest: Quest
  allItems?: RescueItem[]
  onReroll: () => void
  isRerolling?: boolean
}) {
  const allIngredients = allItems?.map((item) => item.name) ?? quest.allIngredients
  const rescuedIngredients = quest.rescuedIngredients.filter((name) => allIngredients.includes(name))
  const failedIngredients = allIngredients.filter((name) => !rescuedIngredients.includes(name))
  const failedReasons = quest.failedIngredientReasons.filter((item) => failedIngredients.includes(item.ingredient))
  const addUses = quest.additionalUses.filter((item) => failedIngredients.includes(item.ingredient))
  const calculatedExp = rescuedIngredients.length * 100
  const rescuedAll = rescuedIngredients.length === allIngredients.length

  return (
    <section
      aria-live="polite"
      className="overflow-hidden rounded-3xl border-2 border-primary bg-card shadow-[0_6px_0_0_var(--primary)]"
    >
      {/* 1. 구조 대상 배너 (입력한 냉털 재료 100% 전부 이번 퀘스트 대상) */}
      <div className="bg-destructive/10 px-5 py-3 text-center">
        <p className="font-display text-xs tracking-[0.2em] text-destructive">🚨 이번 퀘스트 구조 대상</p>
        <p className="mt-1 font-display text-base font-medium">
          🥬 {allIngredients.join(' · ')} 구조에 도전해볼까요?
        </p>
      </div>

      <div className="px-5 py-6">
        {/* 2. 요리명 & 시간 */}
        <p className="text-center font-display text-xs tracking-[0.2em] text-primary">
          ⚔️ TODAY&apos;S QUEST
        </p>
        <h3 className="mt-2 text-center font-display text-2xl leading-snug text-balance">
          {quest.dish}
        </h3>
        <p className="mt-2 text-center text-sm font-medium text-muted-foreground">
          ⏱ {quest.time}
        </p>

        {/* 3. 구조 가능/실패 결과 */}
        <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-muted/60 p-4">
          <Group title="🧊 이번 퀘스트 구조 결과">
            <span className="w-full font-display text-sm font-semibold text-primary">
              {rescuedAll ? '🎉' : '🔥'} {rescuedIngredients.length}/{allIngredients.length}{' '}
              {rescuedAll ? '전부 구조 가능!' : '구조 가능!'}
            </span>
            {allIngredients.map((name) => {
              const rescued = rescuedIngredients.includes(name)
              return (
                <Chip key={name} tone={rescued ? 'good' : 'muted'}>
                  {rescued ? `✓ ${name}` : `💀 ${name}`}
                </Chip>
              )
            })}
          </Group>

          <Group title="🧂 사용하는 기본 재료">
            {quest.basicUsed.length === 0 ? (
              <Chip>없음</Chip>
            ) : (
              quest.basicUsed.map((name) => <Chip key={name}>{name}</Chip>)
            )}
          </Group>

          <Group title="🛒 추가 필요 재료">
            {quest.extraNeeded.length === 0 ? (
              <Chip tone="good">없음</Chip>
            ) : (
              quest.extraNeeded.map((name) => (
                <Chip key={name} tone="warn">
                  {name}
                </Chip>
              ))
            )}
          </Group>

          {quest.extraNeeded.length === 0 ? (
            <p className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-center text-sm font-semibold text-secondary-foreground">
              <Sparkles className="size-4" />
              ✨ 추가 장보기 없이 바로 가능!
            </p>
          ) : null}
        </div>

        {/* 🔴 상태 주의 안내 (해당 시) */}
        {quest.warningMessage ? (
          <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs leading-relaxed text-destructive">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <p>{quest.warningMessage}</p>
          </div>
        ) : null}

        {failedReasons.length > 0 ? (
          <div className="mt-5 flex flex-col gap-2">
            {failedReasons.map((item, index) => (
              <div key={item.ingredient} className="rounded-2xl border border-border bg-muted/50 p-3.5 text-xs leading-relaxed">
                <p className="font-display font-semibold text-foreground">
                  {index % 2 === 0 ? '💀' : '🧊'} {item.ingredient}{' '}
                  {index % 2 === 0 ? '구조 실패!' : '이번 퀘스트에서 후퇴!'}
                </p>
                <p className="mt-1 text-muted-foreground">“{item.reason}”</p>
              </div>
            ))}
          </div>
        ) : null}

        {/* 🥗 메인 요리 외 별도 곁들임 / 토핑 / 특수재료 안내 (해당 시) */}
        {addUses.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-secondary bg-secondary/30 p-4 text-xs leading-relaxed">
            <p className="flex items-center gap-1.5 font-display font-semibold text-secondary-foreground">
              <UtensilsCrossed className="size-4 text-primary" />
              <span>🍽️ 곁들임 & 별도 활용 안내</span>
            </p>
            <ul className="mt-2.5 flex flex-col gap-2">
              {addUses.map((item) => (
                <li key={item.ingredient} className="rounded-xl bg-card p-3 border border-border/60">
                  <span className="font-display font-semibold text-primary">[{item.ingredient}]</span>{' '}
                  <span className="text-foreground">{item.usage}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* 💡 요리 팁 안내 (해당 시) */}
        {quest.tip ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-primary/30 bg-primary/5 p-3.5 text-xs leading-relaxed text-foreground">
            <span className="shrink-0 text-sm">💡</span>
            <div>
              <p className="font-display font-semibold text-primary">TIP</p>
              <p className="mt-0.5 text-muted-foreground">{quest.tip}</p>
            </div>
          </div>
        ) : null}

        {/* 4. 5단계 이내 조리법 */}
        <div className="mt-6">
          <p className="font-display text-base">🍳 조리법</p>
          <ol className="mt-3 flex flex-col gap-2.5">
            {quest.steps.slice(0, 5).map((step, i) => (
              <li
                key={step}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-secondary font-display text-xs text-secondary-foreground">
                  <span className="sr-only">STEP </span>
                  {i + 1}
                </span>
                <p className="pt-0.5 text-sm leading-relaxed">{step.replace(/^STEP\s*\d+\.\s*/, '')}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* 게이미피케이션 보상 (EXP = rescuedIngredients.length × 100) */}
        <div className="mt-6 rounded-2xl border border-dashed border-primary/50 bg-secondary/60 p-4 text-center">
          <p className="font-display text-xs text-muted-foreground">🎯 이번 퀘스트 구조 가능 재료</p>
          <p className="mt-0.5 font-display text-base font-bold">{rescuedIngredients.join(' · ') || quest.rescueTarget}</p>
          <p className="mt-2 font-display text-sm font-semibold text-primary">🎮 요리를 완성하면 +{calculatedExp} EXP 획득 가능</p>
          <div
            className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-card"
            role="img"
            aria-label={`구조 경험치 ${calculatedExp} 포인트 획득 가능`}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${Math.min(100, calculatedExp / 3 + 20)}%` }}
            />
          </div>
        </div>

        {/* 5. 다른 요리 추천받기 */}
        <button
          type="button"
          disabled={isRerolling}
          onClick={onReroll}
          className="mt-6 min-h-12 w-full rounded-2xl border border-border bg-muted font-display text-sm transition-all hover:bg-secondary active:scale-[0.98] disabled:opacity-50"
        >
          {isRerolling ? '🤖 새로운 요리 탐색 중...' : '🔄 다른 요리 추천받기'}
        </button>
      </div>
    </section>
  )
}

export function QuestFailure({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <section
      aria-live="polite"
      className="rounded-3xl border-2 border-destructive/40 bg-card p-6 text-center shadow-[0_5px_0_0_var(--border)]"
    >
      <p aria-hidden="true" className="text-3xl">
        😵‍💫
      </p>
      <p className="mt-3 font-display text-lg">🤖 AI 요리사가 퀘스트를 만들지 못했어요.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {message || '퀘스트 생성에 문제가 생겼어요. 다시 시도해주세요.'}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 min-h-12 w-full rounded-2xl bg-destructive font-display text-sm text-destructive-foreground transition-transform active:translate-y-0.5"
      >
        🔄 다시 시도
      </button>
    </section>
  )
}
