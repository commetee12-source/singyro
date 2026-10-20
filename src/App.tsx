import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Copy,
  ExternalLink as ExternalLinkIcon,
  FileText,
  FolderOpen,
  Home,
  Info,
  ListChecks,
  Menu,
  Monitor,
  Search,
  ShieldCheck,
  Sparkles,
  Sprout,
  X,
} from "lucide-react";
import {
  CARDS_DATE,
  categories,
  checklist,
  glossary,
  guides,
  REVIEW_DATE,
  sources,
} from "./data";
import {
  CategoryIcon,
  EmptyState,
  ExternalLink,
  GuideCard,
  LabelChips,
  Markdown,
  Modal,
  ReviewNotes,
  SectionTitle,
  Status,
} from "./components";
import { EdufinePage } from "./EdufinePage";
import { EdufineWalkthroughPage } from "./EdufineWalkthroughPage";
import { readWorkflowActivity } from "./edufine-workflows";
import { edufineGuideIds, edufineManualIds } from "./edufine";
import { ManualLibrary } from "./ManualLibrary";
import {
  SeoulDirectionModal,
  SeoulEducationLogo,
  SeoulVisionBanner,
  SeoulWelcomeCharacters,
  seoulBrand,
} from "./SeoulBrand";
import { getManuals, validateManual } from "./storage";
import type { GuideStatus, Manual, Page, Workplace } from "./types";
import { VisitCounter } from "./VisitCounter";

type Route = { page: Page; category: string; query: string; article: string; activity: string };
type Preferences = {
  saved: string[];
  checks: string[];
  recent: string[];
  workplace: Workplace;
};
const pages: { id: Page; title: string; icon: typeof Home }[] = [
  { id: "home", title: "여기로, 첫걸음", icon: Home },
  { id: "guides", title: "업무 길잡이", icon: BookOpen },
  { id: "edufine", title: "K-에듀파인", icon: Monitor },
  { id: "edufine-access", title: "에듀파인 따라하기", icon: Monitor },
  { id: "manuals", title: "매뉴얼·자료실", icon: FolderOpen },
  { id: "checklist", title: "신규자 체크리스트", icon: ListChecks },
  { id: "glossary", title: "쉬운 업무 용어", icon: FileText },
  { id: "saved", title: "나의 보관함", icon: Bookmark },
];
const defaultPreferences: Preferences = {
  saved: [],
  checks: [],
  recent: [],
  workplace: "all",
};
const allChecks = checklist.flatMap((g) => g.items);
function readPreferences(): Preferences {
  try {
    const parsed = JSON.parse(
      localStorage.getItem("singyro-preferences-v1") || "{}",
    );
    if (!parsed || typeof parsed !== "object") return defaultPreferences;
    const validIds = (value: unknown, ids: string[]) =>
      Array.isArray(value)
        ? [
            ...new Set(
              value.filter(
                (id): id is string =>
                  typeof id === "string" && ids.includes(id),
              ),
            ),
          ]
        : [];
    return {
      saved: validIds(
        parsed.saved,
        guides.map((g) => g.id),
      ),
      checks: validIds(
        parsed.checks,
        allChecks.map((c) => c.id),
      ),
      recent: validIds(
        parsed.recent,
        guides.map((g) => g.id),
      ).slice(0, 5),
      workplace: ["all", "school", "office"].includes(parsed.workplace)
        ? parsed.workplace
        : "all",
    };
  } catch {
    return defaultPreferences;
  }
}
function readRoute(): Route {
  const [path, params] = window.location.hash.slice(1).split("?");
  const search = new URLSearchParams(params);
  return {
    page: pages.some((p) => p.id === path) ? (path as Page) : "home",
    category: categories.some((c) => c.id === search.get("category"))
      ? search.get("category")!
      : "all",
    query: (search.get("q") || "").slice(0, 150),
    article: search.get("article") || "",
    activity: readWorkflowActivity(search.get("activity")),
  };
}
function routeHash(route: Route) {
  const params = new URLSearchParams();
  if (route.category !== "all") params.set("category", route.category);
  if (route.query) params.set("q", route.query);
  if (route.article) params.set("article", route.article);
  if (route.activity) params.set("activity", route.activity);
  return `#${route.page}${params.size ? `?${params}` : ""}`;
}

