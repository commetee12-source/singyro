import assert from "node:assert/strict";
import test from "node:test";
import {
  workflowImageUrl,
  parseWorkflowCatalog,
  readWorkflowActivity,
  workflowSystemForActivity,
  workflowSteps,
} from "../src/edufine-workflows.ts";

const parseExpenseCatalog = (value) => parseWorkflowCatalog(value, "expense");
const expenseImageUrl = (value) => workflowImageUrl(value, "expense");

const scene = {
  page: 86,
  sub_title: "지출결의",
  menu: "학교회계 > 지출관리**",
  image: "scenes/expense_p86.png",
  steps: [{ step_no: 4, action: "기본정보 확인", pos: { x: 9.2, y: 22.7 } }],
};
const clip = {
  clip_id: "expense_012",
  title: "지출결의",
  category: "III. 지출관리",
  scenes: [
    scene,
    {
      ...scene,
      page: 88,
      image: "scenes/expense_p88.png",
      steps: [{ step_no: 8, action: "내역 확인", pos: null }],
    },
  ],
};

test("원문에서 생략된 번호를 만들지 않고 페이지별 단계 순서를 유지한다", () => {
  const [parsed] = parseExpenseCatalog({ manual_id: "expense", clips: [clip] });
  const steps = workflowSteps(parsed);
  assert.deepEqual(
    steps.map(({ scene, step }) => [scene.page, step.number]),
    [
      [86, 4],
      [88, 8],
    ],
  );
  assert.equal(new Set(steps.map((step) => step.key)).size, 2);
  assert.equal(steps[0].scene.menu, "학교회계 > 지출관리");
  assert.equal(steps[1].step.position, null);
});

test("이미지는 확인한 출처의 지출 매뉴얼 경로만 사용한다", () => {
  assert.equal(
    expenseImageUrl("scenes/expense_p68.png"),
    "https://chatbot.aisen.store/data/scenes/expense_p68.png",
  );
  for (const path of [
    null,
    "https://other.example/track.png",
    "//other.example/a.png",
    "scenes/../a.png",
    "scenes/expense_p1.png?secret=a",
    "javascript:alert(1)",
  ])
    assert.equal(expenseImageUrl(path), "");
});

test("잘못된 카탈로그는 오류로 표시하고 중복과 손상된 단계는 걸러낸다", () => {
  for (const data of [
    null,
    {},
    { manual_id: "budget", clips: [clip] },
    { manual_id: "expense", clips: [] },
  ])
    assert.throws(() => parseExpenseCatalog(data));
  const modified = {
    ...clip,
    scenes: [
      {
        ...scene,
        steps: [
          ...scene.steps,
          null,
          { step_no: 0, action: "잘못된 단계" },
          { step_no: 5, action: "좌표 없음", pos: { x: Infinity, y: -1 } },
        ],
      },
    ],
  };
  const parsed = parseExpenseCatalog({
    manual_id: "expense",
    clips: [null, modified, clip],
  });
  assert.equal(parsed.length, 1);
  assert.equal(workflowSteps(parsed[0]).length, 2);
  assert.equal(parsed[0].scenes[0].steps[1].position, null);
});

test("따라하기 경로는 접속 안내와 등록된 업무 시스템만 허용한다", () => {
  for (const path of [
    "login",
    "expense",
    "expense_008",
    "income",
    "income_002",
    "budget_manage",
    "budget_manage_001",
    "project",
    "project_003",
  ])
    assert.equal(readWorkflowActivity(path), path);
  for (const path of [
    null,
    "",
    "other",
    "//example.com",
    "expense_1?url=other",
    "income_other",
    "income_1/expense",
    "budget_manage_extra",
    "budget_manage_1?url=other",
    "budget_settle_001",
    "project_other",
    "project_3?url=other",
  ])
    assert.equal(readWorkflowActivity(path), "");
});

const projectClip = {
  clip_id: "project_003",
  manual_id: "project",
  title: "2-1. 사업관리카드(전체) 학교별 조회",
  category: "2. 사업관리카드",
  scenes: [
    {
      ...scene,
      page: 15,
      image: "scenes/project_p15.png",
      steps: [
        {
          step_no: 1,
          action:
            "[조회] 버튼을 클릭하여 조회 조건에 따라 사업관리카드(전체) 내역을 조회",
          pos: { x: 93.6, y: 15.4 },
        },
      ],
    },
  ],
};

