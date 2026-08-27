# ✅ FRIDGE QUEST QA 체크리스트

> **문서 버전**: v2.1.0
>
> **최종 수정일**: 2026-08-27
>
> **검증 결과**: 구조 판정 대표 시나리오, 재추천, 타입 검사, 프로덕션 빌드 통과

## 기능 및 정합성

| ID | 검증 항목 | 기대 결과 | 상태 |
| --- | --- | --- | --- |
| TC-101 | 재료 2개 미만 | 요청 차단 및 기존 오류 메시지 표시 | Pass |
| TC-102 | 상태 미선택 | 요청 차단 | Pass |
| TC-103 | 중복 원문 | 서버에서 중복 입력 차단 | Pass |
| TC-201 | 전체 입력 보존 | `allIngredients`가 사용자 원문 배열과 일치 | Pass |
| TC-202 | 일부 구조 | 실제 조리 재료만 `rescuedIngredients`에 포함 | Pass |
| TC-203 | 실패 계산 | `failedIngredients = allIngredients - rescuedIngredients` | Pass |
| TC-204 | 조리법 정합성 | 모든 구조 가능 재료가 `steps`에 원문으로 등장 | Pass |
| TC-205 | 실패 재료 배제 | 실패 재료가 `steps`에 등장하지 않음 | Pass |
| TC-206 | 원문 보존 | `취두부`가 `두부`로 변경되지 않음 | Pass |
| TC-207 | 포함 관계 이름 | `두부`와 `취두부`를 서로 다른 입력으로 판정 | Pass |
| TC-208 | 실패 이유 연결 | 모든 실패 재료에 한 개의 실패 이유 제공 | Pass |
| TC-209 | 별도 활용 연결 | `additionalUses` 대상이 실패 재료와 정확히 일치 | Pass |
| TC-210 | 특수 식재료 | 불확실한 임의 조리 대신 포장 안내 확인을 권고 | Pass |
| TC-211 | EXP | `rescuedIngredients.length × 100`과 일치 | Pass |
| TC-212 | 구조 가능 표시 | `rescued/all` 개수와 Chip 상태가 일치 | Pass |
| TC-213 | UI 용어 | 완료 인증 없이 `구조 가능`으로 표시 | Pass |
| TC-214 | 기존 카드 | `🍽️ 곁들임 & 별도 활용 안내` 스타일 유지 | Pass |
| TC-215 | 조리 방식 균형 | 채소 입력만으로 무조건 국을 추천하지 않음 | Pass |
| TC-216 | 건식 재료 | 빵류를 국으로 만들지 않고 토스트·샌드위치 계열 검토 | Pass |
| TC-217 | 괴식 방지 | 입력 이름을 이어 붙인 생소한 메뉴 대신 일부 재료 실패 처리 | Pass |
| TC-218 | 기본 재료 활용 | 활용 가능한 기본 재료를 `basicUsed`와 `steps`에 함께 반영 | Pass |
| TC-219 | 기본 재료 정합성 | `basicUsed`에 표시한 모든 재료가 실제 `steps`에 등장 | Pass |
| TC-301 | 재추천 상태 유지 | 재료, 상태, 기본 재료, 조리시간 유지 | Pass |
| TC-302 | 실패 재료 우선 | 직전 실패 재료를 `priorityIngredients`로 전달 | Pass |
| TC-303 | 동일 요리 차단 | 단순 수식어 변경 요리를 재추천으로 인정하지 않음 | Pass |
| TC-304 | 검증 실패 | 최대 한 번 재생성 후 기존 오류 UI 사용 | Pass |

## 대표 통합 시나리오

입력: `취두부`, `치즈`, `브로콜리`

- API 상태: 200
- 사용자 원본 이름 일치: Pass
- 구조 가능: 치즈, 브로콜리
- 구조 실패: 취두부
- EXP: 200
- 실패 이유 및 별도 활용 안내 연결: Pass
- 재추천 요청의 `priorityIngredients`가 직전 실패 목록과 일치: Pass
- 재추천 요리가 직전 요리와 다름: Pass

입력: `식빵`, `청양고추` / 기본 재료: `마늘`, `소금`, `식용유`

- 실제 배포 결과: 마늘 식빵 구이
- 구조 가능: 식빵
- 구조 실패: 청양고추
- 기본 재료 실제 사용: 마늘, 소금, 식용유
- EXP: 100
- 청양고추 토스트 같은 강제 조합 미생성: Pass

## 빌드 검증

```bash
pnpm exec tsc --noEmit
pnpm build
```

- TypeScript: Pass
- Next.js 16.3.3 production build: Pass
- `/api/quest`: Dynamic Route Handler 확인
