import Image from 'next/image'

export function QuestHero() {
  return (
    <header className="px-1 pt-8 pb-2 text-center">
      <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-display text-sm tracking-wide">
        <span aria-hidden="true">🎮</span> FRIDGE QUEST
      </p>
      <p className="mt-2 text-xs font-medium text-muted-foreground">
        AI 기반 냉장고 식재료 구조 퀘스트
      </p>

      <h1 className="mt-5 font-display text-3xl leading-tight text-balance">
        오늘 냉장고에서
        <br />
        무엇을 구조할까요?
      </h1>
      <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground text-pretty">
        남은 재료를 입력하면 AI가 오늘의 요리 퀘스트를 만들어드려요.
      </p>

      <div className="mt-6 flex items-end justify-center gap-1">
        <div className="relative -mb-4 max-w-[58%] rounded-3xl rounded-br-md border border-border bg-card px-4 py-3 text-left font-display text-sm leading-snug shadow-[0_3px_0_0_var(--border)]">
          버리기 전에
          <br />
          내가 구조해줄게!
        </div>
        <div className="size-32 shrink-0 overflow-hidden rounded-full border-2 border-primary/30 bg-card sm:size-36">
          <Image
            src="/images/fridge-mascot.png"
            alt="망토를 두른 귀여운 냉장고 구조대 캐릭터"
            width={200}
            height={200}
            priority
            className="size-full scale-105 object-contain"
          />
        </div>
      </div>
    </header>
  )
}
