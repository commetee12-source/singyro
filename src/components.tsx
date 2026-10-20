import { useEffect, useId, useRef, type ReactNode } from "react";
import {
  AlertTriangle,
  Sprout,
  CalendarDays,
  Wallet,
  Package,
  Coins,
  Monitor,
  FileText,
  School,
  X,
  ArrowUpRight,
  Bookmark,
  ChevronRight,
  Link,
  type LucideProps,
} from "lucide-react";
import { categories } from "./data";
import type { Guide, GuideStatus, ReviewNote } from "./types";

const icons: Record<string, React.ComponentType<LucideProps>> = {
  sprout: Sprout,
  calendar: CalendarDays,
  wallet: Wallet,
  package: Package,
  coins: Coins,
  monitor: Monitor,
  file: FileText,
  school: School,
};
export function CategoryIcon({
  name,
  ...props
}: LucideProps & { name: string }) {
  const Icon = icons[name] || FileText;
  return <Icon {...props} />;
}
export function Status({ status }: { status: GuideStatus }) {
  return (
    <span className={`status ${status}`}>
      <span />
      {status === "reference"
        ? "공식 출처 안내"
        : status === "tip"
          ? "적응 팁"
          : status === "draft"
            ? "초안·검토 전"
            : "자료 확인 필요"}
    </span>
  );
}
const LABEL_CLASS: Record<string, string> = {
  "전국 공통": "national",
  "서울교육청 고유": "seoul",
  "내부확인 필요": "internal",
};
export function LabelChips({ labels }: { labels: string[] }) {
  return (
    <div className="label-chips" aria-label="적용 범위 라벨">
      {labels.map((label) => (
        <span key={label} className={`label-chip ${LABEL_CLASS[label] ?? ""}`}>
          {label}
        </span>
      ))}
    </div>
  );
}
const LEVEL_LABEL: Record<ReviewNote["level"], string> = {
  high: "높음",
  medium: "중간",
  low: "낮음",
};
export function ReviewNotes({ notes }: { notes: ReviewNote[] }) {
  return (
    <section className="review-box" aria-label="검증 검토 결과">
      <h3>
        <AlertTriangle size={16} />
        검증에서 지적된 부분 {notes.length}건
      </h3>
      <ul>
        {notes.map((n) => (
          <li key={n.ref + n.note.slice(0, 12)}>
            <span className={`review-level ${n.level}`}>
              {LEVEL_LABEL[n.level]}
            </span>
            <div>
              {n.note}
              <small>
                {n.ref} · {n.applied ? "수정문안을 본문에 반영함" : "검토 메모"}
              </small>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------- 지식카드 본문용 최소 마크다운 렌더러 ----------------
   지원: ###/## 소제목, 문단, - / 1. 목록, - [ ] 확인란, > 인용, | 표 |, ---,
   **굵게**, [링크](https://…), `코드`, [1] 각주 번호. 외부 라이브러리 없음. */
const INLINE =
  /(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|`[^`]+`|\[\d{1,2}\])/g;
function inline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(part);
    if (link)
      return (
        <a key={key} href={link[2]} target="_blank" rel="noopener noreferrer">
          {link[1]}
        </a>
      );
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={key}>{part.slice(1, -1)}</code>;
    if (/^\[\d{1,2}\]$/.test(part)) return <sup key={key}>{part}</sup>;
    return part;
  });
}
type Block =
  | { kind: "h"; text: string }
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: { text: string; check: boolean }[] }
  | { kind: "ol"; items: string[] }
  | { kind: "quote"; lines: string[] }
  | { kind: "table"; rows: string[][] }
  | { kind: "hr" };
function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let i = 0;
  const last = () => blocks[blocks.length - 1];
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) {
      i += 1;
      continue;
    }
    const heading = /^#{2,4}\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({ kind: "h", text: heading[1] });
      i += 1;
      continue;
    }
    if (/^-{3,}$/.test(line)) {
      blocks.push({ kind: "hr" });
      i += 1;
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i]
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i += 1;
      }
      blocks.push({ kind: "table", rows });
      continue;
    }
    if (line.startsWith(">")) {
      const prev = last();
      const content = line.replace(/^>\s?/, "");
      if (prev?.kind === "quote") prev.lines.push(content);
      else blocks.push({ kind: "quote", lines: [content] });
      i += 1;
      continue;
    }
    const check = /^[-*]\s+\[([ xX])\]\s+(.+)$/.exec(line);
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (check || bullet) {
      const item = check
        ? { text: check[2], check: true }
        : { text: bullet![1], check: false };
      const prev = last();
      if (prev?.kind === "ul") prev.items.push(item);
      else blocks.push({ kind: "ul", items: [item] });
      i += 1;
      continue;
    }
    const numbered = /^\d+\.\s+(.+)$/.exec(line);
    if (numbered) {
      const prev = last();
      if (prev?.kind === "ol") prev.items.push(numbered[1]);
      else blocks.push({ kind: "ol", items: [numbered[1]] });
      i += 1;
      continue;
    }
    const prev = last();
    if (prev?.kind === "p" && lines[i - 1]?.trim()) prev.lines.push(line);
    else blocks.push({ kind: "p", lines: [line] });
    i += 1;
  }
  return blocks;
}
export function Markdown({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className="md-body">
      {blocks.map((b, bi) => {
        const k = `b${bi}`;
        switch (b.kind) {
          case "h":
            return <h3 key={k}>{inline(b.text, k)}</h3>;
          case "hr":
            return <hr key={k} />;
          case "quote":
            return (
              <blockquote key={k}>
                {b.lines.map((l, li) => (
                  <p key={li}>{inline(l, `${k}-${li}`)}</p>
                ))}
              </blockquote>
            );
          case "ul":
            return (
              <ul key={k}>
                {b.items.map((item, li) => (
                  <li key={li} className={item.check ? "check" : ""}>
                    {item.check && <span aria-hidden="true">☐</span>}
                    <span>{inline(item.text, `${k}-${li}`)}</span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={k}>
                {b.items.map((item, li) => (
                  <li key={li}>{inline(item, `${k}-${li}`)}</li>
                ))}
              </ol>
            );
          case "table":
            return (
              <div className="md-table" key={k}>
                <table>
                  <thead>
                    <tr>
                      {b.rows[0]?.map((c, ci) => (
                        <th key={ci}>{inline(c, `${k}-h${ci}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.slice(1).map((row, ri) => (
                      <tr key={ri}>
                        {row.map((c, ci) => (
                          <td key={ci}>{inline(c, `${k}-${ri}-${ci}`)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return (
              <p key={k}>
                {b.lines.map((l, li) => (
                  <span key={li}>
                    {li > 0 && <br />}
                    {inline(l, `${k}-${li}`)}
                  </span>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      className={`modal ${wide ? "wide" : ""}`}
      ref={ref}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-top">
        <span id={titleId}>{title}</span>
        <button className="icon-button" onClick={onClose} aria-label="닫기">
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function GuideCard({
  guide,
  saved,
  onOpen,
  onSave,
}: {
  guide: Guide;
  saved: boolean;
  onOpen: () => void;
  onSave: () => void;
}) {
  const category = categories.find((c) => c.id === guide.category)!;
  return (
    <article className="guide-card">
      <div className="card-meta">
        <span className="category-caption">{category.short}</span>
        <button
          className={`icon-button bookmark ${saved ? "selected" : ""}`}
          aria-label={`${guide.title} ${saved ? "저장 해제" : "저장"}`}
          aria-pressed={saved}
          onClick={onSave}
        >
          <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <button className="guide-open" onClick={onOpen}>
        <h3>{guide.title}</h3>
        <p>{guide.summary}</p>
      </button>
      <div className="card-bottom">
        <Status status={guide.status} />
        <button
          onClick={onOpen}
          className="text-button"
          aria-label={`${guide.title} 자세히 보기`}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </article>
  );
}
export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <FileText size={27} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function ExternalLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
      <ArrowUpRight size={16} aria-label="새 창" />
    </a>
  );
}
export function SchoolIllustration() {
  return (
    <svg
      className="school-illustration"
      viewBox="0 0 410 310"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="223" cy="267" rx="155" ry="16" fill="#DBD7EF" />
      <path
        d="M67 117a13 13 0 0 1 13-13h69l18 20h166v121a15 15 0 0 1-15 15H82a15 15 0 0 1-15-15Z"
        fill="#D1B555"
      />
      <g transform="rotate(8 242 147)">
        <rect x="147" y="53" width="172" height="185" rx="9" fill="#BAAFDD" />
        <path d="M165 72h127v143H165z" fill="#CEC5E7" />
      </g>
      <g transform="rotate(-7 205 146)">
        <rect x="110" y="43" width="165" height="192" rx="7" fill="#FFF" />
        <path
          d="M135 68h66m-66 13h111m-111 14h91"
          stroke="#D9D5E7"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path d="M139 120h102v75H139z" fill="#E7E3F5" />
        <path d="m128 126 62-43 62 43" fill="#998AC7" />
        <path d="M170 148h35v47h-35z" fill="#998AC7" />
        <path d="M148 139h12v16h-12zm67 0h12v16h-12z" fill="white" />
        <circle cx="190" cy="112" r="8" fill="white" />
        <path
          d="M190 106v7h5"
          stroke="#998AC7"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M64 159a12 12 0 0 1 12-13h80l17 17h174a9 9 0 0 1 9 11l-20 79a15 15 0 0 1-15 12H85a14 14 0 0 1-14-13Z"
        fill="#EED284"
      />
      <path
        d="M76 160h79l18 17h167"
        stroke="#F9E6B2"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="106" y="197" width="114" height="35" rx="5" fill="#FFF9E9" />
      <path
        d="M121 208h31m-31 9h78"
        stroke="#C4A65F"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <g transform="rotate(13 324 106)">
        <rect x="288" y="77" width="77" height="63" rx="13" fill="#7764B5" />
        <path
          d="m309 107 10 10 18-21"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <path
        d="M54 76v18m-9-9h18"
        stroke="#AEA0D1"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="353" cy="199" r="5" fill="#AA9ACD" />
      <path
        d="M291 30v13m-6.5-6.5h13"
        stroke="#BEAEDC"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M43 226c-6-17 5-32 5-32s17 10 11 27m-5 18v-24"
        stroke="#8AA697"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function SourceMark() {
  return <Link size={14} aria-hidden="true" />;
}
