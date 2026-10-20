import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  ExternalLink,
  Monitor,
  MousePointer2,
  Search,
} from "lucide-react";
import { EdufineAccessGuide } from "./EdufineAccessGuide";
import {
  WORKFLOW_SYSTEMS,
  WORKFLOW_SOURCE_URL,
  parseWorkflowCatalog,
  workflowSystemForActivity,
  workflowSteps,
  type WorkflowClip,
  type WorkflowSystemId,
} from "./edufine-workflows";
import "./edufine-workflows.css";

type Props = { activity: string; onNavigate: (activity: string) => void };

function SourceNote({ systemId }: { systemId: WorkflowSystemId }) {
  return (
    <p className="walkthrough-source">
      <a href={WORKFLOW_SOURCE_URL} target="_blank" rel="noopener noreferrer">
        AI-SEN 공개 따라하기 자료 <ExternalLink size={13} />
      </a>
      <span>
        학습용 · 서울 최신 화면 및 기관별 권한과 일치하는지는 확인하지
        못했습니다.
      </span>
      {systemId === "project" && (
        <span>
          원문 일부 설명이 중간에 끊겨 있어, 화면 원본을 함께 확인해 주세요.
        </span>
      )}
    </p>
  );
}

export function ExpenditureSystemCard({ onOpen }: { onOpen: () => void }) {
  return <WorkflowSystemCard systemId="expense" onOpen={onOpen} />;
}

function WorkflowSystemCard({
  systemId,
  onOpen,
}: {
  systemId: WorkflowSystemId;
  onOpen: () => void;
}) {
  const system = WORKFLOW_SYSTEMS[systemId];
  return (
    <section
      className="walkthrough-system"
      aria-labelledby={`${systemId}-system-title`}
    >
      <div className="walkthrough-system-icon">
        <Monitor size={27} aria-hidden="true" />
      </div>
      <div className="walkthrough-system-copy">
        <span className="walkthrough-eyebrow">
          {system.area} 분야 · 화면 따라하기
        </span>
        <h3 id={`${systemId}-system-title`}>{system.title}</h3>
        <p>{system.description}</p>
      </div>
      <button type="button" className="button primary" onClick={onOpen}>
        {system.label} 따라하기 <ArrowRight size={16} />
      </button>
    </section>
  );
}

