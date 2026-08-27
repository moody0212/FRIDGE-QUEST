'use client'

import Image from 'next/image'
import { Check, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

const LOADING_STEPS = [
  {
    label: 'STEP 1',
    icon: '🧊',
    title: '냉장고 속 재료를 확인하고 있어요.',
    description: '냉털 재료와 신선도 상태를 살펴보고 있어요.',
  },
  {
    label: 'STEP 2',
    icon: '🍳',
    title: '가장 잘 어울리는 조합을 찾고 있어요.',
    description: '냉털 재료와 기본 재료의 현실적인 조합을 탐색해요.',
  },
  {
    label: 'STEP 3',
    icon: '⚔️',
    title: '오늘의 구조 퀘스트를 만들고 있어요.',
    description: '레시피와 재료별 구조 결과를 정리하고 있어요.',
  },
] as const

export function QuestLoading({ isTimeout = false }: { isTimeout?: boolean }) {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setActiveStep(1), 1200),
      window.setTimeout(() => setActiveStep(2), 2800),
    ]

    return () => timers.forEach(window.clearTimeout)
  }, [])

  return (
    <section
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-svh flex-col justify-center py-8"
    >
      <div className="text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-display text-sm tracking-wide">
          <span aria-hidden="true">🎮</span> FRIDGE QUEST
        </p>

        <div className="mx-auto mt-5 size-28 overflow-hidden rounded-full border-2 border-primary/30 bg-card shadow-[0_4px_0_0_var(--border)]">
          <Image
            src="/images/fridge-mascot.png"
            alt="냉장고를 탐색하는 FRIDGE QUEST 구조대 캐릭터"
            width={200}
            height={200}
            priority
            className="size-full scale-105 object-contain"
          />
        </div>

        <h1 className="mt-5 font-display text-2xl leading-tight text-balance">
          냉장고를 탐색하고 있어요
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground text-pretty">
          잠시만 기다려주세요.
          <br />
          가장 맛있는 구조 작전을 준비하고 있어요.
        </p>
      </div>

      <ol className="mt-7 flex flex-col gap-3" aria-label="AI 분석 진행 단계">
        {LOADING_STEPS.map((step, index) => {
          const completed = index < activeStep
          const active = index === activeStep

          return (
            <li
              key={step.label}
              aria-current={active ? 'step' : undefined}
              className={`flex min-w-0 items-center gap-3 rounded-2xl border p-4 transition-colors duration-300 ${
                completed
                  ? 'border-secondary bg-secondary/70'
                  : active
                    ? 'border-primary bg-card shadow-[0_3px_0_0_var(--primary)]'
                    : 'border-border/70 bg-muted/45 text-muted-foreground'
              }`}
            >
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                  completed
                    ? 'bg-primary/15 text-primary'
                    : active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
                aria-hidden="true"
              >
                {completed ? (
                  <Check className="size-5 animate-in zoom-in duration-200 motion-reduce:animate-none" />
                ) : active ? (
                  <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" />
                ) : (
                  <span className="text-base grayscale opacity-60">{step.icon}</span>
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className={`font-display text-[11px] tracking-[0.16em] ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                  {step.label}
                </p>
                <p className="mt-0.5 font-display text-sm leading-snug text-foreground">
                  {completed ? '✓ ' : active ? `${step.icon} ` : ''}
                  {step.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </li>
          )
        })}
      </ol>

      {isTimeout ? (
        <p className="mt-4 rounded-xl bg-warning/20 p-2.5 text-center text-xs font-medium text-warning-foreground">
          ⏳ 분석이 조금 길어지고 있어요. 결과가 준비되는 즉시 보여드릴게요.
        </p>
      ) : null}
    </section>
  )
}
