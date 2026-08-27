# 🤖 FRIDGE QUEST AI 프롬프트 명세서 (Prompt Specification)

> **문서 목적**: PRD.md 및 데이터 정합성/사용자 입력 원문 보존/AI 결과 검증 규칙을 준수하는 AI 시스템 프롬프트 및 I/O 스키마 정의  
> **문서 버전**: v1.4.0 (입력 원문 보존, 1회 재시도 검증 로직 및 EXP UX 문구 개선 반영)  
> **최종 수정일**: 2026-08-27  
> **관련 엔드포인트**: `/api/quest`  

---

## 1. 프롬프트 핵심 비즈니스 규칙 (입력 원문 보존 & 검증 룰)

1. **사용자 입력 재료명 원문 보존 (Source of Truth)**:
   - 사용자가 입력한 재료명(예: `취두부`, `연두부`, `엄마가 만든 감자샐러드`)은 절대 임의로 다른 일반 단어(`두부` 등)로 변경하지 않는다.
   - `rescueTarget` 및 `rescueUsed`의 문자열은 사용자 입력과 100% 동일해야 한다.
2. **세부 재료 구별**:
   - `취두부` ≠ `일반 두부`, `연두부` ≠ `부침두부`, `고추장` ≠ `고춧가루` 등 재료 세부 종류의 특성을 구분하여 조리법을 서술한다.
3. **올바른 표준 조리 용어 사용**:
   - "전자기레인지"와 같은 오탈자는 사용 금지하며, 반드시 "전자레인지", "프라이팬", "에어프라이어", "중불", "약불" 등 표준 용어를 사용한다.
4. **한국어 조사 괄호 표기 금지**:
   - `(을/를)`, `(이/가)` 등 괄호 표기를 금지하고 한국어 받침 연산(`attachJosa`)에 맞는 정갈한 문장 작성.
5. **결과 검증 및 1회 재시도 (Verification & Retry)**:
   - AI 응답에 대해 `validateQuest` 검증(원문 보존 여부, 기본 재료 보유 여부, 오탈자 및 조사 괄호 존재 여부)을 수행한다.
   - 검증 실패 시 1회 재시도 요청을 보내며, 연속 실패 시 지능형 Fallback 엔진으로 자동 복구한다.
6. **EXP 준비 완료 UX 문구 적용**:
   - 결과 화면 하단 EXP 표시는 완료 인증 전이므로 `"🎯 [재료명] 구조 퀘스트 준비 완료!"` 및 `"+120 EXP 획득 가능"`으로 명확히 표현한다.

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
}
```

### 2.2 Response Payload
```typescript
export interface QuestApiResponse {
  rescueTarget: string;      // 구조 대상 재료명 (사용자 입력 원문과 100% 동일)
  dish: string;              // 추천 요리명 (예: "취두부 양파구이")
  time: string;              // 예상 조리시간 (예: "약 15분")
  rescueUsed: string[];      // 실제 사용된 냉털 재료 (입력 원문 100% 보존)
  basicUsed: string[];       // 실제 사용된 기본 재료
  extraNeeded: string[];     // 추가 필요 재료 (없으면 [])
  steps: string[];           // 최대 5단계 표준 조리법
  tip?: string;              // 소스 활용법 또는 곁들임 팁
  warningMessage?: string;   // 🔴 재료 관련 안전 경고 문구
  exp: number;               // 보상 경험치 (80 ~ 150)
}
```