function WorkflowPlayer({
  clip,
  systemId,
  onBack,
}: {
  clip: WorkflowClip;
  systemId: WorkflowSystemId;
  onBack: () => void;
}) {
  const system = WORKFLOW_SYSTEMS[systemId];
  const steps = useMemo(() => workflowSteps(clip), [clip]);
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());
  const [zoom, setZoom] = useState(false);
  const [loadedImage, setLoadedImage] = useState("");
  const [failedImage, setFailedImage] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const current = steps[index];
  const { scene, step } = current;
  const finished = completed.size === steps.length;
  const imageReady =
    !!scene.image && loadedImage === scene.image && failedImage !== scene.image;

  useEffect(() => {
    heading.current?.focus();
  }, []);

  function confirmStep() {
    const next = new Set(completed).add(current.key);
    setCompleted(next);
    if (index < steps.length - 1) setIndex(index + 1);
    else {
      const missing = steps.findIndex((entry) => !next.has(entry.key));
      if (missing >= 0) setIndex(missing);
    }
  }

  return (
    <section className="walkthrough-player">
      <button
        type="button"
        className="text-button walkthrough-back"
        onClick={onBack}
      >
        <ArrowLeft size={16} /> {system.label} 업무 목록
      </button>
      <p className="walkthrough-eyebrow">
        {system.title} · {clip.category}
      </p>
      <h2 ref={heading} tabIndex={-1}>
        {clip.title}
      </h2>
      <p className="walkthrough-lead">
        화면의 원형 표시를 누르거나 ‘확인하고 다음’을 눌러 연습하세요. 실제
        저장·결재·이체는 실행되지 않습니다.
      </p>
      <SourceNote systemId={systemId} />
      <div className="walkthrough-progress">
        <span>
          자료에 수록된 단계{" "}
          <b>
            {index + 1} / {steps.length}
          </b>
        </span>
        <span aria-live="polite">{completed.size}개 연습 확인</span>
        <progress
          value={completed.size}
          max={steps.length}
          aria-label="따라하기 연습 확인"
        />
      </div>
      {finished && (
        <div className="walkthrough-success" role="status">
          <Check size={20} />
          <div>
            <strong>이 자료의 모든 단계를 연습했습니다.</strong>
            <p>실제 업무 처리 여부와는 별개의 학습 기록입니다.</p>
          </div>
          <button
            type="button"
            className="button"
            onClick={() => {
              setCompleted(new Set());
              setIndex(0);
            }}
          >
            다시 연습
          </button>
        </div>
      )}
      <div className="walkthrough-player-grid">
        <div className="walkthrough-screen-panel">
          <div className="walkthrough-screen-toolbar">
            <span>자료 {scene.page}페이지 · 학습 화면</span>
            <label>
              <input
                type="checkbox"
                checked={zoom}
                onChange={(e) => setZoom(e.target.checked)}
              />{" "}
              화면 크게 보기
            </label>
          </div>
          <p className="walkthrough-menu">
            <b>메뉴 경로</b>
            {scene.menu || "원문에 메뉴 경로가 없습니다."}
          </p>
          <p className="walkthrough-screen-action">
            <MousePointer2 size={16} aria-hidden="true" />
            <span>
              <b>원문 {step.number}번</b> {step.action}
            </span>
          </p>
          <div
            className="walkthrough-image-scroll"
            tabIndex={0}
            aria-label="매뉴얼 화면. 크게 보기에서는 좌우로 스크롤할 수 있습니다."
          >
            <div className={`walkthrough-image ${zoom ? "is-zoomed" : ""}`}>
              {scene.image && failedImage !== scene.image ? (
                <>
                  <img
                    key={scene.image}
                    src={scene.image}
                    alt={`${clip.title} 자료 ${scene.page}페이지 화면`}
                    referrerPolicy="no-referrer"
                    onLoad={() => setLoadedImage(scene.image)}
                    onError={() => setFailedImage(scene.image)}
                  />
                  {!imageReady && (
                    <p className="walkthrough-image-loading" role="status">
                      매뉴얼 화면을 불러오는 중입니다…
                    </p>
                  )}
                  {imageReady && step.position && (
                    <button
                      type="button"
                      className="walkthrough-hotspot"
                      style={{
                        left: `clamp(24px, ${step.position.x}%, calc(100% - 24px))`,
                        top: `clamp(24px, ${step.position.y}%, calc(100% - 24px))`,
                      }}
                      aria-label={`원문 ${step.number}번 연습 확인: ${step.action}`}
                      onClick={confirmStep}
                    >
                      {step.number}
                      <MousePointer2 size={16} aria-hidden="true" />
                    </button>
                  )}
                </>
              ) : (
                <div className="walkthrough-image-error" role="status">
                  <Monitor size={32} />
                  <p>매뉴얼 화면을 불러오지 못했습니다.</p>
                  <span>
                    단계 설명을 확인하거나 원본 사이트를 이용해 주세요.
                  </span>
                  {scene.image && (
                    <button
                      type="button"
                      className="button"
                      onClick={() => {
                        setFailedImage("");
                        setLoadedImage("");
                      }}
                    >
                      화면 다시 불러오기
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <p className="walkthrough-caption">
            페이지는 공개 자료의 번호로, 화면에 인쇄된 쪽수와 다를 수 있습니다.
            일부 자료는 중간 단계가 생략되어 있으며, 표시 위치는 참고용입니다.
          </p>
          {scene.image && (
            <a
              className="text-button"
              href={scene.image}
              target="_blank"
              rel="noopener noreferrer"
            >
              화면 원본 크게 열기 <ExternalLink size={14} />
            </a>
          )}
        </div>
        <aside
          className="walkthrough-instruction"
          aria-label="현재 따라하기 단계"
        >
          <div
            className="walkthrough-current"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="walkthrough-eyebrow">
              자료 {scene.page}페이지 · 원문 {step.number}번
            </span>
            <h3>{step.action}</h3>
            {scene.description && <p>{scene.description}</p>}
            {completed.has(current.key) && (
              <span className="walkthrough-checked">
                <Check size={14} /> 연습 확인함
              </span>
            )}
          </div>
          <button
            type="button"
            className="button primary walkthrough-confirm"
            onClick={confirmStep}
          >
            {index === steps.length - 1 ? "이 단계 연습 확인" : "확인하고 다음"}
            <Check size={16} />
          </button>
          <div className="walkthrough-controls">
            <button
              type="button"
              className="button"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
            >
              <ArrowLeft size={15} /> 이전 설명
            </button>
            <button
              type="button"
              className="button"
              disabled={index === steps.length - 1}
              onClick={() => setIndex(index + 1)}
            >
              다음 설명 <ArrowRight size={15} />
            </button>
          </div>
          <p className="walkthrough-caption">
            이전·다음 설명은 연습 확인 수를 바꾸지 않습니다.
          </p>
          {scene.tips.length > 0 && (
            <details className="walkthrough-tips">
              <summary>원문 참고사항</summary>
              {scene.tips.map((tip, i) => (
                <p key={i}>{tip}</p>
              ))}
            </details>
          )}
          <details className="walkthrough-step-list">
            <summary>전체 단계 보기 ({steps.length})</summary>
            <ol>
              {steps.map((entry, i) => (
                <li key={entry.key}>
                  <button
                    type="button"
                    aria-current={index === i ? "step" : undefined}
                    onClick={() => setIndex(i)}
                  >
                    <span>
                      자료 {entry.scene.page}페이지 · {entry.step.number}번{" "}
                      {completed.has(entry.key) ? "✓" : ""}
                    </span>
                    {entry.step.action}
                  </button>
                </li>
              ))}
            </ol>
          </details>
        </aside>
      </div>
    </section>
  );
}

function SystemWalkthrough({
  systemId,
  activity,
  onNavigate,
}: Props & { systemId: WorkflowSystemId }) {
  const system = WORKFLOW_SYSTEMS[systemId];
  const [clips, setClips] = useState<WorkflowClip[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (clips.length) return;
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    setError("");
    fetch(system.catalogUrl, {
      signal: controller.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
    })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data: unknown) => {
        const parsed = parseWorkflowCatalog(data, systemId);
        if (active) setClips(parsed);
      })
      .catch(() => {
        if (active)
          setError(
            `${system.label} 따라하기 자료를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.`,
          );
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [systemId, system, clips.length, attempt]);

  const selected = clips.find((clip) => clip.id === activity);
  if (selected)
    return (
      <WorkflowPlayer
        key={selected.id}
        clip={selected}
        systemId={systemId}
        onBack={() => onNavigate(systemId)}
      />
    );

  const categories = [...new Set(clips.map((clip) => clip.category))];
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = clips.filter(
    (clip) =>
      (!category || clip.category === category) &&
      words.every((word) =>
        `${clip.title} ${clip.category} ${clip.scenes.map((scene) => scene.menu).join(" ")}`
          .toLowerCase()
          .includes(word),
      ),
  );

  return (
    <div className="walkthrough-page">
      <button
        type="button"
        className="text-button walkthrough-back"
        onClick={() => onNavigate("")}
      >
        <ArrowLeft size={16} /> 에듀파인 따라하기 메뉴
      </button>
      <p className="walkthrough-eyebrow">
        K-에듀파인 / {system.area} / 화면 따라하기
      </p>
      <h2>{system.title}</h2>
      <p className="walkthrough-lead">
        따라할 업무를 선택하세요. 매뉴얼 화면과 단계별 설명을 함께 볼 수
        있습니다.
      </p>
      <>
        <SourceNote systemId={systemId} />
        {!clips.length && !error && (
          <div className="walkthrough-message" role="status">
            {system.label} 업무 목록을 불러오는 중입니다…
          </div>
        )}
        {error && (
          <div className="walkthrough-message" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="button primary"
              disabled={loading}
              onClick={() => setAttempt(attempt + 1)}
            >
              다시 불러오기
            </button>
            <a
              href={WORKFLOW_SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-button"
            >
              원본 따라하기 사이트 <ExternalLink size={14} />
            </a>
          </div>
        )}
        {!!clips.length && (
          <>
            {activity !== systemId && (
              <p role="status" className="walkthrough-message">
                해당 업무를 찾지 못했습니다. 아래 목록에서 다시 선택해 주세요.
              </p>
            )}
            <div className="walkthrough-filters">
              <label className="walkthrough-search">
                <Search size={18} />
                <input
                  aria-label={`${system.label} 따라하기 업무 검색`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={system.searchHint}
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")}>
                    지우기
                  </button>
                )}
              </label>
              <select
                aria-label={`${system.label} 업무 분류`}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">모든 업무 분류</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <p className="walkthrough-result-count" role="status">
              따라하기 <strong>{filtered.length}</strong>개{" "}
              <span>· 전체 {clips.length}개</span>
            </p>
            {!filtered.length && (
              <div className="walkthrough-message">
                <p>검색한 업무가 없습니다.</p>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setQuery("");
                    setCategory("");
                  }}
                >
                  전체 업무 보기
                </button>
              </div>
            )}
            <div className="walkthrough-catalog">
              {filtered.map((clip) => (
                <article key={clip.id} className="walkthrough-clip">
                  <span className="walkthrough-eyebrow">{clip.category}</span>
                  <h3>{clip.title}</h3>
                  <p>
                    {clip.scenes.length}개 화면 · 수록 단계{" "}
                    {workflowSteps(clip).length}개
                    {systemId === "project" && (
                      <> · 자료 {clip.scenes[0].page}페이지</>
                    )}
                  </p>
                  <button
                    type="button"
                    className="button"
                    aria-label={`${clip.title} 따라하기`}
                    onClick={() => onNavigate(clip.id)}
                  >
                    따라하기 <ArrowRight size={16} />
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
      </>
    </div>
  );
}

export function EdufineWalkthroughPage({ activity, onNavigate }: Props) {
  if (activity === "login")
    return (
      <>
        <button
          type="button"
          className="text-button walkthrough-back"
          onClick={() => onNavigate("")}
        >
          <ArrowLeft size={16} /> 에듀파인 따라하기 메뉴
        </button>
        <EdufineAccessGuide onOpenWorkflows={() => onNavigate("")} />
      </>
    );

  const systemId = workflowSystemForActivity(activity);
  // Remount on a system change so catalogs, filters, pending requests and practice never mix.
  if (systemId)
    return (
      <SystemWalkthrough
        key={systemId}
        systemId={systemId}
        activity={activity}
        onNavigate={onNavigate}
      />
    );

  return (
    <div className="walkthrough-page">
      <p className="walkthrough-eyebrow">K-에듀파인 / 업무별 화면 연습</p>
      <h2>에듀파인 따라하기</h2>
      <p className="walkthrough-lead">
        지출·수입·예산·사업 중 따라할 업무를 고른 뒤, 화면을 보며 한 단계씩
        연습해 보세요.
      </p>
      <WorkflowSystemCard
        systemId="expense"
        onOpen={() => onNavigate("expense")}
      />
      <WorkflowSystemCard
        systemId="income"
        onOpen={() => onNavigate("income")}
      />
      <WorkflowSystemCard
        systemId="budget_manage"
        onOpen={() => onNavigate("budget_manage")}
      />
      <WorkflowSystemCard
        systemId="project"
        onOpen={() => onNavigate("project")}
      />
      <section className="walkthrough-login-entry">
        <BookOpen size={24} />
        <div>
          <h3>처음 접속 안내</h3>
          <p>업무포털·인증서 로그인과 집·외부 EVPN 접속 순서를 확인하세요.</p>
        </div>
        <button
          type="button"
          className="button"
          onClick={() => onNavigate("login")}
        >
          접속부터 따라하기 <ChevronRight size={16} />
        </button>
      </section>
    </div>
  );
}
