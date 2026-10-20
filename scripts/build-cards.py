# -*- coding: utf-8 -*-
"""신규자 지식창고 초안(84장)을 앱의 Guide 데이터로 변환한다.

입력  : wiki/syntheses/신규 지식창고/서울시교육청_신규자_지식카드_초안.json
        wiki/syntheses/신규 지식창고/서울시교육청_신규자_지식창고_자료묶음_20260913.zip
        (INFO 카드 각주 복원용 research_parts/06_documents_civil_data.md)
출력  : src/knowledge-cards.ts
검증  : 자비스5 검증보고서(2026-09-13)의 High/Medium/Low 지적 중 수정문안이 있는 항목을
        본문에 치환 반영하고, 카드별 review 필드에 근거·수준을 남긴다.

실행  : python scripts/build-cards.py
"""
from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VAULT = ROOT.parents[1]
SRC_DIR = VAULT / "wiki" / "syntheses" / "신규 지식창고"
CARDS_JSON = SRC_DIR / "서울시교육청_신규자_지식카드_초안.json"
BUNDLE_ZIP = SRC_DIR / "서울시교육청_신규자_지식창고_자료묶음_20260913.zip"
OUT = ROOT / "src" / "knowledge-cards.ts"

AS_OF = "2026-09-13"
ORIGIN = "서울시교육청 신규자 지식창고 탑재자료 초안(2026-09-13) · 자비스5 검증 반영"
DRAFT_CAUTION = (
    "이 카드는 2026-09-13 조사 초안이며 소관부서 실무검토를 거치지 않았습니다. "
    "법령·금액·기한·시스템 메뉴·연락처는 처리 시점의 현행 원문과 소속기관 안내로 다시 확인하세요. "
    "「내부확인 필요」 항목은 기관 최신 공문 확인 전 미검증입니다."
)

# ---------------------------------------------------------------- 분야·대상 매핑
CATEGORY: dict[str, str] = {}
for i in range(1, 10):
    CATEGORY[f"start-{i:03d}"] = "start"
CATEGORY["start-008"] = "systems"
for i in range(1, 21):
    CATEGORY[f"hr-{i:03d}"] = "service"
for i in (3, 4, 5, 8, 13, 14, 20):
    CATEGORY[f"hr-{i:03d}"] = "payroll"
for i in range(1, 23):
    CATEGORY[f"fin-{i:03d}"] = "budget"
CATEGORY["fin-003"] = "systems"
for i in (15, 16, 17, 18):
    CATEGORY[f"fin-{i:03d}"] = "contract"
for i in range(1, 21):
    CATEGORY[f"sch-{i:03d}"] = "school"
for i in (2, 3, 4, 5, 6, 7):
    CATEGORY[f"sch-{i:03d}"] = "contract"
CATEGORY["sch-020"] = "documents"
for i in range(1, 14):
    CATEGORY[f"info-{i:03d}"] = "documents"

SCHOOL_ONLY = {"fin-005", "fin-008", "sch-012", "sch-013", "sch-014", "sch-015", "sch-016", "sch-019"}

# ---------------------------------------------------------------- INFO 카드 각주(06_documents_civil_data.md Sources)
FOOTNOTE_TITLES = {
    1: "행정안전부 「2025 행정업무운영 편람」",
    2: "행정업무의 운영 및 혁신에 관한 규정",
    3: "국가기록원 「2026년 기록물관리 지침」",
    4: "공공기록물 관리에 관한 법률",
    5: "공공기관의 정보공개에 관한 법률",
    6: "열린서울교육(서울특별시교육청 정보공개)",
    7: "민원 처리에 관한 법률",
    8: "민원 처리에 관한 법률 시행령",
    9: "국민신문고 이용안내",
    10: "교육부 「학교민원 처리 매뉴얼」 게시물",
    11: "초·중등교육법",
    12: "교원의 지위 향상 및 교육활동 보호를 위한 특별법",
    13: "개인정보 보호법",
    14: "서울특별시교육청 개인정보보호 도움자료",
    15: "서울특별시교육청 정보보안 자료",
    16: "행정안전부 정보보안 기본지침(행정규칙)",
    17: "인공지능 및 데이터 기반 행정 활성화에 관한 법률",
    18: "행정안전부 「2026 공공부문 AI 도입·활용 가이드」",
    19: "개인정보보호위원회 생성형 AI 개인정보 안내",
    20: "교육부 교육분야 AI 윤리원칙",
    21: "서울교육 소식 — 언론홍보 실무 매뉴얼 「언론아 반갑다」",
    22: "지방자치법",
}

