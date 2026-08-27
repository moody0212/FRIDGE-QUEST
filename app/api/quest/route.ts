import { NextResponse } from 'next/server'
import type { Quest } from '@/lib/quest-data'

interface RequestPayload {
  basics: string[]
  items: { name: string; status: 'fresh' | 'soft' | 'bad' }[]
  cookTime: '10' | '20' | 'any'
  excludeDish?: string
}

const BAD_ITEM_WARNING =
  '⚠️ 상태가 좋지 않은 식재료입니다. 냄새, 색, 곰팡이 등 실제 상태를 확인한 후 사용 여부를 결정해주세요.'

/**
 * Natural Korean particle generator to avoid "(을/를)", "(이/가)" brackets (Rule 5).
 */
function attachJosa(word: string, type: '을/를' | '이/가' | '은/는' | '과/와'): string {
  if (!word) return ''
  const trimmed = word.trim()
  const lastChar = trimmed.slice(-1)
  const code = lastChar.charCodeAt(0) - 0xac00
  const hasBatchim = code >= 0 && code <= 11172 && code % 28 !== 0

  switch (type) {
    case '을/를':
      return `${word}${hasBatchim ? '을' : '를'}`
    case '이/가':
      return `${word}${hasBatchim ? '이' : '가'}`
    case '은/는':
      return `${word}${hasBatchim ? '은' : '는'}`
    case '과/와':
      return `${word}${hasBatchim ? '과' : '와'}`
    default:
      return word
  }
}

/**
 * Categorize ingredient nature (Rule 1):
 * Identifies whether an input string represents an already prepared/cooked food
 * (e.g., "엄마가 만든 파프리카감자샐러드", "남은 치킨", "어제 먹다 남은 제육볶음").
 */
function isPreparedFood(name: string): boolean {
  const preparedKeywords = [
    '샐러드', '치킨', '제육', '불고기', '조림', '찌개', '볶음', '남은', '어제',
    '먹다', '엄마가', '시판', '도시락', '피자', '족발', '보쌈', '전', '튀김',
    '버거', '김밥', '카레', '짜장', '국', '탕', '수프'
  ]
  return preparedKeywords.some((kw) => name.includes(kw))
}

/**
 * Generate specific natural preparation text per ingredient (Rule 4).
 */
function getPreparationStep(itemName: string): string {
  if (itemName.includes('양파')) return '양파는 먹기 좋은 크기로 썰어둔다.'
  if (itemName.includes('삼겹살') || itemName.includes('돼지고기')) return '삼겹살은 먹기 좋은 크기로 자른다.'
  if (itemName.includes('소고기') || itemName.includes('닭고기')) return `${attachJosa(itemName, '은/는')} 한 입 크기로 토막 낸다.`
  if (itemName.includes('계란') || itemName.includes('달걀')) return '계란은 볼에 깨뜨려 부드럽게 푼다.'
  if (itemName.includes('두부')) return '두부는 키친타월로 물기를 제거하고 먹기 좋게 자른다.'
  if (itemName.includes('김치')) return '김치는 한 입 크기로 썰어 준비한다.'
  if (itemName.includes('양배추') || itemName.includes('배추')) return `${attachJosa(itemName, '은/는')} 큼직하게 썬다.`
  if (itemName.includes('버섯')) return `${attachJosa(itemName, '은/는')} 밑동을 잘라내고 먹기 좋게 찢는다.`
  if (itemName.includes('당근') || itemName.includes('감자')) return `${attachJosa(itemName, '은/는')} 껍질을 벗겨 얇게 썬다.`
  if (itemName.includes('대파')) return '대파는 송송 썰어 준비한다.'
  if (itemName.includes('마늘')) return '마늘은 편으로 썬다.'
  return `${attachJosa(itemName, '은/는')} 준비하여 먹기 좋게 손질해둔다.`
}

/**
 * Intelligent Rule-based Recipe Synthesizer for FRIDGE QUEST
 */
