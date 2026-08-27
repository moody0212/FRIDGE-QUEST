# 🗺️ FRIDGE QUEST 개발 계획서

> **문서 버전**: v2.0.0
>
> **최종 수정일**: 2026-08-27
>
> **상태**: 구조 가능/실패 판정 시스템 구현 및 검증 완료

## 1. 목표

사용자가 입력한 모든 냉털 재료를 구조 시도하되, 현재 레시피에서 자연스럽게 사용할 수 있는 재료만 구조 가능으로 판정한다. 활용하지 못한 재료는 폐기 대상으로 취급하지 않고 실패 이유, 별도 활용 안내, 다음 퀘스트 우선 재시도로 연결한다.

## 2. 데이터 모델

| 필드 | 생성 주체 | 의미 |
| --- | --- | --- |
| `allIngredients` | 코드 | 사용자가 입력한 원본 냉털 재료 전체 |
| `rescuedIngredients` | AI → 코드 검증 | 현재 레시피 조리 단계에서 실제 사용하는 원본 재료 |
| `failedIngredients` | 코드 | `allIngredients - rescuedIngredients` |
| `failedIngredientReasons` | AI → 코드 검증 | 실패 재료별 현재 요리와 맞지 않는 이유 |
| `additionalUses` | AI → 코드 검증 | 실패 재료별 현실적인 별도 활용 안내 |
| `exp` | 코드 | `rescuedIngredients.length × 100` |

AI는 `allIngredients`, `failedIngredients`, EXP, 구조 가능 비율을 생성하지 않는다.

## 3. 서버 검증 흐름

1. 사용자 입력 이름과 상태를 검증한다.
2. AI가 `rescuedIngredients`, 조리법, 실패 이유, 별도 활용 안내를 반환한다.
3. 구조 가능 재료가 사용자 원본에 존재하는지 확인한다.
4. 구조 가능 재료가 실제 `steps`에 원문으로 등장하는지 확인한다.
5. 실패 재료가 `steps`에 포함되지 않았는지 확인한다.
6. 실패 이유와 `additionalUses` 대상이 코드에서 계산한 실패 재료와 정확히 일치하는지 확인한다.
7. 재추천이면 수식어를 제거한 이전 요리명과 비교한다.
8. 검증 실패 시 한 번만 재생성하며, 다시 실패하면 기존 오류 UI를 사용한다.

`두부`와 `취두부`처럼 이름이 포함되는 입력은 긴 원문부터 조리법에서 소비하여 서로 다른 재료로 판정한다.

## 4. 재추천 흐름

클라이언트는 기존 냉털 재료, 상태, 기본 재료, 조리시간을 유지하고 다음 값을 전달한다.

```ts
previousRecipeName
previousCookingMethod
previousRescuedIngredients
previousFailedIngredients
priorityIngredients // 직전 failedIngredients
```

AI는 `priorityIngredients`를 우선 시도하지만 부자연스러우면 다시 실패 처리할 수 있다.

## 5. UI 원칙

- 기존 단일 화면과 결과 카드 디자인을 유지한다.
- 구조 결과 Chip만 성공/실패 상태로 구분한다.
- 결과 생성 시점에는 `구조 성공`이 아닌 `구조 가능`으로 표시한다.
- 기존 `🍽️ 곁들임 & 별도 활용 안내` 카드의 위치와 스타일을 유지한다.
- DB, 로그인, 결제, EXP 저장, 요리 완료 인증, 새 페이지는 추가하지 않는다.

## 6. 배포

- Vercel 프로젝트: `arang2/fridge-quest`
- Production: https://fridge-quest-liard.vercel.app
- `GEMINI_API_KEY`: Production, Preview, Development 환경에 등록
- 명령: `pnpm deploy:preview`, `pnpm deploy`
