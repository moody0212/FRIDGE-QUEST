import { NextResponse } from 'next/server'
import type { Quest } from '@/lib/quest-data'

interface RequestPayload {
  basics: string[]
  items: { name: string; status: 'fresh' | 'soft' | 'bad' }[]
  cookTime: '10' | '20' | 'any'
  excludeDish?: string
  previousRecipeName?: string
  previousCookingMethod?: string
  previousUsedFridgeIngredients?: string[]
}

const BAD_ITEM_WARNING =
  '⚠️ 상태가 좋지 않은 식재료입니다. 냄새, 색, 곰팡이 등 실제 상태를 확인한 후 사용 여부를 결정해주세요.'

const ADJECTIVES_TO_STRIP = ['매콤', '특제', '간단', '맛있는', '특별한', '초간단', '고소한', '노릇한', '담백한', '바삭']

function stripAdjectives(dishName: string): string {
  let cleaned = dishName.trim()
  for (const adj of ADJECTIVES_TO_STRIP) {
    if (cleaned.startsWith(adj)) {
      cleaned = cleaned.replace(new RegExp(`^${adj}\\s*`), '').trim()
    }
  }
  return cleaned
}

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

function getPreparationStep(itemName: string): string {
  if (itemName.includes('또띠아')) return `${itemName}는 접시 위에 평평하게 펴둔다.`
  if (itemName.includes('식빵')) return `${itemName}는 노릇하게 구울 준비를 한다.`
  if (itemName.includes('양파')) return `${itemName}는 껍질을 벗겨 얇게 채 썬다.`
  if (itemName.includes('삼겹살') || itemName.includes('돼지고기')) return `${itemName}는 먹기 좋은 크기로 자른다.`
  if (itemName.includes('소고기') || itemName.includes('닭고기')) return `${attachJosa(itemName, '은/는')} 한 입 크기로 토막 낸다.`
  if (itemName.includes('계란') || itemName.includes('달걀')) return `${itemName}는 그릇에 깨뜨려 부드럽게 푼다.`
  if (itemName.includes('두부')) return `${itemName}는 키친타월로 물기를 제거하고 한 입 크기로 자른다.`
  if (itemName.includes('김치')) return `${itemName}는 한 입 크기로 썰어 준비한다.`
  if (itemName.includes('양배추') || itemName.includes('배추')) return `${attachJosa(itemName, '은/는')} 얇게 채 썬다.`
  if (itemName.includes('버섯')) return `${attachJosa(itemName, '은/는')} 밑동을 잘라내고 손질한다.`
  if (isSauceOrSeasoning(itemName)) return `${attachJosa(itemName, '은/는')} 양념 소스로 따로 준비해둔다.`
  return `${attachJosa(itemName, '은/는')} 준비하여 먹기 좋게 손질해둔다.`
}

/**
 * Rule A-11: Response Verification Engine
 */
function validateQuest(
  quest: Quest,
  requestItems: { name: string; status: string }[],
  requestBasics: string[],
  previousRecipeName?: string,
  previousUsedFridgeIngredients?: string[],
): { valid: boolean; reason?: string } {
  const inputNames = requestItems.map((i) => i.name)
  const usedFridge = quest.usedFridgeIngredients || quest.rescueUsed || []

  if (!Array.isArray(usedFridge) || usedFridge.length === 0) {
    return {
      valid: false,
      reason: 'usedFridgeIngredients 목록이 빈 배열이거나 유효하지 않습니다.',
    }
  }

  // 1. usedFridgeIngredients validation (Exact match with user input)
  for (const used of usedFridge) {
    if (!inputNames.includes(used)) {
      return {
        valid: false,
        reason: `usedFridgeIngredients의 "${used}"가 사용자가 입력한 원래 재료 원문 목록(${inputNames.join(', ')})에 존재하지 않거나 변경되었습니다.`,
      }
    }
  }

  // 2. Are usedFridgeIngredients actually used in steps?
  const stepsJoined = quest.steps.join(' ')
  for (const used of usedFridge) {
    if (!stepsJoined.includes(used)) {
      return {
        valid: false,
        reason: `usedFridgeIngredients에 지정된 "${used}"가 실제 조리법(steps) 과정에 등장하지 않았습니다.`,
      }
    }
  }

  // 3. rescueTarget must be in usedFridgeIngredients
  if (!usedFridge.includes(quest.rescueTarget)) {
    return {
      valid: false,
      reason: `구조 대상("${quest.rescueTarget}")이 실제로 사용한 냉털 재료 목록(${usedFridge.join(', ')})에 포함되어야 합니다.`,
    }
  }

  // 4. basicUsed validation
  for (const basic of quest.basicUsed) {
    if (!requestBasics.includes(basic)) {
      return {
        valid: false,
        reason: `사용하는 기본 재료("${basic}")가 사용자가 체크한 보유 기본 재료에 없습니다.`,
      }
    }
  }

  // 5. Typo and formatting checks
  const fullText = `${quest.dish} ${stepsJoined} ${quest.tip || ''}`
  if (fullText.includes('전자기레인지')) {
    return {
      valid: false,
      reason: '"전자기레인지"라는 잘못된 표현이 발견되었습니다. "전자레인지"로 표기하세요.',
    }
  }

  if (/\([을를이가은는과와]\)/.test(fullText)) {
    return {
      valid: false,
      reason: '괄호 조사 (을/를) 표기가 감지되었습니다. 올바른 한글 문장 조사를 적용하세요.',
    }
  }

  // 6. Reroll substantially different check (A-8)
  if (previousRecipeName) {
    const cleanCurrent = stripAdjectives(quest.dish)
    const cleanPrev = stripAdjectives(previousRecipeName)
    if (cleanCurrent === cleanPrev || quest.dish === previousRecipeName) {
      return {
        valid: false,
        reason: `직전 추천 요리("${previousRecipeName}")와 실질적으로 동일한 요리입니다. 수식어만 변경하지 말고 전혀 다른 조리법이나 재료 조합을 선택하세요.`,
      }
    }
  }

  return { valid: true }
}