# ---------------------------------------------------------------- 공통 추가 출처
SRC_HR_PLAN = {
    "title": "2026년 일반직공무원 인사운영 기본계획(서울특별시교육청 총무과)",
    "url": "https://baro.sen.go.kr/fus/MI000000000000000022/board/BO00000004/CD100102/view0010v.do?board_seq=131203",
    "note": "자비스5 01-M-4: 연도별 인사 수치는 이 기본계획의 해당 절·쪽을 직접 확인한다. 교육행정지원시스템(BARO) 게시물.",
}
SRC_SCHOOL_RULE = {
    "title": "서울특별시 공립학교회계 규칙",
    "url": "https://www.law.go.kr/자치법규/서울특별시공립학교회계규칙",
    "note": "자비스5 03-H-1: 기준일 현재 현행 규칙은 2016. 11. 14. 타법개정, 서울특별시교육규칙 제939호. 2026. 8. 6. 일부개정규칙안은 입법예고 단계이므로 현행 규칙으로 적용하지 않는다.",
}
SRC_PROPERTY_ORD = {
    "title": "서울특별시교육비특별회계 소관 공유재산 관리 조례",
    "url": "https://www.law.go.kr/자치법규/서울특별시교육비특별회계소관공유재산관리조례",
    "note": "자비스5 03-H-2: 기준일 현행본 2026. 1. 8. 일부개정, 서울특별시조례 제9919호. 관련 시행규칙 제명·현행 여부는 미검증.",
}
SRC_RECORDS_ORD = {
    "title": "서울특별시교육청 기록물 관리에 관한 조례",
    "url": "https://www.law.go.kr/자치법규/서울특별시교육청기록물관리에관한조례",
    "note": "자비스5 03-H-3: [시행 2026. 1. 8.] [서울특별시조례 제9912호, 2026. 1. 8., 제정]. 공공기록물법령·기록관리기준표·당해 연도 지침과 함께 확인.",
}
SRC_EDU_FACILITY_ACT = {
    "title": "교육시설 등의 안전 및 유지관리 등에 관한 법률",
    "url": "https://www.law.go.kr/법령/교육시설등의안전및유지관리등에관한법률",
    "note": "제13조(연 2회 이상 안전점검·결과보고서 제출·보존)·제14조(정밀안전진단). 자비스5 02-H-05 반영.",
}
SRC_OSH_ACT = {
    "title": "산업안전보건법",
    "url": "https://www.law.go.kr/법령/산업안전보건법",
    "note": "제2조(사업주·도급인·건설공사발주자), 제15조·제16조(안전보건관리책임자·관리감독자), 제36조, 제61조·제63조·제64조. 자비스5 02-H-06·H-07 반영.",
}
SRC_PIPA_34 = {
    "title": "개인정보 보호법 제34조·시행령 제39조·제40조(유출 통지·신고)",
    "url": "https://www.law.go.kr/법령/개인정보보호법",
    "note": "자비스5 03-H-4: 유출을 알게 된 때부터 72시간 이내 정보주체 통지·감독기관 신고 판단. 신고 대상 규모·유형은 사고 발생일 현재 시행령으로 확인.",
}
SRC_CIVIL_23 = {
    "title": "민원 처리에 관한 법률 제23조(반복 및 중복 민원의 처리)",
    "url": "https://www.law.go.kr/법령/민원처리에관한법률",
    "note": "자비스5 03-M-1: 법정민원 제외, 동일 내용, 정당한 사유 없이 3회 이상, 앞선 2회 이상 결과 통지 후 종결 가능.",
}
SRC_LOCAL_FIN_45 = {
    "title": "지방재정법 제45조(예산 성립 전 사용)",
    "url": "https://www.law.go.kr/법령/지방재정법",
    "note": "자비스5 02-H-01: 시·도는 국가로부터 용도가 지정되고 소요 전액이 교부된 경비, 국가로부터 확정·통보된 재난구호·복구 경비에 한한다.",
}
SRC_EDU_BUDGET_STD = {
    "title": "지방자치단체 교육비특별회계 세출예산 집행기준(교육부 행정규칙)",
    "url": "https://www.law.go.kr/행정규칙/지방자치단체교육비특별회계세출예산집행기준",
    "note": "제2편 지방교육행정기관 구매카드 발급 및 사용기준. 자비스5 02-H-02 반영. 행정규칙 제명 검색으로 현행본을 확인한다.",
}
SRC_PUBLIC_PROPERTY_44 = {
    "title": "공유재산 및 물품 관리법 제44조(실태조사)",
    "url": "https://www.law.go.kr/법령/공유재산및물품관리법",
    "note": "자비스5 02-M-04: 실태조사·보고 주체는 재산관리관.",
}
SRC_ELEM_32 = {
    "title": "초·중등교육법 제32조(학교운영위원회의 기능)",
    "url": "https://www.law.go.kr/법령/초ㆍ중등교육법",
    "note": "자비스5 02-M-05: 심의(공립), 사립학교 학교헌장·학칙은 자문, 학교발전기금은 심의·의결.",
}
SRC_LOCAL_CONTRACT_25 = {
    "title": "지방자치단체를 당사자로 하는 계약에 관한 법률 시행령 제25조(수의계약)",
    "url": "https://www.law.go.kr/법령/지방자치단체를당사자로하는계약에관한법률시행령",
    "note": "자비스5 02-L-01: 수의계약 사유와 견적 기준은 시행령과 최신 「지방자치단체 입찰 및 계약집행기준」 원문으로 확인.",
}
SRC_DEV_FUND = {
    "title": "2025년 서울특별시 학교발전기금의 조성·운용 및 회계관리요령",
    "url": "https://baro.sen.go.kr/fus/MI000000000000000021/board/BO00000004/CD100102/list0010v.do",
    "note": "서울특별시교육청 예산담당관 게시자료(BARO 학교업무지침). 2026년 이후 개정본·정오표 게시 여부를 운영 전 재확인. 자비스5 02-H-08·H-09 반영.",
}
SRC_AI_ACT = {
    "title": "인공지능 및 데이터 기반 행정 활성화에 관한 법률",
    "url": "https://www.law.go.kr/법령/인공지능및데이터기반행정활성화에관한법률",
    "note": "[시행 2026. 8. 28.] [법률 제21392호, 2026. 2. 27., 일부개정]. 자비스5 03-H-5 확인.",
}

