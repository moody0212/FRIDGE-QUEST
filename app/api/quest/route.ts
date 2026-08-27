import { NextResponse } from 'next/server'
import type { AdditionalUse, FailedIngredientReason, FreshnessKey, Quest } from '@/lib/quest-data'

type RequestItem = { name: string; status: FreshnessKey }

interface RequestPayload {
  basics?: string[]
  items?: RequestItem[]
  cookTime?: '10' | '20' | 'any'
  previousRecipeName?: string
  previousCookingMethod?: string
  previousRescuedIngredients?: string[]
  previousFailedIngredients?: string[]
  priorityIngredients?: string[]
}

interface AiQuest {
  rescueTarget: string
  dish: string
  cookingMethod: string
  time: string
  rescuedIngredients: string[]
  failedIngredientReasons: FailedIngredientReason[]
  additionalUses: AdditionalUse[]
  basicUsed: string[]
  extraNeeded: string[]
  steps: string[]
  tip?: string
  warningMessage?: string
}

const MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash']
const DISH_ADJECTIVES = ['매콤', '특제', '간단', '맛있는', '초간단']
const SPECIAL_INGREDIENTS_REQUIRING_PACKAGE_GUIDANCE = new Set([
  '취두부',
  '낫토',
  '피단',
  '블루치즈',
])
const VERSATILE_BASICS = new Set(['대파', '마늘', '간장', '소금', '식용유', '참기름'])
const GENERATION_ERROR = '퀘스트 생성에 문제가 생겼어요. 다시 시도해주세요.'

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

function sameMembers(left: string[], right: string[]): boolean {
  const uniqueLeft = unique(left)
  const uniqueRight = unique(right)
  return uniqueLeft.length === left.length &&
    uniqueRight.length === right.length &&
    uniqueLeft.length === uniqueRight.length &&
    uniqueLeft.every((value) => uniqueRight.includes(value))
}

function ensureSafeAdditionalUses(additionalUses: AdditionalUse[]): AdditionalUse[] {
  return additionalUses.map((item) =>
    SPECIAL_INGREDIENTS_REQUIRING_PACKAGE_GUIDANCE.has(item.ingredient)
      ? {
          ingredient: item.ingredient,
          usage: `${item.ingredient}는 제품마다 조리 및 섭취 방법이 다를 수 있으므로 제품 포장의 조리·섭취 안내를 확인한 후 활용해주세요.`,
        }
      : item,
  )
}

function normalizeDishName(name: string): string {
  let normalized = name.trim()
  for (const adjective of DISH_ADJECTIVES) normalized = normalized.replace(new RegExp(adjective, 'g'), '')
  return normalized.replace(/[\s\p{P}\p{S}]/gu, '').toLowerCase()
}

// 입력명이 포함 관계여도(두부/취두부) 긴 원문부터 소비해 서로 다른 재료로 판정한다.
function findMentionedIngredients(text: string, allIngredients: string[]): string[] {
  let remaining = text
  const mentioned: string[] = []
  for (const ingredient of [...allIngredients].sort((a, b) => b.length - a.length)) {
    if (!remaining.includes(ingredient)) continue
    mentioned.push(ingredient)
    remaining = remaining.split(ingredient).join(' ')
  }
  return mentioned
}