/**
 * Intelligent Rule-based Recipe Synthesizer for FRIDGE QUEST
 */
function generateFallbackQuest(
  basics: string[],
  items: { name: string; status: 'fresh' | 'soft' | 'bad' }[],
  cookTime: '10' | '20' | 'any',
  previousRecipeName?: string,
  previousUsedFridgeIngredients?: string[],
): Quest {
  // Priority sorting: bad > soft > fresh
  const sortedItems = [...items].sort((a, b) => {
    const score = (s: string) => (s === 'bad' ? 3 : s === 'soft' ? 2 : 1)
    return score(b.status) - score(a.status)
  })

  // If rerolling, prioritize unused items from previous run
  let candidates = sortedItems
  if (previousUsedFridgeIngredients && previousUsedFridgeIngredients.length > 0) {
    const unused = sortedItems.filter((i) => !previousUsedFridgeIngredients.includes(i.name))
    if (unused.length > 0) {
      candidates = unused
    }
  }

  const badItems = items.filter((i) => i.status === 'bad')
  const warningMessage = badItems.length > 0 ? BAD_ITEM_WARNING : undefined

  const carbItems = candidates.filter((i) => isBaseCarb(i.name))
  const sauceItems = candidates.filter((i) => isSauceOrSeasoning(i.name))
  const preparedItems = candidates.filter((i) => isPreparedFood(i.name))
  const mainFoodItems = candidates.filter((i) => !isBaseCarb(i.name) && !isSauceOrSeasoning(i.name) && !isPreparedFood(i.name))

  const targetItem = candidates[0] || items[0]
  const rescueTargetName = targetItem.name

  let dishName = ''
  let usedFridgeIngredients: string[] = []
  let basicUsed: string[] = []
  let extraNeeded: string[] = []
  let steps: string[] = []
  let tip: string | undefined = undefined

  if (carbItems.some((i) => i.name.includes('또띠아'))) {
    const hasSauce = sauceItems.length > 0
    const sauceName = hasSauce ? sauceItems[0].name : ''

    const options = [
      { name: '매콤 계란 또띠아롤', type: 'roll' },
      { name: '김치 치즈 퀘사디아', type: 'quesadilla' },
      { name: '바삭 또띠아 피자', type: 'pizza' },
    ]
    const chosen = previousRecipeName
      ? options.find((o) => stripAdjectives(o.name) !== stripAdjectives(previousRecipeName)) || options[1]
      : options[0]

    dishName = chosen.name
    usedFridgeIngredients = [carbItems[0].name]
    if (hasSauce) usedFridgeIngredients.push(sauceName)

    basicUsed = ['식용유', '소금'].filter((b) => basics.includes(b))

    if (chosen.type === 'roll') {
      extraNeeded = ['계란']
      steps = [
        `STEP 1. ${carbItems[0].name}는 조리대에 평평하게 펴고 계란을 부드럽게 푼다.`,
        'STEP 2. 달군 팬에 식용유를 두르고 계란 지단을 노릇하게 부쳐낸다.',
        `STEP 3. ${carbItems[0].name} 위에 구운 계란 지단을 얹는다.`,
        hasSauce
          ? `STEP 4. ${attachJosa(sauceName, '을/를')} 골고루 바르고 돌돌 단단하게 판다.`
          : 'STEP 4. 취향껏 소스를 바르고 돌돌 단단하게 판다.',
        'STEP 5. 한 입 크기로 썰어 접시에 담아 완성한다.',
      ]
    } else {
      extraNeeded = ['모짜렐라 치즈']
      steps = [
        `STEP 1. ${carbItems[0].name} 위에 속재료와 치즈를 올린다.`,
        `STEP 2. ${carbItems[0].name}를 반으로 접어 모양을 잡는다.`,
        'STEP 3. 달군 팬에 약불로 은근하게 구워낸다.',
        'STEP 4. 치즈가 녹고 겉면이 바삭해지면 뒤집어 반대쪽도 구워준다.',
        'STEP 5. 조각내어 따뜻할 때 섭취한다.',
      ]
    }
  } else if (carbItems.some((i) => i.name.includes('식빵'))) {
    dishName = '고소한 계란 토스트'
    usedFridgeIngredients = [carbItems[0].name]
    basicUsed = ['식용유', '설탕', '소금'].filter((b) => basics.includes(b))
    extraNeeded = ['계란']
    steps = [
      `STEP 1. ${carbItems[0].name}을 준비하고 계란을 부드럽게 푼다.`,
      `STEP 2. 팬에 식용유를 두르고 ${carbItems[0].name}을 노릇하게 구워낸다.`,
      'STEP 3. 계란을 팬에 부어 두툼하게 익힌다.',
      `STEP 4. 구운 ${carbItems[0].name} 사이에 계란을 넣는다.`,
      'STEP 5. 반으로 잘라 따뜻하게 즐긴다.',
    ]
  } else {
    // Select 1 or 2 main ingredients actually used in steps
    const primary = mainFoodItems[0] || targetItem
    const secondary = mainFoodItems.find((i) => i.name !== primary.name)

    usedFridgeIngredients = [primary.name]
    if (secondary) usedFridgeIngredients.push(secondary.name)

    const formOptions = [
      { name: secondary ? `${primary.name} ${secondary.name} 구이` : `노릇한 ${primary.name} 구이`, type: 'grill' },
      { name: secondary ? `${primary.name} ${secondary.name}전` : `고소한 ${primary.name}전`, type: 'pancake' },
      { name: secondary ? `${primary.name} ${secondary.name} 덮밥` : `간편 ${primary.name} 덮밥`, type: 'bowl' },
      { name: secondary ? `${primary.name} ${secondary.name} 볶음` : `매콤 ${primary.name} 볶음`, type: 'stir-fry' },
    ]

    const chosenForm = previousRecipeName
      ? formOptions.find((f) => stripAdjectives(f.name) !== stripAdjectives(previousRecipeName)) || formOptions[1]
      : formOptions[0]

    dishName = chosenForm.name
    basicUsed = ['식용유', '간장', '마늘', '대파', '참기름', '소금'].filter((b) => basics.includes(b))
    extraNeeded = []

    if (chosenForm.type === 'grill') {
      steps = [
        `STEP 1. ${getPreparationStep(primary.name)}`,
        'STEP 2. 팬을 중불로 달구고 식용유를 살짝 둘러 준비한다.',
        `STEP 3. 달군 팬에 손질한 ${attachJosa(primary.name, '을/를')} 올려 노릇하게 구워낸다.`,
        secondary ? `STEP 4. ${attachJosa(secondary.name, '을/를')} 곁들여 함께 노릇하게 익힌다.` : 'STEP 4. 소금이나 간장으로 간을 맞춘다.',
        'STEP 5. 예쁜 접시에 담아내어 완성한다.',
      ]
    } else if (chosenForm.type === 'pancake') {
      steps = [
        `STEP 1. ${getPreparationStep(primary.name)}`,
        `STEP 2. 그릇에 계란을 풀고 ${attachJosa(primary.name, '을/를')} 넣어 섞는다.`,
        'STEP 3. 달군 팬에 기름을 둘러 반죽을 올린다.',
        'STEP 4. 앞뒤로 노릇하게 부쳐낸다.',
        'STEP 5. 접시에 담아 완성한다.',
      ]
    } else if (chosenForm.type === 'bowl') {
      steps = [
        `STEP 1. ${getPreparationStep(primary.name)}`,
        'STEP 2. 팬에 식용유를 두르고 대파와 마늘을 볶는다.',
        `STEP 3. ${attachJosa(primary.name, '을/를')} 넣어 볶다가 간장으로 간한다.`,
        'STEP 4. 따뜻한 밥을 그릇에 담는다.',
        'STEP 5. 밥 위에 조리한 재료를 얹어 덮밥으로 완성한다.',
      ]
    } else {
      steps = [
        `STEP 1. ${getPreparationStep(primary.name)}`,
        'STEP 2. 달군 팬에 식용유를 약간 두른다.',
        `STEP 3. ${attachJosa(primary.name, '을/를')} 넣고 빠르게 볶아낸다.`,
        secondary ? `STEP 4. ${attachJosa(secondary.name, '을/를')} 넣고 함께 볶아 간한다.` : 'STEP 4. 간장이나 소금으로 간을 맞춘다.',
        'STEP 5. 불을 끄고 예쁘게 담아낸다.',
      ]
    }
  }

  if (preparedItems.length > 0) {
    const preparedNames = preparedItems.map((i) => i.name).join(', ')
    tip = `${attachJosa(preparedNames, '은/는')} 이미 완성된 음식이므로 씻거나 조리하지 않고 곁들임 토핑으로 추천합니다.`
  }

  return {
    rescueTarget: rescueTargetName,
    dish: dishName,
    time: cookTime === '10' ? '약 10분' : '약 15분',
    usedFridgeIngredients,
    rescueUsed: usedFridgeIngredients,
    basicUsed,
    extraNeeded,
    steps: steps.slice(0, 5),
    tip,
    warningMessage,
    exp: (usedFridgeIngredients.length || 1) * 100,
  }
}