# ---------------------------------------------------------------- 자비스5 지적 반영표
# old/new 가 있으면 본문 치환, 없으면 검토 메모만 남긴다. old 는 반드시 본문에 1회 존재해야 한다.
FIXES: list[dict] = [
    # ---- 01 온보딩·인사
    {
        "id": "start-003", "ref": "자비스5 01-H-2", "level": "high",
        "old": "4. **도서관·평생학습관 21개(누리집 별도 분류):** 평생학습관 4개와 공공도서관 17개로 표시된다.",
        "new": "4. **도서관·평생학습관 21개(누리집 별도 분류):** 평생학습관 4개와 공공도서관 17개로 표시된다. 조직도 페이지 표기 기준일은 2025-07-24이므로, 위 기관 수와 명칭은 2026년 실제 사용 전 현행 행정기구 설치 조례·시행규칙과 재대조한다.",
        "note": "2026-09-13 현재 행정기구 설치 조례·시행규칙과의 최종 대조가 끝나지 않았다. 직속기관 8개·도서관/평생학습관 21개는 누리집 분류 기준의 표시값이며 확정값이 아니다.",
    },
    {"id": "start-004", "ref": "자비스5 01-H-2(연관)", "level": "medium", "note": "기관별 대표업무 표와 법적 권한 배분은 항목별로 검증되지 않았다. 조직체계 카드와 함께 현행 조례·시행규칙으로 재확인한다."},
    {"id": "start-009", "ref": "자비스5 01-H-2(연관)", "level": "low", "note": "서울교육콜센터 02-1396 운영시간, EVPN 상세 문의 경로, 긴급사고 기관별 보고체계는 미검증."},
    {"id": "start-002", "ref": "자비스5 01-L-1", "level": "low", "note": "단계형 절차는 신규자 누락 방지용 실무 권고안이며, 법정 또는 기관 공통 의무 절차로 검증된 문안이 아니다."},
    {"id": "start-005", "ref": "자비스5 01-L-1", "level": "low", "note": "7개 업무범주는 편집상 분류이며 공식 분류로 검증되지 않았다. 기관별 책임 경계는 업무분장·위임전결로 확인."},
    {"id": "start-007", "ref": "자비스5 01-L-1", "level": "low", "note": "8개 인수인계 묶음과 첫 2주 갱신 등은 권고안이며 공식 근거로 검증되지 않았다."},
    {"id": "start-006", "ref": "자비스5 01-§3", "level": "medium", "note": "월별 표는 확정 기한이 아닌 일반 흐름이다. 학교회계연도 조문·2026학년도 수정지침 게시일·월별 항목의 정확성은 미검증."},
    {
        "id": "hr-005", "ref": "자비스5 01-M-1", "level": "medium",
        "old": "- **적용범위:** 지방공무원에게 준용되는 전국 기준과 서울교육청 예산집행 기준. 교통수단·증빙·마감일은 내부확인.",
        "new": "- **적용범위:** 출장은 사전 명령 후 처리하며, 여비 항목과 정산은 실제 처리일에 적용되는 「공무원 여비 규정」 및 서울교육청·소속기관의 해당 연도 집행기준을 확인한다. 교통수단·증빙·마감일은 내부확인.",
        "note": "국가공무원용 예규의 지방공무원 직접 적용 여부가 확인되지 않았다. 서울교육청 지방공무원용 여비 조례·집행기준 원문으로 교체가 필요하다.",
    },
    {
        "id": "hr-014", "ref": "자비스5 01-M-2", "level": "medium",
        "old": "2023 지침 URL은 제도 확인용이며 2026 배정액·청구기한은 최신 공문 내부확인.",
        "new": "제도 근거만 확인됨. 2026년 포인트, 필수보험, 사용·청구기한은 해당 연도 서울교육청 시행공문 확인 전 미검증.",
        "note": "2026년 배정액·필수보험·사용기간·청구마감을 검증한 근거가 없다. 시행공문 확보 전 수치·기한을 확정값으로 보지 않는다.",
    },
    {
        "id": "hr-017", "ref": "자비스5 01-M-3", "level": "medium",
        "old": "- **적용범위:** 전국 공직자 법정의무 + 서울특별시교육청 공무원 행동강령·내부 신고체계.",
        "new": "- **적용범위:** 전국 공통 법정의무(청탁금지법·공무원 행동강령)는 확인됨. 서울교육청 내부 신고 경로와 담당자는 소속기관 최신 안내 확인 전 미검증.",
        "note": "서울교육청 고유 신고 절차·담당 연락처의 최종 대조 결과가 없다. 행동강령·내부 신고 안내의 정확한 조문·페이지 연결이 필요하다.",
    },
    {"id": "hr-001", "ref": "자비스5 01-M-4", "level": "medium", "note": "근거가 목록형 공지 URL이다. 「2026년 일반직공무원 인사운영 기본계획」 해당 절·쪽을 직접 확인한다(출처 추가).", "add_sources": [SRC_HR_PLAN]},
    {"id": "hr-009", "ref": "자비스5 01-M-4", "level": "medium", "note": "80시간·24시간·14시간 등 연도별 수치는 인사운영 기본계획의 해당 절·쪽으로 추적한다. 신규·휴직·파견자 환산시간은 미검증.", "add_sources": [SRC_HR_PLAN]},
    {"id": "hr-010", "ref": "자비스5 01-M-4", "level": "medium", "note": "승진후보자명부 공개시기·평정점 반영기간은 기본계획에서 확인됨. 2027년 예고사항·세부평정계획은 별도.", "add_sources": [SRC_HR_PLAN]},
    {"id": "hr-011", "ref": "자비스5 01-M-4", "level": "medium", "note": "직렬별 결원·배수·실제 승진 인원과 반기별 시행내용은 미검증.", "add_sources": [SRC_HR_PLAN]},
    {"id": "hr-012", "ref": "자비스5 01-M-4", "level": "medium", "note": "‘2년 주기’의 정확한 적용조건과 반기별 대상 기준일·제출기한은 미검증. 4년 미만 순환전보·1년 유예·행정청 범위는 기본계획에서 확인됨.", "add_sources": [SRC_HR_PLAN]},
    {"id": "hr-015", "ref": "자비스5 01-M-4", "level": "medium", "note": "집중상담 기간, 온라인 청구와 공문 처리 절차의 전체 흐름은 미검증.", "add_sources": [SRC_HR_PLAN]},
    {"id": "hr-016", "ref": "자비스5 01-M-4", "level": "medium", "note": "2026년 계약기관·비용·신청채널·회차 조정조건은 미검증.", "add_sources": [SRC_HR_PLAN]},
    {"id": "hr-020", "ref": "자비스5 01-M-4", "level": "medium", "note": "학교 개인별 차등·행정청 개인/부서 차등 병용의 원문 위치, 대상 기준일·이의기간·지급일은 미검증.", "add_sources": [SRC_HR_PLAN]},
    # ---- 02 예산·회계·학교
    {
        "id": "fin-007", "ref": "자비스5 02-H-01", "level": "high",
        "old": "- **한줄답:** 용도가 지정되고 소요경비 전액이 교부된 경비 등 법정 요건을 충족할 때만 먼저 쓰고 차기 추경에 명시해 계상한다.",
        "new": "- **한줄답:** 교육비특별회계의 성립 전 사용은 「지방재정법」 제45조에 따라 ① 국가로부터 용도가 지정되고 소요 전액이 교부된 경비 또는 ② 국가로부터 재난구호·복구계획이 확정·통보된 소요경비에 한한다. 같은 회계연도의 차기 추가경정예산에 반드시 계상하며, 내부 승인·예산배정·집행 절차는 해당 연도 교육청 지침과 위임전결규정을 따른다. 교부 주체가 국가인지 먼저 확인한다.",
        "note": "원문은 재원 범위를 ‘교부된 경비 등’으로 넓게 써서 서울시·민간 교부금도 성립 전 사용이 가능한 것처럼 읽혔다. 지방재정법 제45조 제1호·제2호 요건으로 교체했다.",
        "add_sources": [SRC_LOCAL_FIN_45],
    },
    {
        "id": "fin-011", "ref": "자비스5 02-H-02", "level": "high",
        "old": "「지방자치단체 회계관리에 관한 훈령」의 신용카드 사용절차",
        "new": "「지방자치단체 교육비특별회계 세출예산 집행기준」 제2편(구매카드 발급·사용기준)과 서울시교육청 구매카드 관리지침(교육비특별회계), 「서울특별시 공립학교회계 규칙」과 해당 학년도 학교회계 지침(학교회계)",
        "old2": "지출결의·반납 처리한다.",
        "new2": "적법한 지출결의를 거쳐 카드대금을 지급하고 취소·환불을 대사한다. 카드한도는 예산·품의·계약 권한을 대신하지 않는다.",
        "note": "일반 지방자치단체용 훈령 하나로 양 회계를 묶었던 근거를 회계별 직접 근거로 교체했다. ‘반납 처리’는 의미가 불명확해 ‘카드대금 지급 및 취소·환불 대사’로 바꿨다.",
        "add_sources": [SRC_EDU_BUDGET_STD, SRC_SCHOOL_RULE],
    },
    {
        "id": "fin-013", "ref": "자비스5 02-H-03", "level": "high",
        "old": "- **적용범위:** 국고·지방보조사업, 교육청 목적지정 전입금·지원금.",
        "new": "- **적용범위:** 먼저 교부결정서와 세입 재원의 법적 성격을 확인한다. 지방보조사업에는 「지방자치단체 보조금 관리에 관한 법률」과 교부조건을, 교육청 목적사업비전입금·지원금에는 「초·중등교육법」 제30조의2, 공립학교회계 규칙, 해당 학년도 학교회계 지침 및 교부공문을 적용한다. 정산, 이자·잔액 반납, 사업기간과 목적 외 사용 제한은 각 재원별 근거와 교부조건에 따라 처리하며, K-에듀파인 세입과목을 먼저 확인한다.",
        "note": "학교회계 목적사업비전입금·지원금은 모두 지방보조금이 아니다. 재원별 근거를 분리했다.",
        "add_sources": [SRC_SCHOOL_RULE],
    },
    {
        "id": "fin-020", "ref": "자비스5 02-H-04", "level": "high",
        "old": "→ 심의·승인 → 공개·보관한다. 학교장은 회계연도 종료 후 2개월 이내 결산서를 학교운영위원회에 제출한다.",
        "new": "→ 심의·승인 → 공개·보관한다. (학교회계) 2월 말 종료 후 20일에 출납을 폐쇄·정리하고, 학교장이 종료 후 2개월 이내 결산서를 학교운영위원회에 제출하며, 운영위원회는 종료 후 3개월 이내 심의결과를 학교장에게 통보하고, 학교장은 통보일부터 10일 이내 공개한다. (교육비특별회계) 「지방회계법」·「지방자치법」과 해당 연도 결산지침에 따라 교육감 작성, 지방의회 승인 절차를 별도로 적용한다.",
        "note": "교육비특별회계 결산(교육감 작성·지방의회 승인)과 학교회계 결산(운영위원회 심의) 절차가 한 문장에 섞여 있어 회계별로 분리했다.",
        "add_sources": [SRC_SCHOOL_RULE],
    },
    {
        "id": "sch-008", "ref": "자비스5 02-H-05", "level": "high",
        "old": "사고대응, 재발방지를 묶어 학교장이 총괄한다.",
        "new": "사고대응, 재발방지를 묶어 학교장이 총괄한다. 교육시설의 장은 「교육시설 등의 안전 및 유지관리 등에 관한 법률」 제13조와 안전점검등에 관한 지침에 따라 연 2회 이상 안전점검을 실시하고 결과보고서를 작성해 감독기관에 제출·법정기간 보존하며, 점검 결과 필요하면 제14조에 따른 정밀안전진단과 사용제한·보수 등 후속조치를 한다. 학교안전사고 예방계획·교육·훈련은 「학교안전사고 예방 및 보상에 관한 법률」 절차로 병행한다.",
        "note": "교육시설법상 연 2회 이상 안전점검·결과보고서 제출·보존 의무가 빠져 있어 추가했다. 연 2회 점검 일정과 보고서 제출을 확인란으로 관리한다.",
        "add_sources": [SRC_EDU_FACILITY_ACT],
    },
    {
        "id": "sch-010", "ref": "자비스5 02-H-06", "level": "high",
        "old": "학교장은 관리 책임을 이행하고 담당자는 위험성평가·교육·건강조치의 증빙을 관리한다.",
        "new": "산업안전보건법상 의무주체는 근로자를 사용하는 사업주이며, 학교장의 안전보건관리책임자·관리감독자 해당 여부와 권한은 법정 요건 및 서울시교육청의 최신 안전보건관리체계·지정 문서로 확인한다. 학교는 지정된 역할에 따라 위험성평가, 교육, 보호구, 건강진단, 사고조사·개선 조치를 수행·증빙하되, 담당자 지정이 사업주의 법정 책임을 대체하지 않는다.",
        "old2": "교원 업무가 아니라 사용자·관리감독·안전보건 조직의 공동 책무.",
        "new2": "교원 업무가 아니라 사업주(교육감 소속 근로자는 서울시교육청 지정 체계)·안전보건관리책임자·관리감독자의 법정 역할에 따른 책무.",
        "note": "학교장을 일률적으로 사업주·안전보건관리책임자로 단정하던 문안을 삭제했다. 2026 서울교육 산업안전보건 기본계획·조직도 확인 후 배포한다.",
        "add_sources": [SRC_OSH_ACT],
    },
    {
        "id": "sch-011", "ref": "자비스5 02-H-07", "level": "high",
        "old": "- **한줄답**: 청소·시설·공사 용역을 외주화해도 학교의 현장 위험 조정·정보제공·출입통제 의무까지 사라지는 것은 아니다.",
        "new": "- **한줄답**: 계약마다 학교·교육청이 산업안전보건법상 사업주, 도급인 또는 건설공사발주자 중 어디에 해당하는지 먼저 판단한다. 도급인이고 관계수급인 근로자가 도급인의 사업장에서 작업하면 법 제63조·제64조의 안전보건조치와 협의체·순회점검·교육지원·혼재작업 확인·조정을 이행한다. 시공을 주도·총괄·관리하지 않는 건설공사발주자는 법 제2조상 도급인에서 제외되므로 발주자에게 적용되는 별도 안전의무와 계약조건을 확인하고, 관계수급인 근로자의 작업행동에 대한 직접 지시는 피한다.",
        "note": "모든 발주를 도급인으로 간주하던 문안을 ‘법적 지위 판정’ 우선으로 교체했다. 공사와 청소·시설관리 용역의 체크리스트는 분리해 운영한다.",
        "add_sources": [SRC_OSH_ACT],
    },
    {
        "id": "sch-015", "ref": "자비스5 02-H-08", "level": "high",
        "old": "① 운영위원장이 학교장과 협의·학부모 의견 수렴 ② 사용목적·조성방법·수입지출계획 수립 ③ 운영위원회 심의·의결 ④ 적법한 접수·영수증 ⑤ 접수내역 공개 ⑥ 목적에 맞게 집행.",
        "new": "① 금품을 기부금품·모금금품·자발적 조성금품으로 구분 ② 기부금품(기부자의 자유의사)은 언제든 접수할 수 있으나 사용 전 운용계획을 수립해 예·결산소위원회 검토와 운영위원회 심의·의결을 거침(요령상 즉시 집행 예외는 요건·사후보고·연도 내 계획변경 절차 확인) ③ 모금금품·자발적 조성금품은 운영위원장이 학교장과 협의하고 학부모 의견을 수렴해 운용계획을 수립한 뒤 운영위원회 심의·의결 후에만 조성 ④ 적법한 접수·영수증 ⑤ 접수내역 공개 ⑥ 목적에 맞게 집행. 교사·학생을 통한 안내문 배부와 계좌번호 기재는 금지.",
        "note": "모금·자발적 조성 절차를 기부금품 접수에도 적용하던 문안을 세 유형별 흐름으로 분리했다.",
        "add_sources": [SRC_DEV_FUND],
    },
    {
        "id": "sch-016", "ref": "자비스5 02-H-09", "level": "high",
        "old": "⑦ 필요 시 학교장에게 관리업무 위탁하되 책임·절차 문서화.",
        "new": "⑦ 발전기금회계 출납명령기관은 학교운영위원장, 출납원은 학교회계출납원이며 회계연도(3월 1일~다음 해 2월 말) 종료 후 20일에 출납을 폐쇄하고, 결산은 종료 후 3개월 이내 운영위원회 심의·의결을 거쳐 관할청에 보고·공개한다 ⑧ 운영위원회는 본질적 권한을 위탁할 수 없고 심의·의결로 구체적 범위를 정한 부수업무 일부만 학교장에게 위탁하며, 위탁받은 학교장은 집행계획과 집행내역을 매 분기 운영위원회에 서면 보고한다.",
        "note": "위탁 범위·분기 보고·출납폐쇄·결산기한(종료 후 3개월)이 빠져 있어 요령의 문안으로 보완했다.",
        "add_sources": [SRC_DEV_FUND],
    },
    {
        "id": "fin-002", "ref": "자비스5 02-M-01", "level": "medium",
        "old": "- **한줄답:** 교육비특별회계는 1월 1일~12월 31일, 학교회계는 3월 1일~다음 해 2월 말이다.",
        "new": "- **한줄답:** 교육비특별회계 회계연도는 1월 1일~12월 31일이다. 학교회계는 3월 1일~다음 해 2월 말이며, 출납은 종료 후 20일에 폐쇄한다. 출납폐쇄정리 기간에는 회계연도 안에 이루어진 징수행위·지출원인행위의 수납·지출만 정리하고, 2월 말 이후 새 추경·이전용·신규 지출원인행위는 하지 않는다.",
        "note": "학교회계 출납폐쇄기한(종료 후 20일)의 의미를 분리 표기했다.",
    },
    {
        "id": "fin-010", "ref": "자비스5 02-M-02", "level": "medium",
        "old": "해당 연도 지방자치단체 회계관리에 관한 훈령.",
        "new": "교육비특별회계는 지방회계법령·교육비특별회계 집행기준, 학교회계는 「초·중등교육법」·「서울특별시 공립학교회계 규칙」·해당 학년도 학교회계 지침을 적용한다. 품의·계약·검사·출납 권한자는 최신 회계관직 지정 및 위임전결규정으로 확인한다.",
        "note": "회계별 직접 근거와 회계관직을 분리 표기했다. ‘지출원’ 표현은 기관별 지정 회계관직과 일치하는지 확인이 필요하다.",
        "add_sources": [SRC_SCHOOL_RULE],
    },
    {
        "id": "fin-012", "ref": "자비스5 02-M-03", "level": "medium",
        "old": "기준과 한도 안에서 집행하고 상대방·목적을 남긴다.",
        "new": "기준과 한도 안에서 집행하고 상대방·목적을 남긴다. 2026학년도 서울 공립학교 학교회계 업무추진비는 지침상 원칙적으로 1인당 40,000원 이내(연회비·선물비 등은 별도 기준)이며, 교육비특별회계는 학교회계 금액을 준용하지 말고 해당 연도 세출예산 집행기준을 별도로 확인한다.",
        "note": "2026 학교회계 지침의 1인당 40,000원 한도와 적용 회계·연도를 표시했다. 연도가 바뀌면 갱신 대상이다.",
    },
    {
        "id": "fin-015", "ref": "자비스5 02-L-01", "level": "low",
        "old": "- **한줄답:** 계약금액·성격·시장조건에 따라 경쟁입찰·수의계약 등 방법을 정하고 수의계약을 위한 인위적 분할은 금지한다.",
        "new": "- **한줄답:** 추정가격을 산정한 뒤 지방계약법 시행령 제25조의 수의계약 사유와 최신 계약집행기준의 1인 견적·2인 이상 견적·견적제출 생략 기준을 원문으로 확인한다. 여성기업·장애인기업·사회적기업 등 상대방 특례는 자격증빙과 금액기준을 계약일 현재 다시 확인하고, 동일 목적 사업의 인위적 분할은 금지한다.",
        "note": "금액기준은 개정될 수 있어 고정값을 넣지 않았다. 시행령 제25조와 최신 예규를 직접 확인한다.",
        "add_sources": [SRC_LOCAL_CONTRACT_25],
    },
    {
        "id": "fin-022", "ref": "자비스5 02-L-02", "level": "low",
        "old": "인사발령 즉시, 최소 반기 1회 권한점검.",
        "new": "인사발령·휴직·퇴직·업무분장 변경 즉시 권한을 회수·변경하고, 정기 권한점검은 서울시교육청 및 기관의 최신 정보보안·K-에듀파인 권한관리 계획에서 정한 주기에 따른다.",
        "note": "‘최소 반기 1회’는 공식 원문에서 확인되지 않아 삭제했다.",
    },
    {
        "id": "sch-003", "ref": "자비스5 02-M-04", "level": "medium",
        "old": "교육행정직 주관, 시설담당·사용부서가 현황 확인 협조.",
        "new": "법정 실태조사·보고 주체는 지정된 재산관리관(「공유재산 및 물품 관리법」 제44조제2항)이며, 교육행정직은 업무분장과 위임 범위에서 조사·대장정비 실무를 수행하고 시설·사용부서는 현황 확인에 협조한다. 최종 결재·보고 권한은 재산관리관 지정 및 사무위임 규정으로 확인한다.",
        "note": "‘교육행정직 주관’을 ‘지정 재산관리관 주관’으로 교체했다.",
        "add_sources": [SRC_PUBLIC_PROPERTY_44, SRC_PROPERTY_ORD],
    },
    {"id": "sch-002", "ref": "자비스5 03-H-2", "level": "medium", "note": "적용 조례의 정확한 제명은 「서울특별시교육비특별회계 소관 공유재산 관리 조례」(2026. 1. 8. 일부개정, 조례 제9919호)다. 개별 처분 전 본문·별표와 권한위임 규정을 대조한다.", "add_sources": [SRC_PROPERTY_ORD]},
    {
        "id": "sch-014", "ref": "자비스5 02-M-05", "level": "medium",
        "old": "운영위원회는 학교 운영의 법정 심의·자문기구이며,",
        "new": "운영위원회는 「초·중등교육법」 제32조의 사항을 심의하는 기구(사립학교의 학교헌장·학칙 제·개정은 자문, 공모교장·초빙교사 사항은 사립학교 심의대상에서 제외, 학교발전기금 조성·운용·사용은 심의·의결)이며,",
        "note": "‘심의·자문기구’ 병기를 학교유형·안건별 권한으로 교체했다. 추가 심의사항은 서울시 조례·학교법인 정관으로 확인한다.",
        "add_sources": [SRC_ELEM_32],
    },
    # ---- 03 법령·정보
    {"id": "info-003", "ref": "자비스5 03-H-3", "level": "high", "note": "2026년 제정 「서울특별시교육청 기록물 관리에 관한 조례」가 근거에서 빠져 있었다(출처 추가). 기록관리기준표만 내부 지침으로 이해하지 않도록 조례를 함께 본다.", "add_sources": [SRC_RECORDS_ORD]},
    {
        "id": "info-008", "ref": "자비스5 03-H-4", "level": "high",
        "old": "7. **유출 의심 시**: 혼자 삭제·회수로 끝내지 말고 즉시 기관 개인정보 담당자·관리자에게 보고해 차단, 영향 확인, 통지·신고 여부를 판단한다.[13][14]",
        "new": "7. **유출 의심 시**: 혼자 삭제·회수로 끝내지 말고 즉시 기관 개인정보 담당자·관리자에게 보고해 차단, 영향 확인, 통지·신고 여부를 판단한다.[13][14]\n8. **72시간 통지·신고 판단**: 유출 사실을 알게 된 때부터 72시간 이내에 정보주체(14세 미만 아동은 법정대리인) 통지 대상·내용(유출 항목, 시점과 경위, 피해 최소화 방법, 대응·구제절차, 담당부서 연락처)을 판단하고, 법령상 신고 대상이면 같은 기한 내 개인정보보호위원회 또는 한국인터넷진흥원에 신고한다. 구체적 신고 요건과 예외는 사고 발생일 현재 「개인정보 보호법」 제34조·시행령 제39조·제40조와 서울교육청 최신 도움자료로 확인한다.[13][14]",
        "note": "정보주체 통지의 72시간 기준과 감독기관 신고 판단 단계가 없어 추가했다. 신고 대상 규모·정보 유형의 숫자는 임의로 기재하지 않았다.",
        "add_sources": [SRC_PIPA_34],
    },
    {
        "id": "info-009", "ref": "자비스5 03-H-4(연관)", "level": "medium",
        "old": "- 잘못 보냈다면 회수 성공 여부와 관계없이 즉시 유출 대응 절차를 시작한다.[13][14]",
        "new": "- 잘못 보냈다면 회수 성공 여부와 관계없이 즉시 유출 대응 절차를 시작한다. 정보주체 통지(72시간 이내)와 신고 판단은 「개인정보보호」 카드의 절차를 따른다.[13][14]",
        "note": "잘못 발송된 학생·학부모 정보는 회수 시도만으로 종결할 수 없다. 72시간 통지·신고 판단으로 연결했다.",
        "add_sources": [SRC_PIPA_34],
    },
    {
        "id": "__repeat__", "ref": "자비스5 03-M-1", "level": "medium",
        "old": "법정 요건, 이전 통지 횟수, 민원조정위원회 등 기관 절차를 확인한 뒤 종결한다.",
        "new": "법정민원을 제외한 동일 내용의 민원이 정당한 사유 없이 3회 이상 제출되고 앞선 2회 이상 처리결과를 통지한 경우에 한해 「민원 처리에 관한 법률」 제23조와 기관 절차에 따라 이후 민원을 종결할 수 있다. 사안별 민원조정위원회 대상 여부는 별도로 확인한다.",
        "note": "반복민원 종결 요건(법정민원 제외·동일 내용·정당한 사유 없음·3회 이상·앞선 2회 결과 통지)을 구체화했다.",
        "add_sources": [SRC_CIVIL_23],
    },
    {
        "id": "info-010", "ref": "자비스5 03-M-3", "level": "medium",
        "old": "네트워크 연결 차단 여부를 내부 절차에 따라 판단한다.",
        "new": "네트워크 연결 차단 여부를 내부 절차에 따라 판단한다. 사안 발생 즉시 소속기관 관리자·정보보안 담당자에게 보고하고, 서울교육청 최신 정보보안 도움자료의 사이버침해사고 신고망과 보안관제센터 연계 절차를 따른다. 개인정보가 포함되면 개인정보 유출 대응을 동시에 개시한다.",
        "note": "사이버침해사고의 기관 내부 보고 경로와 보안관제센터 연계 절차를 추가했다.",
    },
    {"id": "info-011", "ref": "자비스5 03-H-5", "level": "low", "note": "「인공지능 및 데이터 기반 행정 활성화에 관한 법률」 [시행 2026. 8. 28.]은 검증에서 제명·시행일이 확인됐다(출처 추가).", "add_sources": [SRC_AI_ACT]},
    {"id": "info-004", "ref": "자비스5 03-L-1", "level": "low", "note": "정보공개 처리기한(10일, 10일 범위 연장)은 맞다. 기산일과 연장 통지 방식은 보강이 필요하다."},
]