test("사업관리 자료와 경로를 읽고 문서 변환 흔적을 연습 단계로 표시하지 않는다", () => {
  const damaged = {
    ...projectClip,
    clip_id: "project_001",
    scenes: [
      {
        ...projectClip.scenes[0],
        steps: [
          {
            step_no: 1,
            action: "도\n\n<!-- PAGE BREAK -",
            pos: { x: 19.4, y: 26.5 },
          },
        ],
      },
    ],
  };
  const parsed = parseWorkflowCatalog(
    { manual_id: "project", clips: [damaged, projectClip] },
    "project",
  );
  assert.deepEqual(
    parsed.map((clip) => clip.id),
    ["project_003"],
  );
  assert.equal(
    parsed[0].scenes[0].image,
    "https://chatbot.aisen.store/data/scenes/project_p15.png",
  );
  assert.equal(workflowSteps(parsed[0])[0].step.number, 1);
  assert.throws(() =>
    parseWorkflowCatalog({ manual_id: "project", clips: [damaged] }, "project"),
  );
  for (const activity of ["project", "project_003", "project_070"])
    assert.equal(workflowSystemForActivity(activity), "project");
});

test("사업관리와 다른 시스템의 자료·이미지·변조 경로는 분리한다", () => {
  for (const other of ["expense", "income", "budget_manage"]) {
    assert.throws(() =>
      parseWorkflowCatalog(
        { manual_id: "project", clips: [projectClip] },
        other,
      ),
    );
    assert.equal(workflowImageUrl("scenes/project_p15.png", other), "");
    assert.equal(workflowImageUrl(`scenes/${other}_p15.png`, "project"), "");
  }
  const parsed = parseWorkflowCatalog(
    {
      manual_id: "project",
      clips: [
        clip,
        { ...projectClip, clip_id: "project_999", manual_id: "income" },
        projectClip,
      ],
    },
    "project",
  );
  assert.deepEqual(
    parsed.map((clip) => clip.id),
    ["project_003"],
  );
  for (const path of [
    "https://other.example/project_p15.png",
    "scenes/project_p15.png?url=other",
    "scenes/../project_p15.png",
  ])
    assert.equal(workflowImageUrl(path, "project"), "");
});

const budgetClip = {
  clip_id: "budget_manage_001",
  manual_id: "budget_manage",
  title: "Ⅱ. 2. 성립전예산 편성",
  category: "II. 성립전예산",
  scenes: [
    {
      ...scene,
      page: 19,
      image: "scenes/budget_manage_p19.png",
      steps: [
        { step_no: 1, action: "[신규] 버튼 클릭", pos: { x: 90.6, y: 16.4 } },
      ],
    },
    {
      ...scene,
      page: 33,
      image: "scenes/budget_manage_p33.png",
      steps: [
        { step_no: 1, action: "[조회] 버튼 클릭", pos: { x: 93.9, y: 16.3 } },
      ],
    },
  ],
};

test("밑줄이 포함된 예산 경로와 원문에서 다시 시작하는 단계 번호를 보존한다", () => {
  const [parsed] = parseWorkflowCatalog(
    { manual_id: "budget_manage", clips: [budgetClip] },
    "budget_manage",
  );
  const steps = workflowSteps(parsed);
  assert.equal(parsed.id, "budget_manage_001");
  assert.deepEqual(
    steps.map(({ scene, step }) => [scene.page, step.number]),
    [
      [19, 1],
      [33, 1],
    ],
  );
  assert.equal(new Set(steps.map((step) => step.key)).size, 2);
  assert.equal(
    parsed.scenes[0].image,
    "https://chatbot.aisen.store/data/scenes/budget_manage_p19.png",
  );
  for (const activity of [
    "budget_manage",
    "budget_manage_001",
    "budget_manage_017",
  ])
    assert.equal(workflowSystemForActivity(activity), "budget_manage");
});

