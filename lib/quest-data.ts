export const BASIC_INGREDIENTS = [
  { name: '김치', emoji: '🥬' },
  { name: '대파', emoji: '🌿' },
  { name: '마늘', emoji: '🧄' },
  { name: '고춧가루', emoji: '🌶️' },
  { name: '간장', emoji: '🍶' },
  { name: '소금', emoji: '🧂' },
  { name: '설탕', emoji: '🍬' },
  { name: '식용유', emoji: '🌻' },
  { name: '참기름', emoji: '🥜' },
  { name: '식초', emoji: '🍋' },
] as const

export type FreshnessKey = 'fresh' | 'soft' | 'bad'

export const FRESHNESS: Record<
  FreshnessKey,
  { emoji: string; label: string; short: string; tone: string }
> = {
  fresh: {
    emoji: '🟢',
    label: '신선해요',
    short: '신선',
    tone: 'bg-secondary text-secondary-foreground',
  },
  soft: {
    emoji: '🟡',
    label: '시들거나 물러졌어요',
    short: '물렁',
    tone: 'bg-warning/25 text-warning-foreground',
  },
  bad: {
    emoji: '🔴',
    label: '상태가 많이 안 좋아요',
    short: '위급',
    tone: 'bg-destructive/15 text-destructive',
  },
}

export type RescueItem = {
  id: string
  name: string
  status: FreshnessKey | null
}

export type CookTime = '10' | '20' | 'any'

export const COOK_TIMES: { value: CookTime; label: string; emoji: string }[] = [
  { value: '10', label: '10분 이내', emoji: '⚡' },
  { value: '20', label: '20분 이내', emoji: '🔥' },
  { value: 'any', label: '상관없음', emoji: '🍲' },
]

export type Quest = {
  rescueTarget: string
  dish: string
  time: string
  rescueUsed: string[]
  basicUsed: string[]
  extraNeeded: string[]
  steps: string[]
  tip?: string
  warningMessage?: string
  exp: number
}

export const SAMPLE_QUESTS: Quest[] = [
  {
    rescueTarget: '양배추',
    dish: '김치 양배추 계란볶음',
    time: '약 15분',
    rescueUsed: ['양배추', '계란'],
    basicUsed: ['김치', '대파', '마늘', '간장', '식용유'],
    extraNeeded: [],
    steps: [
      '양배추와 김치를 먹기 좋은 크기로 자른다.',
      '식용유에 대파와 마늘을 볶는다.',
      '김치와 양배추를 넣고 볶는다.',
      '계란을 넣어 익힌다.',
      '간장으로 간을 맞춘다.',
    ],
    exp: 100,
  },
  {
    rescueTarget: '양배추',
    dish: '양배추 두부 스크램블',
    time: '약 12분',
    rescueUsed: ['양배추', '두부', '계란'],
    basicUsed: ['대파', '소금', '식용유', '참기름'],
    extraNeeded: [],
    steps: [
      '두부는 키친타월로 물기를 제거한다.',
      '양배추를 얇게 채 썬다.',
      '식용유에 대파를 볶아 향을 낸다.',
      '두부를 으깨 넣고 계란과 함께 스크램블한다.',
      '소금과 참기름으로 마무리한다.',
    ],
    exp: 120,
  },
  {
    rescueTarget: '두부',
    dish: '매콤 두부 양배추 덮밥',
    time: '약 18분',
    rescueUsed: ['두부', '양배추'],
    basicUsed: ['김치', '고춧가루', '마늘', '간장', '설탕'],
    extraNeeded: [],
    steps: [
      '두부를 큼직하게 썰어 겉면을 노릇하게 굽는다.',
      '양배추와 김치를 채 썬다.',
      '마늘과 고춧가루를 기름에 볶아 양념을 만든다.',
      '양배추와 김치를 넣고 센 불에 볶는다.',
      '간장과 설탕으로 간해 밥 위에 올린다.',
    ],
    exp: 90,
  },
]