# ---------------------------------------------------------------- 유틸
URL_RE = re.compile(r"https?://[^\s)>\]]+")
MDLINK_RE = re.compile(r"\[([^\]]+)\]\((https?://[^)\s]+)\)")
CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫"


def plain(text: str) -> str:
    text = MDLINK_RE.sub(r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    return re.sub(r"\s+", " ", text).strip()


def strip_bullet(line: str) -> str:
    return re.sub(r"^\s*(?:[-*]|\d+\.)\s+", "", line).strip()


def split_steps(text: str) -> list[str]:
    text = plain(text)
    if sum(text.count(ch) for ch in CIRCLED) >= 2:
        parts = re.split(r"\s*[" + CIRCLED + r"]\s*", text)
        return [p.strip(" .;") for p in parts if p.strip(" .;")]
    if text.count("→") >= 2:
        return [p.strip(" .;") for p in text.split("→") if p.strip(" .;")]
    if text.count(";") >= 1:
        return [p.strip(" .") for p in text.split(";") if p.strip(" .")]
    return [text]


def parse_source_line(line: str) -> dict | None:
    m = URL_RE.search(line)
    if not m:
        return None
    url = m.group(0).rstrip(".,;")
    rest = plain(line.replace(m.group(0), "")).strip(" :-")
    quoted = re.search(r"「([^」]+)」", rest)
    title = quoted.group(1) if quoted else (rest[:80] or url)
    note = rest if quoted else ""
    if "edufine.go.kr" in url:
        note = (note + " " if note else "") + "K-에듀파인 주소는 자동 접속이 실패했습니다(자비스5 E-06). 내부망 전용 또는 공식 접속경로를 소관부서에서 확인하세요."
    return {"title": title, "url": url, "note": note}


def dedupe_sources(items: list[dict]) -> list[dict]:
    seen, out = set(), []
    for s in items:
        key = s["url"]
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
    return out


# ---------------------------------------------------------------- 형식별 파서
def parse_format_a(body: str) -> dict:
    """start-*: `**한줄답**` 같은 굵은 제목줄로 절이 나뉜다."""
    sections: dict[str, list[str]] = {}
    current = None
    for line in body.split("\n"):
        m = re.match(r"^\*\*([^*]+)\*\*\s*$", line.strip())
        if m:
            current = m.group(1).strip()
            sections[current] = []
            continue
        if current is not None:
            sections[current].append(line)
    text = {k: "\n".join(v).strip() for k, v in sections.items()}
    steps = [plain(strip_bullet(l)) for l in text.get("상세절차", "").split("\n") if re.match(r"^\s*\d+\.", l)]
    contact_lines = [plain(strip_bullet(l)) for l in text.get("문의처", "").split("\n") if l.strip().startswith("-")]
    sources = [s for s in (parse_source_line(l) for l in text.get("근거", "").split("\n") if l.strip().startswith("-")) if s]
    body_lines = []
    skip = False
    for line in body.split("\n"):
        m = re.match(r"^\*\*([^*]+)\*\*\s*$", line.strip())
        if m:
            skip = m.group(1).strip() == "근거"
        if not skip:
            body_lines.append(line)
    return {
        "summary": plain(text.get("한줄답", "")),
        "steps": steps,
        "contact": contact_lines[0] if contact_lines else "",
        "sources": sources,
        "scope": plain(text.get("적용범위", "")),
        "refresh": plain(text.get("갱신주기", "")),
        "labels": [],
        "body": "\n".join(body_lines),
    }


BULLET_RE = re.compile(r"^-\s+\*\*([^*]+?)\*\*:?\s*(.*)$")


def parse_format_b(body: str) -> dict:
    """hr-/fin-/sch-*: `- **한줄답:** …` 한 줄 항목 목록."""
    fields: dict[str, str] = {}
    keep_lines = []
    for line in body.split("\n"):
        m = BULLET_RE.match(line.strip())
        if not m:
            keep_lines.append(line)
            continue
        label = m.group(1).strip().rstrip(":")
        value = m.group(2).strip()
        fields[label] = value
        if label == "라벨" or label.startswith("근거") or label.startswith("공식 근거"):
            continue
        keep_lines.append(line)
    summary = fields.get("한줄답", "")
    steps = split_steps(fields.get("절차·핵심", ""))
    contact = plain(fields.get("문의처", ""))
    src_text = next((v for k, v in fields.items() if k.startswith("근거") or k.startswith("공식 근거")), "")
    sources = [{"title": t.strip("「」"), "url": u.rstrip(".,;"), "note": ""} for t, u in MDLINK_RE.findall(src_text)]
    if "edufine.go.kr" in src_text:
        for s in sources:
            if "edufine.go.kr" in s["url"]:
                s["note"] = "K-에듀파인 주소는 자동 접속이 실패했습니다(자비스5 E-06). 내부망 전용 또는 공식 접속경로를 소관부서에서 확인하세요."
    labels = re.findall(r"\[([^\]]+)\]", fields.get("라벨", ""))
    return {
        "summary": plain(summary),
        "steps": steps,
        "contact": contact,
        "sources": sources,
        "scope": plain(fields.get("적용범위", "")),
        "refresh": plain(fields.get("갱신주기", "")),
        "labels": labels,
        "body": "\n".join(keep_lines),
    }


def parse_format_c(body: str, footnotes: dict[int, str]) -> dict:
    """info-*: `### 한 문장 핵심` 등 소제목 절."""
    sections: dict[str, list[str]] = {}
    order: list[str] = []
    current = None
    for line in body.split("\n"):
        m = re.match(r"^###\s+(.+)$", line.strip())
        if m:
            current = m.group(1).strip()
            sections[current] = []
            order.append(current)
            continue
        if current is not None:
            sections[current].append(line)
    text = {k: "\n".join(v).strip() for k, v in sections.items()}
    summary = plain(text.get("한 문장 핵심", "").split("\n")[0])
    steps: list[str] = []
    for name in order[1:]:
        items = [plain(strip_bullet(l)) for l in text[name].split("\n") if re.match(r"^\s*(?:\d+\.|-)\s+", l) and not l.strip().startswith("- [ ]")]
        if items:
            steps = items
            break
    refs: list[int] = []
    for n in re.findall(r"\[(\d{1,2})\]", body):
        n = int(n)
        if n in footnotes and n not in refs:
            refs.append(n)
    sources = [{"title": FOOTNOTE_TITLES.get(n, f"출처 [{n}]"), "url": footnotes[n], "note": f"본문 각주 [{n}] · 확인 {AS_OF}"} for n in refs]
    return {
        "summary": summary,
        "steps": steps,
        "contact": "소속기관 해당 업무 담당자",
        "sources": sources,
        "scope": "",
        "refresh": "",
        "labels": [],
        "body": body,
    }


def load_footnotes() -> dict[int, str]:
    with zipfile.ZipFile(BUNDLE_ZIP) as zf:
        text = zf.read("final/research_parts/06_documents_civil_data.md").decode("utf-8")
    tail = text.split("## Sources", 1)[1]
    return {int(n): url for n, url in re.findall(r"^\[(\d+)\]\s+(\S+)", tail, re.M)}


# ---------------------------------------------------------------- 메인
def apply_fixes(cards: dict[str, dict]) -> dict[str, list[dict]]:
    """본문 치환 + review 메모. 반환: id → review 목록."""
    reviews: dict[str, list[dict]] = {cid: [] for cid in cards}
    extra_sources: dict[str, list[dict]] = {cid: [] for cid in cards}
    for fix in FIXES:
        target_ids = [fix["id"]]
        if fix["id"] == "__repeat__":
            target_ids = [cid for cid, c in cards.items() if fix["old"] in c["body_markdown"]]
            if not target_ids:
                sys.exit(f"FIX {fix['ref']}: 반복민원 문안을 어느 카드에서도 찾지 못함")
        for cid in target_ids:
            card = cards[cid]
            applied = False
            for old_key, new_key in (("old", "new"), ("old2", "new2")):
                if old_key not in fix:
                    continue
                old, new = fix[old_key], fix[new_key]
                count = card["body_markdown"].count(old)
                if count != 1:
                    sys.exit(f"FIX {fix['ref']} ({cid}): 원문 {count}회 발견 — 정확히 1회여야 함\n  {old}")
                card["body_markdown"] = card["body_markdown"].replace(old, new)
                applied = True
            reviews[cid].append({"level": fix["level"], "ref": fix["ref"], "note": fix["note"], "applied": applied})
            extra_sources[cid].extend(fix.get("add_sources", []))
    return reviews, extra_sources


def build() -> list[dict]:
    raw = json.loads(CARDS_JSON.read_text(encoding="utf-8"))
    cards = {c["id"]: dict(c) for c in raw}
    if len(cards) != 84:
        sys.exit(f"카드 수가 84가 아님: {len(cards)}")
    footnotes = load_footnotes()
    reviews, extra_sources = apply_fixes(cards)

    out: list[dict] = []
    for c in raw:
        cid = c["id"]
        card = cards[cid]
        body = card["body_markdown"].rstrip()
        body = re.sub(r"\n-{3,}\s*$", "", body).rstrip()
        if re.search(r"^\*\*한줄답\*\*\s*$", body, re.M):
            parsed = parse_format_a(body)
        elif "### 한 문장 핵심" in body:
            parsed = parse_format_c(body, footnotes)
        else:
            parsed = parse_format_b(body)
        summary = plain((card.get("summary") or "").strip().lstrip(": ")) or parsed["summary"]
        if not summary:
            sys.exit(f"{cid}: 요약을 만들지 못함")
        sources = dedupe_sources(parsed["sources"] + extra_sources[cid])
        if not sources:
            sys.exit(f"{cid}: 출처가 비어 있음")
        category = CATEGORY[cid]
        labels = parsed["labels"]
        if labels:
            # 자비스5 01-H-1: JSON 의 SEOUL_EDU 단일값 대신 원문 라벨을 범위 정보로 쓴다.
            pass
        tags = [c["category_label"], *labels, "지식카드"]
        caution = DRAFT_CAUTION
        if parsed["scope"]:
            caution = caution + " 적용범위: " + parsed["scope"]
        out.append({
            "id": cid,
            "category": category,
            "title": c["title"].strip(),
            "summary": summary,
            "status": "draft",
            "audience": "school" if cid in SCHOOL_ONLY else "all",
            "tags": tags,
            "steps": parsed["steps"] or [summary],
            "caution": caution,
            "contact": parsed["contact"] or "소속기관 해당 업무 담당자",
            "sources": sources,
            "updated": card.get("as_of") or AS_OF,
            "body": parsed["body"].strip(),
            "scope": parsed["scope"],
            "refresh": parsed["refresh"],
            "labels": labels,
            "review": reviews[cid],
            "origin": ORIGIN,
        })
    return out


def write_ts(cards: list[dict]) -> None:
    header = (
        "// 이 파일은 scripts/build-cards.py 가 생성합니다. 직접 고치지 마세요.\n"
        f"// 원본: wiki/syntheses/신규 지식창고/서울시교육청_신규자_지식카드_초안.json (기준일 {AS_OF})\n"
        "// 자비스5 검증보고서(2026-09-13)의 지적 중 수정문안이 있는 항목은 본문에 반영했고 review 필드에 남겼습니다.\n"
        'import type { Guide } from "./types";\n\n'
        "export const knowledgeCards: Guide[] = "
    )
    payload = json.dumps(cards, ensure_ascii=False, indent=2)
    OUT.write_text(header + payload + ";\n", encoding="utf-8", newline="\n")


def report(cards: list[dict]) -> None:
    from collections import Counter
    print(f"카드 {len(cards)}장 → {OUT.relative_to(ROOT)}")
    print("분야:", dict(Counter(c["category"] for c in cards)))
    print("대상:", dict(Counter(c["audience"] for c in cards)))
    print("빈 요약:", sum(1 for c in cards if not c["summary"]), "· 빈 출처:", sum(1 for c in cards if not c["sources"]))
    levels = Counter(r["level"] for c in cards for r in c["review"])
    applied = sum(1 for c in cards for r in c["review"] if r["applied"])
    print(f"검토 메모: {dict(levels)} · 본문 치환 적용 {applied}건 · 메모 있는 카드 {sum(1 for c in cards if c['review'])}장")
    print("라벨 있는 카드:", sum(1 for c in cards if c["labels"]))
    short = [c["id"] for c in cards if len(c["steps"]) < 2]
    print("단계 1개 이하 카드:", short)


if __name__ == "__main__":
    cards = build()
    write_ts(cards)
    report(cards)
