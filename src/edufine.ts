/**
 * K-에듀파인 안내 데이터.
 *
 * 구성은 AI-SEN(chatbot.aisen.store) 공개 사용설명서의 3탭 격리·슬래시 명령어·
 * 단어 정제기 개념을 참고했다. 다만 화면 절차(메뉴 위치·버튼 순서)는 서울 최신
 * 매뉴얼 원문을 확보하기 전까지 싣지 않는다. 추측으로 채우면 신규자가 잘못된
 * 화면을 찾아 헤매고, 이 사이트의 다른 카드가 지키는 출처 규칙도 무너진다.
 */

export interface TermBasis {
  /** 예: "지방회계법 제29조" */
  law: string;
  /** 시행일 YYYY-MM-DD */
  effective: string;
  url: string;
}

export interface EdufineTerm {
  id: string;
  /** 시스템·법령에서 쓰는 말 */
  term: string;
  /** 신규자가 실제로 떠올리는 말. 검색어로도 쓴다. */
  plain: string[];
  area: TermArea;
  meaning: string;
  /** 법령 원문으로 확인한 근거. 없으면 시스템 용어라 법령 근거가 없다는 뜻이다. */
  basis?: TermBasis;
  /** 근거 없이 설명한 부분에 붙이는 단서 */
  caution?: string;
}

export type TermArea = "지출" | "예산" | "수입" | "자산" | "권한";

export const termAreas: { id: TermArea; label: string; hint: string }[] = [
  { id: "지출", label: "지출", hint: "계약하고 돈을 내보내는 일" },
  { id: "예산", label: "예산", hint: "편성·이월·성립전 사용" },
  { id: "수입", label: "수입", hint: "받은 돈과 되돌려 줄 돈" },
  { id: "자산", label: "자산", hint: "물품과 재산 관리" },
  { id: "권한", label: "권한", hint: "누가 무엇을 할 수 있는가" },
];

const LAW = {
  회계: "https://www.law.go.kr/법령/지방회계법",
  재정: "https://www.law.go.kr/법령/지방재정법",
};

export const edufineTerms: EdufineTerm[] = [
  {
    id: "term-wonin",
    term: "지출원인행위 (줄여서 원인행위)",
    plain: ["품의", "계약하기", "돈 쓰기로 정하는 것", "발주", "구매 결정"],
    area: "지출",
    meaning:
      "지출의 원인이 되는 계약이나 그 밖의 행위를 말한다. 돈이 실제로 나가기 전, 「쓰겠다」고 정하는 단계다. 배정된 예산의 범위에서만 할 수 있고, 이 행위를 하는 사람을 재무관이라 부른다.",
    basis: {
      law: "지방회계법 제29조(지출원인행위)",
      effective: "2026-01-02",
      url: LAW.회계,
    },
  },
  {
    id: "term-jaemugwan",
    term: "재무관",
    plain: ["누가 결재하지", "계약 담당", "원인행위 하는 사람"],
    area: "권한",
    meaning:
      "지방자치단체의 장, 또는 그 위임을 받아 지출원인행위를 하는 공무원이다. 시스템에서 내 권한이 무엇인지 헷갈릴 때는 「내가 재무관인가, 지출원인행위를 올리는 담당인가」부터 가른다.",
    basis: {
      law: "지방회계법 제29조제2항",
      effective: "2026-01-02",
      url: LAW.회계,
    },
  },
  {
    id: "term-seongrip",
    term: "성립전예산 (예산 성립 전 사용)",
    plain: ["예산 아직 없는데 써야 해", "내려온 돈 먼저 쓰기", "추경 전에 집행"],
    area: "예산",
    meaning:
      "추가경정예산이 성립하기 전에 미리 쓰는 것을 말한다. 용도가 지정되고 소요 전액이 교부된 경비 등 법이 정한 경우에만 가능하며, 쓴 뒤에는 같은 회계연도의 다음 추경에 반드시 계상해야 한다.",
    basis: {
      law: "지방재정법 제45조 단서",
      effective: "2026-07-01",
      url: LAW.재정,
    },
    caution:
      "위 조문은 지방자치단체 예산의 원형 근거다. 학교회계에 그대로 적용되는지는 소속기관의 재무회계 규칙과 회계담당 안내로 확인한다.",
  },
  {
    id: "term-iwol",
    term: "명시이월 / 예산 이월",
    plain: ["올해 못 썼는데 내년에", "남은 예산 넘기기", "이월"],
    area: "예산",
    meaning:
      "회계연도 안에 다 쓰지 못할 사정이 있을 때 다음 회계연도로 넘겨 쓰는 것이다. 명시이월비는 해당 연도와 다음 연도에 걸쳐 지출원인행위를 할 수 있다.",
    basis: {
      law: "지방회계법 제30조",
      effective: "2026-01-02",
      url: LAW.회계,
    },
  },
  {
    id: "term-gwaonap",
    term: "과오납금 반환",
    plain: ["더 받았어요", "잘못 들어온 돈", "돌려줘야 하는 수입"],
    area: "수입",
    meaning:
      "잘못 걷었거나 더 걷은 돈을 돌려주는 것이다. 반환할 회계연도의 수입금에서 반환하고, 정해진 바에 따라 이자를 함께 지급한다.",
    basis: {
      law: "지방회계법 제28조",
      effective: "2026-01-02",
      url: LAW.회계,
    },
  },
  {
    id: "term-jichul-gyeoreui",
    term: "지출결의 (지출결의서)",
    plain: ["돈 보내기", "대금 지급", "이체 올리기", "정산"],
    area: "지출",
    meaning:
      "원인행위로 정해진 돈을 실제로 내보내기 위해 올리는 시스템 처리다. 원인행위 없이 지출결의부터 올릴 수 없다는 점이 신규자가 가장 많이 막히는 지점이다.",
    caution:
      "시스템 처리 단계의 이름이라 법령에 그대로 나오지 않는다. 화면 순서와 필수 입력값은 소속기관 회계담당과 매뉴얼 원문으로 확인한다.",
  },
  {
    id: "term-bannap",
    term: "반납결의 / 지출반납",
    plain: ["돈 돌려주기", "집행 취소", "남은 돈 반납", "정산 반납"],
    area: "지출",
    meaning:
      "이미 지출한 돈을 되돌려 받아 회계에 다시 넣는 처리다. 「정산 보고」와 「실제 회계 반납」은 서로 다른 절차이므로 둘을 같은 것으로 보지 않는다.",
    caution:
      "시스템 처리 단계의 이름이다. 목적사업비 반납은 별도 정산시스템 절차가 함께 걸리므로 자료실의 목적사업비 정산 안내를 함께 본다.",
  },
  {
    id: "term-baljeon",
    term: "발전기금 기탁 접수",
    plain: ["학부모가 기부했어요", "후원금 받았는데", "학교발전기금"],
    area: "수입",
    meaning:
      "학교발전기금으로 들어온 돈을 접수해 처리하는 절차다. 학교회계와는 별도의 장부로 관리하므로 어느 회계로 받을 돈인지부터 가른다.",
    caution:
      "조성·운용 기준은 서울시교육청 학교발전기금 회계관리요령을 따른다. 자료실에서 해당 자료를 확인한다.",
  },
  {
    id: "term-jasan",
    term: "통합자산관리 (물품관리)",
    plain: ["물품 등록", "비품 번호", "재물조사", "자산 취득"],
    area: "자산",
    meaning:
      "사들인 물품을 자산으로 등록하고 관리하는 영역이다. 계약·검수 자료와 자산 등록이 서로 연결되므로, 구매만 끝내고 등록을 빠뜨리지 않는다.",
    caution:
      "서울 최신판 매뉴얼을 확보하기 전까지는 자료실의 타 시도 매뉴얼로 용어·기능만 익히고, 금액·결재선은 서울 기준으로 다시 확인한다.",
  },
];

