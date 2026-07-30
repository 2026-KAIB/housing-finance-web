/**
 * 차트 계열 색상. KB 옐로·브라운 계열 안에서 6개 검사를 통과한 값이다.
 *
 *   node scripts/validate_palette.js "#eda100,#8a4b12" \
 *     --mode light --surface "#faf7f1"
 *
 *   명도 밴드 PASS (L 0.43~0.77) · 채도 하한 PASS (C >= 0.1)
 *   CVD 분리 PASS (ΔE 28.9 protan / 28.2 tritan)
 *   정상시야 하한 PASS (ΔE 29.3) · 표면 대비 WARN (#eda100 2.02:1)
 *
 * UI의 --color-brand(#ffcc00)를 그대로 쓰지 않는 이유: 명도 0.865로
 * 밴드 위에 있고 표면 대비 1.41:1이라 차트 마크로 못 쓴다. #eda100은
 * 같은 색상 계열에서 명도만 밴드 안으로 내린 단계다. 같은 이유로
 * KB 브라운 #4e473f는 채도 0.016(회색으로 읽힘)이라 계열 식별에 쓸 수
 * 없어서, 채도를 하한 위로 올린 #8a4b12를 쓴다.
 *
 * 대비 WARN은 완화 조건으로 해소된다 — 두 차트 모두 범례가 있고 바로
 * 옆에 전체 데이터 표가 있다. 범례나 표를 지우면 WARN이 실제 실패가 된다.
 */
export const CHART_SERIES = ["#eda100", "#8a4b12"] as const;

/**
 * 계열이 2개를 넘을 때 쓰는 "기타" 중성색. 브랜드 색을 순환시키지
 * 않는다 — 순환 배정은 색이 가리키는 대상을 바꿔버려 식별을 깬다.
 * 픽스처 20개에서 allocations 길이는 0·1·2뿐이라 실제로는 쓰이지
 * 않지만, 백엔드가 3개 이상을 주더라도 색이 겹치지 않게 둔다.
 */
export const CHART_OTHER = "#8c857a";

/** 그리드·축처럼 뒤로 물러나야 하는 선. --color-line과 같은 값. */
export const CHART_GRID = "#e7e0d4";

/**
 * 마크 사이를 벌리는 표면색. --color-surface와 같은 값이다. 인접한 채움
 * 사이에 2px 표면색 간격을 두면 두 계열이 맞닿아 섞여 보이지 않는다.
 */
export const CHART_SURFACE = "#ffffff";

export function seriesColor(index: number): string {
  return CHART_SERIES[index] ?? CHART_OTHER;
}
