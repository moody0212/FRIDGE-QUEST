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
 * Rule 1: Ingredient Role Classifier
 */
function isSauceOrSeasoning(name: string): boolean {
  const sauceKeywords = ['스리라차', '소스', '케첩', '마요네즈', '드레싱', '잼', '굴소스', '돈까스', '머스타드', '간장', '고춧가루', '설탕', '소금']
  return sauceKeywords.some((kw) => name.includes(kw))
}

function isBaseCarb(name: string): boolean {
  const carbKeywords = ['또띠아', '식빵', '빵', '밥', '면', '파스타', '우동', '라면', '라이스페이퍼']
  return carbKeywords.some((kw) => name.includes(kw))
}

function isPreparedFood(name: string): boolean {
  const preparedKeywords = [
    '샐러드', '치킨', '제육', '불고기', '조림', '찌개', '볶음', '남은', '어제',
    '먹다', '엄마가', '시판', '도시락', '피자', '족발', '보쌈', '전', '튀김',
    '버거', '김밥', '카레', '짜장', '국', '탕', '수프'
  ]
  return preparedKeywords.some((kw) => name.includes(kw))
}

/**
 * Rule 4: Generate specific natural preparation text per ingredient
 */
function getPreparationStep(itemName: string): string {
  if (itemName.includes('또띠아')) return '또띠아는 접시 위에 평평하게 펴둔다.'
  if (itemName.includes('식빵')) return '식빵은 노릇하게 구울 준비를 한다.'
  if (itemName.includes('양파')) return '양파는 껍질을 벗겨 얇게 채 썬다.'
  if (itemName.includes('삼겹살') || itemName.includes('돼지고기')) return '삼겹살은 먹기 좋은 크기로 자른다.'
  if (itemName.includes('소고기') || itemName.includes('닭고기')) return `${attachJosa(itemName, '은/는')} 한 입 크기로 토막 낸다.`
  if (itemName.includes('계란') || itemName.includes('달걀')) return '계란은 그릇에 깨뜨려 부드럽게 푼다.'
  if (itemName.includes('두부')) return '두부는 키친타월로 물기를 제거하고 한 입 크기로 자른다.'
  if (itemName.includes('김치')) return '김치는 한 입 크기로 썰어 준비한다.'
  if (itemName.includes('양배추') || itemName.includes('배추')) return `${attachJosa(itemName, '은/는')} 얇게 채 썬다.`
  if (itemName.includes('버섯')) return `${attachJosa(itemName, '은/는')} 밑동을 잘라내고 손질한다.`
  if (isSauceOrSeasoning(itemName)) return `${attachJosa(itemName, '은/는')} 양념 소스로 따로 준비해둔다.`
  return `${attachJosa(itemName, '은/는')} 준비하여 먹기 좋게 손질해둔다.`
}

/**
 * Intelligent Multi-step Reasoning Recipe Synthesizer for FRIDGE QUEST
 */
