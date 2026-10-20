export type CategoryId =
  | "start"
  | "service"
  | "budget"
  | "contract"
  | "payroll"
  | "systems"
  | "documents"
  | "school";
export type Workplace = "all" | "school" | "office";
/** draft: 지식창고 초안 카드(2026-09-13). 소관부서 검토 전이며 검증 지적을 review 에 남긴다. */
export type GuideStatus = "reference" | "pending" | "tip" | "draft";
export type Page =
  | "home"
  | "guides"
  | "edufine"
  | "edufine-access"
  | "manuals"
  | "checklist"
  | "glossary"
  | "saved";
export interface Source {
  title: string;
  url: string;
  note: string;
}
export type ReviewLevel = "high" | "medium" | "low";
export interface ReviewNote {
  level: ReviewLevel;
  /** 예: "자비스5 02-H-01" */
  ref: string;
  note: string;
  /** true 면 지적된 수정문안을 본문에 이미 반영했다. */
  applied: boolean;
}
export interface Guide {
  id: string;
  category: CategoryId;
  title: string;
  summary: string;
  status: GuideStatus;
  audience: Workplace;
  tags: string[];
  steps: string[];
  caution: string;
  contact: string;
  sources: Source[];
  updated: string;
  /** 지식카드 본문(마크다운). 있으면 상세 화면에서 steps 대신 이 본문을 렌더링한다. */
  body?: string;
  scope?: string;
  refresh?: string;
  /** 원문 라벨: 전국 공통 · 서울교육청 고유 · 내부확인 필요 */
  labels?: string[];
  review?: ReviewNote[];
  origin?: string;
}
export type ManualKind = "resource" | "law";
export interface Manual {
  id: string;
  title: string;
  category: CategoryId;
  description: string;
  publisher: string;
  year: string;
  addedAt: string;
  filename?: string;
  file?: Blob;
  url?: string;
  builtin?: boolean;
  /** resource: 공식 자료·허브 링크, law: 법령·행정규칙·자치법규 */
  kind?: ManualKind;
}