function generateFallbackQuest(
  basics: string[],
  items: { name: string; status: 'fresh' | 'soft' | 'bad' }[],
  cookTime: '10' | '20' | 'any',
  excludeDish?: string,
): Quest {
  const softItems = items.filter((i) => i.status === 'soft')
  const badItems = items.filter((i) => i.status === 'bad')
  const freshItems = items.filter((i) => i.status === 'fresh')

  // Rule 1 & Rule 3: Separate raw ingredients from already prepared/cooked foods
  const preparedItems = items.filter((i) => isPreparedFood(i.name))
  const rawItems = items.filter((i) => !isPreparedFood(i.name))

  // Determine main rescue target (prioritize soft raw item, then soft prepared if only prepared, then fresh/bad)
  const targetItem =
    rawItems.find((i) => i.status === 'soft') ||
    rawItems.find((i) => i.status === 'fresh') ||
    rawItems[0] ||
    items[0]

  const partnerItem =
    rawItems.find((i) => i.name !== targetItem.name) ||
    rawItems[1]

  const targetName = targetItem.name
  const partnerName = partnerItem ? partnerItem.name : ''

  const hasBadItem = badItems.length > 0
  const warningMessage = hasBadItem ? BAD_ITEM_WARNING : undefined

  // Determine Dish Name
  const candidateNames = partnerName
    ? [
        `${targetName} ${partnerName} 볶음`,
        `${targetName} ${partnerName} 덮밥`,
        `매콤 ${targetName} ${partnerName} 조림`,
        `고소한 ${targetName} ${partnerName}전`,
      ]
    : [
        `고소한 ${targetName} 볶음`,
        `달콤 짭조름한 ${targetName} 조림`,
        `간편 ${targetName} 덮밥`,
      ]

  const availableCandidates = excludeDish
    ? candidateNames.filter((name) => name !== excludeDish)
    : candidateNames
  const chosenDishName = availableCandidates[0] || candidateNames[0]

  // Rule 2 & Rule 7: rescueUsed contains ONLY ingredients actually cooked in the main recipe
  const rescueUsed = [targetName]
  if (partnerName) {
    rescueUsed.push(partnerName)
  }

  // Basic ingredients used
  const potentialBasics = ['대파', '마늘', '식용유', '간장', '소금', '참기름', '설탕', '고춧가루', '김치', '식초']
  const basicUsed = potentialBasics.filter((b) => basics.includes(b)).slice(0, 4)

  // Extra needed (only essential missing ingredients)
  const extraNeeded: string[] = []
  if (!basics.includes('식용유') && !basics.includes('참기름')) {
    extraNeeded.push('식용유')
  }

  // Steps Generation
  const steps: string[] = []

  // STEP 1: Ingredient specific preparation (Rule 4)
  if (partnerName) {
    steps.push(`STEP 1. ${getPreparationStep(targetName)} ${getPreparationStep(partnerName)}`)
  } else {
    steps.push(`STEP 1. ${getPreparationStep(targetName)}`)
  }

  // STEP 2: Aromatics / Base oil
  if (basics.includes('식용유') && (basics.includes('대파') || basics.includes('마늘'))) {
    const aromatics = ['대파', '마늘'].filter((a) => basics.includes(a))
    const joinedAromatics = aromatics.length === 2 ? `${aromatics[0]}와 ${aromatics[1]}` : aromatics[0]
    steps.push(`STEP 2. 달군 팬에 식용유를 두르고 ${attachJosa(joinedAromatics, '을/를')} 볶아 향을 낸다.`)
  } else {
    steps.push(`STEP 2. 팬을 중불로 달구고 식용유를 살짝 두른다.`)
  }

  // STEP 3: Cooking main ingredients
  const combinedNames = rescueUsed.length === 2 ? `${rescueUsed[0]}와 ${rescueUsed[1]}` : rescueUsed[0]
  steps.push(`STEP 3. 팬에 ${attachJosa(combinedNames, '을/를')} 넣고 중약불에서 노릇하게 볶는다.`)

  // STEP 4: Seasoning
  const seasonings = ['간장', '고춧가루', '설탕', '소금'].filter((s) => basics.includes(s))
  if (seasonings.length > 0) {
    const joinedSeasonings = seasonings.join(', ')
    steps.push(`STEP 4. ${attachJosa(joinedSeasonings, '을/를')} 취향껏 넣어 간을 맞춘다.`)
  } else {
    steps.push(`STEP 4. 소금이나 간장으로 알맞게 간을 맞춘다.`)
  }

  // STEP 5: Final touch
  if (basics.includes('참기름')) {
    steps.push(`STEP 5. 불을 끄고 참기름을 둘러 풍미를 살려 완성한다.`)
  } else {
    steps.push(`STEP 5. 접시에 정갈하게 담아내어 따뜻할 때 맛있게 즐긴다.`)
  }

  // Rule 3: Prepared food TIP guidance
  let tip: string | undefined = undefined
  if (preparedItems.length > 0) {
    const preparedNames = preparedItems.map((i) => i.name).join(', ')
    tip = `${attachJosa(preparedNames, '은/는')} 이미 완성된 음식이므로 볶음에 억지로 넣지 않고 완성된 요리와 곁들여 드시는 것을 추천합니다.`
  }

  return {
    rescueTarget: targetName,
    dish: chosenDishName,
    time: cookTime === '10' ? '약 10분' : '약 15분',
    rescueUsed,
    basicUsed,
    extraNeeded,
    steps: steps.slice(0, 5),
    tip,
    warningMessage,
    exp: softItems.length > 0 ? 120 : hasBadItem ? 80 : 100,
  }
}