/** 슬래시 명령어와 초성 검색에 함께 쓰는 초성표 */
const CHO = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

/** 한글 문자열에서 초성만 뽑는다. 한글이 아닌 글자는 그대로 둔다. */
export function chosungOf(text: string): string {
  let out = "";
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      out += CHO[Math.floor((code - 0xac00) / 588)];
    } else {
      out += char;
    }
  }
  return out;
}

/** 입력이 초성만으로 이루어졌는지. 그럴 때만 초성 대조를 한다. */
export function isChosungQuery(query: string): boolean {
  const trimmed = query.replace(/\s/g, "");
  return trimmed.length > 0 && [...trimmed].every((c) => CHO.includes(c));
}

/**
 * 용어 한 건이 검색어에 걸리는지 판단한다.
 * 프로그램 용어, 신규자가 쓰는 말, 뜻풀이, 초성을 모두 본다.
 */
export function matchesTerm(term: EdufineTerm, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [term.term, ...term.plain, term.meaning, term.area]
    .join(" ")
    .toLowerCase();
  if (haystack.includes(q)) return true;
  if (isChosungQuery(q)) {
    return chosungOf([term.term, ...term.plain].join(" ")).includes(q);
  }
  return false;
}

/** 이 페이지에서 모아 보여 줄 기존 지식카드 */
export const edufineGuideIds = ["start-008", "fin-003"];

/** 이 페이지에서 모아 보여 줄 자료실 항목 */
export const edufineManualIds = ["res-s53", "res-s54", "res-s14", "res-s40"];

/**
 * 질문을 정확하게 만드는 요령.
 * AI-SEN 공개 사용설명서의 「스마트 질문 3대 공식」을 신규자 관점으로 각색했다.
 */
export const askTips: { title: string; bad: string; good: string; why: string }[] =
  [
    {
      title: "사람·복무를 물을 때는 직종을 밝힌다",
      bad: "육아휴직 몇 살까지 돼?",
      good: "지방공무원 육아휴직 신청 자녀 나이 기준은?",
      why: "지방공무원·교원·교육공무직은 적용 지침이 각각 따로 있다. 직종을 빼면 다른 직종의 기준이 섞여 나온다.",
    },
    {
      title: "계약·회계를 물을 때는 금액과 목적을 밝힌다",
      bad: "수의계약 돼?",
      good: "추정가격 2천만원 이하 물품 구매 시 1인 수의계약이 가능한가요?",
      why: "계약 규정은 금액 구간마다 조항이 갈린다. 금액이 없으면 답이 하나로 좁혀지지 않는다.",
    },
    {
      title: "시스템 화면을 물을 때는 프로그램 용어로 바꾼다",
      bad: "돈 돌려주는 거 어떻게 해요?",
      good: "지출반납 처리 절차가 어떻게 되나요?",
      why: "시스템은 일상어가 아니라 자기 용어로 화면을 나눈다. 위 용어사전에서 프로그램 용어를 먼저 찾아 그 말로 묻는다.",
    },
  ];
