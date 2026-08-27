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

export type AdditionalUse = {
  ingredient: string
  usage: string
}

export type FailedIngredientReason = {
  ingredient: string
  reason: string
}

export type Quest = {
  rescueTarget: string
  dish: string
  cookingMethod: string
  time: string
  allIngredients: string[]
  rescuedIngredients: string[]
  failedIngredients: string[]
  failedIngredientReasons: FailedIngredientReason[]
  additionalUses: AdditionalUse[]
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
    cookingMethod: '볶음',
    time: '약 15분',
    allIngredients: ['양배추', '계란'],
    rescuedIngredients: ['양배추', '계란'],
    failedIngredients: [],
    failedIngredientReasons: [],
    additionalUses: [],
    basicUsed: ['김치', '대파', '마늘', '간장', '식용유'],
    extraNeeded: [],
    steps: [
      '양배추와 김치를 먹기 좋은 크기로 자른다.',
      '식용유에 대파와 마늘을 볶는다.',
      '김치와 양배추를 넣고 볶는다.',
      '계란을 넣어 익힌다.',
      '간장으로 간을 맞춘다.',
    ],
    exp: 200,
  },
]