async function callGeminiModel(model: string, apiKey: string, prompt: string): Promise<Quest | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        }),
      },
    )

    if (res.ok) {
      const data = await res.json()
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (rawText) {
        const parsed = JSON.parse(rawText) as Quest
        if (parsed.dish && parsed.rescueTarget && Array.isArray(parsed.steps)) {
          return parsed
        }
      }
    }
  } catch (err) {
    console.warn(`Model ${model} execution error:`, err)
  }
  return null
}

export async function POST(request: Request) {
  try {
    const body: RequestPayload = await request.json()
    const {
      basics = [],
      items = [],
      cookTime = '20',
      excludeDish,
      previousRecipeName,
      previousCookingMethod,
      previousUsedFridgeIngredients = [],
    } = body

    const lastRecipe = previousRecipeName || excludeDish

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
    const geminiKey = process.env.GEMINI_API_KEY || process.env.FRIDGE_QUEST_AI_KEY

    if (geminiKey) {
      const badList = items.filter((i) => i.status === 'bad').map((i) => i.name).join(', ')
      const softList = items.filter((i) => i.status === 'soft').map((i) => i.name).join(', ')
      const freshList = items.filter((i) => i.status === 'fresh').map((i) => i.name).join(', ')

      const basePrompt = `당신은 냉장고 식재료 구조 퀘스트 마스터 AI 셰프입니다. 입력된 냉장고 재료 중 조리법에 실제로 사용할 재료만 선택하여 현실적인 요리를 1개 추천하고 JSON으로 응답하세요.

[사용자 입력 데이터]
- 보유 기본 재료: ${basics.length > 0 ? basics.join(', ') : '없음'}
- 냉털 재료 (위급/상태나쁨 🔴 - 우선검토): ${badList || '없음'}
- 냉털 재료 (물렁/시듦 🟡 - 우선구조): ${softList || '없음'}
- 냉털 재료 (신선함 🟢): ${freshList || '없음'}
- 조리 가능 시간: ${cookTime === '10' ? '10분 이내' : cookTime === '20' ? '20분 이내' : '상관없음'}
${
  lastRecipe
    ? `[🚨 재추천 요청 - 직전 요리 정보 피할 것]
- 직전 추천 요리명: ${lastRecipe}
- 직전 조리 방식: ${previousCookingMethod || '미정'}
- 직전 사용 재료: ${previousUsedFridgeIngredients.join(', ') || '없음'}
규칙: 직전 요리와 실질적으로 다른 조리 방식(예: 구이, 전, 덮밥, 찜 등)이나 직전 사용하지 않은 남은 재료를 우선 활용하세요.`
    : ''
}

[필수 규칙 A: usedFridgeIngredients와 실제 조리법 일치]
1. usedFridgeIngredients 배열에는 이번 레시피의 조리 단계(steps)에서 실제로 사용 및 조리되는 냉털 재료명만 넣으세요.
2. 입력된 냉털 재료를 억지로 모두 넣지 마세요! 실제 조리에 1~2개만 사용된다면 usedFridgeIngredients에도 그 1~2개만 넣어야 합니다.
3. usedFridgeIngredients에 넣은 재료는 반드시 조리 과정(steps) 문장에 100% 명시적으로 등장해야 합니다.

[필수 규칙 B: 입력 재료명 원문 보존 (Source of Truth)]
1. 사용자가 입력한 재료명 원문("${items.map((i) => i.name).join(', ')}")을 절대 변경하지 마십시오. (예: "취두부" ➔ "취두부", 절대 "두부"로 치환 금지)
2. 완성된 음식(샐러드, 치킨 등)은 씻거나 볶지 말고 곁들임 토핑으로만 활용하세요.

[필수 규칙 C: 조리 용어 및 표기]
1. "전자기레인지" 사용 절대 금지 ➔ "전자레인지"로 작성하세요.
2. "(을/를)" 과 같은 괄호 조사를 절대 쓰지 마세요.

[JSON 응답 포맷]
{
  "rescueTarget": "이번 레시피 주 구조 대상 재료명 (원문과 100% 일치)",
  "dish": "자연스러운 요리명",
  "time": "약 15분",
  "usedFridgeIngredients": ["실제 steps 조리 과정에서 사용되는 냉털 재료원문"],
  "basicUsed": ["실제 사용된 보유 기본재료"],
  "extraNeeded": ["필수 추가 재료 (없으면 [])"],
  "steps": [
    "STEP 1. ...",
    "STEP 2. ...",
    "STEP 3. ...",
    "STEP 4. ...",
    "STEP 5. ..."
  ],
  "tip": "활용 팁 (있을 경우만)",
  "warningMessage": "🔴 재료 관련 경고문구(있을 경우만)"
}`

      const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro']

      for (const model of models) {
        try {
          let parsed = await callGeminiModel(model, geminiKey, basePrompt)

          if (parsed) {
            // Ensure rescueUsed equals usedFridgeIngredients
            parsed.usedFridgeIngredients = parsed.usedFridgeIngredients || parsed.rescueUsed || []
            parsed.rescueUsed = parsed.usedFridgeIngredients

            let validation = validateQuest(
              parsed,
              items,
              basics,
              lastRecipe,
              previousUsedFridgeIngredients,
            )

            // Rule A-12: Single retry on validation failure
            if (!validation.valid) {
              console.warn(`[AI Validation Failed on ${model}]: ${validation.reason}. Requesting 1-time retry...`)

              const retryPrompt = `${basePrompt}

[🚨 1회 재시도 요청 - 검증 실패 원인 수정 지침]
이전 응답이 다음 검증 이유로 거부되었습니다:
"${validation.reason}"

지침:
1. usedFridgeIngredients에는 실제 steps 조리 과정에 100% 등장하는 재료명만 넣으세요.
2. 입력 원문 재료명("${items.map((i) => i.name).join(', ')}")을 변경하지 마세요.
3. 직전 추천 요리("${lastRecipe || '없음'}")와 실질적으로 다른 요리 형태를 만드세요.`

              parsed = await callGeminiModel(model, geminiKey, retryPrompt)
              if (parsed) {
                parsed.usedFridgeIngredients = parsed.usedFridgeIngredients || parsed.rescueUsed || []
                parsed.rescueUsed = parsed.usedFridgeIngredients
                validation = validateQuest(
                  parsed,
                  items,
                  basics,
                  lastRecipe,
                  previousUsedFridgeIngredients,
                )
              }
            }

            if (parsed && validation.valid) {
              // Code calculates EXP strictly (A-10)
              parsed.exp = (parsed.usedFridgeIngredients.length || 1) * 100
              return NextResponse.json(parsed)
            }
          }
        } catch (modelErr) {
          console.warn(`Model ${model} execution failed, trying next model:`, modelErr)
        }
      }
    }

    // 3. Rule-based Fallback Synthesizer Engine
    const fallbackQuest = generateFallbackQuest(
      basics,
      items,
      cookTime,
      lastRecipe,
      previousUsedFridgeIngredients,
    )
    fallbackQuest.exp = (fallbackQuest.usedFridgeIngredients.length || 1) * 100
    return NextResponse.json(fallbackQuest)
  } catch (error) {
    console.error('Error generating quest:', error)
    return NextResponse.json(
      { error: '퀘스트 생성 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
