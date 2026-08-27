# 🧊 FRIDGE QUEST

> 입력한 냉털 재료를 모두 구조 시도하되, 실제 레시피에 자연스럽게 사용하는 재료만 **구조 가능**으로 판정하는 AI 요리 퀘스트입니다.

## 핵심 기능 (v2.0.0)

1. **현실적인 구조 판정**
   - 모든 입력 재료는 구조 시도 대상입니다.
   - 한 요리에 억지로 모두 섞지 않고 실제 조리법에 사용한 재료만 구조 가능으로 표시합니다.
2. **명확한 데이터 분리**
   - `allIngredients`: 사용자 원본 입력 전체
   - `rescuedIngredients`: 현재 조리법에서 실제 사용하는 냉털 재료
   - `failedIngredients`: 코드에서 `allIngredients - rescuedIngredients`로 계산한 미활용 재료
3. **구조 실패 후속 행동**
   - 실패는 폐기를 뜻하지 않습니다.
   - 실패 이유와 기존 `🍽️ 곁들임 & 별도 활용 안내` 카드로 현실적인 다음 행동을 제공합니다.
4. **원문 및 레시피 정합성 검증**
   - `취두부`를 `두부`로 일반화하지 않습니다.
   - 구조 가능 재료가 조리 단계에 실제 등장하는지 확인하고, 불일치하면 한 번만 재생성합니다.
5. **게이미피케이션**
   - `🔥 2/3 구조 가능!`처럼 현재 구조 가능 수를 표시합니다.
   - EXP는 코드에서 `rescuedIngredients.length × 100`으로 계산하며 실제 저장하지 않습니다.
6. **실패 재료 우선 재추천**
   - 다른 요리 추천 시 직전 실패 재료를 `priorityIngredients`로 전달합니다.
   - 수식어만 바꾼 동일 요리는 검증에서 차단합니다.

## 기술 구성

- Next.js 16.3.3 App Router
- React 19, TypeScript, Tailwind CSS
- Google Gemini API (`gemini-3.6-flash`, `gemini-2.5-flash` fallback)
- Vercel CLI 및 Vercel 환경변수 배포

## 실행과 배포

```bash
pnpm install
pnpm dev
```

```bash
# Preview
pnpm deploy:preview

# Production
pnpm deploy
```

프로덕션: https://fridge-quest-liard.vercel.app

`GEMINI_API_KEY`는 `.env` 또는 Vercel 환경변수에만 저장하며 저장소에 커밋하지 않습니다.

## 문서

- [개발 계획](docs/DEVELOPMENT_PLAN.md)
- [QA 체크리스트](docs/QA_CHECKLIST.md)
- [AI 프롬프트 및 응답 명세](docs/AI_PROMPT_SPEC.md)
- [제품 요구사항](PRD.md)
