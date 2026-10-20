# -*- coding: utf-8 -*-
"""공식 자료·법령 목록(xlsx 조사표)을 public/manuals.json 에 반영한다.

입력  : wiki/syntheses/신규 지식창고/seoul-education-newcomer-resources_2026-09-13.xlsx
        (시트 자료목록 58건 · 법령근거 34건)
출력  : public/manuals.json — 기존 손수 등록한 항목(id 가 doc-/res-/law- 로 시작하지 않는 것)은 유지하고,
        생성 항목은 매번 다시 만든다.

실행  : python scripts/build-manuals.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
VAULT = ROOT.parents[1]
XLSX = VAULT / "wiki" / "syntheses" / "신규 지식창고" / "seoul-education-newcomer-resources_2026-09-13.xlsx"
OUT = ROOT / "public" / "manuals.json"
ADDED = "2026-09-15"
GENERATED_PREFIX = ("doc-", "res-", "law-")

FIELD_CATEGORY = {
    "자료 허브": "start", "첫 출근·질문답변": "start", "조직·담당자": "start",
    "연수": "service", "연수자료": "service", "인사": "service", "인력관리": "service",
    "교육공무직": "school", "감사·교육공무직": "school",
    "교원 등 보수": "payroll", "감사·보수": "payroll",
    "학교회계 예산": "budget", "교육비특별회계": "budget", "목적사업비": "budget", "기금회계": "budget",
    "감사·지출": "budget", "교육경비 보조": "budget", "법규 개정 추적": "budget",
    "학교발전기금": "school", "학교운영위원회": "school", "학교통합지원": "school", "학교급식": "school",
    "유아학비": "school", "재난·안전": "school", "타시도·구조": "school",
    "계약": "contract", "시설·환경": "contract", "시설·사립학교": "contract",
    "감사": "documents", "일반행정": "documents", "기록물": "documents", "민원·정보공개": "documents",
    "민원": "documents", "보도·홍보": "documents",
    "인증서": "systems", "원격업무": "systems", "나이스": "systems", "타시도·시스템": "systems",
}
LAW_RULES = [
    (r"여비|보수|수당", "payroll"),
    (r"공무원|복무|교육훈련|인사규칙|사무전결", "service"),
    (r"재정|회계|예산|집행기준", "budget"),
    (r"계약|입찰|낙찰|공유재산|물품", "contract"),
    (r"초·중등교육|교육자치|교육시설|학교안전|근로기준|산업안전|수업료", "school"),
    (r"기록물|정보공개|개인정보|민원|청탁|이해충돌|행정업무|인공지능", "documents"),
]
# 기존 손수 등록 항목과 겹치는 것(같은 법령·같은 자료)은 생성하지 않는다.
SKIP_RESOURCES = {"S05", "S06", "S20"}
SKIP_LAWS = {"L01", "L03", "L26"}
LAW_OVERRIDES = {
    "L29": {
        "url": "https://www.law.go.kr/자치법규/서울특별시공립학교회계규칙",
        "note": "자비스5 검증(2026-09-13): 기준일 현재 현행 규칙은 2016. 11. 14. 타법개정, 서울특별시교육규칙 제939호. 2026. 8. 6. 일부개정규칙안은 입법예고 단계라 현행으로 적용하지 않는다.",
    },
    "L30": {
        "url": "https://www.law.go.kr/자치법규/서울특별시교육비특별회계소관공유재산관리조례",
        "note": "자비스5 검증(2026-09-13): 현행본 2026. 1. 8. 일부개정, 서울특별시조례 제9919호.",
    },
}
EXTRA_LAWS = [
    ("서울특별시교육청 기록물 관리에 관한 조례", "documents", "본청·교육지원청·직속기관·각급학교 기록물 관리의 조직·책임·절차", "[시행 2026. 1. 8.] [서울특별시조례 제9912호, 2026. 1. 8., 제정]. 자비스5 검증에서 누락이 지적되어 추가.", "https://www.law.go.kr/자치법규/서울특별시교육청기록물관리에관한조례"),
    ("행정업무의 운영 및 혁신에 관한 규정", "documents", "공문서 정의, 기안·결재·시행·접수 등 행정업무 운영 기준", "[시행 2026. 5. 19.] [대통령령 제36333호]. 지방자치단체 기관 포함 행정기관 적용.", "https://www.law.go.kr/법령/행정업무의운영및혁신에관한규정"),
    ("인공지능 및 데이터 기반 행정 활성화에 관한 법률", "documents", "공공부문 인공지능·데이터 기반 행정", "[시행 2026. 8. 28.] [법률 제21392호, 2026. 2. 27., 일부개정].", "https://www.law.go.kr/법령/인공지능및데이터기반행정활성화에관한법률"),
    ("지방자치단체 교육비특별회계 세출예산 집행기준", "budget", "교육비특별회계 세출예산 집행기준. 제2편 지방교육행정기관 구매카드 발급 및 사용기준", "교육부 행정규칙. 제명 검색으로 현행본을 확인한다. 자비스5 02-H-02 근거 교체에 사용.", "https://www.law.go.kr/행정규칙/지방자치단체교육비특별회계세출예산집행기준"),
]
OFFICIAL_DOCS = [
    {
        "id": "doc-edu-budget-2026", "title": "2026년도 서울특별시교육비특별회계 예산편성 기본지침", "category": "budget",
        "description": "본청·교육지원청·직속기관의 교육비특별회계 예산편성·운용 기준. 학교회계 지침과 구분해서 본다. 연도별 개정되므로 2027년도 자료 게시 시 교체.",
        "publisher": "서울특별시교육청(동부교육지원청 재정지원과 게시)", "year": "2026",
        "url": "https://dbedu.sen.go.kr/CMS/school/school04/school0406/school040603/1351280_2906.html",
    },
    {
        "id": "doc-hr-plan-2026", "title": "2026년 일반직공무원 인사운영 기본계획", "category": "service",
        "description": "교육감 소속 일반직공무원 인사·전보·보직·운영 기준. 인사 수치가 있는 지식카드의 직접 근거. 매년 최신 계획으로 교체.",
        "publisher": "서울특별시교육청 총무과(교육행정지원시스템 게시)", "year": "2026",
        "url": "https://baro.sen.go.kr/fus/MI000000000000000022/board/BO00000004/CD100102/view0010v.do?board_seq=131203",
    },
    {
        "id": "doc-privacy-breach-2024", "title": "서울특별시교육청 개인정보 유출사고 대응 매뉴얼(2024.08. 개정전문)", "category": "documents",
        "description": "학생·학부모·교직원 개인정보 유출 초동대응 절차. 사고 연락망·보고기한·담당부서는 최신 내부계획으로 재확인.",
        "publisher": "서울특별시교육청(교육행정지원시스템 게시)", "year": "2024",
        "url": "https://baro.sen.go.kr/fus/MI000000000000000022/board/BO00000004/CD100102/view0010v.do?board_seq=106083",
    },
]


def sheet_rows(wb: openpyxl.Workbook, name: str) -> list[dict]:
    rows = list(wb[name].iter_rows(values_only=True))
    header = rows[4]
    return [dict(zip(header, r)) for r in rows[5:] if r and r[0]]


def law_category(name: str) -> str:
    for pattern, cat in LAW_RULES:
        if re.search(pattern, name):
            return cat
    return "documents"


def clean(text: object) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def build_resources(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        rid = r["ID"]
        if rid in SKIP_RESOURCES:
            continue
        field = clean(r["분야"])
        category = FIELD_CATEGORY.get(field)
        if not category:
            sys.exit(f"{rid}: 분야 매핑 없음 — {field}")
        priority = clean(r["우선"])
        path = clean(r["자료 찾는 경로"])
        desc_parts = [
            f"우선순위 {priority}",
            clean(r["탑재 활용"]),
            f"찾는 경로: {path}" if path else "",
            clean(r["주의·남은 확인"]),
        ]
        level = clean(r["확인 수준"])
        if level:
            desc_parts.append(f"확인 수준: {level}")
        out.append({
            "id": f"res-{rid.lower()}",
            "title": clean(r["자료명"]),
            "category": category,
            "description": " · ".join(p for p in desc_parts if p),
            "publisher": clean(r["게시·발행 주체"]),
            "year": clean(r["자료 판·연도"]) or "미확인",
            "addedAt": ADDED,
            "url": clean(r["원문 URL"]),
            "kind": "resource",
        })
    return out


def build_laws(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        lid = r["ID"]
        if lid in SKIP_LAWS:
            continue
        name = clean(r["법령·규칙명"])
        override = LAW_OVERRIDES.get(lid, {})
        note = clean(r["주의·현행 확인"])
        desc = " · ".join(p for p in [clean(r["다룰 내용"]), override.get("note") or note, f"확인 수준: {clean(r['확인 수준'])}"] if p)
        out.append({
            "id": f"law-{lid.lower()}",
            "title": name,
            "category": law_category(name),
            "description": desc,
            "publisher": "국가법령정보센터",
            "year": "현행",
            "addedAt": ADDED,
            "url": override.get("url") or clean(r["원문 URL"]),
            "kind": "law",
        })
    for i, (title, category, content, note, url) in enumerate(EXTRA_LAWS, start=1):
        out.append({
            "id": f"law-x{i:02d}",
            "title": title,
            "category": category,
            "description": f"{content} · {note}",
            "publisher": "국가법령정보센터",
            "year": "현행",
            "addedAt": ADDED,
            "url": url,
            "kind": "law",
        })
    return out


def main() -> None:
    existing = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else []
    base = [m for m in existing if not m["id"].startswith(GENERATED_PREFIX)]
    wb = openpyxl.load_workbook(XLSX, read_only=True)
    docs = [{**d, "addedAt": ADDED, "kind": "resource"} for d in OFFICIAL_DOCS]
    resources = build_resources(sheet_rows(wb, "자료목록"))
    laws = build_laws(sheet_rows(wb, "법령근거"))
    items = base + docs + resources + laws
    ids = [m["id"] for m in items]
    if len(ids) != len(set(ids)):
        sys.exit("id 중복")
    urls = {}
    for m in items:
        urls.setdefault(m["url"], []).append(m["id"])
    dups = {u: v for u, v in urls.items() if len(v) > 1}
    for m in items:
        if not m["url"].startswith("https://"):
            sys.exit(f"{m['id']}: https 아님 — {m['url']}")
    OUT.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"manuals.json: 기존 {len(base)} + 공식원문 {len(docs)} + 자료 {len(resources)} + 법령 {len(laws)} = {len(items)}")
    if dups:
        print("같은 URL을 쓰는 항목(의도된 경우만 허용):")
        for u, v in dups.items():
            print("  ", v, u[:80])


if __name__ == "__main__":
    main()
