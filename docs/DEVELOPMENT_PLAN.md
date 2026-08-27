# 🗺️ FRIDGE QUEST 개발 계획서 (Development Roadmap)

> **프로젝트명**: FRIDGE QUEST — 냉장고 식재료 구조 퀘스트 (5시간 MVP)  
> **기준 문서**: `PRD.md` (FRIDGE QUEST 최종 PRD)  
> **문서 버전**: v1.5.0 (개정 핵심 정책: "100% 전부 이번 퀘스트에서 구조", mainDishIngredients + additionalUses 카드 분리 & EXP 전체 개수 비례 반영)  
> **최종 수정일**: 2026-08-27  
> **전체 진행률**: 🟢 100% (새로운 정책 반영 및 100% 구조 레시피 엔진 고도화 완료)  

---

## 1. 프로젝트 개요 및 핵심 목표

### 1.1 핵심 가치
> 🧊 **“내가 입력한 모든 냉털 재료”를 이번 퀘스트 한 끼 안에서 100% 완벽하게 구조(메인 요리 + 별도 곁들임/토핑/안내)해준다.**

### 1.2 핵심 성공 조건
1. **전부 구조 원칙**: 사용자가 입력한 냉털 재료는 이번 퀘스트에서 100% 모두 구조 (남은 재료/이월 개념 완전 제거).
2. **억지 조합 금지 (메인 요리 vs 곁들임 분리)**:
   - 어울리는 재료는 메인 요리(`mainDishIngredients` & `steps`)로 조리.
   - 어울리지 않는 재료(예: 취두부, 딸기, 감자샐러드 등)는 억지로 팬에 함께 볶지 않고 곁들임/토핑/별도 가열 안내(`additionalUses`)로 깔끔하게 분리 구조.
3. **재료 원문 보존 (Source of Truth)**:
   - `취두부` ➔ `취두부` (절대 `두부`로 임의 치환/일반화 금지).
   - 특수 식재료는 안전한 곁들임/제품 조리 안내 우선 제공.
4. **EXP 코드 정밀 연산**:
   - $\text{EXP} = \text{입력한 냉털 재료 개수} \times 100$. AI가 숫자를 직접 생성하지 않음.
5. **단일 화면 구성 & 1회 재시도 검증**:
   - AI 응답 불일치 시 1회 재시도 요청, 연속 실패 시 100% 정합성 보장 룰베이스 Fallback 엔진으로 자동 복구.

---

## 2. 기술 스택 및 아키텍처

| 영역 | 기술 스택 | 비고 |
| :--- | :--- | :--- |
| **Framework** | Next.js 14+ (App Router) | React Server Components & Client Components |
| **Language** | TypeScript | 엄격한 타입 안정성 보장 |
| **Styling** | Tailwind CSS + CSS Variables | 게이미피케이션 테마 (Warm/Playful Aesthetic) |
| **AI Integration** | Google Gemini API (Multi-model Fallback) | Next.js Route Handler (`/api/quest`) + JSON Structured Output |
| **Verification Engine** | Custom Validation (`validateQuest`) | 원문 보존, 재료 100% 사용 검증, 1회 재시도 |
| **State Management** | React Local State (`useState`, `useRef`) | 단일 화면 상태 유지 및 재시도 간편화 |

---

## 3. 핵심 비즈니스 룰 및 이행 현황

### 3.1 개정 핵심 정책 이행 완료 내역
- [x] **남은 구조 대상 개념 완전 제거**: `remainingItems`, `남은 구조 대상` 제거.
- [x] **100% 전부 구조 데이터 구조 적용**: `questIngredients` (모든 입력 재료), `mainDishIngredients` (메인 요리 사용 재료), `additionalUses` (별도 곁들임/안내).
- [x] **EXP 코드 연산**: `questIngredients.length * 100`으로 코드 계산.
- [x] **재추천 요리 다변화**: `stripAdjectives`로 수식어만 바꾼 동일 요리 재추천 차단.
- [x] **표준 조리 용어 강제**: "전자레인지" 사용, `(을/를)` 괄호 조사 표기 완전 금지.
