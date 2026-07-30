# 홈서버 프론트엔드 자동 배포 안내

이 문서는 `housing-finance-web`의 `main` 브랜치가 바뀔 때마다 테스트,
Docker 이미지 발행, 홈서버 교체, 헬스체크를 자동으로 수행하는 방법을
설명한다.

## 1. 전체 구성

최소 애플리케이션 컨테이너는 다음 3개다.

```text
인터넷 사용자
  -> 공유기 외부 TCP 18080
  -> 홈서버 TCP 13000
  -> housing-finance-web:3000
  -> /api 프록시
  -> housing-finance-api:8000
  -> PostgreSQL:5432
```

- `housing-finance-web`: 외부 요청을 받는 Next.js 컨테이너
- `housing-finance-api`: Docker 내부에서만 접근하는 FastAPI 컨테이너
- PostgreSQL: Docker 내부에서만 접근하는 DB 컨테이너

백엔드와 DB 포트는 공유기에 포트포워딩하지 않는다. 브라우저는 같은
출처의 `/api/*`를 호출하고 Next.js 서버가 내부 백엔드로 전달한다.

실제 공개 서비스에서는 임의 HTTP 포트 대신 도메인과 HTTPS를 제공하는
리버스 프록시를 추가하는 것이 좋다. NAS나 공유기가 HTTPS 리버스 프록시를
제공한다면 별도 컨테이너는 필요하지 않다.

## 2. 사용할 포트

첫 외부 테스트에서는 다음 값을 권장한다.

| 구간 | 값 |
| --- | --- |
| Next.js 컨테이너 | `3000` |
| 홈서버 호스트 | `13000` |
| 공유기 외부 포트 | `18080/TCP` |
| FastAPI 컨테이너 | `8000`, 외부 미공개 |
| PostgreSQL 컨테이너 | `5432`, 외부 미공개 |

공유기에는 다음 규칙 하나만 만든다.

```text
외부 TCP 18080
-> 홈서버 고정 내부 IP의 TCP 13000
```

접속 주소는 `http://공인IP:18080` 또는 `http://DDNS주소:18080`이다.
외부 포트 `18080`은 다른 미사용 포트로 바꿔도 된다. 포트 번호 변경은
암호화를 제공하지 않으므로 공개 운영 전에는 HTTPS를 적용한다.

## 3. 홈서버 Docker 네트워크 준비

홈서버에서 다음 명령을 한 번 실행한다.

```bash
docker network inspect housing-platform >/dev/null 2>&1 \
  || docker network create housing-platform
```

나중에 프론트, 백엔드, DB 컨테이너를 모두 이 네트워크에 연결한다.

## 4. 홈서버 환경 파일 준비

저장소의 `deploy/home-server.env.example`을 참고해 홈서버에 배포 전용
디렉터리와 환경 파일을 만든다.

```bash
sudo install -d -m 750 /opt/housing-finance
sudo nano /opt/housing-finance/.env
```

초기 내용은 다음과 같다.

```dotenv
WEB_BIND_ADDRESS=0.0.0.0
WEB_HOST_PORT=13000
BACKEND_API_URL=http://housing-finance-api:8000
PLATFORM_NETWORK=housing-platform
```

프론트 환경 파일에는 DB 비밀번호가 필요 없다. DB 비밀번호와 AI 키는
나중에 백엔드 전용 환경 파일에만 저장한다.

## 5. GitHub self-hosted runner 설치

GitHub 저장소에서 다음 메뉴로 이동한다.

```text
Settings
-> Actions
-> Runners
-> New self-hosted runner
```

홈서버의 운영체제와 CPU 아키텍처를 선택한 뒤 GitHub가 화면에 보여 주는
설치 명령을 홈서버에서 그대로 실행한다. 등록할 때 runner에
`housing-production` 라벨을 추가한다.

Linux runner를 서비스로 설치하는 명령은 GitHub가 생성한 runner
디렉터리에서 실행한다.

