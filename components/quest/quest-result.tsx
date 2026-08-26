'use client'

import type { Quest } from '@/lib/quest-data'

function Chip({ children, tone = 'plain' }: { children: string; tone?: 'plain' | 'good' }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        tone === 'good'
          ? 'bg-secondary text-secondary-foreground'
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

export function QuestResult({ quest, onReroll }: { quest: Quest; onReroll: () => void }) {
  return (
    <section
      aria-live="polite"
      className="overflow-hidden rounded-3xl border-2 border-primary bg-card shadow-[0_6px_0_0_var(--primary)]"
    >
      <div className="bg-destructive/10 px-5 py-3 text-center">
        <p className="font-display text-xs tracking-[0.2em] text-destructive">🚨 RESCUE MISSION</p>
        <p className="mt-1 font-display text-base">{quest.rescueTarget}를 먼저 구조해야 해요!</p>
      </div>

      <div className="px-5 py-6">
        <p className="text-center font-display text-xs tracking-[0.2em] text-primary">
          ⚔️ TODAY&apos;S QUEST
        </p>
        <h3 className="mt-2 text-center font-display text-2xl leading-snug text-balance">
          {quest.dish}
        </h3>
        <p className="mt-2 text-center text-sm font-medium text-muted-foreground">
          ⏱ {quest.time}
        </p>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-muted/60 p-4">
          <Group title="🧊 냉털 재료">
            {quest.rescueUsed.map((name) => (
              <Chip key={name} tone="good">
                {name}
              </Chip>
            ))}
          </Group>
          <Group title="🧂 사용하는 기본 재료">
            {quest.basicUsed.map((name) => (
              <Chip key={name}>{name}</Chip>
            ))}
          </Group>
          <Group title="🛒 추가 필요 재료">
            {quest.extraNeeded.length === 0 ? (
              <Chip tone="good">없음</Chip>
            ) : (
              quest.extraNeeded.map((name) => <Chip key={name}>{name}</Chip>)
            )}
          </Group>
          {quest.extraNeeded.length === 0 ? (
            <p className="rounded-xl bg-secondary px-3 py-2 text-center text-sm font-semibold text-secondary-foreground">
              ✨ 추가 장보기 없이 가능!
            </p>
          ) : null}
        </div>

        <div className="mt-6">
          <p className="font-display text-base">🍳 QUEST GUIDE</p>
          <ol className="mt-3 flex flex-col gap-2.5">
            {quest.steps.slice(0, 5).map((step, i) => (
              <li
                key={step}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary font-display text-xs text-secondary-foreground">
                  <span className="sr-only">STEP </span>
                  {i + 1}
                </span>
                <p className="pt-1 text-sm leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-primary/50 bg-secondary/60 p-4 text-center">
          <p className="font-display text-base">🎉 {quest.rescueTarget} 구조 성공!</p>
          <p className="mt-1 font-display text-sm text-primary">+{quest.exp} EXP</p>
          <div
            className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-card"
            role="img"
            aria-label={`구조 경험치 ${quest.exp} 포인트 획득`}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${Math.min(100, quest.exp / 2 + 20)}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onReroll}
          className="mt-6 min-h-12 w-full rounded-2xl border border-border bg-muted font-display text-sm transition-colors hover:bg-secondary"
        >
          🔄 다른 요리 추천받기
        </button>
      </div>
    </section>
  )
}

export function QuestFailure({ onRetry }: { onRetry: () => void }) {
  return (
    <section
      aria-live="polite"
      className="rounded-3xl border-2 border-destructive/40 bg-card p-6 text-center shadow-[0_5px_0_0_var(--border)]"
    >
      <p aria-hidden="true" className="text-3xl">
        😵‍💫
      </p>
      <p className="mt-3 font-display text-lg">AI 요리사가 퀘스트를 만들지 못했어요.</p>
      <p className="mt-1 text-sm text-muted-foreground">잠시 후 다시 시도해주세요.</p>
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
