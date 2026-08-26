import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Jua, Noto_Sans_KR } from 'next/font/google'
import './globals.css'

const _jua = Jua({ weight: '400', subsets: ['latin'] })
const _notoSansKr = Noto_Sans_KR({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FRIDGE QUEST · AI 냉장고 식재료 구조 퀘스트',
  description:
    '남은 재료를 입력하면 AI가 오늘의 요리 퀘스트를 만들어드려요. 버리기 전에 냉장고 식재료를 구조하세요!',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#F6F4E8',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="bg-background">
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