```bash
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

runner 계정이 Docker를 실행할 수 있어야 한다. `<RUNNER_USER>`는 실제
runner 서비스 계정으로 바꾼다.

```bash
sudo usermod -aG docker <RUNNER_USER>
```

그룹 변경 후 runner 서비스를 재시작한다. Docker 권한은 사실상 서버
관리자 권한이므로 신뢰하는 저장소의 `main` 배포에만 사용한다.

## 6. GitHub 저장소 설정

### Actions 패키지 권한

저장소의 Actions 설정에서 workflow가 패키지를 쓰고 읽을 수 있도록 한다.
워크플로는 GitHub가 자동으로 제공하는 `GITHUB_TOKEN`으로 GHCR에
로그인하므로 별도 개인 토큰을 저장할 필요가 없다.

### 자동 배포 활성화

runner와 환경 파일 준비가 모두 끝난 뒤 다음 Repository variable을 만든다.

```text
Settings
-> Secrets and variables
-> Actions
-> Variables

Name: ENABLE_HOME_DEPLOY
Value: true
```

이 변수가 없거나 `true`가 아니면 이미지 발행까지만 수행하고 홈서버
배포 작업은 건너뛴다. 따라서 runner 설치 전에 workflow를 main에
머지해도 배포 작업이 대기 상태로 남지 않는다.

변수를 만든 뒤 첫 배포를 시작하려면 다음 메뉴에서 `main`을 선택하고
`Run workflow`를 누른다.

```text
Actions
-> Web CI/CD
-> Run workflow
-> Branch: main
```

이후에는 `main`이 갱신될 때마다 같은 과정이 자동으로 실행된다.

### main 보호

`main` 브랜치에는 다음 보호 규칙을 권장한다.

- Pull Request를 통해서만 변경
- `validate` 작업 통과 필수
- 최소 한 명의 리뷰 승인
- 관리자도 가능하면 동일한 규칙 적용

PR 코드는 GitHub가 제공하는 runner에서만 검사한다. 홈서버 runner는
`main`에 반영된 커밋의 배포에만 사용한다.

## 7. 자동 배포 동작

`main`에 커밋이 반영되면 `.github/workflows/ci.yml`이 다음 순서로 실행된다.

1. 타입 검사
2. Vitest 테스트
3. Next.js 프로덕션 빌드
4. amd64/arm64 Docker 이미지 생성
5. `ghcr.io/2026-kaib/housing-finance-web:<커밋 SHA>` 발행
6. 홈서버가 정확한 SHA 이미지를 pull
7. 프론트 컨테이너 교체
8. `/health`가 정상인지 최대 90초 확인
9. 실패하면 직전 이미지로 복구

`main` 태그도 만들지만 자동 배포는 재현 가능한 커밋 SHA 태그를 사용한다.

## 8. 상태 확인

홈서버에서 다음 명령으로 프론트 상태를 확인한다.

```bash
docker ps --filter name=housing-finance-web
docker logs --tail 200 housing-finance-web
curl --fail http://127.0.0.1:13000/health
```

정상 응답 예시는 다음과 같다.

```json
{"status":"ok","service":"housing-finance-web"}
```

백엔드가 아직 배포되지 않았더라도 프론트 화면과 `/health`는 열린다.
다만 `/api/*` 호출은 백엔드 배포 전까지 `502`를 반환한다.

## 9. 실행과 중단

자동 배포 후 프론트를 중단하려면 홈서버에서 실행한다.

```bash
docker stop housing-finance-web
```

다시 실행하려면 다음을 사용한다.

```bash
docker start housing-finance-web
```

다음 `main` 배포가 실행되면 컨테이너는 최신 이미지로 다시 생성된다.

## 10. 다음 단계

프론트 배포 확인 후 백엔드에서 진행할 작업은 다음과 같다.

1. FastAPI용 프로덕션 이미지 발행 workflow
2. `housing-finance-api` 컨테이너를 `housing-platform`에 연결
3. PostgreSQL 컨테이너를 같은 네트워크에 연결
4. FastAPI의 실제 DB 저장소 연결
5. `/ready`에서 DB 연결까지 확인
6. HTTPS 리버스 프록시 또는 NAS 인증서 연결
