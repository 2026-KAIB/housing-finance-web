# Input feature

3-step 입력 위저드. 단계 구분 기준은 **입력 주체**다.

| 단계 | 화면 | 내용 |
|---|---|---|
| step 1 | `step-input.tsx` | 사용자가 직접 입력하는 값 전부 — `basic-fields` · `goal-fields` · `savings-fields` |
| step 2 | `step-mydata.tsx` | 자동으로 채워지는 값 — `features/mydata`의 패널 |
| step 3 | `step-review.tsx` | 입력값 + `profile-facts` + 마이데이터 요약 → [결과 보기] |

- 폼 검증은 step 1에서만 돌린다. step 2·3에는 입력 필드가 없다.
- 마이데이터를 불러왔는지는 `input-wizard.tsx`가 쥔다. step 3이 그 사실을 보고해야
  하므로 패널 안에 두면 알 수 없다.
- `persona-picker.tsx`는 프로토타입 전용 부가 기능이다. 실사용 전환 시 이 파일과
  `step-input.tsx`의 `<PersonaPicker />` 한 줄만 지운다. 폼 로직에 관여하지 않는다.
- 목표 시점은 화면에서 `YYYY-MM`, 계약에서 `YYYYMM`이다. 변환은 `toFormValues`와
  `lib/format/date`의 `parseYmInput`이 담당한다.
