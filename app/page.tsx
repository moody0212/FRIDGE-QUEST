import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check, ChefHat, Search, Sparkles } from 'lucide-react'

const benefits = [
  {
    icon: Search,
    title: '남은 재료부터 탐색',
    description: '냉장고에 남은 재료와 상태를 입력하면 구조가 필요한 재료를 먼저 살펴봐요.',
  },
  {
    icon: ChefHat,
    title: '현실적인 한 끼 추천',
    description: '기본 재료까지 고려해 집에서 만들기 자연스러운 요리를 골라드려요.',
  },
  {
    icon: Sparkles,
    title: '재미있는 구조 결과',
    description: '어떤 재료를 활용할 수 있는지 퀘스트 결과와 EXP로 한눈에 확인해요.',
  },
]

const steps = [
  ['01', '냉장고 재료 입력', '버리기 아까운 재료와 신선도 상태를 알려주세요.'],
  ['02', 'AI 구조 작전 분석', '재료 궁합과 조리시간을 살펴 가장 자연스러운 조합을 찾아요.'],
  ['03', '오늘의 퀘스트 시작', '레시피를 확인하고 냉장고 속 재료를 맛있는 한 끼로 구조해요.'],
]

export default function LandingPage() {
  return (
    <main className="min-h-svh overflow-hidden">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-2 font-display text-lg" aria-label="FRIDGE QUEST 홈">
          <span
            className="flex size-9 items-center justify-center rounded-xl border border-border bg-card shadow-[0_2px_0_0_var(--border)]"
            aria-hidden="true"
          >
            🧊
          </span>
          FRIDGE QUEST
        </Link>
        <Link
          href="/quest"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl bg-primary px-4 font-display text-sm text-primary-foreground shadow-[0_3px_0_0_var(--secondary-foreground)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-0 active:shadow-none"
        >
          퀘스트 시작 <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </header>

      <section className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pt-12 pb-20 sm:px-8 md:grid-cols-[1.05fr_0.95fr] md:pt-20 md:pb-28">
        <div className="relative z-10 text-center md:text-left">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-secondary px-3 py-1.5 text-sm font-semibold text-secondary-foreground">
            <Sparkles className="size-4" aria-hidden="true" /> AI 냉장고 식재료 구조대
          </p>
          <h1 className="mt-6 font-display text-4xl leading-[1.15] text-balance sm:text-5xl lg:text-6xl">
            버리기 전에,
            <br />
            <span className="text-primary">맛있는 퀘스트</span>로 구조해요
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground text-pretty md:mx-0 md:text-lg md:leading-8">
            냉장고에 애매하게 남은 재료가 있나요? 재료와 조리시간만 알려주면 AI가 오늘 만들기 좋은 한 끼를 찾아드려요.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center md:justify-start">
            <Link
              href="/quest"
              className="inline-flex min-h-16 w-full max-w-xs items-center justify-center gap-2 rounded-3xl bg-primary px-7 font-display text-xl text-primary-foreground shadow-[0_6px_0_0_var(--secondary-foreground)] transition-all hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring active:translate-y-1 active:shadow-[0_2px_0_0_var(--secondary-foreground)] sm:w-auto"
            >
              냉장고 구조하러 가기 <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
            <p className="text-xs text-muted-foreground">가입 없이 바로 시작할 수 있어요</p>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -top-10 -right-12 size-40 rounded-full bg-accent/25 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-10 -left-12 size-44 rounded-full bg-primary/15 blur-3xl" aria-hidden="true" />
          <div className="relative rounded-[2rem] border border-border bg-card p-5 shadow-[0_8px_0_0_var(--border)] sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold tracking-wider text-primary">TODAY&apos;S QUEST</p>
                <p className="mt-1 font-display text-2xl">냉장고 구조 작전</p>
              </div>
              <span className="rounded-full bg-warning/20 px-3 py-1 text-xs font-bold text-warning-foreground">+300 EXP</span>
            </div>
            <div className="mt-5 flex items-center gap-4 rounded-3xl bg-secondary/70 p-4">
              <div className="size-28 shrink-0 overflow-hidden rounded-full border-2 border-primary/25 bg-card sm:size-32">
                <Image
                  src="/images/fridge-mascot.png"
                  alt="망토를 두른 FRIDGE QUEST 냉장고 구조대 캐릭터"
                  width={200}
                  height={200}
                  priority
                  className="size-full scale-105 object-contain"
                />
              </div>
              <div>
                <p className="font-display text-lg">재료 구조 준비 완료!</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  냉장고 속 재료를 알려주면 가장 맛있는 구조 작전을 찾아볼게요.
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
              {['재료 확인', '조합 탐색', '퀘스트 발견'].map((label) => (
                <div key={label} className="rounded-2xl border border-border bg-background px-2 py-3">
                  <Check className="mx-auto mb-1.5 size-4 text-primary" aria-hidden="true" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card/70 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="font-display text-sm text-primary">WHY FRIDGE QUEST?</p>
            <h2 className="mt-3 font-display text-3xl text-balance sm:text-4xl">남은 재료 고민을 오늘의 게임으로</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              무조건 모든 재료를 섞지 않아요. 실제로 함께 쓰기 좋은 재료를 중심으로 현실적인 요리를 추천합니다.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-3xl border border-border bg-card p-6 shadow-[0_4px_0_0_var(--border)]">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-xl">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 py-20 sm:px-8 md:py-28">
        <div className="text-center">
          <p className="font-display text-sm text-primary">HOW IT WORKS</p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl">세 단계면 구조 퀘스트 완성</h2>
        </div>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map(([number, title, description]) => (
            <li key={number} className="relative rounded-3xl border border-border bg-card p-6">
              <span className="font-display text-3xl text-primary/30">{number}</span>
              <h3 className="mt-4 font-display text-xl">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="px-5 pb-20 sm:px-8 md:pb-28">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-primary/20 bg-secondary px-6 py-12 text-center shadow-[0_6px_0_0_var(--border)] sm:px-10 sm:py-16">
          <p className="text-4xl" aria-hidden="true">🧊</p>
          <h2 className="mt-4 font-display text-3xl text-balance sm:text-4xl">오늘 냉장고엔 무엇이 남아 있나요?</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            버리기 전에 한 번만 더 살펴봐요. 생각보다 근사한 한 끼가 숨어 있을지도 몰라요.
          </p>
          <Link
            href="/quest"
            className="mt-7 inline-flex min-h-16 items-center justify-center gap-2 rounded-3xl bg-primary px-8 font-display text-xl text-primary-foreground shadow-[0_6px_0_0_var(--secondary-foreground)] transition-all hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring active:translate-y-1 active:shadow-[0_2px_0_0_var(--secondary-foreground)]"
          >
            무료로 퀘스트 시작하기 <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-5 py-8 text-center text-xs text-muted-foreground">
        <p>
          <span className="font-display text-foreground">FRIDGE QUEST</span> · 냉장고 속 재료를 맛있는 한 끼로
        </p>
      </footer>
    </main>
  )
}