function validateAiQuest(
  candidate: AiQuest,
  allIngredients: string[],
  basics: string[],
  previousRecipeName?: string,
): { valid: true; quest: Quest } | { valid: false; reason: string } {
  if (!candidate?.dish?.trim() || !candidate.cookingMethod?.trim() || !candidate.time?.trim() ||
    !Array.isArray(candidate.rescuedIngredients) || !Array.isArray(candidate.failedIngredientReasons) ||
    !Array.isArray(candidate.additionalUses) || !Array.isArray(candidate.basicUsed) ||
    !Array.isArray(candidate.extraNeeded) || !Array.isArray(candidate.steps) || candidate.steps.length === 0) {
    return { valid: false, reason: '필수 응답 필드가 누락되었습니다.' }
  }

  const rescuedIngredients = unique(candidate.rescuedIngredients)
  if (rescuedIngredients.length !== candidate.rescuedIngredients.length) {
    return { valid: false, reason: '구조 가능 재료가 중복되었습니다.' }
  }
  if (rescuedIngredients.length === 0) {
    return { valid: false, reason: '현재 레시피에서 사용하는 냉털 재료가 없습니다.' }
  }
  if (rescuedIngredients.some((name) => !allIngredients.includes(name))) {
    return { valid: false, reason: '구조 가능 재료명이 사용자 원문과 일치하지 않습니다.' }
  }

  const failedIngredients = allIngredients.filter((name) => !rescuedIngredients.includes(name))
  const stepMentions = findMentionedIngredients(candidate.steps.join(' '), allIngredients)
  if (rescuedIngredients.some((name) => !stepMentions.includes(name))) {
    return { valid: false, reason: '구조 가능 재료가 실제 조리 과정에서 사용되지 않았습니다.' }
  }
  if (stepMentions.some((name) => failedIngredients.includes(name))) {
    return { valid: false, reason: '구조 실패 재료가 실제 조리 과정에 포함되었습니다.' }
  }
  if (candidate.basicUsed.some((name) => !basics.includes(name))) {
    return { valid: false, reason: '보유하지 않은 기본 재료를 사용한다고 표시했습니다.' }
  }
  if (basics.some((name) => VERSATILE_BASICS.has(name)) && candidate.basicUsed.length === 0) {
    return { valid: false, reason: '자연스럽게 활용할 수 있는 보유 기본 재료를 전혀 검토하지 않았습니다.' }
  }
  if (candidate.basicUsed.some((name) => !candidate.steps.join(' ').includes(name))) {
    return { valid: false, reason: '사용한다고 표시한 기본 재료가 실제 조리 과정에 없습니다.' }
  }

  const reasonIngredients = candidate.failedIngredientReasons.map((item) => item.ingredient)
  const useIngredients = candidate.additionalUses.map((item) => item.ingredient)
  if (!sameMembers(reasonIngredients, failedIngredients)) {
    return { valid: false, reason: '실패 이유 대상이 실제 구조 실패 재료와 일치하지 않습니다.' }
  }
  if (!sameMembers(useIngredients, failedIngredients)) {
    return { valid: false, reason: '별도 활용 안내 대상이 실제 구조 실패 재료와 일치하지 않습니다.' }
  }
  if (candidate.failedIngredientReasons.some((item) => !item.reason?.trim() || item.reason.includes('\n')) ||
    candidate.additionalUses.some((item) => !item.usage?.trim())) {
    return { valid: false, reason: '구조 실패 이유 또는 별도 활용 안내가 비어 있습니다.' }
  }
  if (previousRecipeName && normalizeDishName(candidate.dish) === normalizeDishName(previousRecipeName)) {
    return { valid: false, reason: '직전 요리와 이름만 꾸민 동일한 요리입니다.' }
  }

  return {
    valid: true,
    quest: {
      rescueTarget: candidate.rescueTarget || rescuedIngredients[0],
      dish: candidate.dish.trim(),
      cookingMethod: candidate.cookingMethod.trim(),
      time: candidate.time.trim(),
      allIngredients,
      rescuedIngredients,
      failedIngredients,
      failedIngredientReasons: candidate.failedIngredientReasons,
      additionalUses: ensureSafeAdditionalUses(candidate.additionalUses),
      basicUsed: unique(candidate.basicUsed),
      extraNeeded: unique(candidate.extraNeeded),
      steps: candidate.steps.slice(0, 5),
      tip: candidate.tip?.trim() || undefined,
      warningMessage: candidate.warningMessage?.trim() || undefined,
      exp: rescuedIngredients.length * 100,
    },
  }
}

async function callGemini(model: string, apiKey: string, prompt: string): Promise<AiQuest | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.65 },
        }),
      },
    )
    if (!response.ok) return null
    const data = await response.json()
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
    return rawText ? (JSON.parse(rawText) as AiQuest) : null
  } catch (error) {
    console.warn(`Gemini model ${model} failed:`, error)
    return null
  }
}

async function generateWithAvailableModel(apiKey: string, prompt: string): Promise<AiQuest | null> {
  for (const model of MODELS) {
    const result = await callGemini(model, apiKey, prompt)
    if (result) return result
  }
  return null
}

