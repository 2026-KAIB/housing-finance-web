# Housing Finance Web

주택구매 금융 컨설팅 서비스의 Next.js 사용자 화면입니다.

## 담당 영역

- 사용자 기본정보·목표주택·목표기간 입력
- 금융진단 대시보드
- 대출·예적금·구매전략 비교
- 최종 웹 보고서
- PDF·Markdown 다운로드 연결

금융 계산과 상품 판정은 프론트에서 다시 구현하지 않고 `housing-finance-core` API의 결과를 표시합니다.

## 로컬 실행

Node.js 22 이상을 권장합니다.

```bash
npm install
npm run dev
```

Windows PowerShell에서는 환경설정 파일을 먼저 복사합니다.

```powershell
Copy-Item .env.example .env
```

- 웹: http://localhost:3000
- 기본 API 주소: http://localhost:8000

현재 Windows 한글 경로에서 발생하는 Turbopack 경로 처리 문제를 피하기 위해 개발·빌드 명령은 Webpack 모드로 고정되어 있습니다.

### 카카오맵 앱 키

`희망 주택` 지도 패널을 쓰려면 `.env`에 `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`를 채워야 합니다. 카카오
개발자 콘솔에서 발급받은 **REST API 키가 아닌 JavaScript 키**를 넣어야 하며, 같은 콘솔의
내 애플리케이션 > 플랫폼 > Web에 `http://localhost:3000`을 등록해야 지도가 로드됩니다. 키가
비어 있으면 지도 자리에 안내 문구가 대신 표시됩니다.

## 구조

```text
src/
├─ app/          Next.js 라우트
├─ components/   여러 기능에서 재사용하는 UI
├─ features/     입력·대시보드·보고서 기능 모듈
└─ lib/
   ├─ api/       백엔드 호출
   └─ contracts/ 백엔드 응답 TypeScript 타입
```
