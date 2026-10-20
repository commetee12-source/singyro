import { useRef, useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Download,
  FilePlus2,
  FileText,
  Link,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Info,
} from "lucide-react";
import { categories } from "./data";
import { EmptyState, ExternalLink, Modal, SectionTitle } from "./components";
import {
  downloadBlob,
  exportManuals,
  importManuals,
  removeManual,
  safeUrl,
  saveManual,
} from "./storage";
import type { CategoryId, Manual } from "./types";

export function ManualLibrary({
  manuals,
  loading,
  onRefresh,
  notify,
  initialCategory = "all",
}: {
  manuals: Manual[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  notify: (message: string) => void;
  initialCategory?: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [scope, setScope] = useState("all");
  const [editing, setEditing] = useState<Manual | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState<Manual | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inScope = (m: Manual) =>
    scope === "all" ||
    (scope === "mine" && !m.builtin) ||
    (scope === "law" && m.builtin && m.kind === "law") ||
    (scope === "official" && m.builtin && m.kind !== "law");
  const filtered = manuals.filter(
    (m) =>
      (category === "all" || m.category === category) &&
      inScope(m) &&
      `${m.title} ${m.description} ${m.publisher} ${m.year}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  async function act(work: () => Promise<void>) {
    setBusy(true);
    try {
      await work();
    } catch (e) {
      notify(
        e instanceof Error
          ? e.message
          : "저장 공간을 사용할 수 없습니다. 브라우저 설정을 확인해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <SectionTitle
        title="매뉴얼·자료실"
        subtitle="필요한 지침과 나만의 업무자료를 한곳에 모아두세요."
        action={
          <button className="button primary" onClick={() => setEditing("new")}>
            <Plus size={17} />
            자료 추가
          </button>
        }
      />
      <div className="notice library-notice">
        <Info size={19} />
        <div>
          <strong>내가 추가한 자료는 이 브라우저에만 저장돼요.</strong>
          <p>
            다른 사람에게 자동 공유되지 않으며, 브라우저 데이터 삭제 시
            사라집니다. 파일까지 포함되는 ‘자료 백업’을 이용해 주세요.
          </p>
        </div>
      </div>
      <div className="library-tools">
        <div className="segmented">
          <button
            className={scope === "all" ? "active" : ""}
            onClick={() => setScope("all")}
          >
            전체 자료 <span>{manuals.length}</span>
          </button>
          <button
            className={scope === "official" ? "active" : ""}
            onClick={() => setScope("official")}
          >
            공식 자료·허브{" "}
            <span>
              {manuals.filter((m) => m.builtin && m.kind !== "law").length}
            </span>
          </button>
          <button
            className={scope === "law" ? "active" : ""}
            onClick={() => setScope("law")}
          >
            법령·자치법규{" "}
            <span>
              {manuals.filter((m) => m.builtin && m.kind === "law").length}
            </span>
          </button>
          <button
            className={scope === "mine" ? "active" : ""}
            onClick={() => setScope("mine")}
          >
            내가 추가한 자료{" "}
            <span>{manuals.filter((m) => !m.builtin).length}</span>
          </button>
        </div>
        <div className="button-row">
          <button
            className="button small"
            disabled={busy}
            onClick={() =>
              act(async () => {
                await exportManuals();
                notify("내 자료와 첨부파일 백업을 내려받았습니다.");
              })
            }
          >
            <ArrowDownToLine size={15} />
            자료 백업
          </button>
          <button
            className="button small"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <ArrowUpFromLine size={15} />
            백업 불러오기
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file)
                void act(async () => {
                  const count = await importManuals(file);
                  setRemoved(null);
                  await onRefresh();
                  notify(
                    `${count}개 자료를 복원했습니다. 동일 ID 자료는 기존 내용을 유지합니다.`,
                  );
                });
            }}
          />
        </div>
      </div>
      <div className="filter-bar">
        <label className="inline-search">
          <Search size={18} />
          <input
            aria-label="자료 검색"
            placeholder="자료명, 발행기관, 연도 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="자료 업무 분야"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">모든 업무 분야</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {removed && (
        <div className="undo-notice" role="status">
          ‘{removed.title}’ 자료를 삭제했습니다.
          <button
            onClick={() =>
              act(async () => {
                await saveManual(removed);
                setRemoved(null);
                await onRefresh();
                notify("자료를 복구했습니다.");
              })
            }
            disabled={busy}
          >
            되돌리기
          </button>
        </div>
      )}
      <div className="library-results" aria-live="polite">
        총 <strong>{filtered.length}</strong>개 자료{busy && " · 처리 중…"}
      </div>
      {loading ? (
        <div className="loading-state" role="status">
          자료를 불러오는 중이에요…
        </div>
      ) : filtered.length ? (
        <div className="manual-list">
          {filtered.map((m) => (
            <article key={m.id} className="manual-row">
              <div className={`file-icon ${m.file ? "purple" : "blue"}`}>
                {m.file ? <FileText size={25} /> : <Link size={24} />}
              </div>
              <div className="manual-info">
                <div className="manual-labels">
                  <span>
                    {categories.find((c) => c.id === m.category)?.short}
                  </span>
                  <span>
                    {m.builtin
                      ? m.kind === "law"
                        ? "법령·규칙"
                        : "공통 자료"
                      : "내 자료"}
                  </span>
                  <span>{m.year}</span>
                </div>
                <h3>{m.title}</h3>
                <p>{m.description}</p>
                <small>
                  {m.publisher || "발행기관 미입력"}
                  {m.filename &&
                    ` · ${m.filename} · ${((m.file?.size ?? 0) / 1024 / 1024).toFixed(1)}MB`}
                </small>
              </div>
              <div className="manual-actions">
                {m.file && (
                  <button
                    className="button small"
                    onClick={() => downloadBlob(m.file!, m.filename!)}
                  >
                    <Download size={16} />
                    파일 받기
                  </button>
                )}
                {m.url && safeUrl(m.url) && (
                  <ExternalLink href={m.url} className="button small">
                    {m.url.startsWith("/manuals/") ? "파일 받기" : "원문 보기"}
                  </ExternalLink>
                )}
                {!m.builtin && (
                  <div className="row">
                    <button
                      className="icon-button"
                      onClick={() => setEditing(m)}
                      aria-label={`${m.title} 수정`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-button"
                      disabled={busy}
                      onClick={() =>
                        act(async () => {
                          await removeManual(m.id);
                          setRemoved(m);
                          await onRefresh();
                        })
                      }
                      aria-label={`${m.title} 삭제`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            query || category !== "all"
              ? "조건에 맞는 자료가 없어요"
              : "첫 번째 업무자료를 추가해 보세요"
          }
          text="PDF·한글·엑셀 파일이나 공식 자료 링크를 등록할 수 있어요."
          action={
            <button
              className="button primary"
              onClick={() => setEditing("new")}
            >
              <FilePlus2 size={17} />
              자료 추가
            </button>
          }
        />
      )}
      <div className="subtle-callout">
        <FilePlus2 size={21} />
        <div>
          <strong>서울교육 업무자료를 차근차근 채워갑니다</strong>
          <p>
            공식 자료·허브와 법령 목록은 2026-09-13 조사 기준이며 링크 접속만
            확인했습니다. 원문 본문의 현행 여부와 적용 대상은 열어서 확인하세요.
            현재 검색은 등록된 제목·설명·발행기관을 대상으로 합니다.
          </p>
        </div>
      </div>
      {editing && (
        <ManualForm
          manual={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            setRemoved(null);
            await onRefresh();
            notify("자료를 이 브라우저에 저장했습니다.");
          }}
        />
      )}
    </>
  );
}

function ManualForm({
  manual,
  onClose,
  onSaved,
}: {
  manual?: Manual;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(manual?.title ?? "");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  function selectFile(value?: File) {
    if (!value) return;
    if (
      value.size > 20 * 1024 * 1024 ||
      !/\.(pdf|hwp|hwpx|doc|docx|xls|xlsx|ppt|pptx|txt|md)$/i.test(value.name)
    ) {
      setError("20MB 이하 PDF·한글·워드·엑셀·PPT·텍스트 파일을 선택해 주세요.");
      return;
    }
    setError("");
    setFile(value);
    if (!title) setTitle(value.name.replace(/\.[^.]+$/, ""));
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const url = String(form.get("url") || "").trim();
    try {
      if (url && !safeUrl(url))
        throw new Error(
          "원문 주소는 https://로 시작하는 주소를 입력해 주세요.",
        );
      await saveManual({
        id: manual?.id ?? crypto.randomUUID(),
        title: title.trim(),
        category: String(form.get("category")) as CategoryId,
        description: String(form.get("description") || "").trim(),
        publisher: String(form.get("publisher") || "").trim(),
        year: String(form.get("year") || "").trim(),
        addedAt: manual?.addedAt ?? new Date().toISOString().slice(0, 10),
        ...(url ? { url } : {}),
        ...(file || manual?.file
          ? {
              file: file || manual!.file,
              filename: file?.name || manual!.filename,
            }
          : {}),
      });
      await onSaved();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "자료를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={manual ? "자료 수정" : "새 자료 추가"} onClose={onClose}>
      <form className="manual-form" onSubmit={submit}>
        <p className="form-intro">
          업무자료를 파일이나 원문 링크로 보관하세요.
        </p>
        <button
          type="button"
          className={`dropzone ${dragging ? "dragging" : ""}`}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            selectFile(e.dataTransfer.files[0]);
          }}
        >
          <Upload size={26} />
          <strong>
            {file?.name ||
              manual?.filename ||
              "파일을 끌어오거나 클릭해서 선택하세요"}
          </strong>
          <span>PDF, HWP, HWPX, DOCX, XLSX, PPTX, TXT 등 · 최대 20MB</span>
        </button>
        <input
          ref={fileInput}
          type="file"
          hidden
          accept=".pdf,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md"
          onChange={(e) => selectFile(e.target.files?.[0])}
        />
        <label>
          자료 제목 <span className="required">*</span>
          <input
            required
            value={title}
            maxLength={150}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 학교회계 업무 매뉴얼"
          />
        </label>
        <div className="form-grid">
          <label>
            업무 분야 <span className="required">*</span>
            <select name="category" defaultValue={manual?.category ?? "start"}>
              {categories.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            기준 연도
            <input
              name="year"
              maxLength={20}
              defaultValue={manual?.year ?? String(new Date().getFullYear())}
              placeholder="예: 2026"
            />
          </label>
        </div>
        <label>
          발행기관
          <input
            name="publisher"
            maxLength={150}
            defaultValue={manual?.publisher}
            placeholder="예: 서울특별시교육청"
          />
        </label>
        <label>
          원문 주소
          {!file && !manual?.file && (
            <span className="field-hint"> · 파일이 없으면 필수</span>
          )}
          <input
            type="url"
            name="url"
            maxLength={2048}
            defaultValue={manual?.url}
            placeholder="https://"
            required={!file && !manual?.file}
          />
        </label>
        <label>
          간단한 설명
          <textarea
            name="description"
            rows={3}
            maxLength={1000}
            defaultValue={manual?.description}
            placeholder="어떤 업무에 쓰는 자료인지, 확인해야 할 내용 등을 적어 주세요."
          />
        </label>
        <p className="form-footnote">
          이 브라우저에만 저장됩니다. 공개 가능한 자료인지 확인해 주세요.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="button"
            onClick={onClose}
            disabled={busy}
          >
            취소
          </button>
          <button className="button primary" type="submit" disabled={busy}>
            {busy ? "저장 중…" : "자료 저장"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