function buildPrompt({ basics, items, cookTime, previousRecipeName, previousCookingMethod,
  previousRescuedIngredients, previousFailedIngredients, priorityIngredients }: {
  basics: string[]
  items: RequestItem[]
  cookTime: '10' | '20' | 'any'
  previousRecipeName?: string
  previousCookingMethod?: string
  previousRescuedIngredients: string[]
  previousFailedIngredients: string[]
  priorityIngredients: string[]
}): string {
  const allIngredients = items.map((item) => item.name)
  const stateText = items.map((item) => `${item.name}: ${item.status}`).join(', ')
  return `당신은 FRIDGE QUEST의 현실적인 AI 요리사입니다. 아래 입력으로 한 가지 요리 퀘스트를 JSON으로 만드세요.

[사용자 원본 데이터]
- allIngredients: ${JSON.stringify(allIngredients)}
- 재료 상태: ${stateText}
- 보유 기본 재료: ${JSON.stringify(basics)}
- 조리 시간: ${cookTime}
- previousRecipeName: ${previousRecipeName || '없음'}
- previousCookingMethod: ${previousCookingMethod || '없음'}
- previousRescuedIngredients: ${JSON.stringify(previousRescuedIngredients)}
- previousFailedIngredients: ${JSON.stringify(previousFailedIngredients)}
- priorityIngredients: ${JSON.stringify(priorityIngredients)}

[구조 판정 규칙]
1. 모든 allIngredients는 구조 시도 대상이지만 한 요리에 억지로 전부 넣지 마세요. 정확성과 현실성이 우선입니다.
2. rescuedIngredients에는 현재 요리의 steps에서 실제로 사용하는 냉털 재료만 넣으세요.
3. rescuedIngredients의 이름은 allIngredients의 문자열을 글자 하나도 바꾸지 않고 그대로 복사하세요. 취두부, 두부, 순두부, 연두부는 서로 다른 재료입니다.
4. rescuedIngredients의 모든 재료명을 steps에 원문 그대로 직접 쓰세요. 사용하지 않는 입력 재료명은 steps에 쓰지 마세요.
5. allIngredients 중 rescuedIngredients에 없는 각 재료마다 failedIngredientReasons와 additionalUses를 정확히 하나씩 만드세요.
6. 실패 이유는 현재 요리와의 궁합을 중심으로 짧고 쉬운 한 문장으로 쓰고, 근거 없이 위험하다고 단정하지 마세요.
7. additionalUses는 자연스럽고 일반적인 활용법을 확실히 알 때만 구체적으로 안내하세요. 특수 식재료에 확신이 없으면 임의로 굽기·볶기·데우기를 지시하지 말고 제품 포장의 조리·섭취 안내를 확인하도록 하세요.
8. 보유 기본 재료를 조미·향·조리 기반으로 적극 검토하세요. 대파, 마늘, 간장, 소금, 식용유, 참기름처럼 현재 요리에 자연스럽게 쓸 수 있는 재료가 있다면 basicUsed에 포함하고 steps에도 원문으로 실제 사용하세요. 어울리지 않는 기본 재료까지 억지로 쓰지는 마세요.
9. 보유 기본 재료로 해결할 수 있는 것을 extraNeeded에 다시 요구하지 말고, 추가로 꼭 필요한 재료만 extraNeeded에 넣으세요.
10. EXP, 성공률, allIngredients, failedIngredients는 반환하지 마세요. 서버 코드가 계산합니다.
11. steps는 최대 5개이며 실제 조리 순서여야 합니다.
12. 조리 방식을 먼저 정하지 말고 재료의 형태, 수분, 궁합, 조리시간을 비교해 가장 자연스러운 방식을 고르세요. 국·찌개·탕·전골과 볶음·구이·전·조림·찜·무침·샐러드·토스트·샌드위치는 동등한 후보이며 어느 한 계열도 기본값이 아닙니다.
13. 국물 요리는 물이나 육수에서 함께 익혔을 때 조합이 자연스러운 경우에만 선택하세요. 채소가 있다는 이유만으로 무조건 국을 만들지 마세요.
14. 요리명은 실제 가정식이나 일반적인 메뉴로 납득할 수 있어야 합니다. 입력 재료 이름을 단순히 이어 붙여 생소한 메뉴를 창작하지 마세요. 자연스러운 한 접시가 안 되면 일부 재료만 rescuedIngredients에 넣고 나머지는 구조 실패로 분리하세요.
15. 식빵·또띠아·바게트 같은 빵류가 중심이면 토스트, 오픈샌드, 샌드위치처럼 건식 조리를 검토하되, 자극적인 향신 채소를 빵에 억지로 결합하지 마세요. 예를 들어 입력이 식빵과 청양고추뿐이고 보유 기본 재료가 마늘·소금·식용유라면 식빵만 사용한 마늘 토스트가 자연스럽습니다. 청양고추 토스트를 창작하지 말고 청양고추는 이번 퀘스트 구조 실패와 별도 활용 안내로 분리하세요.
16. "매콤", "특제" 같은 수식어는 어색한 재료 조합을 정당화하지 못합니다. 익숙한 요리로 설명할 수 없는 조합은 실패 처리하세요.
${priorityIngredients.length > 0 ? `17. 직전 퀘스트의 실패 재료 ${JSON.stringify(priorityIngredients)}를 이번에는 우선 구조해 보세요. 단, 부자연스럽거나 비현실적이면 다시 제외해도 됩니다.` : ''}
${previousRecipeName ? `18. 직전 요리 "${previousRecipeName}"와 실질적으로 다른 요리를 만드세요. 핵심 조리 방식이 "${previousCookingMethod}"였다면 다른 계열을 우선 검토하되, 재료에 맞지 않는 방식으로 억지 변경하지 마세요. 수식어만 바꾼 요리는 금지합니다.` : ''}

[JSON 형식]
{
  "rescueTarget": "대표 구조 재료 원문",
  "dish": "요리명",
  "cookingMethod": "국/찌개/탕/전골/볶음/구이/전/조림/찜 중 핵심 조리 방식",
  "time": "약 15분",
  "rescuedIngredients": ["steps에서 실제 사용하는 allIngredients 원문"],
  "failedIngredientReasons": [{ "ingredient": "사용하지 않은 원문", "reason": "현재 요리와 맞지 않는 짧은 한 문장" }],
  "additionalUses": [{ "ingredient": "사용하지 않은 원문", "usage": "현실적인 별도 활용 안내" }],
  "basicUsed": ["실제 사용하는 보유 기본 재료"],
  "extraNeeded": [],
  "steps": ["STEP 1. ..."],
  "tip": "선택적인 짧은 팁",
  "warningMessage": "상태가 좋지 않은 재료가 있을 때만 안전한 확인 안내"
}`
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestPayload
    const basics = Array.isArray(body.basics) ? unique(body.basics) : []
    const items = Array.isArray(body.items) ? body.items : []
    const cookTime = body.cookTime || '20'

    if (items.length < 2) return NextResponse.json({ error: '냉털 재료를 2개 이상 입력해주세요.' }, { status: 400 })
    if (items.some((item) => !item.name?.trim() || !['fresh', 'soft', 'bad'].includes(item.status))) {
      return NextResponse.json({ error: '모든 냉털 재료의 상태를 선택해주세요.' }, { status: 400 })
    }

    const allIngredients = items.map((item) => item.name.trim())
    if (unique(allIngredients).length !== allIngredients.length) {
      return NextResponse.json({ error: '같은 이름의 냉털 재료가 중복되어 있어요.' }, { status: 400 })
    }
    const apiKey = process.env.GEMINI_API_KEY || process.env.FRIDGE_QUEST_AI_KEY
    if (!apiKey) return NextResponse.json({ error: GENERATION_ERROR }, { status: 503 })

    const previousRescuedIngredients = (body.previousRescuedIngredients || []).filter((name) => allIngredients.includes(name))
    const previousFailedIngredients = (body.previousFailedIngredients || []).filter((name) => allIngredients.includes(name))
    const priorityIngredients = (body.priorityIngredients || previousFailedIngredients).filter((name) => allIngredients.includes(name))
    const prompt = buildPrompt({
      basics,
      items: items.map((item, index) => ({ ...item, name: allIngredients[index] })),
      cookTime,
      previousRecipeName: body.previousRecipeName,
      previousCookingMethod: body.previousCookingMethod,
      previousRescuedIngredients,
      previousFailedIngredients,
      priorityIngredients,
    })

    const firstCandidate = await generateWithAvailableModel(apiKey, prompt)
    if (firstCandidate) {
      const firstValidation = validateAiQuest(firstCandidate, allIngredients, basics, body.previousRecipeName)
      if (firstValidation.valid) return NextResponse.json(firstValidation.quest)

      const retryPrompt = `${prompt}\n\n[1회 재생성 요청]\n이전 결과가 입력 재료 또는 레시피 일관성 검증에 실패했습니다: ${firstValidation.reason}\n사용자가 입력한 재료명을 변경하지 말고 rescuedIngredients와 실제 조리법이 정확히 일치하도록 다시 생성하세요. 모든 재료를 억지로 한 요리에 사용할 필요는 없습니다. 활용하기 어려운 재료에는 실패 이유와 현실적인 별도 활용 안내를 제공하세요.`
      const retryCandidate = await generateWithAvailableModel(apiKey, retryPrompt)
      if (retryCandidate) {
        const retryValidation = validateAiQuest(retryCandidate, allIngredients, basics, body.previousRecipeName)
        if (retryValidation.valid) return NextResponse.json(retryValidation.quest)
      }
    }

    return NextResponse.json({ error: GENERATION_ERROR }, { status: 502 })
  } catch (error) {
    console.error('Quest generation failed:', error)
    return NextResponse.json({ error: GENERATION_ERROR }, { status: 500 })
  }
}