test("예산과 다른 시스템의 자료 및 이미지가 섞이지 않는다", () => {
  for (const other of ["expense", "income"]) {
    assert.throws(() =>
      parseWorkflowCatalog(
        { manual_id: "budget_manage", clips: [budgetClip] },
        other,
      ),
    );
    assert.equal(workflowImageUrl("scenes/budget_manage_p19.png", other), "");
    assert.equal(
      workflowImageUrl(`scenes/${other}_p19.png`, "budget_manage"),
      "",
    );
  }
  const mixed = parseWorkflowCatalog(
    {
      manual_id: "budget_manage",
      clips: [
        clip,
        { ...budgetClip, clip_id: "budget_manage_999", manual_id: "income" },
        budgetClip,
      ],
    },
    "budget_manage",
  );
  assert.deepEqual(
    mixed.map((clip) => clip.id),
    ["budget_manage_001"],
  );
  for (const path of [
    "scenes/budget_settle_p19.png",
    "scenes/budget_manage_p19.png?url=other",
    "scenes/../budget_manage_p19.png",
  ])
    assert.equal(workflowImageUrl(path, "budget_manage"), "");
});

const incomeClip = {
  clip_id: "income_002",
  manual_id: "income",
  title: "Ⅱ. 1-② 납입금정보관리",
  category: "II. 기준정보",
  scenes: [
    {
      ...scene,
      page: 31,
      image: "scenes/income_p31.png",
      steps: [
        { step_no: 1, action: "[조회] 버튼 클릭", pos: { x: 93.9, y: 16.2 } },
        {
          step_no: 2,
          action: "[이전년도복사] 버튼 클릭",
          pos: { x: 84.5, y: 23.2 },
        },
      ],
    },
    {
      ...scene,
      page: 32,
      image: "scenes/income_p32.png",
      steps: [
        { step_no: 3, action: "복사된 내역 확인", pos: { x: 2.7, y: 27.1 } },
      ],
    },
  ],
};

test("수입 카탈로그의 여러 화면과 단계를 원문 순서대로 연결한다", () => {
  const [parsed] = parseWorkflowCatalog(
    { manual_id: "income", clips: [incomeClip] },
    "income",
  );
  assert.equal(parsed.id, "income_002");
  assert.deepEqual(
    workflowSteps(parsed).map(({ scene, step }) => [scene.page, step.number]),
    [
      [31, 1],
      [31, 2],
      [32, 3],
    ],
  );
  assert.equal(
    parsed.scenes[0].image,
    "https://chatbot.aisen.store/data/scenes/income_p31.png",
  );
});

test("수입·지출 자료와 이미지가 서로 섞이지 않는다", () => {
  assert.throws(() =>
    parseWorkflowCatalog({ manual_id: "expense", clips: [clip] }, "income"),
  );
  assert.throws(() =>
    parseWorkflowCatalog(
      { manual_id: "income", clips: [incomeClip] },
      "expense",
    ),
  );
  const mixed = parseWorkflowCatalog(
    {
      manual_id: "income",
      clips: [
        clip,
        { ...incomeClip, clip_id: "income_999", manual_id: "expense" },
        incomeClip,
      ],
    },
    "income",
  );
  assert.deepEqual(
    mixed.map((clip) => clip.id),
    ["income_002"],
  );
  assert.equal(workflowImageUrl("scenes/expense_p31.png", "income"), "");
  assert.equal(workflowImageUrl("scenes/income_p31.png", "expense"), "");
  for (const path of [
    "//example.com/income_p31.png",
    "scenes/income_p31.png?url=other",
    "scenes/../income_p31.png",
  ])
    assert.equal(workflowImageUrl(path, "income"), "");
});

test("수입·지출 상세 주소는 각 목록으로 분류하고 접속 안내는 별도로 둔다", () => {
  for (const activity of ["income", "income_002", "income_082"])
    assert.equal(workflowSystemForActivity(activity), "income");
  for (const activity of ["expense", "expense_008", "expense_088"])
    assert.equal(workflowSystemForActivity(activity), "expense");
  for (const activity of [
    null,
    "",
    "login",
    "income_bad",
    "expense_2#income",
    "https://example.com",
  ])
    assert.equal(workflowSystemForActivity(activity), null);
});
