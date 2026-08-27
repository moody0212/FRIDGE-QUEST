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
 * Rule 1 & Rule 4: Generate specific natural preparation text per ingredient while strictly preserving exact user input name!
 */
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
 * Rule 6: Minimal AI Response Verification Engine
 */
function validateQuest(
  quest: Quest,
  requestItems: { name: string; status: string }[],
  requestBasics: string[],
): { valid: boolean; reason?: string } {
  const inputNames = requestItems.map((i) => i.name)

  // A. Is rescueTarget one of the user's input items? (Exact match - Rule 1 & Rule 6A)
  if (!inputNames.includes(quest.rescueTarget)) {
    return {
      valid: false,
      reason: `구조 대상("${quest.rescueTarget}")이 사용자가 입력한 원문 재료 목록(${inputNames.join(', ')})과 다릅니다.`,
    }
  }

  // B. Are all rescueUsed items in inputNames? (Exact match - Rule 1 & Rule 6B & 6F)
  for (const used of quest.rescueUsed) {
    if (!inputNames.includes(used)) {
      return {
        valid: false,
        reason: `사용하는 냉털 재료("${used}")가 사용자의 입력 원문(${inputNames.join(', ')})과 일치하지 않거나 임의 변경되었습니다.`,
      }
    }
  }

  // C. Is rescueTarget included in rescueUsed?
  if (!quest.rescueUsed.includes(quest.rescueTarget)) {
    return {
      valid: false,
      reason: `구조 대상("${quest.rescueTarget}")이 실제 사용하는 냉털 재료 목록(${quest.rescueUsed.join(', ')})에 포함되어야 합니다.`,
    }
  }

  // D. Are all basicUsed items in user's checked basics? (Rule 6C)
  for (const basic of quest.basicUsed) {
    if (!requestBasics.includes(basic)) {
      return {
        valid: false,
        reason: `사용하는 기본 재료("${basic}")가 사용자가 체크한 기본 재료 목록에 없습니다.`,
      }
    }
  }

  // E. Check for invalid terms like "전자기레인지" or particle brackets "(을/를)" (Rule 5 & Rule 6G)
  const fullText = `${quest.dish} ${quest.steps.join(' ')} ${quest.tip || ''}`
  if (fullText.includes('전자기레인지')) {
    return {
      valid: false,
      reason: '"전자기레인지"라는 오탈자 용어가 포함되어 있습니다. 올바른 표현인 "전자레인지"를 사용하세요.',
    }
  }

  if (/\([을를이가은는과와]\)/.test(fullText)) {
    return {
      valid: false,
      reason: '조사 괄호 표기 (을/를), (이/가) 등이 포함되어 있습니다. 괄호 없이 받침에 맞는 조사를 적용하세요.',
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
      'STEP 2. 팬에 식용유를 약간 두르고 식빵을 노릇하게 구워낸다.',
      'STEP 3. 풀은 계란을 팬에 부어 두툼하게 익힌다.',
      'STEP 4. 구운 식빵 사이에 계란을 넣고 취향껏 소스를 더한다.',
      'STEP 5. 반으로 잘라 따뜻하게 즐긴다.',
    ]
  } else if (mainFoodItems.some((i) => i.name.includes('두부')) && (items.some((i) => i.name.includes('김치')) || basics.includes('김치'))) {
    // Dubu-Kimchi (Fixed "전자기레인지" -> "전자레인지")
    dishName = `담백한 ${rescueTargetName}김치`
    rescueUsed = items.map((i) => i.name)
    basicUsed = ['김치', '참기름', '깨', '식용유', '설탕'].filter((b) => basics.includes(b))
    extraNeeded = []
    steps = [
      `STEP 1. ${rescueTargetName}는 한 입 크기로 썰어 끓는 물에 데치거나 전자레인지에 데운다.`,
      'STEP 2. 김치는 먹기 좋은 크기로 쫑쫑 썰어둔다.',
      'STEP 3. 팬에 식용유를 두르고 김치와 설탕을 넣어 볶는다.',
      'STEP 4. 마지막에 참기름을 살짝 둘러 고소한 풍미를 낸다.',
      `STEP 5. 따뜻한 ${rescueTargetName} 옆에 볶은 김치를 정갈하게 곁들여 완성한다.`,
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
    exp: (rescueUsed.length || 1) * 100,
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
            temperature: 0.5,
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

    // 2. Gemini LLM Handler with Response Verification & Single Retry
    const geminiKey = process.env.GEMINI_API_KEY || process.env.FRIDGE_QUEST_AI_KEY

    if (geminiKey) {
      const softList = items.filter((i) => i.status === 'soft').map((i) => i.name).join(', ')
      const badList = items.filter((i) => i.status === 'bad').map((i) => i.name).join(', ')
      const freshList = items.filter((i) => i.status === 'fresh').map((i) => i.name).join(', ')

      const basePrompt = `당신은 냉장고 식재료 구조 퀘스트 마스터 AI 셰프입니다. 사용자가 입력한 냉장고 재료를 분석하여 실제로 먹을 수 있는 최적의 현실적 요리 1개를 추천하고 JSON으로 응답하세요.

[입력 데이터]
- 보유 기본 재료: ${basics.length > 0 ? basics.join(', ') : '없음'}
- 냉털 재료(시들거나 물러짐 🟡): ${softList || '없음'}
- 냉털 재료(상태 많이 안 좋음 🔴): ${badList || '없음'}
- 냉털 재료(신선함 🟢): ${freshList || '없음'}
- 조리 가능 시간: ${cookTime === '10' ? '10분 이내' : cookTime === '20' ? '20분 이내' : '상관없음'}
${excludeDish ? `- 직전 추천 요리(동일/유사한 조리 형태 피할 것): ${excludeDish}` : ''}

[절대 준수 원칙: 입력 재료명 보존 (Source of Truth)]
1. 사용자가 입력한 냉털 재료명 원문("${items.map((i) => i.name).join(', ')}")을 절대 다른 단어로 임의 변경하지 마십시오.
   - 예: "취두부" ➔ "취두부" (절대 "두부"로 변경 금지!)
   - 예: "연두부" ➔ "연두부", "순두부" ➔ "순두부"
   - 예: "엄마가 만든 감자샐러드" ➔ "엄마가 만든 감자샐러드"
2. rescueTarget, rescueUsed의 문자열은 사용자의 입력 원문과 100% 토씨 하나 틀리지 않고 동일해야 합니다.

[조리 용어 및 표기 필수 규칙]
1. 조리 용어 오탈자 절대 금지: "전자기레인지"라는 어색한 표현은 사용 금지하며, 반드시 "전자레인지"로 표기하십시오.
2. 조리기구/조리 동작: 전자레인지, 프라이팬, 냄비, 에어프라이어, 오븐, 중불, 약불, 센 불, 데치다, 삶다, 굽다, 볶다, 찌다, 졸이다 표준 용어를 사용하십시오.
3. 괄호 조사 표기 금지: "(을/를)", "(이/가)" 등 괄호 조사는 사용하지 말고 올바른 한글 문장 조사를 작성하십시오.

[JSON 응답 포맷]
{
  "rescueTarget": "주 구조 대상 재료명 (사용자 입력 원문과 100% 동일)",
  "dish": "현실적이고 자연스러운 요리명",
  "time": "약 15분",
  "rescueUsed": ["실제 레시피에 사용된 냉털재료 (사용자 입력 원문과 100% 동일)"],
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

      const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro']

      for (const model of models) {
        try {
          let parsed = await callGeminiModel(model, geminiKey, basePrompt)

          if (parsed) {
            let validation = validateQuest(parsed, items, basics)

            // Rule 7: Single retry on validation failure
            if (!validation.valid) {
              console.warn(`[AI Validation Failed on ${model}]: ${validation.reason}. Requesting 1-time retry...`)

              const retryPrompt = `${basePrompt}

[🚨 1회 재시도 요청 - 검증 실패 수정 지침]
직전 생성 결과가 다음 검증 실패 이유로 거부되었습니다:
"${validation.reason}"

반드시 사용자가 입력한 재료명 원문("${items.map((i) => i.name).join(', ')}")을 100% 정확히 보존하고, "전자기레인지" 오탈자 및 괄호 조사를 제거하여 다시 정합성 있게 응답하십시오.`

              parsed = await callGeminiModel(model, geminiKey, retryPrompt)
              if (parsed) {
                validation = validateQuest(parsed, items, basics)
              }
            }

            if (parsed && validation.valid) {
              return NextResponse.json(parsed)
            }
          }
        } catch (modelErr) {
          console.warn(`Model ${model} execution failed, trying next model:`, modelErr)
        }
      }
    }

    // 3. Fallback Synthesizer Engine (guaranteed exact name preservation & valid Korean terms)
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
