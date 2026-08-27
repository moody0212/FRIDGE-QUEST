import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '퀘스트 시작 | FRIDGE QUEST',
  description: '냉장고 속 남은 재료를 입력하고 AI가 추천하는 오늘의 요리 구조 퀘스트를 시작하세요.',
}

export default function QuestLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