function generateFallbackQuest(
  basics: string[],
  items: { name: string; status: 'fresh' | 'soft' | 'bad' }[],
  cookTime: '10' | '20' | 'any',
  excludeDish?: string,
): Quest {
  const softItems = items.filter((i) => i.status === 'soft')
  const badItems = items.filter((i) => i.status === 'bad')

  const hasBadItem = badItems.length > 0
  const warningMessage = hasBadItem ? BAD_ITEM_WARNING : undefined

  // Categorize ingredient roles
  const carbItems = items.filter((i) => isBaseCarb(i.name))
  const sauceItems = items.filter((i) => isSauceOrSeasoning(i.name))
  const preparedItems = items.filter((i) => isPreparedFood(i.name))
  const mainFoodItems = items.filter((i) => !isBaseCarb(i.name) && !isSauceOrSeasoning(i.name) && !isPreparedFood(i.name))

  const targetItem = softItems[0] || items[0]
  const rescueTargetName = targetItem.name

  let dishName = ''
  let rescueUsed: string[] = []
  let basicUsed: string[] = []
  let extraNeeded: string[] = []
  let steps: string[] = []
  let tip: string | undefined = undefined

  // Rule 2 & 3: Multi-step Reasoning based on Roles
  if (carbItems.some((i) => i.name.includes('또띠아'))) {
    // Tortilla Case: Wrap, Quesadilla, or Pizza (NEVER stir-fry!)
    const hasSauce = sauceItems.length > 0
    const sauceName = hasSauce ? sauceItems[0].name : ''

    const candidates = [
      { name: '매콤 계란 또띠아롤', type: 'roll' },
      { name: '김치 치즈 퀘사디아', type: 'quesadilla' },
      { name: '바삭 또띠아 계란지단 피자', type: 'pizza' },
    ]
    const chosen = excludeDish ? candidates.find((c) => c.name !== excludeDish) || candidates[0] : candidates[0]
    dishName = chosen.name

    rescueUsed = items.map((i) => i.name)
    basicUsed = ['식용유', '간장', '소금'].filter((b) => basics.includes(b))

    if (chosen.type === 'roll') {
      extraNeeded = ['계란']
      steps = [
        'STEP 1. 또띠아는 조리대에 평평하게 펴고 계란을 부드럽게 푼다.',
        'STEP 2. 달군 팬에 식용유를 두르고 계란을 지단으로 노릇하게 구워낸다.',
        'STEP 3. 또띠아 위에 구운 계란 지단을 얹는다.',
        hasSauce
          ? `STEP 4. ${attachJosa(sauceName, '을/를')} 골고루 바르고 또띠아를 돌돌 단단하게 판다.`
          : 'STEP 4. 취향껏 소스를 바르고 또띠아를 돌돌 단단하게 판다.',
        'STEP 5. 한 입 크기로 썰어 접시에 담아 완성한다.',
      ]
    } else {
      extraNeeded = ['모짜렐라 치즈']
      steps = [
        'STEP 1. 또띠아 위에 속재료와 치즈를 골고루 올린다.',
        'STEP 2. 또띠아를 반으로 접어 모양을 잡는다.',
        'STEP 3. 달군 팬에 또띠아를 올리고 약불에서 은근하게 구워낸다.',
        'STEP 4. 치즈가 녹고 겉면이 바삭해지면 뒤집어 반대쪽도 구워준다.',
        'STEP 5. 먹기 좋은 크기로 조각내어 따뜻할 때 섭취한다.',
      ]
    }
  } else if (carbItems.some((i) => i.name.includes('식빵'))) {
    // Toast / Sandwich (NEVER stir-fry!)
    dishName = '고소한 계란 토스트'
    rescueUsed = items.map((i) => i.name)
    basicUsed = ['식용유', '설탕', '소금'].filter((b) => basics.includes(b))
    extraNeeded = ['계란']
    steps = [
      'STEP 1. 식빵을 준비하고 계란을 부드럽게 푼다.',
      'STEP 2. 팬에 식용유를 약간 두르고 식빵 노릇하게 구워낸다.',
      'STEP 3. 풀은 계란을 팬에 부어 두툼하게 익힌다.',
      'STEP 4. 구운 식빵 사이에 계란을 넣고 취향껏 소스를 더한다.',
      'STEP 5. 반으로 잘라 따뜻하게 즐긴다.',
    ]
  } else if (mainFoodItems.some((i) => i.name.includes('두부')) && (items.some((i) => i.name.includes('김치')) || basics.includes('김치'))) {
    // Dubu-Kimchi
    dishName = '담백한 두부김치'
    rescueUsed = items.map((i) => i.name)
    basicUsed = ['김치', '참기름', '깨', '식용유', '설탕'].filter((b) => basics.includes(b))
    extraNeeded = []
    steps = [
      'STEP 1. 두부는 한 입 크기로 썰어 끓는 물에 데치거나 전자기레인지에 데운다.',
      'STEP 2. 김치는 먹기 좋은 크기로 쫑쫑 썰어둔다.',
      'STEP 3. 팬에 식용유를 두르고 김치와 설탕을 넣어 볶는다.',
      'STEP 4. 마지막에 참기름을 살짝 둘러 고소한 풍미를 낸다.',
      'STEP 5. 따뜻한 두부 옆에 볶은 김치를 정갈하게 곁들여 완성한다.',
    ]
  } else {
    // Meat / Veggies: Rotate between 구이, 전, 덮밥, 볶음
    const primaryName = mainFoodItems[0]?.name || rescueTargetName
    const secondaryName = mainFoodItems[1]?.name || ''

    const candidateForms = [
      { name: secondaryName ? `${primaryName} ${secondaryName} 구이` : `노릇한 ${primaryName} 구이`, type: 'grill' },
      { name: secondaryName ? `${primaryName} ${secondaryName}전` : `고소한 ${primaryName}전`, type: 'pancake' },
      { name: secondaryName ? `${primaryName} ${secondaryName} 덮밥` : `간편 ${primaryName} 덮밥`, type: 'bowl' },
      { name: secondaryName ? `${primaryName} ${secondaryName} 볶음` : `매콤 ${primaryName} 볶음`, type: 'stir-fry' },
    ]

    const chosenForm = excludeDish
      ? candidateForms.find((c) => c.name !== excludeDish) || candidateForms[0]
      : candidateForms[0]

    dishName = chosenForm.name
    rescueUsed = mainFoodItems.map((i) => i.name)
    if (rescueUsed.length === 0) rescueUsed = [rescueTargetName]

    basicUsed = ['식용유', '간장', '마늘', '대파', '참기름', '소금'].filter((b) => basics.includes(b))
    extraNeeded = []

    if (chosenForm.type === 'grill') {
      steps = [
        `STEP 1. ${getPreparationStep(primaryName)}`,
        'STEP 2. 팬을 중불로 달구고 식용유를 살짝 둘러 준비한다.',
        `STEP 3. 손질한 ${attachJosa(primaryName, '을/를')} 팬에 올려 노릇하게 구워낸다.`,
        'STEP 4. 소금이나 간장으로 취향껏 간을 맞춘다.',
        'STEP 5. 예쁜 접시에 담아내어 완성한다.',
      ]
    } else if (chosenForm.type === 'pancake') {
      steps = [
        `STEP 1. ${getPreparationStep(primaryName)}`,
        'STEP 2. 그릇에 계란이나 부침가루를 넣어 재료와 섞어 반죽을 만든다.',
        'STEP 3. 달군 팬에 기름을 넉넉히 두르고 반죽을 한 숟가락씩 얹는다.',
        'STEP 4. 중약불에서 앞뒤로 노릇바삭하게 부쳐낸다.',
        'STEP 5. 키친타월에 기름을 빼고 간장과 함께 낸다.',
      ]
    } else if (chosenForm.type === 'bowl') {
      steps = [
        `STEP 1. ${getPreparationStep(primaryName)}`,
        'STEP 2. 팬에 식용유를 두르고 대파와 마늘을 볶아 향을 낸다.',
        `STEP 3. ${attachJosa(primaryName, '을/를')} 넣어 볶다가 간장과 설탕으로 자작하게 양념한다.`,
        'STEP 4. 따뜻한 밥을 그릇에 담는다.',
        'STEP 5. 밥 위에 조리한 재료를 얹어 덮밥으로 완성한다.',
      ]
    } else {
      steps = [
        `STEP 1. ${getPreparationStep(primaryName)}`,
        'STEP 2. 달군 팬에 식용유를 약간 두른다.',
        `STEP 3. ${attachJosa(primaryName, '을/를')} 넣고 센 불에서 빠르게 볶아낸다.`,
        'STEP 4. 간장이나 소금으로 간을 맞춘다.',
        'STEP 5. 불을 끄고 담아낸다.',
      ]
    }
  }

  // Prepared items tip
  if (preparedItems.length > 0) {
    const preparedNames = preparedItems.map((i) => i.name).join(', ')
    tip = `${attachJosa(preparedNames, '은/는')} 이미 완성된 음식이므로 메인 조리에서 제외하고 곁들임 음식으로 추천합니다.`
  }

  return {
    rescueTarget: rescueTargetName,
    dish: dishName,
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

    // 2. Gemini LLM Handler
    const geminiKey = process.env.GEMINI_API_KEY

    if (geminiKey) {
      try {
        const softList = items.filter((i) => i.status === 'soft').map((i) => i.name).join(', ')
        const badList = items.filter((i) => i.status === 'bad').map((i) => i.name).join(', ')
        const freshList = items.filter((i) => i.status === 'fresh').map((i) => i.name).join(', ')

        const prompt = `당신은 냉장고 식재료 구조 퀘스트 마스터 AI 셰프입니다. 입력된 냉장고 재료를 분석하여 실제로 먹을 수 있는 최적의 현실적 요리 1개를 추천하고 JSON으로 응답하세요.

[입력 데이터]
- 보유 기본 재료: ${basics.length > 0 ? basics.join(', ') : '없음'}
- 냉털 재료(시들거나 물러짐 🟡): ${softList || '없음'}
- 냉털 재료(상태 많이 안 좋음 🔴): ${badList || '없음'}
- 냉털 재료(신선함 🟢): ${freshList || '없음'}
- 조리 가능 시간: ${cookTime === '10' ? '10분 이내' : cookTime === '20' ? '20분 이내' : '상관없음'}
${excludeDish ? `- 직전 추천 요리(동일/유사한 조리 형태 피할 것): ${excludeDish}` : ''}

[절대 준수 레시피 생성 사고 단계]

STEP A. [재료 역할 내부 분류]
- 단백질/주재료 (삼겹살, 계란, 두부 등)
- 베이스/곡물 (또띠아, 식빵, 밥, 면 등)
- 소스/양념 (스리라차 소스, 케첩, 마요네즈, 간장 등)
- 조리완료 음식 (샐러드, 남은 치킨 등)

STEP B. ["볶음" 기본값 절대 사용 금지!]
- 팬에서 구울 수 있다고 해서 습관적으로 "○○ 볶음"을 만들지 마십시오.
- 특히 또띠아, 식빵, 샐러드, 소스류, 조리완료 음식은 "볶음"이 금지됩니다.
- 자연스러운 요리 형태 후보(랩, 롤, 퀘사디아, 토스트, 샌드위치, 전, 덮밥, 구이, 조림, 오믈렛, 볶음밥 등) 중 가장 어울리는 1개를 선택하세요.
  예: 또띠아 + 스리라차 소스 → '매콤 계란 또띠아롤' (스리라차는 소스로 사용, 필요 시 계란을 extraNeeded에 추가)
  예: 또띠아 + 김치 → '김치 치즈 퀘사디아'
  예: 식빵 + 계란 → '계란 토스트'

STEP C. [소스/양념명 요리명 명사 결합 금지]
- 스리라차 소스, 마요네즈 등의 소스를 요리 이름의 주재료 명사로 결합하지 마세요. (예: "또띠아 스리라차 소스 볶음" X)
- 소스는 레시피 과정에서 양념/드레싱으로 활용하세요.

STEP D. [현실적 요리 품질 우선]
- 보유 재료만으로 완벽한 요리가 어렵다면 "매콤 계란 또띠아롤"처럼 필수 재료(계란 등)를 extraNeeded에 추가하여 실제 먹을 수 있는 요리를 만드세요.
- 추가 필요 재료 0개를 위해 괴상한 억지 요리를 만드는 것을 금지합니다.

STEP E. [조사 괄호 표기 절대 금지]
- "(을/를)", "(이/가)", "(은/는)" 과 같은 괄호 조사를 절대 출력하지 말고 올바른 한글 조사를 적용하세요.

STEP F. [조리법 서술]
- 요리 형태(랩, 전, 덮밥, 토스트 등)에 맞는 실제 조리 동작으로 최대 5단계를 구성하세요.

[JSON 응답 포맷]
{
  "rescueTarget": "주 구조 대상 재료명",
  "dish": "현실적이고 자연스러운 요리명",
  "time": "약 15분",
  "rescueUsed": ["실제 레시피에 사용된 냉털재료"],
  "basicUsed": ["실제 사용된 보유 기본재료"],
  "extraNeeded": ["필수 추가 재료 (없으면 [])"],
  "steps": [
    "STEP 1. ...",
    "STEP 2. ...",
    "STEP 3. ...",
    "STEP 4. ...",
    "STEP 5. ..."
  ],
  "tip": "완성된 음식 또는 소스 활용 팁 (있을 경우만)",
  "warningMessage": "🔴 재료 관련 경고문구(있을 경우만)",
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

    // 3. Fallback Synthesizer Engine
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
