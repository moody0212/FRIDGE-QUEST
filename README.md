# 🧊 FRIDGE QUEST

> 입력한 냉털 재료를 모두 구조 시도하되, 실제 레시피에 자연스럽게 사용하는 재료만 **구조 가능**으로 판정하는 AI 요리 퀘스트입니다.

## 바로가기

- 🌐 [랜딩페이지](https://fridge-quest-liard.vercel.app/)
- 🍳 [서비스 시작하기](https://fridge-quest-liard.vercel.app/quest)

## 핵심 기능 (v2.2.0)

### 랜딩페이지 및 서비스 진입

- `/`에서 FRIDGE QUEST의 목적, 사용 방법, 핵심 가치를 먼저 안내합니다.
- 랜딩페이지의 `퀘스트 시작` CTA를 누르면 실제 냉장고 입력 서비스인 `/quest`로 이동합니다.
- 랜딩과 서비스 모두 기존 크림색 배경, 초록색 포인트, 둥근 카드, 냉장고 구조대 캐릭터 톤앤매너를 공유합니다.

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
7. **현실적인 메뉴와 조리 방식 선택**
   - 국·찌개·볶음·구이·조림·찜·무침·토스트 등을 동등하게 비교하고 재료 형태와 궁합에 맞는 방식을 선택합니다.
   - 재료명을 이어 붙인 괴식은 만들지 않고, 자연스러운 한 접시가 안 되면 일부 재료를 구조 실패로 분리합니다.
8. **기본 재료 실제 활용 검증**
   - 마늘, 간장, 소금, 식용유 등 선택된 기본 재료를 자연스럽게 활용합니다.
   - `basicUsed`에 표시한 기본 재료가 실제 조리 단계에도 등장하는지 서버에서 확인합니다.

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

프로덕션 랜딩: https://fridge-quest-liard.vercel.app

실제 서비스: https://fridge-quest-liard.vercel.app/quest

`GEMINI_API_KEY`는 `.env` 또는 Vercel 환경변수에만 저장하며 저장소에 커밋하지 않습니다.

## 문서

- [개발 계획](docs/DEVELOPMENT_PLAN.md)
- [QA 체크리스트](docs/QA_CHECKLIST.md)
- [AI 프롬프트 및 응답 명세](docs/AI_PROMPT_SPEC.md)
- [디자인 톤앤매너 및 랜딩페이지 계획](docs/DESIGN_TONE_AND_MANNER_PLAN.md)
- [제품 요구사항](PRD.md)
