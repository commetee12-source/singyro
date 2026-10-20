import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  CircleHelp,
  KeyRound,
  Monitor,
  PanelRight,
  RotateCcw,
  School,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { ExternalLink } from "./components";
import {
  ACCESS_REVIEW_DATE,
  ACCESS_STORAGE_KEY,
  accessLinks,
  accessProblems,
  accessSources,
  confirmAccessStep,
  getAccessSteps,
  parseAccessProgress,
  type AccessMode,
  type AccessStep,
} from "./edufine-access";
import "./edufine-access.css";

function loadProgress() {
  try {
    return parseAccessProgress(localStorage.getItem(ACCESS_STORAGE_KEY));
  } catch {
    return parseAccessProgress(null);
  }
}

/** 학습용 도식. 인증서·계정 입력이나 실제 접속은 수행하지 않는다. */
function PracticeScene({
  step,
  practiced,
  onPractice,
}: {
  step: AccessStep;
  practiced: boolean;
  onPractice: () => void;
}) {
  return (
    <div className={`access-scene scene-${step.id}`}>
      <div className="access-scene-label">
        <Monitor size={15} /> 연습용 예시 · 실제 화면과 다를 수 있어요
      </div>
      <div className="access-browser-bar">
        <span className="access-window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>
          {step.id === "evpn" || step.id === "vpn"
            ? "evpn.sen.go.kr"
            : step.id === "portal" ||
                step.id === "certificate" ||
                step.id === "launch"
              ? "sen.eduptl.kr"
              : "첫 접속 준비 노트"}
        </span>
      </div>
      <div className="access-scene-body">
        {step.id === "ready" && (
          <>
            <School size={32} />
            <h4>시작 전에, 세 가지</h4>
            <ul className="access-practice-list">
              <li>기관에서 사용하는 계정</li>
              <li>본인 명의 인증서</li>
              <li>업무망 또는 승인된 EVPN</li>
            </ul>
          </>
        )}
        {step.id === "approval" && (
          <>
            <ShieldCheck size={32} />
            <h4>나이스에서 이용 신청</h4>
            <p className="access-example-path">
              기본메뉴 <span>›</span> 원격업무지원서비스 <span>›</span>{" "}
              원격업무지원서비스(eVPN)
            </p>
            <p>신청 후 부서장 승인까지 확인</p>
          </>
        )}
        {step.id === "evpn" && (
          <>
            <ShieldCheck size={32} />
            <h4>서울교육청 EVPN</h4>
            <p>공식 페이지에서 본인 인증 진행</p>
            <div className="access-demo-field">
              계정·비밀번호 입력은 공식 사이트에서
            </div>
          </>
        )}
        {step.id === "vpn" && (
          <>
            <Wifi size={32} />
            <h4>세 칸 모두 Yes인지 확인</h4>
            <div className="access-vpn-status">
              {["설치", "실행", "연결"].map((label) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{practiced ? "Yes" : "확인 전"}</strong>
                </div>
              ))}
            </div>
            <p>로그인 → AXGATE 설치 → VPN 실행</p>
          </>
        )}
        {step.id === "portal" && (
          <>
            <Monitor size={32} />
            <h4>서울 업무포털</h4>
            <div className="access-demo-field access-demo-address">
              https://sen.eduptl.kr/
            </div>
            <p>업무망 또는 EVPN 연결 후 접속</p>
          </>
        )}
        {step.id === "certificate" && (
          <>
            <KeyRound size={32} />
            <h4>본인 인증서로 로그인</h4>
            <div className="access-demo-field">
              <ShieldCheck size={20} /> 본인 명의 교육부 전자서명 인증서
            </div>
            <p>아이디 확인 → 인증서 선택 → 로그인</p>
          </>
        )}
        {step.id === "launch" && (
          <>
            <Monitor size={32} />
            <h4>업무포털의 서비스 메뉴</h4>
            <div className="access-demo-services">
              <span>나이스</span>
              <strong>K-에듀파인</strong>
              <span>기록관리</span>
            </div>
            <p>버튼 위치보다 메뉴 이름을 확인하세요.</p>
          </>
        )}
        {step.id === "permission" && (
          <>
            <CheckCircle2 size={32} />
            <h4>접속 후, 마지막 확인</h4>
            <ul className="access-practice-list">
              <li>내 이름으로 로그인했나요?</li>
              <li>현재 소속기관이 맞나요?</li>
              <li>맡은 업무의 메뉴가 보이나요?</li>
            </ul>
          </>
        )}
        <button
          type="button"
          className={`access-practice-button ${practiced ? "practiced" : ""}`}
          onClick={onPractice}
        >
          {practiced ? (
            <Check size={18} />
          ) : (
            <span className="access-click-marker" aria-hidden="true">
              ●
            </span>
          )}
          {step.practice}
        </button>
        <p className="access-practice-feedback" role="status">
          {practiced
            ? step.practiceFeedback
            : "눌러서 순서를 익힌 뒤, 실제 화면에서 따라 해보세요."}
        </p>
      </div>
    </div>
  );
}

