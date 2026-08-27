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

      <div className="mt-6 flex items-center justify-center gap-3 px-2">
        {/* 캐릭터 대사 말풍선 (캐릭터 얼굴 왼쪽에 밀착 배치 & 꼬리 구현) */}
        <div className="relative max-w-[190px] shrink rounded-2xl border border-border bg-card px-3.5 py-2.5 text-left font-display text-xs leading-snug shadow-[0_3px_0_0_var(--border)] sm:max-w-[210px] sm:text-sm">
          버리기 전에
          <br />
          내가 구조해줄게!
          {/* 캐릭터 얼굴/입 방향을 향하는 오른쪽 삼각형 꼬리 */}
          <div
            className="absolute -right-2 top-1/2 -translate-y-1/2 size-0 border-y-[6px] border-y-transparent border-l-[8px] border-l-card drop-shadow-[1px_0_0_var(--border)]"
            aria-hidden="true"
          />
        </div>

        {/* 캐릭터 이미지 */}
        <div className="size-28 shrink-0 overflow-hidden rounded-full border-2 border-primary/30 bg-card sm:size-32">
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
