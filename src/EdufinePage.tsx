import { useMemo, useState } from "react";
import {
  BookMarked,
  MessageSquareText,
  Monitor,
  Scale,
  Search,
  TriangleAlert,
} from "lucide-react";
import { EmptyState, ExternalLink, SectionTitle } from "./components";
import { ExpenditureSystemCard } from "./EdufineWalkthroughPage";
import {
  askTips,
  edufineTerms,
  matchesTerm,
  termAreas,
  type EdufineTerm,
  type TermArea,
} from "./edufine";

/** 슬래시 명령어로 분야를 바로 지정한다. 예: "/지출 반납" */
function parseQuery(raw: string): { area: TermArea | null; text: string } {
  const match = raw.match(/^\/(\S+)\s*(.*)$/);
  if (!match) return { area: null, text: raw };
  const found = termAreas.find((a) => a.id === match[1]);
  if (!found) return { area: null, text: raw };
  return { area: found.id, text: match[2] };
}

function TermRow({ term }: { term: EdufineTerm }) {
  return (
    <article className="term-row">
      <div className="term-head">
        <h3>{term.term}</h3>
        <span className="term-area">{term.area}</span>
      </div>
      <p className="term-plain">
        {term.plain.map((word) => (
          <span key={word}>{word}</span>
        ))}
      </p>
      <p className="term-meaning">{term.meaning}</p>
      {term.basis && (
        <p className="term-basis">
          <Scale size={14} />
          <ExternalLink href={term.basis.url}>
            {term.basis.law}
          </ExternalLink>
          <small>시행 {term.basis.effective}</small>
        </p>
      )}
      {term.caution && (
        <p className="term-caution">
          <TriangleAlert size={14} />
          {term.caution}
        </p>
      )}
    </article>
  );
}