export function EdufineAccessGuide({
  onOpenWorkflows,
}: {
  onOpenWorkflows: () => void;
}) {
  const [progress, setProgress] = useState(loadProgress);
  const mode = progress.mode;
  const steps = getAccessSteps(mode);
  const [index, setIndex] = useState(() => {
    const next = getAccessSteps(progress.mode).findIndex(
      (step) => !progress.completed[progress.mode].includes(step.id),
    );
    return next < 0 ? 0 : next;
  });
  const [practiced, setPracticed] = useState(false);
  const [compact, setCompact] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moveFocus = useRef(false);
  const step = steps[index];
  const completed = progress.completed[mode];
  const allDone = completed.length === steps.length;
  const isConfirmed = completed.includes(step.id);
  const source = step.source ? accessSources[step.source] : null;

  useEffect(() => {
    try {
      localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(progress));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [progress]);

  useEffect(() => {
    if (moveFocus.current) {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({ block: "start" });
      moveFocus.current = false;
    }
  }, [index, mode]);

  function selectStep(nextIndex: number) {
    moveFocus.current = nextIndex !== index;
    setIndex(nextIndex);
    setPracticed(false);
  }

  function switchMode(next: AccessMode) {
    if (next === mode) return;
    const first = getAccessSteps(next).findIndex(
      (item) => !progress.completed[next].includes(item.id),
    );
    setProgress((current) => ({ ...current, mode: next }));
    setIndex(first < 0 ? 0 : first);
    setPracticed(false);
  }

  function resetRoute() {
    setProgress((current) => ({
      ...current,
      completed: { ...current.completed, [mode]: [] },
    }));
    selectStep(0);
  }

  function confirmAndContinue() {
    const next = confirmAccessStep(progress, mode, step.id, true);
    setProgress(next);
    const nextIndex = steps.findIndex(
      (item, position) =>
        position > index && !next.completed[mode].includes(item.id),
    );
    const firstIncomplete = steps.findIndex(
      (item) => !next.completed[mode].includes(item.id),
    );
    if (nextIndex >= 0) selectStep(nextIndex);
    else if (firstIncomplete >= 0) selectStep(firstIncomplete);
  }

  return (
    <div className={`access-guide ${compact ? "access-compact" : ""}`}>
      <header className="access-heading">
        <div>
          <p className="access-audience">
            서울 소속 교직원을 위한 첫 접속 안내
          </p>
          <h2>한 화면씩, 따라 하면 돼요.</h2>
          <p>
            이 안내를 옆에 두고 업무포털부터 K-에듀파인까지 차근차근 접속해
            보세요.
          </p>
        </div>
        <button
          type="button"
          className="button access-compact-toggle"
          aria-pressed={compact}
          onClick={() => setCompact((value) => !value)}
        >
          <PanelRight size={16} />
          {compact ? "전체 안내 보기" : "옆에 두고 보기"}
        </button>
      </header>
      {compact && (
        <p className="access-compact-tip">
          브라우저 창을 좁혀 실제 업무 화면 옆에 놓으세요. 단계별 설명과 확인
          버튼을 모아 보여드립니다.
        </p>
      )}

      <fieldset className="access-mode-picker">
        <legend>어디에서 접속하나요?</legend>
        <div>
          <button
            type="button"
            aria-pressed={mode === "office"}
            onClick={() => switchMode("office")}
          >
            <School size={22} />
            <span>
              <strong>학교·기관에서</strong>
              <small>업무망에 연결된 PC · 5단계</small>
            </span>
            {mode === "office" && <Check size={18} />}
          </button>
          <button
            type="button"
            aria-pressed={mode === "remote"}
            onClick={() => switchMode("remote")}
          >
            <Wifi size={22} />
            <span>
              <strong>집·외부에서</strong>
              <small>EVPN 이용 승인 필요 · 8단계</small>
            </span>
            {mode === "remote" && <Check size={18} />}
          </button>
        </div>
      </fieldset>

      <div className="access-progress-heading">
        <span>
          실제 화면에서 확인한 단계{" "}
          <b>
            {completed.length} / {steps.length}
          </b>
        </span>
        <button type="button" onClick={resetRoute}>
          <RotateCcw size={13} /> 이 경로 초기화
        </button>
      </div>
      <progress
        className="access-progress"
        value={completed.length}
        max={steps.length}
        aria-label="실제 화면 확인 진도"
      />
      <p className="access-save-note" role="status">
        {storageError
          ? "브라우저에 진도를 저장할 수 없어 현재 화면에서만 유지됩니다."
          : "확인한 단계는 이 브라우저에 저장돼요. 연습 버튼만 누르면 진도에 포함되지 않아요."}
      </p>

      {allDone && (
        <div className="access-complete" role="status">
          <CheckCircle2 size={25} />
          <div>
            <strong>이 경로의 확인을 모두 마쳤어요.</strong>
            <p>
              직접 표시한 확인 기록입니다. 실제 접속 상태는 업무포털에서
              확인하세요.
            </p>
          </div>
        </div>
      )}

      <div className="access-workspace">
        <nav className="access-step-nav" aria-label="접속 안내 단계">
          <ol>
            {steps.map((item, position) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={position === index ? "step" : undefined}
                  onClick={() => selectStep(position)}
                >
                  <span
                    className={
                      completed.includes(item.id)
                        ? "step-number done"
                        : "step-number"
                    }
                  >
                    {completed.includes(item.id) ? (
                      <Check size={15} aria-label="확인 완료" />
                    ) : (
                      position + 1
                    )}
                  </span>
                  <span>{item.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <section
          className="access-active-step"
          aria-labelledby="access-step-title"
        >
          <div className="access-step-title">
            <span>
              {index + 1} / {steps.length} 단계
            </span>
            <h3 id="access-step-title" ref={headingRef} tabIndex={-1}>
              {step.instruction}
            </h3>
          </div>
          <div className="access-step-content">
            {!compact && (
              <PracticeScene
                step={step}
                practiced={practiced}
                onPractice={() => setPracticed(true)}
              />
            )}
            <div className="access-instructions">
              <h4>이렇게 따라 하세요</h4>
              <ol>
                {step.actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ol>
              {step.link && (
                <ExternalLink
                  href={step.link.url}
                  className="button primary access-official-link"
                >
                  {step.link.label}
                </ExternalLink>
              )}
              {step.link && (
                <p className="access-link-note">
                  공식 사이트가 새 창으로 열립니다.
                </p>
              )}
              <details className="access-step-help">
                <summary>
                  <CircleHelp size={15} /> 여기서 막혔나요?
                </summary>
                <p>{step.help}</p>
              </details>
              <div className="access-step-source">
                {source ? (
                  <>
                    <span>안내 근거</span>
                    <ExternalLink href={source.url}>
                      {source.title}
                    </ExternalLink>
                    {step.source === "portal" && (
                      <small>
                        공통 흐름 참고 · 서울 내부 화면 배치는 미확인
                      </small>
                    )}
                  </>
                ) : (
                  <>
                    <span>실무 확인 목록</span>
                    <small>메뉴와 권한은 소속기관 안내로 확인하세요.</small>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="access-confirmation">
            <label>
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(event) =>
                  setProgress((current) =>
                    confirmAccessStep(
                      current,
                      mode,
                      step.id,
                      event.target.checked,
                    ),
                  )
                }
              />
              <span>{step.checkpoint}</span>
            </label>
            <p>연습을 마친 뒤 실제 화면을 확인했을 때 표시해 주세요.</p>
          </div>
          <div className="access-step-controls">
            <button
              type="button"
              className="button"
              disabled={index === 0}
              onClick={() => selectStep(index - 1)}
            >
              <ArrowLeft size={15} /> 이전
            </button>
            <button
              type="button"
              className="button primary access-confirm-next"
              onClick={confirmAndContinue}
            >
              {index === steps.length - 1
                ? "실제 확인 완료"
                : "실제 확인하고 다음"}
              <Check size={16} />
            </button>
            <button
              type="button"
              className="access-skip"
              disabled={index === steps.length - 1}
              onClick={() => selectStep(index + 1)}
            >
              다음 설명 <ArrowRight size={14} />
            </button>
          </div>
        </section>
      </div>

      <section
        className="access-troubleshooting"
        aria-labelledby="access-help-title"
      >
        <h3 id="access-help-title">
          <CircleHelp size={20} /> 접속하다 막혔다면
        </h3>
        {accessProblems.map((problem) => (
          <details key={problem.title}>
            <summary>{problem.title}</summary>
            <p>{problem.answer}</p>
          </details>
        ))}
        <p className="access-contact">
          서울 EVPN 문의: <a href="tel:021396">02-1396</a> · 세부 연결은 공식
          EVPN 페이지의 문의처 안내를 확인하세요.
        </p>
      </section>

      <section className="access-after-login">
        <BookOpen size={24} />
        <div>
          <h3>접속 다음은, 업무별 따라 하기</h3>
          <p>
            에듀파인 따라하기 메뉴에서 지출관리·수입관리·예산관리·사업관리
            업무를 선택해 화면 연습을 이어갈 수 있어요.
          </p>
        </div>
        <button type="button" className="button" onClick={onOpenWorkflows}>
          업무별 따라하기 열기 <ArrowRight size={16} />
        </button>
      </section>

      <details className="access-sources">
        <summary>출처와 확인 범위 · {ACCESS_REVIEW_DATE}</summary>
        <p>
          접속 주소·EVPN 절차는 서울교육청 공개 안내를 확인했습니다. 업무포털의
          인증 후 화면에는 접근하지 못했으며, 내부 화면의 현재 배치와 개인별
          권한은 확인하지 못했습니다. 연습 화면은 순서를 설명하기 위한
          도식입니다.
        </p>
        <ul>
          {Object.values(accessSources).map((item) => (
            <li key={item.url}>
              <ExternalLink href={item.url}>{item.title}</ExternalLink>
              <span>{item.scope}</span>
            </li>
          ))}
        </ul>
        <p>
          구성 참고:{" "}
          <ExternalLink href={accessLinks.reference}>
            AI-SEN K-에듀파인 따라하기
          </ExternalLink>
          의 단계 탐색·클릭 연습·좁은 화면 안내 방식. 이 페이지는
          계정·인증서·비밀번호를 수집하지 않습니다.
        </p>
      </details>
    </div>
  );
}
