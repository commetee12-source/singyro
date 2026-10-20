# 예산관리시스템 따라하기

**에듀파인 따라하기 → 예산관리시스템 → 예산관리 따라하기 → 업무 선택**으로 진입한다. 기존 지출·수입과 같은 검색·분류·화면 연습을 제공한다. 홈·K-에듀파인 용어사전·자료실과 공통 디자인은 유지한다.

- 목록: `/#edufine-access?activity=budget_manage`.
- 성립전예산 편성: `/#edufine-access?activity=budget_manage_001`.
- 출처: [AI-SEN 공개 예산관리(성립전·추경) 카탈로그](https://chatbot.aisen.store/data/catalogs/budget_manage.json).
- 확인 시 업무 17개, 화면 89개, 수록 단계 173개. 성립전예산, 추가경정예산, 이전용/예비비관리 3개 분류를 제공한다.

공통 화면은 유지하고 시스템 설정·진입 카드·허용 경로에 `budget_manage`를 추가했다. 이미지 경로는 출처의 `scenes/budget_manage_p숫자.png`만 허용하며 다른 시스템의 자료와 섞이지 않도록 검증한다. 단계 번호가 화면별로 다시 시작해도 화면별 학습 기록을 구분한다. 자료·검색·진도는 시스템 전환 시 분리된다.

원본 서버의 공개 자료를 직접 불러오는 학습용 기능이다. 실제 예산 등록·저장·결재를 실행하지 않는다. 원문의 페이지·단계 번호와 자료 누락 안내를 유지하며, 서울 최신 화면·기관별 권한의 일치 여부는 확인하지 못했다고 표시한다.

## 검증

- `npm run build`: TypeScript 검사·빌드 통과. 기존 500kB 초과 번들 경고 유지.
- `node --test scripts/edufine-access.test.mjs scripts/edufine-workflows.test.mjs`: 13개 테스트 통과.
- 예산 17개·지출 88개·수입 82개 카탈로그 항목과 이미지 경로 모두 유효.
- 브라우저에서 예산 메뉴, 17개 목록, 검색, 성립전예산 이미지, 화면 표시 클릭 후 다음 이미지·단계 이동을 확인했다.
- 상세 주소 새로고침 정상. 390px·320px 확대 시 가로 스크롤이 이미지 영역 안에 머문다. 브라우저 오류·경고 로그 없음.
- 별도 lint·커버리지 도구는 프로젝트에 구성되어 있지 않다.

## 공개 배포

기존 [신규는 여기로](https://singyro-seoul.netlify.app/#edufine-access)에 `dist`와 `netlify/functions`를 함께 배포했다. 배포 ID: `6aae0265a66ab685e9ad14ff`.

공개 사이트에서 지출·수입·예산 선택 메뉴, 예산 업무 17개, 성립전예산 원문 이미지, 화면 표시 클릭 후 다음 이미지·단계 이동을 확인했다. 검사한 공개 페이지의 브라우저 오류·경고 로그는 없었다.

[배포 기록](https://app.netlify.com/projects/singyro-seoul/deploys/6aae0265a66ab685e9ad14ff) · [예산관리 따라하기](https://singyro-seoul.netlify.app/#edufine-access?activity=budget_manage)