export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [preferences, setPreferences] = useState(readPreferences);
  const [searchDraft, setSearchDraft] = useState(route.query);
  const [statusFilter, setStatusFilter] = useState<GuideStatus | "all">("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [shared, setShared] = useState<Manual[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [sharedLoading, setSharedLoading] = useState(true);
  const [storageError, setStorageError] = useState("");
  const [toast, setToast] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [directionOpen, setDirectionOpen] = useState(false);
  const [copyFallback, setCopyFallback] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);
  const searchRef = useRef<HTMLInputElement>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 5500);
  }, []);
  const refreshManuals = useCallback(async () => {
    try {
      setManuals(await getManuals());
    } catch {
      setStorageError(
        "브라우저 자료 저장 공간을 열지 못했습니다. 개인 자료 저장은 브라우저 설정을 확인한 뒤 이용해 주세요.",
      );
    } finally {
      setLocalLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    void refreshManuals();
    fetch("/manuals.json")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: unknown) => {
        if (!Array.isArray(data)) throw new Error();
        const values = data.map((value) => ({
          ...validateManual(value),
          builtin: true,
        }));
        if (values.some((v) => !v.url)) throw new Error();
        if (active) setShared(values);
      })
      .catch(() => {
        if (active)
          notify("공통 자료 목록을 불러오지 못했습니다. 새로고침해 주세요.");
      })
      .finally(() => {
        if (active) setSharedLoading(false);
      });
    try {
      localStorage.setItem("singyro-storage-check", "1");
      localStorage.removeItem("singyro-storage-check");
    } catch {
      setStorageError(
        "이 브라우저에서 개인 설정을 저장할 수 없습니다. 현재 이용 중인 화면에만 반영됩니다.",
      );
    }
    const listener = () => {
      setRoute(readRoute());
      setMenuOpen(false);
    };
    const shortcuts = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k" &&
        !document.querySelector("dialog[open]")
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("hashchange", listener);
    window.addEventListener("keydown", shortcuts);
    return () => {
      active = false;
      window.removeEventListener("hashchange", listener);
      window.removeEventListener("keydown", shortcuts);
      window.clearTimeout(toastTimer.current);
    };
  }, [notify, refreshManuals]);
  useEffect(() => {
    setSearchDraft(route.query);
  }, [route.query]);
  useEffect(() => {
    document.title = `${route.article ? guides.find((g) => g.id === route.article)?.title || "업무 길잡이" : pages.find((p) => p.id === route.page)?.title} · 신규는 여기로`;
  }, [route.page, route.article]);

  function savePreferences(update: Partial<Preferences>) {
    const next = { ...preferences, ...update };
    setPreferences(next);
    try {
      localStorage.setItem("singyro-preferences-v1", JSON.stringify(next));
    } catch {
      setStorageError(
        "저장 공간을 사용할 수 없어 변경사항이 새로고침 후 사라질 수 있습니다.",
      );
    }
  }
  function go(page: Page, options: Partial<Route> = {}, replace = false) {
    const next = { page, category: "all", query: "", article: "", activity: "", ...options };
    setRoute(next);
    setMenuOpen(false);
    const hash = routeHash(next);
    if (replace) window.history.replaceState(null, "", hash);
    else window.location.hash = hash;
    if (
      page !== route.page ||
      next.category !== route.category ||
      next.query !== route.query ||
      next.activity !== route.activity
    ) {
      window.scrollTo({ top: 0 });
      setStatusFilter("all");
    }
  }
  function openGuide(id: string) {
    savePreferences({
      recent: [id, ...preferences.recent.filter((item) => item !== id)].slice(
        0,
        5,
      ),
    });
    go(route.page, { ...route, article: id });
  }
  function toggleSaved(id: string) {
    const saved = preferences.saved.includes(id);
    savePreferences({
      saved: saved
        ? preferences.saved.filter((value) => value !== id)
        : [...preferences.saved, id],
    });
    notify(saved ? "보관함에서 해제했습니다." : "나의 보관함에 저장했습니다.");
  }
  function toggleCheck(id: string) {
    savePreferences({
      checks: preferences.checks.includes(id)
        ? preferences.checks.filter((c) => c !== id)
        : [...preferences.checks, id],
    });
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify("복사했습니다.");
    } catch {
      setCopyFallback(text);
    }
  }
  const selected = guides.find((g) => g.id === route.article);
  const allManuals = [...manuals, ...shared];
  const search = route.query.trim().toLowerCase();
  const matches = (text: string) =>
    search.split(/\s+/).every((word) => text.toLowerCase().includes(word));
  const filteredGuides = guides.filter(
    (g) =>
      (route.category === "all" || g.category === route.category) &&
      (statusFilter === "all" || g.status === statusFilter) &&
      (preferences.workplace === "all" ||
        g.audience === "all" ||
        g.audience === preferences.workplace) &&
      matches(
        [
          g.title,
          g.summary,
          ...g.tags,
          ...g.steps,
          g.caution,
          g.body ?? "",
          ...g.sources.map((s) => s.title),
        ].join(" "),
      ) &&
      (route.page !== "saved" || preferences.saved.includes(g.id)),
  );
  const searchManuals = search
    ? allManuals.filter((m) =>
        matches(`${m.title} ${m.description} ${m.publisher}`),
      )
    : [];
  const searchGlossary = search
    ? glossary.filter((g) => matches(g[0] + g[1]))
    : [];
  const progress = Math.round(
    (preferences.checks.length / allChecks.length) * 100,
  );
  const filteredTitle =
    route.page === "saved"
      ? "나의 보관함"
      : search
        ? `‘${route.query}’ 검색 결과`
        : route.category !== "all"
          ? categories.find((c) => c.id === route.category)?.name
          : "업무 길잡이";
  const currentCategory =
    selected && categories.find((c) => c.id === selected.category)!;
  const guideCards = (items: typeof guides) => (
    <div className="guide-grid">
      {items.map((g) => (
        <GuideCard
          key={g.id}
          guide={g}
          saved={preferences.saved.includes(g.id)}
          onOpen={() => openGuide(g.id)}
          onSave={() => toggleSaved(g.id)}
        />
      ))}
    </div>
  );
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        본문 바로가기
      </a>
      {menuOpen && (
        <button
          className="sidebar-overlay"
          aria-label="메뉴 닫기"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <a
          className="sidebar-institution"
          href="https://www.sen.go.kr/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="서울특별시교육청 공식 홈페이지 (새 창)"
        >
          <SeoulEducationLogo />
        </a>
        <button
          className="brand"
          onClick={() => go("home")}
          aria-label="신규는 여기로 홈"
        >
          <span>
            신규는 여기로<small>서울교육 신규 공무원의 든든한 첫걸음</small>
          </span>
        </button>
        <div className="workspace-label">
          <span className="dot" />
          서울시교육청 교육행정직
        </div>
        <nav aria-label="주 메뉴">
          {pages.map((p) => (
            <button
              key={p.id}
              className={`nav-item ${route.page === p.id ? "active" : ""}`}
              aria-current={route.page === p.id ? "page" : undefined}
              onClick={() => go(p.id)}
            >
              <p.icon size={20} strokeWidth={1.8} />
              <span>{p.title}</span>
              {p.id === "saved" && preferences.saved.length > 0 && (
                <b>{preferences.saved.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-links">
          <p>자주 찾는 공식 사이트</p>
          <ExternalLink href="https://www.sen.go.kr/">
            서울특별시교육청
          </ExternalLink>
          <ExternalLink href="https://www.law.go.kr/">
            국가법령정보센터
          </ExternalLink>
          <ExternalLink href="https://buseo.sen.go.kr/buseo/bu05/index.do">
            교육청 예산담당관
          </ExternalLink>
          <ExternalLink href="https://baro.sen.go.kr/">
            교육행정지원시스템 BARO
          </ExternalLink>
          <ExternalLink href="https://contract.sen.go.kr/">
            서울교육 계약길잡이
          </ExternalLink>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <img
              src={seoulBrand.growing}
              alt="학교 앞에서 함께 새싹을 심는 자라나와 열리미"
              width="596"
              height="335"
              loading="lazy"
            />
            <strong>서울교육 안에서, 함께 자라요.</strong>
            <p>
              오늘 하나 배웠다면,
              <br />
              그걸로 충분한 첫걸음이에요.
            </p>
          </div>
          <button className="help-button" onClick={() => setHelpOpen(true)}>
            <CircleHelp size={17} />이 사이트 이용 안내
            <ChevronRight size={15} />
          </button>
          <VisitCounter />
        </div>
      </aside>
      <div className="app-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="메뉴 열기"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu size={23} />
            </button>
            <span className="breadcrumb">
              <strong>{pages.find((p) => p.id === route.page)?.title}</strong>
            </span>
          </div>
          <form
            className="top-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              go("guides", { query: searchDraft.trim() });
            }}
          >
            <Search size={18} />
            <input
              ref={searchRef}
              aria-label="전체 검색"
              placeholder="어떤 업무가 궁금하세요?"
              value={searchDraft}
              maxLength={150}
              onChange={(e) => setSearchDraft(e.target.value)}
            />
            <button type="submit" aria-label="검색하기">
              <kbd>Ctrl K</kbd>
              <ArrowRight size={17} />
            </button>
          </form>
          <span className="personal-avatar" title="개인 브라우저에 기록됩니다">
            나
          </span>
        </header>
        <main id="main-content" tabIndex={-1}>
          {storageError && (
            <div className="notice error" role="alert">
              <Info size={18} />
              {storageError}
            </div>
          )}
          {route.page === "home" && (
            <>
              <div className="greeting">
                <div>
                  <span>
                    반가워요, 신규 주무관님 <span aria-hidden="true">☀</span>
                  </span>
                  <p>오늘의 첫걸음도 여기서 함께해요.</p>
                </div>
                <label className="workplace">
                  <span>나의 근무지</span>
                  <select
                    aria-label="나의 근무지"
                    value={preferences.workplace}
                    onChange={(e) =>
                      savePreferences({
                        workplace: e.target.value as Workplace,
                      })
                    }
                  >
                    <option value="all">전체 근무지</option>
                    <option value="school">학교</option>
                    <option value="office">교육청·지원청·직속기관</option>
                  </select>
                </label>
              </div>
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-label">
                    <Sprout size={15} />
                    서울특별시교육청 신규 교육행정직 길잡이
                  </span>
                  <h1>
                    서울교육의 첫걸음,
                    <br />
                    신규는 여기로.
                  </h1>
                  <p>
                    첫 출근부터 학교회계, 복무, 공문 작성까지.
                    <br />
                    자라나·열리미와 함께 하나씩 알아가요.
                  </p>
                  <button
                    className="button hero-button"
                    onClick={() => go("checklist")}
                  >
                    나의 첫 출근 준비하기
                    <ArrowRight size={17} />
                  </button>
                </div>
                <SeoulWelcomeCharacters />
              </section>
              <SeoulVisionBanner onOpen={() => setDirectionOpen(true)} />
              <section className="quick-section" aria-label="상황별 바로가기">
                <span>지금 이런 상황인가요?</span>
                <div className="quick-actions">
                  {[
                    { label: "첫 출근했어요", icon: "sprout", id: "first-day" },
                    {
                      label: "연가 쓰고 싶어요",
                      icon: "calendar",
                      id: "leave",
                    },
                    {
                      label: "지출해야 해요",
                      icon: "wallet",
                      id: "expenditure",
                    },
                    { label: "공문을 써야 해요", icon: "file", id: "draft" },
                    {
                      label: "시스템이 낯설어요",
                      icon: "monitor",
                      id: "systems-overview",
                    },
                  ].map((item) => (
                    <button key={item.id} onClick={() => openGuide(item.id)}>
                      <CategoryIcon name={item.icon} size={18} />
                      {item.label}
                      <ChevronRight size={14} />
                    </button>
                  ))}
                </div>
              </section>
              <div className="home-columns">
                <div>
                  <section className="category-section">
                    <SectionTitle
                      title="어떤 업무를 찾고 있나요?"
                      subtitle="교육행정 업무를 분야별로 살펴보세요."
                      action={
                        <button
                          className="text-button"
                          onClick={() => go("guides")}
                        >
                          전체 보기
                          <ChevronRight size={16} />
                        </button>
                      }
                    />
                    <div className="category-grid">
                      {categories.map((c) => (
                        <button
                          className="category-card"
                          key={c.id}
                          onClick={() => go("guides", { category: c.id })}
                        >
                          <span className={`category-icon ${c.color}`}>
                            <CategoryIcon
                              name={c.icon}
                              size={24}
                              strokeWidth={1.7}
                            />
                          </span>
                          <strong>{c.name}</strong>
                          <p>{c.description}</p>
                          <span className="category-count">
                            길잡이{" "}
                            {
                              guides.filter(
                                (g) =>
                                  g.category === c.id &&
                                  (preferences.workplace === "all" ||
                                    g.audience === "all" ||
                                    g.audience === preferences.workplace),
                              ).length
                            }
                            개<ChevronRight size={14} />
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="recommended">
                    <SectionTitle
                      title={
                        preferences.recent.length
                          ? "최근에 살펴본 길잡이"
                          : "처음이라면, 이 글부터"
                      }
                      subtitle={
                        preferences.recent.length
                          ? "다시 보고 싶은 내용을 이어서 확인하세요."
                          : "새로운 업무를 시작하기 전에 가볍게 읽어보세요."
                      }
                    />
                    {guideCards(
                      (preferences.recent.length
                        ? preferences.recent.map((id) =>
                            guides.find((g) => g.id === id)!,
                          )
                        : [guides[1], guides[4], guides[15]]
                      ).slice(0, 3),
                    )}
                  </section>
                </div>
                <aside className="home-rail">
                  <section className="journey-panel">
                    <div className="journey-title">
                      <span className="small-icon">
                        <ClipboardCheck size={20} />
                      </span>
                      <span>나의 첫걸음 체크</span>
                      <span className="tiny-label">첫 한 달</span>
                    </div>
                    <h3>
                      {progress === 100 ? (
                        "첫걸음을 모두 채웠어요!"
                      ) : (
                        <>
                          서두르지 말고,
                          <br />
                          하나씩 해봐요.
                        </>
                      )}
                    </h3>
                    <div className="progress-label">
                      <span>
                        {preferences.checks.length} / {allChecks.length} 완료
                      </span>
                      <strong>{progress}%</strong>
                    </div>
                    <div
                      className="progress-track"
                      role="progressbar"
                      aria-label="신규자 체크리스트 진행률"
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <span style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mini-checks">
                      {checklist[0].items.slice(0, 3).map((c) => (
                        <label key={c.id}>
                          <input
                            type="checkbox"
                            checked={preferences.checks.includes(c.id)}
                            onChange={() => toggleCheck(c.id)}
                          />
                          <span>{c.text}</span>
                        </label>
                      ))}
                    </div>
                    <button
                      className="journey-link"
                      onClick={() => go("checklist")}
                    >
                      체크리스트 이어보기
                      <ArrowRight size={16} />
                    </button>
                    <p className="local-note">
                      내 기록은 이 브라우저에 저장돼요.
                    </p>
                  </section>
                  <section className="source-panel">
                    <ShieldCheck size={25} />
                    <h3>근거를 함께 확인해요</h3>
                    <p>
                      복무는 공통 법령과
                      <br />
                      서울시교육감 소속 조례를 함께.
                    </p>
                    <button onClick={() => openGuide("service-rules")}>
                      복무 기준 살펴보기
                      <ArrowUpRight size={16} />
                    </button>
                    <div className="status-legend">
                      <Status status="reference" />
                      <Status status="pending" />
                      <Status status="tip" />
                      <Status status="draft" />
                    </div>
                  </section>
                </aside>
              </div>
              <section className="home-library">
                <SectionTitle
                  title="곁에 두고 보는 업무자료"
                  subtitle="서울교육의 공식 자료부터 차근차근 모아가요."
                  action={
                    <button
                      className="text-button"
                      onClick={() => go("manuals")}
                    >
                      자료실 가기
                      <ChevronRight size={16} />
                    </button>
                  }
                />
                <div className="home-manual-grid">
                  {allManuals.slice(0, 2).map((m) => (
                    <button
                      key={m.id}
                      className="home-manual"
                      onClick={() => go("manuals", { category: m.category })}
                    >
                      <span className="file-icon purple">
                        <FileText size={23} />
                      </span>
                      <div>
                        <small>{m.publisher}</small>
                        <strong>{m.title}</strong>
                        <span>
                          {m.year} ·{" "}
                          {m.builtin ? "공식 원문 링크" : "내가 추가한 자료"}
                        </span>
                      </div>
                      <ChevronRight size={19} />
                    </button>
                  ))}
                  <button
                    className="home-manual add-manual"
                    onClick={() => go("manuals")}
                  >
                    <FolderOpen size={29} />
                    <div>
                      <strong>내 업무 매뉴얼도 여기에</strong>
                      <span>파일과 링크를 추가할 수 있어요.</span>
                    </div>
                    <ArrowRight size={19} />
                  </button>
                </div>
              </section>
            </>
          )}
          {(route.page === "guides" || route.page === "saved") && (
            <>
              <SectionTitle
                title={filteredTitle || "업무 길잡이"}
                subtitle={
                  route.page === "saved"
                    ? "다시 보고 싶은 길잡이를 모아두었어요. 이 브라우저에 저장됩니다."
                    : "실무 확인 목록과 공식 출처를 함께 살펴보세요."
                }
                action={
                  <label className="workplace">
                    <span>근무지</span>
                    <select
                      aria-label="길잡이 근무지"
                      value={preferences.workplace}
                      onChange={(e) =>
                        savePreferences({
                          workplace: e.target.value as Workplace,
                        })
                      }
                    >
                      <option value="all">전체 근무지</option>
                      <option value="school">학교</option>
                      <option value="office">교육청·지원청·직속기관</option>
                    </select>
                  </label>
                }
              />
              <div className="category-tabs" aria-label="업무 분야">
                <button
                  className={route.category === "all" ? "active" : ""}
                  onClick={() => go(route.page, { query: route.query })}
                >
                  전체
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    className={route.category === c.id ? "active" : ""}
                    onClick={() =>
                      go(route.page, { category: c.id, query: route.query })
                    }
                  >
                    {c.short}
                  </button>
                ))}
              </div>
              {route.page === "guides" && route.category === "systems" && (
                <section
                  className="access-category-entry"
                  aria-labelledby="access-category-title"
                >
                  <Monitor size={25} aria-hidden="true" />
                  <div>
                    <h3 id="access-category-title">에듀파인 따라하기</h3>
                    <p>
                      지출·수입·예산·사업관리시스템의 업무별 화면과 처음 접속하는 순서를
                      한 단계씩 따라 해보세요.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button primary"
                    onClick={() => go("edufine-access")}
                  >
                    에듀파인 따라하기 열기
                    <ArrowRight size={16} />
                  </button>
                </section>
              )}
              <div className="results-header">
                <span>
                  길잡이 <strong>{filteredGuides.length}</strong>개
                </span>
                <select
                  aria-label="자료 확인 상태"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as GuideStatus | "all")
                  }
                >
                  <option value="all">모든 확인 상태</option>
                  <option value="reference">공식 출처 안내</option>
                  <option value="pending">자료 확인 필요</option>
                  <option value="tip">적응 팁</option>
                  <option value="draft">초안·검토 전 (지식카드)</option>
                </select>
              </div>
              {filteredGuides.length ? (
                guideCards(filteredGuides)
              ) : (
                <EmptyState
                  title={
                    route.page === "saved" && !preferences.saved.length
                      ? "아직 저장한 길잡이가 없어요"
                      : "조건에 맞는 길잡이가 없어요"
                  }
                  text={
                    route.page === "saved" && !preferences.saved.length
                      ? "길잡이의 책갈피 버튼을 누르면 이곳에 모아둘 수 있어요."
                      : "다른 검색어나 업무 분야로 다시 찾아보세요."
                  }
                  action={
                    <button
                      className="button"
                      onClick={() => {
                        setStatusFilter("all");
                        go("guides");
                      }}
                    >
                      전체 길잡이 보기
                    </button>
                  }
                />
              )}
              {route.page === "guides" && search && (
                <div className="additional-results">
                  <SectionTitle
                    title={`함께 찾은 자료 ${searchManuals.length}개 · 용어 ${searchGlossary.length}개`}
                  />
                  {searchManuals.map((m) => (
                    <button
                      key={m.id}
                      className="search-result-row"
                      onClick={() => go("manuals", { category: m.category })}
                    >
                      <FolderOpen size={19} />
                      <span>{m.title}</span>
                      <ChevronRight size={17} />
                    </button>
                  ))}
                  {searchGlossary.map((g) => (
                    <button
                      key={g[0]}
                      className="search-result-row"
                      onClick={() => openGuide(g[2])}
                    >
                      <BookOpen size={19} />
                      <span>
                        <strong>{g[0]}</strong>
                        <small>{g[1]}</small>
                      </span>
                      <ChevronRight size={17} />
                    </button>
                  ))}
                  {!searchManuals.length && !searchGlossary.length && (
                    <p className="muted">
                      등록된 자료 제목·설명과 업무 용어에서 일치하는 내용이
                      없습니다.
                    </p>
                  )}
                </div>
              )}
              <div className="subtle-callout">
                <Info size={20} />
                <p>
                  ‘자료 확인 필요’는 내부 매뉴얼·세부 절차의 검토가 필요한
                  안내입니다. 업무별 담당자와 최신 자료를 확인한 뒤 활용해
                  주세요.
                </p>
              </div>
            </>
          )}
          {route.page === "edufine-access" && (
            <EdufineWalkthroughPage
              activity={route.activity}
              onNavigate={(activity) => go("edufine-access", { activity })}
            />
          )}
          {route.page === "edufine" && (
            <EdufinePage
              onOpenExpenditure={() => go("edufine-access", { activity: "expense" })}
              onOpenGuide={(id) => go("guides", { article: id })}
              relatedGuides={edufineGuideIds
                .map((id) => guides.find((g) => g.id === id))
                .filter((g): g is NonNullable<typeof g> => Boolean(g))
                .map((g) => ({
                  id: g.id,
                  title: g.title,
                  summary: g.summary,
                }))}
              relatedManuals={edufineManualIds
                .map((id) => allManuals.find((m) => m.id === id))
                .filter((m): m is NonNullable<typeof m> => Boolean(m))
                .map((m) => ({
                  id: m.id,
                  title: m.title,
                  publisher: m.publisher,
                  url: m.url,
                }))}
            />
          )}
          {route.page === "manuals" && (
            <ManualLibrary
              key={route.category}
              manuals={allManuals}
              loading={localLoading || sharedLoading}
              onRefresh={refreshManuals}
              notify={notify}
              initialCategory={route.category}
            />
          )}
          {route.page === "checklist" && (
            <>
              <SectionTitle
                title="신규자 체크리스트"
                subtitle="첫 출근부터 첫 한 달까지. 나의 속도로 하나씩 확인해요."
              />
              <section className="checklist-banner">
                <div className="checklist-circle">
                  <CheckCheck size={33} />
                </div>
                <div>
                  <h2>
                    {progress === 100
                      ? "첫 한 달의 준비를 모두 마쳤어요!"
                      : "작은 첫걸음이 쌓이면 익숙해져요."}
                  </h2>
                  <p>
                    적응을 돕는 권장 목록입니다. 소속기관 안내에 맞춰
                    활용하세요.
                  </p>
                </div>
                <div className="checklist-total">
                  <strong>
                    {preferences.checks.length}
                    <span> / {allChecks.length}</span>
                  </strong>
                  <span>완료한 첫걸음</span>
                </div>
              </section>
              <div className="checklist-columns">
                {checklist.map((group, index) => (
                  <section className="checklist-group" key={group.id}>
                    <div className="checklist-group-title">
                      <span>{index + 1}</span>
                      <div>
                        <h2>{group.title}</h2>
                        <p>{group.subtitle}</p>
                      </div>
                      <small>
                        {
                          group.items.filter((c) =>
                            preferences.checks.includes(c.id),
                          ).length
                        }
                        /{group.items.length}
                      </small>
                    </div>
                    {group.items.map((c) => (
                      <div
                        className={`check-row ${preferences.checks.includes(c.id) ? "done" : ""}`}
                        key={c.id}
                      >
                        <label>
                          <input
                            type="checkbox"
                            checked={preferences.checks.includes(c.id)}
                            onChange={() => toggleCheck(c.id)}
                          />
                          <span>{c.text}</span>
                        </label>
                        <button
                          className="icon-button"
                          onClick={() => openGuide(c.guide)}
                          aria-label={`${c.text} 안내 보기`}
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    ))}
                  </section>
                ))}
              </div>
              <p className="local-note">
                <Info size={15} />
                체크 상태는 이 브라우저에 자동 저장됩니다.
              </p>
            </>
          )}
          {route.page === "glossary" && (
            <>
              <SectionTitle
                title="쉬운 업무 용어"
                subtitle="처음 듣는 말이 많아도 괜찮아요. 업무 속 의미부터 알아보세요."
              />
              <label className="glossary-search inline-search">
                <Search size={20} />
                <input
                  aria-label="업무 용어 검색"
                  placeholder="예: 품의, 전결, 학교회계"
                  value={route.query}
                  onChange={(e) =>
                    go("glossary", { query: e.target.value }, true)
                  }
                />
              </label>
              <div className="glossary-list">
                {glossary
                  .filter((g) => matches(g[0] + g[1]))
                  .map((g) => (
                    <article className="glossary-item" key={g[0]}>
                      <h2>{g[0]}</h2>
                      <p>{g[1]}</p>
                      <button
                        className="text-button"
                        onClick={() => openGuide(g[2])}
                      >
                        관련 길잡이
                        <ChevronRight size={16} />
                      </button>
                    </article>
                  ))}
              </div>
              {!glossary.some((g) => matches(g[0] + g[1])) && (
                <EmptyState
                  title="아직 등록되지 않은 용어예요"
                  text="다른 단어로 찾아보거나 업무 길잡이를 확인해 보세요."
                />
              )}
            </>
          )}
          <footer>
            <SeoulEducationLogo className="footer-institution" />
            <span>
              서울시교육청 교육행정직을 위한 개인 제작 업무 길잡이 · 교육청 공식
              운영 사이트가 아닙니다.
            </span>
            <button onClick={() => setHelpOpen(true)}>
              이용 안내
              <ExternalLinkIcon size={12} />
            </button>
          </footer>
        </main>
      </div>
      {selected && (
        <Modal
          key={selected.id}
          title={`${currentCategory?.name} · 업무 길잡이`}
          onClose={() => go(route.page, { ...route, article: "" })}
          wide
        >
          <div className="article-body">
            <div className="article-meta">
              <Status status={selected.status} />
              <span>
                {selected.body ? "조사 기준" : "안내 작성"} {selected.updated}
              </span>
            </div>
            <h1>{selected.title}</h1>
            <p className="article-lead">{selected.summary}</p>
            {selected.labels && selected.labels.length > 0 && (
              <LabelChips labels={selected.labels} />
            )}
            <div className="article-actions">
              <button
                className={`button small ${preferences.saved.includes(selected.id) ? "is-saved" : ""}`}
                onClick={() => toggleSaved(selected.id)}
              >
                <Bookmark
                  size={16}
                  fill={
                    preferences.saved.includes(selected.id)
                      ? "currentColor"
                      : "none"
                  }
                />
                {preferences.saved.includes(selected.id)
                  ? "보관함에 저장됨"
                  : "보관함에 저장"}
              </button>
              <button
                className="button small"
                onClick={() => copy(window.location.href)}
              >
                <Copy size={15} />
                링크 복사
              </button>
            </div>
            {selected.status === "draft" && (
              <div className="draft-banner" role="note">
                <AlertTriangle size={18} />
                <div>
                  <strong>소관부서 검토 전 초안입니다.</strong>
                  {selected.origin ?? `지식창고 초안 ${CARDS_DATE}`}. 공식
                  안내가 아니라 조사 자료이며, 아래 「검증에서 지적된 부분」과
                  원문 링크를 함께 확인한 뒤 소속기관 담당자에게 물어보세요.
                </div>
              </div>
            )}
            {selected.review && selected.review.length > 0 && (
              <ReviewNotes notes={selected.review} />
            )}
            {selected.body ? (
              <>
                <h2>카드 내용</h2>
                <Markdown text={selected.body} />
              </>
            ) : (
              <>
                <h2>이 순서로 확인해 보세요</h2>
                <ol className="article-steps">
                  {selected.steps.map((step, index) => (
                    <li key={step}>
                      <span>{index + 1}</span>
                      <p>{step}</p>
                    </li>
                  ))}
                </ol>
              </>
            )}
            <div className="article-caution">
              <Info size={20} />
              <div>
                <strong>확인이 필요한 부분</strong>
                <p>{selected.caution}</p>
              </div>
            </div>
            {selected.body ? (
              (selected.scope || selected.refresh) && (
                <dl className="card-facts">
                  {selected.scope && (
                    <>
                      <dt>적용범위</dt>
                      <dd>{selected.scope}</dd>
                    </>
                  )}
                  {selected.refresh && (
                    <>
                      <dt>갱신주기</dt>
                      <dd>{selected.refresh}</dd>
                    </>
                  )}
                </dl>
              )
            ) : (
              <div className="contact-line">
                <CircleHelp size={18} />
                <span>문의·확인</span>
                <strong>{selected.contact}</strong>
              </div>
            )}
            <h2>근거와 참고자료</h2>
            {selected.sources.length ? (
              <div className="article-sources">
                {selected.sources.map((s) => (
                  <div key={s.url}>
                    <ExternalLink href={s.url}>{s.title}</ExternalLink>
                    <p>{s.note}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pending-source">
                <FileText size={21} />
                <div>
                  <strong>
                    {selected.status === "tip"
                      ? "적응을 위한 실무 제안입니다."
                      : "이 업무의 상세 매뉴얼을 기다리고 있어요."}
                  </strong>
                  <p>
                    현재 공식 세부 절차를 검토한 자료는 없습니다. 자료실에서
                    관련 파일을 추가할 수 있습니다.
                  </p>
                </div>
              </div>
            )}
            <p className="source-date">
              공식 자료 검색일 {selected.body ? CARDS_DATE : REVIEW_DATE} ·
              자동 갱신되지 않습니다. 처리 시점의 현행본을 확인하세요.
            </p>
            {allManuals.filter((m) => m.category === selected.category).length >
              0 && (
              <button
                className="related-manual-link"
                onClick={() => go("manuals", { category: selected.category })}
              >
                <FolderOpen size={18} />이 분야 자료실 보기
                <ArrowRight size={16} />
              </button>
            )}
            <details className="ai-prompt">
              <summary>
                <Sparkles size={18} />
                <span>AI에게 더 구체적으로 질문하기</span>
                <ChevronRight size={16} />
              </summary>
              <p>
                상황을 바꿔 질문할 수 있는 문장입니다. AI 답변도 출처 확인이
                필요하며, 개인정보·비공개 업무자료는 넣지 마세요.
              </p>
              <textarea
                readOnly
                rows={7}
                aria-label="AI 질문문"
                value={makePrompt(selected.id)}
              />
              <button
                className="button small"
                onClick={() => copy(makePrompt(selected.id))}
              >
                <Copy size={15} />
                질문문 복사
              </button>
            </details>
            <div className="related-guides">
              <h2>함께 보면 좋은 길잡이</h2>
              {guides
                .filter(
                  (g) =>
                    g.category === selected.category && g.id !== selected.id,
                )
                .slice(0, 2)
                .map((g) => (
                  <button onClick={() => openGuide(g.id)} key={g.id}>
                    {g.title}
                    <ChevronRight size={17} />
                  </button>
                ))}
            </div>
          </div>
        </Modal>
      )}
      {route.article && !selected && (
        <Modal title="길잡이를 찾을 수 없어요" onClose={() => go("guides")}>
          <EmptyState
            title="변경되었거나 없는 길잡이입니다"
            text="전체 업무 길잡이에서 다시 찾아주세요."
            action={
              <button className="button primary" onClick={() => go("guides")}>
                전체 길잡이 보기
              </button>
            }
          />
        </Modal>
      )}
      {helpOpen && (
        <Modal
          title="신규는 여기로 이용 안내"
          onClose={() => setHelpOpen(false)}
        >
          <div className="help-content">
            <span className="category-icon purple">
              <Sprout size={27} />
            </span>
            <h2>서울교육의 첫걸음을 함께해요.</h2>
            <p>
              서울시교육청 교육행정직 신규자를 위한 개인 제작 업무 길잡이입니다.
              서울특별시교육청이 운영하거나 공식 검증한 사이트는 아닙니다.
            </p>
            <h3>업무 안내의 확인 범위</h3>
            <p>
              공식 출처 안내는 자료로 연결하는 기능입니다. ‘자료 확인 필요’
              안내는 상세 매뉴얼을 받기 전 작성한 확인 목록이며, ‘적응 팁’은
              업무 적응을 위한 제안입니다. 단가·휴가 일수·계약 한도 등은
              확정하지 않았습니다.
            </p>
            <h3>초안·검토 전 지식카드</h3>
            <p>
              ‘초안·검토 전’ 표시가 있는 84장은 {CARDS_DATE} 기준으로 조사한
              신규자 지식창고 초안입니다. 독립 검증에서 지적된 부분은 카드마다
              「검증에서 지적된 부분」으로 표시했고, 수정문안이 있는 항목은
              본문에 반영했습니다. 소관부서 실무검토를 거친 자료가 아니므로
              업무 처리의 근거로 삼지 말고, 원문 링크와 소속기관 안내로
              확인하세요.
            </p>
            <h3>나의 기록과 자료</h3>
            <p>
              즐겨찾기·체크리스트와 내가 추가한 파일은 현재 기기의 이 브라우저에
              저장됩니다. 로그인·기기 동기화·공용 업로드 기능은 없습니다. 자료
              백업은 자료실의 파일과 설명을 포함하며, 즐겨찾기와 체크 상태는
              포함하지 않습니다.
            </p>
            <h3>자료를 계속 채울 수 있어요</h3>
            <p>
              자료실에서 파일이나 링크를 추가하세요. 모든 이용자에게 제공할 공통
              매뉴얼은 사이트 운영자가 공통 자료 목록에 반영할 수 있습니다.
            </p>
            <p className="source-date">
              자료 검색·초기 안내 작성: {REVIEW_DATE}
            </p>
            <ExternalLink href={sources.education.url} className="text-button">
              서울특별시교육청 공식 사이트
            </ExternalLink>
          </div>
        </Modal>
      )}
      {copyFallback && (
        <Modal
          title="내용을 선택해 복사해 주세요"
          onClose={() => setCopyFallback("")}
        >
          <div className="help-content">
            <p>브라우저에서 자동 복사를 허용하지 않았습니다.</p>
            <textarea
              aria-label="복사할 내용"
              readOnly
              value={copyFallback}
              rows={10}
              onFocus={(e) => e.target.select()}
            />
          </div>
        </Modal>
      )}
      {directionOpen && (
        <SeoulDirectionModal onClose={() => setDirectionOpen(false)} />
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{toast}</span>
          <button aria-label="알림 닫기" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}

function makePrompt(id: string) {
  const guide = guides.find((g) => g.id === id)!;
  return `나는 서울시교육청 소속 신규 교육행정직 지방공무원입니다.\n궁금한 업무: ${guide.title}\n근무지: [학교 / 교육지원청 / 본청 / 직속기관]\n내 상황: [개인정보와 비공개 내용을 제외하고 작성]\n\n1. 처리 시점의 최신 법령과 서울시교육청 지침을 검색해 확인해 주세요.\n2. 적용 대상(지방공무원·교원·교육공무직)과 회계(학교회계·교육비특별회계)를 구분해 주세요.\n3. 근거의 문서명·조항·시행일·원문 링크를 제시하고, 확인하지 못한 것은 모른다고 표시해 주세요.\n4. 단계별 확인 목록과 소속기관 담당자에게 물어볼 질문을 정리해 주세요.\n\n이 사이트의 안내는 참고용이며 내부 세부 절차는 아직 검증하지 않았습니다.`;
}
