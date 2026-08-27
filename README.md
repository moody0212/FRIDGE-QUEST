# 🧊 FRIDGE QUEST (냉장고 식재료 구조 퀘스트)

> **"내가 입력한 모든 냉털 재료"를 AI가 이번 퀘스트 한 끼 안에서 100% 완벽하게 구조(메인 요리 + 별도 곁들임/토핑/안내)해준다.**

---

## 📌 프로젝트 소개
FRIDGE QUEST는 버려지기 직전의 냉장고 식재료를 게이미피케이션 요소와 AI 추천을 통해 하나의 요리 퀘스트로 변환하여 해결하는 5시간 MVP 서비스입니다.

### 🌟 핵심 기능 및 개정 정책 (v1.5.0)
1. **단일 화면(SPA) 퀘스트 생성**: 기본 재료 체크, 냉털 재료/상태 입력, 조리시간 설정부터 AI 레시피 결과까지 한 화면에서 조작.
2. **100% 전부 구조 정책 (All-Rescue)**:
   - 입력한 모든 냉털 재료가 이번 퀘스트 대상 (`questIngredients`).
   - 어울리는 재료는 메인 요리(`mainDishIngredients` & `steps`)에 사용하고, 어울리지 않는 재료(취두부, 딸기, 감자샐러드 등)는 억지로 팬에 함께 볶지 않고 곁들임/토핑/별도 안내(`additionalUses`)로 깔끔하게 분리 구조.
3. **입력 재료명 원문 보존 (Source of Truth)**:
   - `취두부` ➔ `취두부` (절대 `두부`로 임의 치환/일반화 금지).
4. **EXP 코드 정밀 연산**:
   - $\text{EXP} = \text{입력한 냉털 재료 개수} \times 100$. (코드 레벨 자동 연산)
5. **게이미피케이션 & Reroll**:
   - `🎯 이번 퀘스트 구조 대상` & `🎮 요리를 완성하면 +EXP 획득 가능` 게이지 카드 제공.
   - `🔄 다른 요리 추천받기` 수식어 중복 차단 및 다변화 기능.

---

## 📁 주요 문서 가이드 (`docs/`)
- 🗺️ [개발 계획서 (DEVELOPMENT_PLAN.md)](file:///c:/IT%20test/docs/DEVELOPMENT_PLAN.md): v1.5.0 스프린트별 태스크 및 진행 상태 (100% 완료)
- 🧪 [QA 테스트 체크리스트 (QA_CHECKLIST.md)](file:///c:/IT%20test/docs/QA_CHECKLIST.md): v1.5.0 30개 항목 전수 통과 (100% Pass)
- 🤖 [AI 프롬프트 명세서 (AI_PROMPT_SPEC.md)](file:///c:/IT%20test/docs/AI_PROMPT_SPEC.md): v1.5.0 LLM 비즈니스 룰 및 Structured Output JSON 규격
- 📑 [PRD.md](file:///c:/IT%20test/PRD.md): FRIDGE QUEST 최종 요구사항 정의서

---

## 🚀 시작하기

### 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 로 접속하여 서비스를 확인할 수 있습니다.
