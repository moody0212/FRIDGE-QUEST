import { NextResponse } from 'next/server'
import type { Quest, AdditionalUse } from '@/lib/quest-data'

interface RequestPayload {
  basics: string[]
  items: { name: string; status: 'fresh' | 'soft' | 'bad' }[]
  cookTime: '10' | '20' | 'any'
  excludeDish?: string
  previousRecipeName?: string
  previousCookingMethod?: string
  previousMainDishIngredients?: string[]
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
 * Natural Korean particle generator to avoid "(을/를)", "(이/가)" brackets (Rule 14).
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

function isPreparedOrSpecial(name: string): boolean {
  const specialKeywords = [
    '취두부', '샐러드', '치킨', '제육', '불고기', '조림', '찌개', '남은', '어제',
    '먹다', '엄마가', '시판', '도시락', '피자', '족발', '보쌈', '딸기', '과일', '디저트'
  ]
  return specialKeywords.some((kw) => name.includes(kw))
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
 * Rule 15: Response Verification Engine (All items rescued in THIS quest)
 */
function validateQuest(
  quest: Quest,
  requestItems: { name: string; status: string }[],
  requestBasics: string[],
  previousRecipeName?: string,
): { valid: boolean; reason?: string } {
  const inputNames = requestItems.map((i) => i.name)
  const questIngs = quest.questIngredients || quest.rescueUsed || []
  const mainIngs = quest.mainDishIngredients || []
  const addUses = quest.additionalUses || []

  // A. All user input items must be present in questIngredients (Source of Truth)
  for (const name of inputNames) {
    if (!questIngs.includes(name)) {
      return {
        valid: false,
        reason: `입력 재료("${name}")가 이번 퀘스트 구조 대상 목록(questIngredients)에서 누락되거나 변경되었습니다.`,
      }
    }
  }

  // B. Every input item must have a real usage (either in mainDishIngredients & steps OR in additionalUses)
  const stepsJoined = quest.steps.join(' ')
  const addUsesIngs = addUses.map((u) => u.ingredient)

  for (const name of inputNames) {
    const inMain = mainIngs.includes(name) && stepsJoined.includes(name)
    const inAdd = addUsesIngs.includes(name)
    if (!inMain && !inAdd) {
      return {
        valid: false,
        reason: `입력 재료("${name}")에 대한 실제 조리법(steps) 또는 별도 활용 안내(additionalUses)가 없습니다.`,
      }
    }
  }

  // C. Check basicUsed
  for (const basic of quest.basicUsed) {
    if (!requestBasics.includes(basic)) {
      return {
        valid: false,
        reason: `사용하는 기본 재료("${basic}")가 사용자가 체크한 보유 기본 재료에 없습니다.`,
      }
    }
  }

  // D. Formatting and typo checks
  const fullText = `${quest.dish} ${stepsJoined} ${quest.tip || ''} ${addUses.map((u) => u.usage).join(' ')}`
  if (fullText.includes('전자기레인지')) {
    return {
      valid: false,
      reason: '"전자기레인지"라는 오탈자가 감지되었습니다. "전자레인지"로 사용하십시오.',
    }
  }

  if (/\([을를이가은는과와]\)/.test(fullText)) {
    return {
      valid: false,
      reason: '괄호 조사 (을/를) 표기가 감지되었습니다. 괄호 없이 자연스러운 한글 조사를 적용하십시오.',
    }
  }

  // E. Reroll substantially different check
  if (previousRecipeName) {
    const cleanCurrent = stripAdjectives(quest.dish)
    const cleanPrev = stripAdjectives(previousRecipeName)
    if (cleanCurrent === cleanPrev || quest.dish === previousRecipeName) {
      return {
        valid: false,
        reason: `직전 요리("${previousRecipeName}")와 실질적으로 동일합니다. 다른 조리 형태나 다른 메인 재료 구성을 사용하세요.`,
      }
    }
  }

  return { valid: true }
}

/**
 * Intelligent Rule-based Recipe Synthesizer (All items rescued in THIS quest)
 */
function generateFallbackQuest(
  basics: string[],
  items: { name: string; status: 'fresh' | 'soft' | 'bad' }[],
  cookTime: '10' | '20' | 'any',
  previousRecipeName?: string,
): Quest {
  const inputNames = items.map((i) => i.name)
  const badItems = items.filter((i) => i.status === 'bad')
  const warningMessage = badItems.length > 0 ? BAD_ITEM_WARNING : undefined

  // Categorize main dish candidates vs special/side candidates
  const carbItems = items.filter((i) => isBaseCarb(i.name))
  const sauceItems = items.filter((i) => isSauceOrSeasoning(i.name))
  const mainFoodItems = items.filter((i) => !isBaseCarb(i.name) && !isSauceOrSeasoning(i.name) && !isPreparedOrSpecial(i.name))
  const specialItems = items.filter((i) => isPreparedOrSpecial(i.name))

  const targetItem = items.find((i) => i.status === 'bad') || items.find((i) => i.status === 'soft') || items[0]
  const rescueTargetName = targetItem.name

  let dishName = ''
  let mainDishIngredients: string[] = []
  let additionalUses: AdditionalUse[] = []
  let basicUsed: string[] = []
  let extraNeeded: string[] = []
  let steps: string[] = []

  if (carbItems.some((i) => i.name.includes('또띠아'))) {
    const carbName = carbItems[0].name
    const options = [
      { name: '매콤 계란 또띠아롤', type: 'roll' },
      { name: '김치 치즈 퀘사디아', type: 'quesadilla' },
    ]
    const chosen = previousRecipeName
      ? options.find((o) => stripAdjectives(o.name) !== stripAdjectives(previousRecipeName)) || options[1]
      : options[0]

    dishName = chosen.name
    mainDishIngredients = [carbName]
    basicUsed = ['식용유', '소금'].filter((b) => basics.includes(b))

    if (chosen.type === 'roll') {
      extraNeeded = ['계란']
      steps = [
        `STEP 1. ${carbName}는 조리대에 평평하게 펴고 계란을 부드럽게 푼다.`,
        'STEP 2. 달군 팬에 식용유를 두르고 계란 지단을 노릇하게 부쳐낸다.',
        `STEP 3. ${carbName} 위에 구운 계란 지단을 얹는다.`,
        'STEP 4. 소스를 골고루 바르고 돌돌 단단하게 판다.',
        'STEP 5. 한 입 크기로 썰어 접시에 담아 완성한다.',
      ]
    } else {
      extraNeeded = ['모짜렐라 치즈']
      steps = [
        `STEP 1. ${carbName} 위에 속재료와 치즈를 올린다.`,
        `STEP 2. ${carbName}를 반으로 접어 모양을 잡는다.`,
        'STEP 3. 달군 팬에 약불로 은근하게 구워낸다.',
        'STEP 4. 치즈가 녹고 겉면이 바삭해지면 뒤집어 반대쪽도 구워준다.',
        'STEP 5. 조각내어 따뜻할 때 섭취한다.',
      ]
    }
  } else {
    // Pick 1 or 2 items for main dish
    const primary = mainFoodItems[0] || targetItem
    const secondary = mainFoodItems.find((i) => i.name !== primary.name)

    mainDishIngredients = [primary.name]
    if (secondary) mainDishIngredients.push(secondary.name)

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

    if (chosenForm.type === 'grill') {
      steps = [
        `STEP 1. ${getPreparationStep(primary.name)}`,
        'STEP 2. 팬을 중불로 달구고 식용유를 살짝 둘러 준비한다.',
        `STEP 3. 손질한 ${attachJosa(primary.name, '을/를')} 팬에 올려 노릇하게 구워낸다.`,
        secondary ? `STEP 4. ${attachJosa(secondary.name, '을/를')} 곁들여 함께 노릇하게 익힌다.` : 'STEP 4. 소금이나 간장으로 간을 맞춘다.',
        'STEP 5. 접시에 예쁘게 담아내어 완성한다.',
      ]
    } else if (chosenForm.type === 'pancake') {
      steps = [
        `STEP 1. ${getPreparationStep(primary.name)}`,
        `STEP 2. 그릇에 계란을 풀고 ${attachJosa(primary.name, '을/를')} 넣어 섞는다.`,
        'STEP 3. 달군 팬에 기름을 둘러 반죽을 올린다.',
        'STEP 4. 앞뒤로 노릇바삭하게 부쳐낸다.',
        'STEP 5. 접시에 담아 완성한다.',
      ]
    } else if (chosenForm.type === 'bowl') {
      steps = [
        `STEP 1. ${getPreparationStep(primary.name)}`,
        'STEP 2. 팬에 식용유를 두르고 대파와 마늘을 볶아 향을 낸다.',
        `STEP 3. ${attachJosa(primary.name, '을/를')} 넣어 볶다가 간장으로 간한다.`,
        'STEP 4. 따뜻한 밥을 그릇에 담는다.',
        'STEP 5. 밥 위에 조리한 재료를 얹어 덮밥으로 완성한다.',
      ]
    } else {
      steps = [
        `STEP 1. ${getPreparationStep(primary.name)}`,
        'STEP 2. 달군 팬에 식용유를 약간 두른다.',
        `STEP 3. ${attachJosa(primary.name, '을/를')} 넣고 센 불에서 빠르게 볶아낸다.`,
        secondary ? `STEP 4. ${attachJosa(secondary.name, '을/를')} 함께 넣어 볶아 간한다.` : 'STEP 4. 간장이나 소금으로 간을 맞춘다.',
        'STEP 5. 불을 끄고 담아낸다.',
      ]
    }
  }

  // Provide additional uses for items not included in mainDishIngredients
  const unusedInMain = inputNames.filter((name) => !mainDishIngredients.includes(name))
  for (const name of unusedInMain) {
    if (name.includes('취두부')) {
      additionalUses.push({
        ingredient: name,
        usage: `${name}는 일반 두부와 조리 특성이 다르므로 제품 포장의 안내를 확인하고 별도로 구워 곁들입니다.`,
      })
    } else if (isSauceOrSeasoning(name)) {
      additionalUses.push({
        ingredient: name,
        usage: `${name}는 메인 요리의 찍어먹는 양념 소스로 활용하세요.`,
      })
    } else {
      additionalUses.push({
        ingredient: name,
        usage: `${attachJosa(name, '은/는')} 씻거나 볶지 않고 메인 요리의 신선한 곁들임/토핑으로 곁들여 섭취하세요.`,
      })
    }
  }

  return {
    rescueTarget: rescueTargetName,
    dish: dishName,
    time: cookTime === '10' ? '약 10분' : '약 15분',
    questIngredients: inputNames,
    mainDishIngredients,
    additionalUses: additionalUses.length > 0 ? additionalUses : undefined,
    rescueUsed: inputNames,
    basicUsed,
    extraNeeded,
    steps: steps.slice(0, 5),
    exp: inputNames.length * 100,
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
    } = body

    const lastRecipe = previousRecipeName || excludeDish
    const inputNames = items.map((i) => i.name)

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

      const basePrompt = `당신은 냉장고 식재료 구조 마스터 AI 셰프입니다. 사용자가 입력한 모든 냉털 재료("${inputNames.join(', ')}")에 대해 이번 퀘스트 안에서 100% 실용적인 활용 방법을 제공하는 "오늘의 구조 퀘스트 1개"를 생성하고 JSON으로 응답하세요.

[입력 데이터]
- 보유 기본 재료: ${basics.length > 0 ? basics.join(', ') : '없음'}
- 냉털 재료 (위급/상태나쁨 🔴): ${badList || '없음'}
- 냉털 재료 (물렁/시듦 🟡): ${softList || '없음'}
- 냉털 재료 (신선함 🟢): ${freshList || '없음'}
- 조리 가능 시간: ${cookTime === '10' ? '10분 이내' : cookTime === '20' ? '20분 이내' : '상관없음'}
${lastRecipe ? `- 직전 추천 요리(동일 형태 피할 것): ${lastRecipe}` : ''}

[핵심 정책: 전부 구조 ≠ 한 요리에 억지로 다 넣기]
1. 사용자가 입력한 모든 재료("${inputNames.join(', ')}")는 이번 퀘스트에서 모두 구조 대상입니다!
2. 그러나 어울리지 않는 재료(예: 취두부, 딸기, 샐러드 등)를 무작치 팬 하나에 넣고 "○○ 볶음"으로 합치지 마십시오!
3. 서로 잘 어울리는 재료만 메인 요리(mainDishIngredients) 및 조리법(steps)에 사용하고, 어울리지 않는 재료는 별도 곁들임/토핑/안내(additionalUses)로 분리하세요.
4. 취두부 등 조리 특성이 특수한 식재료의 조리법에 확신이 없다면 억지 볶음 레시피를 만들지 말고 "제품 포장 조리 안내 확인 후 별도 구이/곁들임"으로 additionalUses에 안전하게 제공하세요.

[원문 보존 및 표기]
1. 사용자가 입력한 재료명 원문("${inputNames.join(', ')}")을 100% 유지하십시오. (예: "취두부" ➔ "취두부", 절대 "두부"로 치환 금지)
2. "전자기레인지" 오탈자 금지 ➔ "전자레인지"로만 쓰세요.
3. 괄호 조사 (을/를) 표기 금지 ➔ 받침에 맞는 조사 문장을 쓰세요.

[JSON 응답 포맷]
{
  "rescueTarget": "주 구조 대상 재료명 (원문 100% 동일)",
  "dish": "메인 요리명",
  "time": "약 15분",
  "questIngredients": ["${inputNames.join('", "')}"],
  "mainDishIngredients": ["메인 요리 steps 조리법에 실제로 들어가는 냉털재료 원문"],
  "additionalUses": [
    {
      "ingredient": "메인 요리에 들어가지 않는 냉털재료 원문",
      "usage": "곁들임/사이드/토핑/별도 가열 안내 문구"
    }
  ],
  "basicUsed": ["실제 사용된 보유 기본재료"],
  "extraNeeded": ["필수 추가 재료 (없으면 [])"],
  "steps": [
    "STEP 1. ...",
    "STEP 2. ...",
    "STEP 3. ...",
    "STEP 4. ...",
    "STEP 5. ..."
  ],
  "tip": "팁 (있을 경우만)",
  "warningMessage": "🔴 재료 관련 경고문구(있을 경우만)"
}`

      const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro']

      for (const model of models) {
        try {
          let parsed = await callGeminiModel(model, geminiKey, basePrompt)

          if (parsed) {
            parsed.questIngredients = inputNames
            parsed.rescueUsed = inputNames
            parsed.mainDishIngredients = parsed.mainDishIngredients || inputNames

            let validation = validateQuest(parsed, items, basics, lastRecipe)

            // Single Retry on validation failure
            if (!validation.valid) {
              console.warn(`[AI Validation Failed on ${model}]: ${validation.reason}. Requesting 1-time retry...`)

              const retryPrompt = `${basePrompt}

[🚨 1회 재시도 요청 - 검증 실패 수정 지침]
이전 결과가 다음 이유로 검증에 실패했습니다:
"${validation.reason}"

지침:
1. 입력한 모든 재료("${inputNames.join(', ')}")에 대해 mainDishIngredients(steps 조리법) 또는 additionalUses(별도 곁들임) 중 하나에 100% 활용 방법을 포함하세요.
2. 입력 원문 재료명을 임의로 변경하지 마십시오.
3. 어울리지 않는 재료는 억지로 볶지 말고 additionalUses에 깔끔하게 분리하세요.`

              parsed = await callGeminiModel(model, geminiKey, retryPrompt)
              if (parsed) {
                parsed.questIngredients = inputNames
                parsed.rescueUsed = inputNames
                parsed.mainDishIngredients = parsed.mainDishIngredients || inputNames
                validation = validateQuest(parsed, items, basics, lastRecipe)
              }
            }

            if (parsed && validation.valid) {
              parsed.exp = inputNames.length * 100
              return NextResponse.json(parsed)
            }
          }
        } catch (modelErr) {
          console.warn(`Model ${model} execution failed, trying next model:`, modelErr)
        }
      }
    }

    // 3. Fallback Synthesizer Engine (guaranteed 100% validation pass)
    const fallbackQuest = generateFallbackQuest(basics, items, cookTime, lastRecipe)
    return NextResponse.json(fallbackQuest)
  } catch (error) {
    console.error('Error generating quest:', error)
    return NextResponse.json(
      { error: '퀘스트 생성 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
