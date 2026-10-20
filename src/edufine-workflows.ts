export const WORKFLOW_SOURCE_URL = "https://chatbot.aisen.store/guide/";
export type WorkflowSystemId =
  | "expense"
  | "income"
  | "budget_manage"
  | "project";
export const WORKFLOW_SYSTEMS = {
  expense: {
    area: "지출",
    label: "지출관리",
    title: "지출관리시스템",
    description:
      "품의등록부터 원인행위, 지출결의까지. 업무를 선택하고 화면의 표시를 따라 연습해 보세요.",
    searchHint: "업무 검색 · 품의등록, 원인행위, 지출결의",
    catalogUrl: "https://chatbot.aisen.store/data/catalogs/expense.json",
  },
  income: {
    area: "수입",
    label: "수입관리",
    title: "수입관리시스템",
    description:
      "수납, 징수결의, 반환, 일계까지. 업무를 선택하고 화면의 표시를 따라 연습해 보세요.",
    searchHint: "업무 검색 · 수납, 징수결의, 반환, 일계",
    catalogUrl: "https://chatbot.aisen.store/data/catalogs/income.json",
  },
  budget_manage: {
    area: "예산",
    label: "예산관리",
    title: "예산관리시스템",
    description:
      "성립전예산, 추가경정예산, 이전용·예비비까지. 업무를 선택하고 화면의 표시를 따라 연습해 보세요.",
    searchHint: "업무 검색 · 성립전예산, 예산확정, 이전용, 예비비",
    catalogUrl: "https://chatbot.aisen.store/data/catalogs/budget_manage.json",
  },
  project: {
    area: "사업",
    label: "사업관리",
    title: "사업관리시스템",
    description:
      "사업관리카드 조회부터 담당자 지정, 세부항목 관리까지. 업무를 선택하고 화면의 표시를 따라 연습해 보세요.",
    searchHint: "업무 검색 · 사업관리카드, 담당자, 세부항목, 인수인계",
    catalogUrl: "https://chatbot.aisen.store/data/catalogs/project.json",
  },
} satisfies Record<
  WorkflowSystemId,
  {
    area: string;
    label: string;
    title: string;
    description: string;
    searchHint: string;
    catalogUrl: string;
  }
>;

export type WorkflowStep = {
  number: number;
  action: string;
  position: { x: number; y: number } | null;
};
export type WorkflowScene = {
  page: number;
  title: string;
  menu: string;
  description: string;
  image: string;
  tips: string[];
  steps: WorkflowStep[];
};
export type WorkflowClip = {
  id: string;
  title: string;
  category: string;
  scenes: WorkflowScene[];
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\*\*/g, "").trim() : "";
}

// Public source paths only; never accept arbitrary URLs from the remote catalog.
export function workflowImageUrl(
  value: unknown,
  system: WorkflowSystemId,
): string {
  const match =
    typeof value === "string"
      ? value.match(
          /^scenes\/(expense|income|budget_manage|project)_p\d+\.png$/,
        )
      : null;
  return match && match[1] === system
    ? `https://chatbot.aisen.store/data/${value}`
    : "";
}

function parseStep(
  value: unknown,
  system: WorkflowSystemId,
): WorkflowStep | null {
  const step = record(value);
  const pos = record(step.pos);
  const action = text(step.action);
  // Conversion artifacts are not usable instructions (observed in the project overview).
  if (
    !Number.isInteger(step.step_no) ||
    Number(step.step_no) < 1 ||
    !action ||
    (system === "project" && /<!--|-->|\bPAGE BREAK\b/i.test(action))
  )
    return null;
  const validPosition =
    typeof pos.x === "number" &&
    Number.isFinite(pos.x) &&
    pos.x >= 0 &&
    pos.x <= 100 &&
    typeof pos.y === "number" &&
    Number.isFinite(pos.y) &&
    pos.y >= 0 &&
    pos.y <= 100;
  return {
    number: Number(step.step_no),
    action,
    position: validPosition ? { x: pos.x as number, y: pos.y as number } : null,
  };
}

function parseScene(
  value: unknown,
  system: WorkflowSystemId,
): WorkflowScene | null {
  const scene = record(value);
  if (
    !Number.isInteger(scene.page) ||
    Number(scene.page) < 1 ||
    !Array.isArray(scene.steps)
  )
    return null;
  const steps = scene.steps
    .map((step) => parseStep(step, system))
    .filter((step): step is WorkflowStep => !!step);
  if (!steps.length) return null;
  return {
    page: Number(scene.page),
    title: text(scene.sub_title),
    menu: text(scene.menu),
    description: text(scene.screen_desc),
    image: workflowImageUrl(scene.image, system),
    tips: Array.isArray(scene.tips) ? scene.tips.map(text).filter(Boolean) : [],
    steps,
  };
}

export function parseWorkflowCatalog(
  value: unknown,
  system: WorkflowSystemId,
): WorkflowClip[] {
  const catalog = record(value);
  const label = WORKFLOW_SYSTEMS[system].label;
  if (catalog.manual_id !== system || !Array.isArray(catalog.clips))
    throw new Error(`${label} 자료 형식을 확인할 수 없습니다.`);
  const idPattern = new RegExp(`^${system}_\\d+$`);
  const clips: WorkflowClip[] = [];
  const ids = new Set<string>();
  for (const value of catalog.clips) {
    const clip = record(value);
    if (
      typeof clip.clip_id !== "string" ||
      !idPattern.test(clip.clip_id) ||
      (clip.manual_id !== undefined && clip.manual_id !== system) ||
      ids.has(clip.clip_id) ||
      !text(clip.title) ||
      !Array.isArray(clip.scenes)
    )
      continue;
    const scenes = clip.scenes
      .map((scene) => parseScene(scene, system))
      .filter((scene): scene is WorkflowScene => !!scene);
    if (!scenes.length) continue;
    ids.add(clip.clip_id);
    clips.push({
      id: clip.clip_id,
      title: text(clip.title),
      category: text(clip.category) || "기타",
      scenes,
    });
  }
  if (!clips.length) throw new Error(`표시할 ${label} 따라하기가 없습니다.`);
  return clips;
}

// Keep source page/step numbers, including gaps; do not invent missing instructions.
export function workflowSteps(clip: WorkflowClip) {
  return clip.scenes.flatMap((scene, sceneIndex) =>
    scene.steps.map((step, stepIndex) => ({
      key: `${sceneIndex}:${stepIndex}`,
      scene,
      step,
    })),
  );
}

export function workflowSystemForActivity(
  value: string | null,
): WorkflowSystemId | null {
  const match = value?.match(
    /^(expense|income|budget_manage|project)(?:_\d+)?$/,
  );
  return match ? (match[1] as WorkflowSystemId) : null;
}

export function readWorkflowActivity(value: string | null): string {
  return value === "login" || workflowSystemForActivity(value) ? value! : "";
}
