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

const MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
]
const DISH_ADJECTIVES = ['매콤', '특제', '간단', '맛있는', '초간단']
const SPECIAL_INGREDIENTS_REQUIRING_PACKAGE_GUIDANCE = new Set([
  '취두부',
  '낫토',
  '피단',
  '블루치즈',
])
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
  const stepsText = candidate.steps.join(' ')
  const actualBasicUsed = basics.filter((name) => stepsText.includes(name))

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
      basicUsed: actualBasicUsed,
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
    if (!response.ok) {
      console.warn(`Gemini model ${model} returned ${response.status}`)
      return null
    }
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
1. 레시피 선택의 최우선 목표는 allIngredients를 현실적인 범위에서 최대한 많이 구조하는 것입니다. 보유 기본 재료나 조리 편의 때문에 자연스럽게 함께 쓸 수 있는 냉털 재료를 제외하지 마세요.
2. 최종 요리를 정하기 전에 내부적으로 실제 가정식으로 납득 가능한 후보를 최소 3개 검토하세요. 먼저 음식으로 자연스러운 후보만 남기고, 그중 rescuedIngredients가 가장 많은 후보를 선택하세요. 판단 순서는 현실성 > 구조율 > 창의성입니다. 후보 비교 과정은 JSON에 출력하지 마세요.
3. 기본 재료는 냉털 재료와 경쟁하는 주재료가 아니라 냉털 재료의 조리를 돕는 보조 재료입니다. 우선순위는 (1) 냉털 재료 조합, (2) 기본 재료로 조리 보조, (3) 꼭 필요한 추가 재료, (4) 불가피한 구조 실패입니다.
4. 양배추와 베이컨처럼 일반적인 조리 상식상 함께 볶을 수 있는 재료는 둘 다 구조하세요. 기본 재료가 대파·마늘·식용유라고 해서 "베이컨 대파볶음"을 고르고 양배추를 실패 처리하지 마세요. "양배추 베이컨 볶음"처럼 냉털 재료 중심의 요리를 선택하고 기본 재료는 조리를 보조해야 합니다.
5. 구조 실패는 최후의 수단입니다. 실패로 정하기 직전에 "이 재료를 현재 입력들과 함께 쓰는 일반적인 국·찌개·볶음·전·조림·찜·무침 등의 방법이 정말 없는가?"를 다시 확인하세요. 일반적인 방법이 하나라도 있다면 더 간단한 요리를 위해 제외하지 말고 rescuedIngredients에 포함하세요.
6. 구조 실패는 맛의 궁합이 명백히 나쁘거나, 식재료 특성상 같은 요리가 부자연스럽거나, 특수 식재료의 올바른 조리법을 확신할 수 없거나, 이미 조리된 음식이라 합치기 지나치게 부자연스러운 경우에만 허용합니다.
7. failedIngredientReasons는 일반 조리 상식에 맞아야 합니다. 양배추가 베이컨 볶음과 어울리지 않는다는 식의 부당한 이유는 금지합니다. 타당한 실패 이유를 설명할 수 없다면 해당 재료를 구조하는 후보를 다시 선택하세요.
8. rescuedIngredients에는 현재 요리의 steps에서 실제로 사용하는 냉털 재료만 넣으세요.
9. rescuedIngredients의 이름은 allIngredients의 문자열을 글자 하나도 바꾸지 않고 그대로 복사하세요. 취두부, 두부, 순두부, 연두부는 서로 다른 재료입니다.
10. rescuedIngredients의 모든 재료명을 steps에 원문 그대로 직접 쓰세요. 사용하지 않는 입력 재료명은 steps에 쓰지 마세요.
11. allIngredients 중 rescuedIngredients에 없는 각 재료마다 failedIngredientReasons와 additionalUses를 정확히 하나씩 만드세요.
12. 실패 이유는 현재 요리와의 궁합을 중심으로 짧고 쉬운 한 문장으로 쓰고, 근거 없이 위험하다고 단정하지 마세요.
13. additionalUses는 자연스럽고 일반적인 활용법을 확실히 알 때만 구체적으로 안내하세요. 취두부 같은 특수 식재료에 확신이 없으면 임의로 굽기·볶기·데우기를 지시하지 말고 제품 포장의 조리·섭취 안내를 확인하도록 하세요.
14. 보유 기본 재료를 조미·향·조리 기반으로 적극 검토하세요. 대파, 마늘, 간장, 소금, 식용유, 참기름처럼 현재 요리에 자연스럽게 쓸 수 있는 재료가 있다면 basicUsed에 포함하고 steps에도 원문으로 실제 사용하세요. 어울리지 않는 기본 재료까지 억지로 쓰지는 마세요.
15. TODAY'S QUEST 요리명은 가능하면 rescuedIngredients인 냉털 재료를 중심으로 만드세요. 기본 재료가 요리명을 지배하지 않게 하되 실제 널리 쓰이는 고유 음식명은 예외입니다.
16. 보유 기본 재료로 해결할 수 있는 것을 extraNeeded에 다시 요구하지 말고, 추가로 꼭 필요한 재료만 extraNeeded에 넣으세요.
17. EXP, 성공률, allIngredients, failedIngredients는 반환하지 마세요. 서버 코드가 계산합니다.
18. steps는 최대 5개이며 실제 조리 순서여야 합니다.
19. 조리 방식을 먼저 정하지 말고 재료의 형태, 수분, 궁합, 조리시간을 비교해 가장 자연스러운 방식을 고르세요. 국·찌개·탕·전골과 볶음·구이·전·조림·찜·무침·샐러드·토스트·샌드위치는 동등한 후보이며 어느 한 계열도 기본값이 아닙니다.
20. 김치·콩나물·계란·두부처럼 실제 국·찌개·볶음·전으로 함께 활용 가능한 재료는 "김치 콩나물 구이" 같은 비일반적인 요리보다 익숙한 가정식을 우선하세요. 이 조합은 김치·콩나물·두부로 국을 끓이고 계란을 풀어 넣으면 네 재료를 모두 자연스럽게 사용할 수 있으므로, 더 단순하게 만들기 위해 계란을 실패 처리하지 마세요.
21. 요리명은 실제 가정식이나 일반적인 메뉴로 납득할 수 있어야 합니다. 입력 재료 이름을 단순히 이어 붙여 생소한 메뉴를 창작하지 마세요. 자연스러운 한 접시가 안 되면 일부 재료만 rescuedIngredients에 넣고 나머지는 구조 실패로 분리하세요.
22. 식빵·또띠아·바게트 같은 빵류가 중심이면 토스트, 오픈샌드, 샌드위치처럼 건식 조리를 검토하되, 자극적인 향신 채소를 빵에 억지로 결합하지 마세요. 입력이 식빵과 청양고추뿐이면 식빵을 마늘 토스트 등으로 구조하고 청양고추는 구조 실패와 별도 활용 안내로 분리할 수 있습니다.
23. "매콤", "특제" 같은 수식어는 어색한 재료 조합을 정당화하지 못합니다. 익숙한 요리로 설명할 수 없는 조합은 실패 처리하세요.
${priorityIngredients.length > 0 ? `24. 직전 퀘스트의 실패 재료 ${JSON.stringify(priorityIngredients)}를 이번에는 우선 구조해 보세요. 단, 부자연스럽거나 비현실적이면 다시 제외해도 됩니다.` : ''}
${previousRecipeName ? `25. 직전 요리 "${previousRecipeName}"와 실질적으로 다른 요리를 만드세요. 핵심 조리 방식이 "${previousCookingMethod}"였다면 다른 계열을 우선 검토하되, 재료에 맞지 않는 방식으로 억지 변경하지 마세요. 수식어만 바꾼 요리는 금지합니다.` : ''}

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
      console.warn(`[Quest validation retry] ${firstValidation.reason}`)

      const retryPrompt = `${prompt}\n\n[1회 재생성 요청]\n이전 결과가 입력 재료 또는 레시피 일관성 검증에 실패했습니다: ${firstValidation.reason}\n사용자가 입력한 재료명을 변경하지 말고 rescuedIngredients와 실제 조리법이 정확히 일치하도록 다시 생성하세요. 모든 재료를 억지로 한 요리에 사용할 필요는 없습니다. 활용하기 어려운 재료에는 실패 이유와 현실적인 별도 활용 안내를 제공하세요.`
      const retryCandidate = await generateWithAvailableModel(apiKey, retryPrompt)
      if (retryCandidate) {
        const retryValidation = validateAiQuest(retryCandidate, allIngredients, basics, body.previousRecipeName)
        if (retryValidation.valid) return NextResponse.json(retryValidation.quest)
        console.warn(`[Quest validation failed] ${retryValidation.reason}`)
      }
    }

    return NextResponse.json({ error: GENERATION_ERROR }, { status: 502 })
  } catch (error) {
    console.error('Quest generation failed:', error)
    return NextResponse.json({ error: GENERATION_ERROR }, { status: 500 })
  }
}