export function EdufinePage({
  onOpenGuide,
  onOpenExpenditure,
  relatedGuides,
  relatedManuals,
}: {
  onOpenGuide: (id: string) => void;
  onOpenExpenditure: () => void;
  relatedGuides: { id: string; title: string; summary: string }[];
  relatedManuals: { id: string; title: string; publisher: string; url?: string }[];
}) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState<TermArea | null>(null);

  const parsed = useMemo(() => parseQuery(query), [query]);
  const activeArea = parsed.area ?? area;
  const results = useMemo(
    () =>
      edufineTerms.filter(
        (term) =>
          (!activeArea || term.area === activeArea) &&
          matchesTerm(term, parsed.text),
      ),
    [activeArea, parsed.text],
  );

  return (
    <>
      <SectionTitle
        title="K-에듀파인"
        subtitle="시스템이 쓰는 말부터 익혀요. 내 말을 프로그램 말로 바꾸면 절반은 풀립니다."
      />

      <section className="edufine-intro">
        <div className="edufine-intro-icon">
          <Monitor size={26} />
        </div>
        <div>
          <strong>왜 화면을 못 찾을까</strong>
          <p>
            시스템을 몰라서가 아니라 <b>단어가 달라서</b>인 경우가 대부분입니다.
            「돈 돌려주기」를 찾으면 안 나오지만 <b>「지출반납」</b>으로 찾으면
            나옵니다. 아래 용어사전에서 내 말을 프로그램 말로 먼저 바꿔 보세요.
          </p>
        </div>
      </section>

      <div className="edufine-search">
        <Search size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="내 말로 찾아보세요. 예: 돈 돌려주기 · ㅈㅊ · /예산 이월"
          aria-label="K-에듀파인 용어 검색"
        />
        {query && (
          <button className="text-button" onClick={() => setQuery("")}>
            지우기
          </button>
        )}
      </div>
      <p className="edufine-search-hint">
        초성으로 찾을 수 있어요(<b>ㅈㅊ</b> → 지출). 분야를 정해 찾으려면
        <b> /지출</b>, <b>/예산</b>처럼 앞에 붙이세요.
      </p>

      <div className="edufine-areas">
        <button
          className={`area-chip ${!activeArea ? "active" : ""}`}
          onClick={() => {
            setArea(null);
            setQuery(parsed.text);
          }}
        >
          전체
        </button>
        {termAreas.map((a) => (
          <button
            key={a.id}
            className={`area-chip ${activeArea === a.id ? "active" : ""}`}
            onClick={() => {
              setArea(a.id);
              setQuery(parsed.text);
            }}
            title={a.hint}
          >
            {a.label}
          </button>
        ))}
      </div>

      {activeArea === "지출" && (
        <ExpenditureSystemCard onOpen={onOpenExpenditure} />
      )}

      {results.length ? (
        <div className="term-list">
          {results.map((term) => (
            <TermRow key={term.id} term={term} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="찾는 용어가 아직 없어요"
          text="용어사전은 계속 채우는 중입니다. 다른 말로 찾아보거나, 아래 관련 자료와 지식카드를 확인해 보세요."
        />
      )}

      <SectionTitle
        title="질문을 정확하게 만드는 법"
        subtitle="사람에게 묻든 AI에게 묻든 같습니다. 빠진 조건을 채우면 답이 하나로 좁혀져요."
      />
      <div className="ask-tips">
        {askTips.map((tip) => (
          <article key={tip.title} className="ask-tip">
            <h3>
              <MessageSquareText size={17} />
              {tip.title}
            </h3>
            <p className="ask-bad">
              <span>이렇게 말고</span>
              {tip.bad}
            </p>
            <p className="ask-good">
              <span>이렇게</span>
              {tip.good}
            </p>
            <p className="ask-why">{tip.why}</p>
          </article>
        ))}
      </div>

      <SectionTitle
        title="서울 최신 화면 절차는 확인이 필요합니다"
        subtitle="공개 따라하기 자료와 실제 업무 화면은 다를 수 있습니다."
      />
      <section className="edufine-pending">
        <TriangleAlert size={19} />
        <div>
          <p>
            지출 분야의 따라하기는 AI-SEN 공개 자료를 연결한 학습용입니다.
            서울시교육청 최신 K-에듀파인 화면 및 기관별 권한과 일치하는지는
            확인하지 못했습니다. 실제 처리 전에는 소속기관의 최신 매뉴얼과
            화면을 함께 확인해 주세요.
          </p>
          <p>
            화면 조작에 도움이 필요하면 아래 두 곳을 이용하세요. 둘 다 답을 받은
            뒤 <b>소속기관 회계·재무 담당에게 한 번 더 확인</b>하는 것이 안전합니다.
          </p>
          <div className="edufine-links">
            <ExternalLink href="https://chatbot.aisen.store/" className="chip-link">
              AI-SEN 챗봇 K-에듀파인 탭
            </ExternalLink>
            <ExternalLink href="https://baro.sen.go.kr/" className="chip-link">
              교육행정지원시스템 BARO
            </ExternalLink>
          </div>
          <p className="edufine-credit">
            이 페이지의 용어사전·질문 요령 구성은 서울시교육청 교육행정 지침
            챗봇 <b>AI-SEN</b>의 공개 사용설명서를 참고해 만들었습니다.
          </p>
        </div>
      </section>

      {relatedGuides.length > 0 && (
        <>
          <SectionTitle title="관련 지식카드" />
          <div className="edufine-related">
            {relatedGuides.map((guide) => (
              <button
                key={guide.id}
                className="related-card"
                onClick={() => onOpenGuide(guide.id)}
              >
                <BookMarked size={17} />
                <strong>{guide.title}</strong>
                <span>{guide.summary}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {relatedManuals.length > 0 && (
        <>
          <SectionTitle
            title="관련 자료"
            subtitle="서울 최신판을 확보하기 전까지는 용어·기능 학습용으로만 봅니다."
          />
          <div className="edufine-related">
            {relatedManuals.map((manual) => (
              <div key={manual.id} className="related-card static">
                <strong>{manual.title}</strong>
                <span>{manual.publisher}</span>
                {manual.url && (
                  <ExternalLink href={manual.url} className="text-button">
                    자료 보기
                  </ExternalLink>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
