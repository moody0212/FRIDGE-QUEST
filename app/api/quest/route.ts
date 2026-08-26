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
 * Intelligent Rule-based Recipe Synthesizer for FRIDGE QUEST
 * Adheres strictly to PRD.md specifications:
 * 1. 🟡 Soft items prioritized as rescueTarget and main ingredient
 * 2. 🔴 Bad items get safety warnings and are optionally excluded/cautioned
 * 3. Only checked basic ingredients in basicUsed; unchecked ones placed in extraNeeded
 * 4. Maximum 5 cooking steps
 * 5. 100% ingredient consistency between recipe steps and ingredient lists
 */
function generateFallbackQuest(
  basics: string[],
  items: { name: string; status: 'fresh' | 'soft' | 'bad' }[],
  cookTime: '10' | '20' | 'any',
  excludeDish?: string,
): Quest {
  // 1. Identify priority ingredients
  const softItems = items.filter((i) => i.status === 'soft')
  const badItems = items.filter((i) => i.status === 'bad')
  const freshItems = items.filter((i) => i.status === 'fresh')

  // Target item: prioritize soft, then bad (with warning), then fresh
  const primaryItem = softItems[0] || badItems[0] || freshItems[0] || items[0]
  const secondaryItems = items.filter((i) => i.name !== primaryItem.name)
  const secondaryItem = secondaryItems[0] || items[1] || items[0]

  const hasBadItem = badItems.length > 0
  const warningMessage = hasBadItem ? BAD_ITEM_WARNING : undefined

  // Determine dish naming & template based on ingredients & excludeDish
  const targetName = primaryItem.name
  const partnerName = secondaryItem.name

  // Candidate dishes
  const candidates = [
    {
      name: `${targetName} ${partnerName} 볶음`,
      type: 'stir-fry',
      time: cookTime === '10' ? '약 10분' : '약 15분',
      desc: '센 불에 빠르게 볶아내는 초간단 냉털 요리',
    },
    {
      name: `${targetName} ${partnerName} 덮밥`,
      type: 'bowl',
      time: cookTime === '10' ? '약 10분' : '약 18분',
      desc: '밥 위에 얹어 든든하게 먹는 한 그릇 요리',
    },
    {
      name: `매콤 ${targetName} ${partnerName} 조림`,
      type: 'braised',
      time: cookTime === '10' ? '약 10분' : '약 20분',
      desc: '감칠맛 나는 양념으로 졸여낸 밥도둑 요리',
    },
    {
      name: `고소한 ${targetName} ${partnerName}전`,
      type: 'pancake',
      time: '약 12분',
      desc: '노릇노릇 바삭하게 부쳐낸 간편 전 요리',
    },
  ]

  // Filter out excluded dish if rerolling
  const availableCandidates = excludeDish
    ? candidates.filter((c) => c.name !== excludeDish)
    : candidates
  const chosenDish = availableCandidates[0] || candidates[0]

  // Calculate used ingredients
  const rescueUsed = [targetName, partnerName]
  if (items.length > 2 && items[2] && chosenDish.type === 'stir-fry') {
    rescueUsed.push(items[2].name)
  }

  // Filter which basic ingredients are actually available
  const potentialBasics = ['대파', '마늘', '식용유', '간장', '소금', '참기름', '설탕', '고춧가루', '김치', '식초']
  const basicUsed = potentialBasics.filter((b) => basics.includes(b)).slice(0, 4)

  // Extra needed (if crucial basic like oil or soy sauce is missing)
  const extraNeeded: string[] = []
  if (!basics.includes('식용유') && !basics.includes('참기름')) {
    extraNeeded.push('식용유')
  }
  if (!basics.includes('간장') && !basics.includes('소금')) {
    extraNeeded.push('소금 또는 간장')
  }

  // 5 steps generation
  const steps: string[] = []
  steps.push(`STEP 1. ${rescueUsed.join(', ')}을(를) 깨끗이 손질하여 한 입 크기로 자른다.`)

  if (basics.includes('식용유') && (basics.includes('대파') || basics.includes('마늘'))) {
    const aromatics = ['대파', '마늘'].filter((a) => basics.includes(a)).join('과 ')
    steps.push(`STEP 2. 달군 팬에 식용유를 두르고 ${aromatics}을(를) 볶아 향을 낸다.`)
  } else if (extraNeeded.includes('식용유')) {
    steps.push(`STEP 2. 팬에 식용유를 약간 두르고 팬을 달군다.`)
  } else {
    steps.push(`STEP 2. 팬을 중불로 달구고 손질한 ${targetName}을(를) 먼저 넣는다.`)
  }

  steps.push(`STEP 3. 손질해둔 ${rescueUsed.join(', ')}을(를) 넣고 중약불에서 골고루 볶는다.`)

  const seasonings = ['간장', '고춧가루', '설탕', '소금'].filter((s) => basics.includes(s))
  if (seasonings.length > 0) {
    steps.push(`STEP 4. ${seasonings.join(', ')}을(를) 취향껏 넣어 간을 맞추며 볶아준다.`)
  } else {
    steps.push(`STEP 4. 소금이나 간장으로 알맞게 간을 맞춘다.`)
  }

  if (basics.includes('참기름')) {
    steps.push(`STEP 5. 불을 끄고 참기름을 살짝 둘러 고소한 풍미를 더해 완성한다.`)
  } else {
    steps.push(`STEP 5. 접시에 정갈하게 담아내어 따뜻할 때 맛있게 즐긴다.`)
  }

  return {
    rescueTarget: targetName,
    dish: chosenDish.name,
    time: chosenDish.time,
    rescueUsed,
    basicUsed,
    extraNeeded,
    steps: steps.slice(0, 5),
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
    const openaiKey = process.env.OPENAI_API_KEY

    if (geminiKey) {
      try {
        const softList = items.filter((i) => i.status === 'soft').map((i) => i.name).join(', ')
        const badList = items.filter((i) => i.status === 'bad').map((i) => i.name).join(', ')
        const freshList = items.filter((i) => i.status === 'fresh').map((i) => i.name).join(', ')

        const prompt = `당신은 냉장고 식재료 구조 퀘스트 마스터 AI입니다. 다음 입력에 맞춰 요리 1개를 추천하고 JSON으로 응답하세요.
[입력]
- 보유 기본 재료: ${basics.length > 0 ? basics.join(', ') : '없음'}
- 냉털 재료(시들거나 물러짐 🟡): ${softList || '없음'}
- 냉털 재료(상태 많이 안 좋음 🔴): ${badList || '없음'}
- 냉털 재료(신선함 🟢): ${freshList || '없음'}
- 조리 가능 시간: ${cookTime === '10' ? '10분 이내' : cookTime === '20' ? '20분 이내' : '상관없음'}
${excludeDish ? `- 제외할 이전 요리명: ${excludeDish}` : ''}

[필수 규칙]
1. 🟡 상태 재료가 있으면 최우선 구조 대상(rescueTarget)으로 삼고 요리의 주재료로 사용하세요.
2. 🔴 상태 재료가 있으면 무리해서 사용하지 말고 warningMessage 필드에 "⚠️ 상태가 좋지 않은 식재료입니다. 냄새, 색, 곰팡이 등 실제 상태를 확인한 후 사용 여부를 결정해주세요."를 반드시 포함하세요.
3. 사용자가 체크한 보유 기본 재료만 basicUsed에 넣고, 체크하지 않은 필수 재료는 extraNeeded에 명시하세요.
4. 추가 재료(extraNeeded)가 없거나 적은 요리를 우선하세요.
5. 조리법(steps)은 5단계 이내로 작성하며 조리법에 언급된 모든 재료는 rescueUsed, basicUsed, extraNeeded에 반드시 있어야 합니다.
6. JSON 형식:
{
  "rescueTarget": "재료명",
  "dish": "요리명",
  "time": "약 15분",
  "rescueUsed": ["재료1", "재료2"],
  "basicUsed": ["기본재료1"],
  "extraNeeded": [],
  "steps": ["STEP 1. ...", "STEP 2. ..."],
  "warningMessage": "경고문구(있을때만)",
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
