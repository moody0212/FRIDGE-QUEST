# 🤖 FRIDGE QUEST AI 프롬프트 명세서 (Prompt Specification)

> **문서 목적**: PRD.md 및 "100% 전부 이번 퀘스트에서 구조" 개정 정책을 준수하는 AI 시스템 프롬프트 및 I/O 스키마 정의  
> **문서 버전**: v1.5.0 (모든 냉털 재료 100% 구조, mainDishIngredients + additionalUses 카드 분리, 원문 보존 및 1회 재시도 검증)  
> **최종 수정일**: 2026-08-27  
> **관련 엔드포인트**: `/api/quest`  

---

## 1. 프롬프트 핵심 비즈니스 규칙 (All-Rescue Policy & Validation)

1. **전부 구조 원칙**:
   - 사용자가 입력한 냉털 재료(`questIngredients`)는 100% 이번 퀘스트의 대상이다. (남은 구조 대상 개념 완전 제거)
2. **메인 요리 vs 별도 곁들임 분리 (`mainDishIngredients` & `additionalUses`)**:
   - 어울리는 재료만 메인 요리(`mainDishIngredients` & `steps`)에 사용한다.
   - 어울리지 않는 재료(예: 취두부, 딸기, 감자샐러드 등)는 억지로 팬에 함께 볶지 않고 `additionalUses` (곁들임/사이드/토핑/별도 가열 안내)로 분리 구조한다.
3. **입력 재료명 원문 보존 (Source of Truth)**:
   - 사용자가 입력한 재료명(예: `취두부`, `연두부`, `엄마가 만든 감자샐러드`)은 100% 원문 그대로 출력한다. (`취두부` ➔ `취두부`, 절대 `두부`로 임의 치환 금지!)
4. **EXP 코드 연산**:
   - $\text{EXP} = \text{입력한 냉털 재료 개수} \times 100$. (코드 레벨 자동 계산)
5. **올바른 표준 조리 용어 사용**:
   - "전자기레인지" 오탈자 금지 ➔ 반드시 "전자레인지"로 표기.
   - `(을/를)` 과 같은 괄호 조사 표기 금지 및 정갈한 한글 문장 조사 적용.
6. **결과 검증 및 1회 재시도 (Verification & Retry)**:
   - 모든 재료가 메인 요리나 `additionalUses` 중 하나에 속하는지 `validateQuest`로 검증.
   - 검증 실패 시 1회 재시도 요청을 보내며, 연속 실패 시 지능형 Fallback 엔진으로 자동 복구.

---

## 2. 입출력 스키마 (TypeScript & JSON)

### 2.1 Request Payload
```typescript
export interface QuestApiRequest {
  basics: string[];
  items: {
    name: string; // 예: "취두부" (원문 보존 대상)
    status: 'fresh' | 'soft' | 'bad';
  }[];
  cookTime: '10' | '20' | 'any';
  excludeDish?: string;
  previousRecipeName?: string;
  previousCookingMethod?: string;
  previousMainDishIngredients?: string[];
}
```

### 2.2 Response Payload
```typescript
export interface AdditionalUse {
  ingredient: string; // 냉털 재료 원문
  usage: string;      // 별도 곁들임/사이드/토핑/가열 안내 문구
}

export interface QuestApiResponse {
  rescueTarget: string;              // 주 구조 대상 재료명 (원문과 100% 동일)
  dish: string;                      // 메인 요리명 (예: "브로콜리 치즈구이")
  time: string;                      // 예상 조리시간 (예: "약 15분")
  questIngredients: string[];        // 입력된 모든 냉털 재료 원문 (전부 구조)
  mainDishIngredients: string[];     // 메인 요리 steps 조리법에 들어가는 재료
  additionalUses?: AdditionalUse[];  // 메인 요리 외 별도 곁들임/토핑/안내
  rescueUsed: string[];              // 기존 호환용 (= questIngredients)
  basicUsed: string[];               // 실제 사용된 보유 기본 재료
  extraNeeded: string[];             // 필수 추가 재료 (없으면 [])
  steps: string[];                   // 최대 5단계 표준 조리법
  tip?: string;                      // 요리 팁
  warningMessage?: string;           // 🔴 재료 관련 안전 경고 문구
  exp: number;                       // 게이미피케이션 경험치 (입력 개수 × 100)
}
```
