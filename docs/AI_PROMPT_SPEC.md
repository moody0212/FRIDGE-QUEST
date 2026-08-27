# 🤖 FRIDGE QUEST AI 프롬프트 및 응답 명세

> **문서 버전**: v2.0.0
>
> **최종 수정일**: 2026-08-27
>
> **엔드포인트**: `POST /api/quest`

## 1. 역할 분담

AI가 담당하는 값:

- 자연스러운 요리와 핵심 조리 방식
- 실제 사용하는 `rescuedIngredients`
- 최대 5개의 조리 단계
- 실패 재료별 `failedIngredientReasons`
- 실패 재료별 `additionalUses`

코드가 담당하는 값:

- `allIngredients`
- `failedIngredients`
- 구조 가능 개수
- EXP
- 사용자 원문 및 조리법 정합성 검증
- 재추천 동일 요리 검증

## 2. AI 응답 형식

```ts
interface AiQuest {
  rescueTarget: string
  dish: string
  cookingMethod: string
  time: string
  rescuedIngredients: string[]
  failedIngredientReasons: {
    ingredient: string
    reason: string
  }[]
  additionalUses: {
    ingredient: string
    usage: string
  }[]
  basicUsed: string[]
  extraNeeded: string[]
  steps: string[]
  tip?: string
  warningMessage?: string
}
```

AI 응답에는 `allIngredients`, `failedIngredients`, EXP, 구조 가능 비율을 포함하지 않는다.

## 3. 생성 규칙

1. 모든 입력 재료는 구조 시도 대상이지만 한 요리에 억지로 전부 넣지 않는다.
2. `rescuedIngredients`에는 현재 `steps`에서 실제 사용하는 냉털 재료만 넣는다.
3. 사용자 원문을 그대로 복사하며 일반화하거나 이름을 변경하지 않는다.
4. 구조 가능 재료명을 `steps`에 원문 그대로 직접 쓴다.
5. 사용하지 않은 각 입력 재료에 실패 이유와 별도 활용 안내를 하나씩 제공한다.
6. 실패 이유는 현재 요리와의 궁합을 중심으로 짧은 한 문장으로 작성한다.
7. 특수 식재료의 활용법에 확신이 없으면 임의 조리법을 만들지 않고 제품 포장의 조리·섭취 안내 확인을 권한다.
8. `basicUsed`에는 사용자가 보유한 기본 재료만 넣는다.
9. 재추천 시 `priorityIngredients`를 우선 검토하되 비현실적이면 다시 제외할 수 있다.
10. 이전 요리와 이름 및 가능하면 핵심 조리 방식이 다른 요리를 생성한다.

## 4. 서버 후처리

```ts
const failedIngredients = allIngredients.filter(
  (name) => !rescuedIngredients.includes(name),
)

const exp = rescuedIngredients.length * 100
```

서버는 다음을 검증한다.

- 구조 가능 이름이 사용자 원본에 존재하는가
- 모든 구조 가능 이름이 `steps`에 등장하는가
- 실패 이름이 `steps`에 등장하지 않는가
- `failedIngredientReasons`와 `additionalUses`의 대상이 계산된 실패 목록과 일치하는가
- `basicUsed`가 보유 기본 재료의 부분집합인가
- 재추천 요리가 수식어만 변경한 동일 요리가 아닌가

검증 실패 시 같은 입력으로 한 번만 재생성한다. 재생성도 실패하면 `퀘스트 생성에 문제가 생겼어요. 다시 시도해주세요.`를 반환한다.

## 5. 재추천 요청

```ts
interface RerollContext {
  previousRecipeName: string
  previousCookingMethod: string
  previousRescuedIngredients: string[]
  previousFailedIngredients: string[]
  priorityIngredients: string[]
}
```

`priorityIngredients`는 직전 `failedIngredients`이며, 기존 사용자 입력과 설정은 그대로 유지한다.
