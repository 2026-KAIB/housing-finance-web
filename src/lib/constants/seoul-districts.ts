/**
 * 서울 25개 자치구. 코드는 행정표준코드이며 오름차순이 곧 표준 표기 순서다.
 * 부동산 DB(`db_schema_realestate.md`)의 `sgg_codes` 테이블과 같은 값이라,
 * 나중에 API로 갈아끼울 때 형식을 바꿀 필요가 없다.
 */
export const SEOUL_DISTRICTS: readonly { readonly code: string; readonly name: string }[] = [
  { code: "11110", name: "종로구" },
  { code: "11140", name: "중구" },
  { code: "11170", name: "용산구" },
  { code: "11200", name: "성동구" },
  { code: "11215", name: "광진구" },
  { code: "11230", name: "동대문구" },
  { code: "11260", name: "중랑구" },
  { code: "11290", name: "성북구" },
  { code: "11305", name: "강북구" },
  { code: "11320", name: "도봉구" },
  { code: "11350", name: "노원구" },
  { code: "11380", name: "은평구" },
  { code: "11410", name: "서대문구" },
  { code: "11440", name: "마포구" },
  { code: "11470", name: "양천구" },
  { code: "11500", name: "강서구" },
  { code: "11530", name: "구로구" },
  { code: "11545", name: "금천구" },
  { code: "11560", name: "영등포구" },
  { code: "11590", name: "동작구" },
  { code: "11620", name: "관악구" },
  { code: "11650", name: "서초구" },
  { code: "11680", name: "강남구" },
  { code: "11710", name: "송파구" },
  { code: "11740", name: "강동구" },
];

/**
 * "아직 안 골랐다"(빈 문자열)와 구분되는 "전체로 골랐다" 센티널.
 * 둘을 하나로 합치면 필수 입력 검증이 성립하지 않는다.
 */
export const ALL_DISTRICTS = "ALL";

/** 드롭다운 옵션 전용 문구. 요약 표기는 seoulDistrictLabel이 담당한다. */
export const ALL_DISTRICTS_OPTION_LABEL = "전체 (서울 25개 구)";

/** 값이 빈 문자열일 때 <select>가 무엇을 그릴지 정하는 자리표시 옵션 문구. */
export const REGION_PLACEHOLDER_LABEL = "지역을 선택하세요";

export function isSeoulDistrict(code: string): boolean {
  return SEOUL_DISTRICTS.some((district) => district.code === code);
}

/**
 * 입력 확인 화면 등 요약 표기용. 모르는 코드는 `codes.ts`의 lookup과 같은
 * 관용으로 받은 값을 그대로 돌려준다.
 */
export function seoulDistrictLabel(code: string): string {
  if (code === ALL_DISTRICTS) return "서울 전체";

  return SEOUL_DISTRICTS.find((district) => district.code === code)?.name ?? code;
}