export async function POST(request: Request) {
  try {
    const body: RequestPayload = await request.json()
    const { basics = [], items = [], cookTime = '20', excludeDish } = body

    // 1. Validation
    if (!Array.isArray(items) || items.length < 2) {
      return NextResponse.json(
        { error: '냉털 재료를 2개 이상 입력해주세요.' },
        { status: 400 },
      )
    }

    if (items.some((i) => !i.name || !i.status)) {
      return NextResponse.json(
        { error: '모든 냉털 재료의 상태를 선택해주세요.' },
        { status: 400 },
      )
    }

    // 2. Try Gemini / OpenAI LLM if configured in process.env
    const geminiKey = process.env.GEMINI_API_KEY

    if (geminiKey) {
      try {
        const softList = items.filter((i) => i.status === 'soft').map((i) => i.name).join(', ')
        const badList = items.filter((i) => i.status === 'bad').map((i) => i.name).join(', ')
        const freshList = items.filter((i) => i.status === 'fresh').map((i) => i.name).join(', ')

        const prompt = `당신은 냉장고 식재료 구조 퀘스트 마스터 AI입니다. 사용자가 입력한 냉장고 재료를 분석하여 실제로 만들 수 있는 맛있는 요리 1개를 추천하고 JSON으로 응답하세요.

[입력 데이터]
- 보유 기본 재료: ${basics.length > 0 ? basics.join(', ') : '없음'}
- 냉털 재료(시들거나 물러짐 🟡): ${softList || '없음'}
- 냉털 재료(상태 많이 안 좋음 🔴): ${badList || '없음'}
- 냉털 재료(신선함 🟢): ${freshList || '없음'}
- 조리 가능 시간: ${cookTime === '10' ? '10분 이내' : cookTime === '20' ? '20분 이내' : '상관없음'}
${excludeDish ? `- 제외할 이전 요리명: ${excludeDish}` : ''}

[핵심 레시피 생성 필수 규칙]
1. [재료 성격 판단] 입력된 재료를 생식재료(양파, 삼겹살), 일반재료(계란, 두부), 조리식품(김치), 이미 완성/조리된 음식(샐러드, 남은 치킨, 제육볶음 등)으로 구분하여 레시피에 적용하세요.
2. [모든 재료 억지 사용 금지] 입력된 모든 냉털 재료를 한 요리에 억지로 다 넣지 마세요. 🟡 상태 재료를 최우선 구조 대상으로 지정하되, 어울리는 궁합의 재료만 선택해 조리하세요.
3. [완성된 음식 별도 처리] 이미 조리된 음식(예: '엄마가 만든 파프리카감자샐러드')은 세척, 썰기, 볶기 등 생재료 조리 과정을 겪게 하지 마세요.
   - 메인 요리에 억지로 넣지 말고, 필요 시 tip 필드에 "곁들여 먹기" 등의 자연스러운 추천 문구를 작성하세요.
4. [재료별 동작 구분] 모든 재료에 "손질하여 볶는다" 식의 동일 표현을 쓰지 말고, 재료별 특성에 맞는 구체적 조리 동작(양파는 썬다, 삼겹살은 먹기 좋게 자른다, 계란은 푼다 등)을 서술하세요.
5. [조사 괄호 절대 금지] "(을/를)", "(이/가)", "(은/는)" 과 같은 괄호형 조사는 절대 출력하지 마세요. 한국어 받침에 맞는 올바른 조사를 작성하세요.
6. [실제 조리 가능성 우선] 모든 재료를 소진하느라 이상한 음식을 만들지 말고, 실제 조리 상식상 맛있는 요리를 만드세요.
7. [데이터 정합성]
   - rescueUsed: 실제 메인 요리 조리법에서 사용된 냉털 재료만 기재
   - basicUsed: 보유 체크한 기본 재료 중 실제 레시피에 사용된 항목만 기재
   - extraNeeded: 체크하지 않았지만 필수적인 추가 재료만 기재
   - tip: 완성된 음식의 활용법이나 요리 팁 안내 (있을 경우만)

[JSON 응답 포맷]
{
  "rescueTarget": "주 구조 대상 재료명",
  "dish": "추천 요리명",
  "time": "약 15분",
  "rescueUsed": ["실제 사용한 냉털재료1", "실제 사용한 냉털재료2"],
  "basicUsed": ["실제 사용한 기본재료1"],
  "extraNeeded": [],
  "steps": [
    "STEP 1. ...",
    "STEP 2. ...",
    "STEP 3. ...",
    "STEP 4. ...",
    "STEP 5. ..."
  ],
  "tip": "엄마가 만든 파프리카감자샐러드는 완성된 음식이므로 볶음에 억지로 넣지 않고 곁들여 먹는 것을 추천합니다.",
  "warningMessage": "🔴 재료 관련 경고문구(있을때만)",
  "exp": 100
}`

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          },
        )

        if (res.ok) {
          const data = await res.json()
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
          if (rawText) {
            const parsed = JSON.parse(rawText) as Quest
            if (parsed.dish && parsed.rescueTarget && Array.isArray(parsed.steps)) {
              return NextResponse.json(parsed)
            }
          }
        }
      } catch (err) {
        console.warn('Gemini API call failed, using rule-based generator:', err)
      }
    }

    // 3. Fallback to PRD-compliant synthesis engine
    const quest = generateFallbackQuest(basics, items, cookTime, excludeDish)
    return NextResponse.json(quest)
  } catch (error) {
    console.error('Error generating quest:', error)
    return NextResponse.json(
      { error: '퀘스트 생성 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
