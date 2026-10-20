# 수입관리시스템 따라하기

사용자 요청에 따라 기존 **에듀파인 따라하기** 메뉴 안에 수입관리시스템을 추가했다. 기존 홈·K-에듀파인 용어사전·자료실과 지출 분야의 진입 경로는 유지한다. `EdufinePage.tsx`는 이번 작업 전 사본과 SHA-256이 일치한다.

## 사용 경로

- **에듀파인 따라하기 → 수입관리시스템 → 수입관리 따라하기 → 업무 선택**.
- 메뉴: `/#edufine-access`.
- 수입 목록: `/#edufine-access?activity=income`.
- 개별 업무 예: `/#edufine-access?activity=income_002`(납입금정보관리).
- 처음 접속 안내 아래의 ‘업무별 따라하기 열기’도 시스템 선택 메뉴로 연결한다.

## 자료 및 구현

[AI-SEN 따라하기](https://chatbot.aisen.store/guide/)의 [공개 수입 카탈로그](https://chatbot.aisen.store/data/catalogs/income.json)를 불러온다. 확인 시 수입 82개 업무·457개 화면·1,009개 단계이며, 지출 자료 88개 업무·348개 화면·1,046개 단계도 유지된다. 원문 서버가 바뀌면 목록이 달라질 수 있다.

카탈로그 로드·검색·분류·화면 연습을 공통 컴포넌트로 처리한다. 시스템 전환 시 자료·검색 조건·학습 진도를 초기화하고 진행 중 요청을 취소해 수입·지출이 섞이지 않도록 했다. 업무 상세에서 같은 목록으로 돌아갈 때는 검색 조건을 유지한다.

`edufine-workflows.ts`의 시스템 설정에는 확인한 출처 주소만 둔다. 자료의 시스템 ID와 업무 ID를 검증하고, 이미지 경로는 해당 시스템의 `scenes/income_p숫자.png` 또는 `scenes/expense_p숫자.png`로 제한한다. 수입 화면에 지출 이미지를 넣을 수 없다. 요청에는 자격증명과 리퍼러를 보내지 않는다.

실제 수납·징수·반환·결재를 실행하지 않는 학습용 화면이다. 단계 번호와 페이지는 공개 자료를 보존하며, 누락된 절차를 만들어 채우지 않는다. 서울 최신 화면과 기관별 권한에 일치하는지는 확인하지 못했으며 화면에 출처와 확인 범위를 표시한다.

## 검증

- `npm run build`: TypeScript 검사와 빌드 통과. 기존 500kB 초과 번들 경고 유지.
- `node --test scripts/edufine-access.test.mjs scripts/edufine-workflows.test.mjs`: 11개 테스트 통과.
- 두 공개 카탈로그의 모든 업무와 이미지 경로가 자료 검증을 통과했다.
- 브라우저: 메뉴 안에 두 시스템 표시, 수입 82개 목록, 납입금정보관리 검색, 이미지 로드, 원형 표시 클릭, 2개 화면·3개 단계 진행과 완료 확인.
- 수입 목록 복귀 시 검색 조건 유지, 지출 전환 시 검색 초기화·88개 목록·품의등록 초기 진도 확인.
- 수입 상세 주소 직접 접속 정상. 390px·320px에서 확대해도 페이지 가로 넘침 없음. 브라우저 오류·경고 로그 없음.
- 별도 lint·커버리지 도구는 프로젝트에 구성되어 있지 않다.

## 공개 배포

기존 [신규는 여기로](https://singyro-seoul.netlify.app/#edufine-access)에 배포 완료. `dist`와 `netlify/functions`를 함께 배포했다. 배포 ID: `6aadff380ac5214bfeaff3c9`.

공개 사이트에서 두 시스템 선택 메뉴, 수입 업무 82개, 업무 검색, 납입금정보관리 원문 이미지, 표시 클릭 후 다음 단계 이동을 확인했다. 검사한 공개 페이지의 브라우저 오류·경고 로그는 없었다.

[배포 기록](https://app.netlify.com/projects/singyro-seoul/deploys/6aadff380ac5214bfeaff3c9) · [수입관리 따라하기](https://singyro-seoul.netlify.app/#edufine-access?activity=income)
