/** 공개 원문 확인: 2026-09-19. 내부 인증 후 화면은 확인하지 못했으며 예시로만 표현한다. */
export const ACCESS_REVIEW_DATE = "2026-09-19";
export const ACCESS_STORAGE_KEY = "singyro-edufine-access-v1";
export type AccessMode = "office" | "remote";
export type AccessScene =
  | "ready"
  | "approval"
  | "evpn"
  | "vpn"
  | "portal"
  | "certificate"
  | "launch"
  | "permission";

export const accessLinks = {
  portal: "https://sen.eduptl.kr/",
  evpn: "https://evpn.sen.go.kr/",
  edufine: "https://klef.sen.go.kr/keris_ui/main.do",
  epki: "https://www.epki.go.kr/",
  reference: "https://chatbot.aisen.store/guide/",
};

export const accessSources = {
  evpn: {
    title: "서울교육청 EVPN 공식 접속 안내",
    url: "https://evpn.sen.go.kr/custom/index.html",
    scope: "공식 연결 주소, 로그인 후 VPN 설치, 설치·실행·연결 Yes 확인",
  },
  application: {
    title: "서울교육청 EVPN 신청 방법",
    url: "https://evpn.sen.go.kr/custom/evpn4_manual_application.html",
    scope: "본인 신청 경로, 부서장 승인, 담당자 대리 신청",
  },
  certificate: {
    title: "서울 동부교육지원청 인증서 발급 안내",
    url: "https://dbedu.sen.go.kr/CMS/civilapp/civilapp01/civilapp0105/civilapp010502/index.html",
    scope: "업무포털·K-에듀파인용 교육부 전자서명 인증서와 인사정보 등록 확인",
  },
  portal: {
    title: "경기도교육청 2026 업무길라잡이",
    url: "https://www.goe.go.kr/resource/goe/na/bbs_2675/2026/03/f57b2f27-0f5e-4673-af49-302b67f7d3d9.pdf",
    scope:
      "공통 접속 흐름 참고: 아이디·인증서 로그인 → K-에듀파인. 서울 화면의 배치는 미확인",
  },
};

export interface AccessStep {
  id: AccessScene;
  title: string;
  instruction: string;
  actions: string[];
  checkpoint: string;
  help: string;
  practice: string;
  practiceFeedback: string;
  source?: keyof typeof accessSources;
  link?: { label: string; url: string };
}

const ready: AccessStep = {
  id: "ready",
  title: "접속 준비",
  instruction: "업무용 계정과 본인 인증서를 먼저 준비해요.",
  actions: [
    "소속기관에서 사용하는 업무포털 아이디와 본인 명의 교육부 전자서명 인증서(EPKI)를 준비하세요.",
    "처음 발령받았다면 인사정보 등록과 사용자 등록 여부를 소속기관 담당자에게 확인하세요.",
    "학교·기관 안에서도 업무망이 아닌 개인 인터넷이나 테더링을 쓰고 있다면 ‘집·외부에서’를 선택하세요.",
  ],
  checkpoint: "업무용 계정과 사용할 인증서를 준비했어요.",
  help: "계정·인사정보는 소속기관 담당자, 인증서 발급은 소속기관 인증서 담당자에게 먼저 문의하세요.",
  practice: "준비사항 살펴보기",
  practiceFeedback: "계정, 본인 인증서, 접속망을 확인한 뒤 시작해요.",
  source: "certificate",
  link: { label: "전자서명인증센터 열기", url: accessLinks.epki },
};
const approval: AccessStep = {
  id: "approval",
  title: "EVPN 이용 승인",
  instruction: "외부에서 쓰려면 EVPN 신청과 승인이 필요해요.",
  actions: [
    "나이스의 [기본메뉴] → [원격업무지원서비스] → [원격업무지원서비스(eVPN)]에서 신청하세요.",
    "신청 후 부서장 승인을 받고, 사용하려는 날짜가 승인된 기간 안에 있는지 확인하세요.",
    "이미 외부에 있어 신청이 어렵다면 소속기관 원격업무담당자에게 문의하세요. 공식 안내에는 담당자 대리 신청과 원격업무 외부 신청 방법도 있습니다.",
  ],
  checkpoint: "EVPN 이용이 승인되었고 사용기간 안에 있어요.",
  help: "신청과 승인은 다릅니다. 신청만 저장했다면 승인 여부부터 확인하세요.",
  practice: "신청 경로 확인하기",
  practiceFeedback:
    "실제 나이스에서 신청한 뒤 승인까지 확인해야 외부 접속을 이어갈 수 있어요.",
  source: "application",
  link: {
    label: "서울 EVPN 신청 안내 열기",
    url: accessSources.application.url,
  },
};
const evpn: AccessStep = {
  id: "evpn",
  title: "EVPN 로그인",
  instruction: "서울교육청 EVPN 페이지에 먼저 접속해요.",
  actions: [
    "아래 ‘서울 EVPN 열기’를 눌러 공식 페이지로 이동하세요.",
    "공식 화면의 LOGIN을 누르고 안내되는 본인 인증 절차를 진행하세요. 계정·비밀번호는 실제 공식 사이트에서만 입력하세요.",
    "VPN이 아직 설치되지 않아도 공식 안내에 따라 먼저 로그인한 다음 설치합니다.",
  ],
  checkpoint: "서울 EVPN에서 로그인을 마쳤어요.",
  help: "사용기간 만료 또는 패스워드 분실 시 서울교육청 안내에 따라 나이스에서 EVPN을 재신청하세요.",
  practice: "LOGIN 버튼 눌러보기",
  practiceFeedback:
    "로그인 순서를 연습했어요. 실제 로그인은 서울 EVPN 페이지에서 진행하세요.",
  source: "evpn",
  link: { label: "서울 EVPN 열기", url: accessLinks.evpn },
};
const vpn: AccessStep = {
  id: "vpn",
  title: "VPN 연결 확인",
  instruction: "설치·실행·연결이 모두 Yes인지 확인해요.",
  actions: [
    "EVPN 로그인 후 공식 페이지에서 AXGATE VPN Client를 내려받아 설치하세요.",
    "이미 설치했다면 ‘VPN 실행’을 누르세요. 설치되지 않은 상태에서는 이 버튼만 눌러도 실행되지 않습니다.",
    "화면의 ‘설치’, ‘실행’, ‘연결’ 세 항목이 모두 Yes가 된 뒤 다음 단계로 이동하세요.",
  ],
  checkpoint: "실제 EVPN 화면의 세 항목이 모두 Yes예요.",
  help: "하나라도 No라면 아직 연결이 끝나지 않았습니다. EVPN 페이지의 ‘매뉴얼 보기’와 FAQ를 확인하세요.",
  practice: "연결 상태 확인 연습",
  practiceFeedback:
    "세 칸 모두 Yes가 접속 준비 완료의 기준이에요. 이 표시는 연습 결과이며 실제 연결 상태가 아닙니다.",
  source: "evpn",
  link: { label: "EVPN 공식 안내 열기", url: accessLinks.evpn },
};
const portal: AccessStep = {
  id: "portal",
  title: "업무포털 열기",
  instruction: "서울 업무포털 주소를 열어요.",
  actions: [
    "업무망에 연결된 PC에서 ‘서울 업무포털 열기’를 누르거나 주소창에 https://sen.eduptl.kr/을 입력하세요.",
    "외부 접속 중이라면 EVPN의 설치·실행·연결이 모두 Yes인 상태를 유지하세요.",
    "처음 접속할 때 설치 안내가 나오면 공식 페이지가 안내하는 프로그램을 설치한 뒤 다시 접속하세요.",
  ],
  checkpoint: "서울 업무포털 로그인 화면이 열렸어요.",
  help: "주소가 열리지 않으면 업무망인지, 외부라면 EVPN이 연결됐는지 먼저 확인하세요. 이 안내 페이지를 보는 것만으로 업무망에 연결되지는 않습니다.",
  practice: "업무포털 주소 열기 연습",
  practiceFeedback:
    "주소를 확인했어요. 아래 공식 링크에서 실제 로그인 화면이 열리는지 확인하세요.",
  source: "evpn",
  link: { label: "서울 업무포털 열기", url: accessLinks.portal },
};
const certificate: AccessStep = {
  id: "certificate",
  title: "인증서 로그인",
  instruction: "실제 업무포털에서 본인 인증서로 로그인해요.",
  actions: [
    "업무포털의 아이디 입력·인증서 로그인 안내를 따르세요.",
    "본인의 인증서를 선택하고 실제 인증서 창에 비밀번호를 입력하세요. 이 연습 페이지에는 비밀번호를 입력하는 칸이 없습니다.",
    "최초 사용자 또는 인증서를 바꾼 사용자라면 실제 화면의 사용자 등록·인증서 변경 안내를 확인하세요.",
  ],
  checkpoint: "로그인 후 업무포털의 내 화면이 보여요.",
  help: "인증서가 보이지 않으면 저장 위치와 유효기간을 확인하고 소속기관 인증서 담당자에게 문의하세요. 서울 내부 로그인 화면의 현재 배치는 확인하지 못했습니다.",
  practice: "인증서 로그인 순서 연습",
  practiceFeedback:
    "인증서 선택 → 비밀번호 입력 → 로그인 순서입니다. 본인 인증은 실제 업무포털에서 진행하세요.",
  source: "portal",
  link: { label: "서울 업무포털 열기", url: accessLinks.portal },
};
const launch: AccessStep = {
  id: "launch",
  title: "K-에듀파인 선택",
  instruction: "업무포털에서 K-에듀파인을 찾아 선택해요.",
  actions: [
    "로그인한 업무포털에서 이름이 ‘K-에듀파인’인 메뉴를 선택하세요. 메뉴의 위치는 실제 화면에서 확인하세요.",
    "서울 EVPN 공식 페이지의 ‘K-에듀파인 바로가기’도 이용할 수 있습니다. 아래 직접 연결 역시 업무망 또는 EVPN 연결이 필요합니다.",
    "화면이 열리지 않으면 오류 문구나 팝업 차단 알림이 있는지 확인하세요. 필요한 설정은 해당 공식 사이트에 한해 적용하세요.",
  ],
  checkpoint: "K-에듀파인 화면이 열렸어요.",
  help: "나이스와 K-에듀파인은 서로 다른 메뉴입니다. 메뉴 이름을 확인하고 선택하세요.",
  practice: "K-에듀파인 메뉴 눌러보기",
  practiceFeedback:
    "K-에듀파인을 선택했어요. 실제 업무포털에서 같은 이름의 메뉴를 찾아보세요.",
  source: "portal",
  link: { label: "K-에듀파인 공식 연결", url: accessLinks.edufine },
};
const permission: AccessStep = {
  id: "permission",
  title: "소속·업무 확인",
  instruction: "내 소속과 맡은 업무를 확인하면 첫 접속 끝이에요.",
  actions: [
    "로그인한 사용자와 현재 소속기관이 맞는지 확인하세요.",
    "담당 업무에 필요한 메뉴가 보이는지 확인하세요. 접속에 성공해도 업무 권한은 별도로 확인해야 합니다.",
    "필요한 메뉴가 없다면 소속기관 K-에듀파인 권한담당자에게 담당 업무와 보이지 않는 메뉴를 알려주세요.",
  ],
  checkpoint: "내 소속과 필요한 업무 메뉴를 확인했어요.",
  help: "이 단계는 실무 확인 목록입니다. 권한 부여 방법과 내부 메뉴의 최신 배치는 소속기관 담당자에게 확인하세요.",
  practice: "마지막 확인사항 살펴보기",
  practiceFeedback:
    "사용자·소속·업무 메뉴를 확인해요. 권한이 없다면 담당자에게 문의하세요.",
};

export function getAccessSteps(mode: AccessMode): AccessStep[] {
  return mode === "remote"
    ? [ready, approval, evpn, vpn, portal, certificate, launch, permission]
    : [ready, portal, certificate, launch, permission];
}

export interface AccessProgress {
  version: 1;
  mode: AccessMode;
  completed: Record<AccessMode, string[]>;
}

export function parseAccessProgress(raw: string | null): AccessProgress {
  const empty: AccessProgress = {
    version: 1,
    mode: "office",
    completed: { office: [], remote: [] },
  };
  try {
    const saved = JSON.parse(raw || "null");
    if (!saved || saved.version !== 1) return empty;
    const clean = (mode: AccessMode): string[] => {
      const ids = getAccessSteps(mode).map((step) => step.id);
      const values: unknown = saved.completed?.[mode];
      return Array.isArray(values)
        ? [
            ...new Set(
              values.filter(
                (id): id is AccessScene =>
                  typeof id === "string" && ids.includes(id as AccessScene),
              ),
            ),
          ]
        : [];
    };
    return {
      version: 1,
      mode: saved.mode === "remote" ? "remote" : "office",
      completed: { office: clean("office"), remote: clean("remote") },
    };
  } catch {
    return empty;
  }
}

export function confirmAccessStep(
  progress: AccessProgress,
  mode: AccessMode,
  id: string,
  confirmed: boolean,
): AccessProgress {
  if (!getAccessSteps(mode).some((step) => step.id === id)) return progress;
  const without = progress.completed[mode].filter((value) => value !== id);
  return {
    ...progress,
    completed: {
      ...progress.completed,
      [mode]: confirmed ? [...without, id] : without,
    },
  };
}

export const accessProblems = [
  {
    title: "업무포털 주소가 열리지 않아요",
    answer:
      "기관 안이라면 업무망인지 확인하세요. 집·외부라면 EVPN의 설치·실행·연결이 모두 Yes인지 먼저 확인하세요. 계속 열리지 않으면 소속기관 정보 담당자에게 접속 장소와 오류 문구를 알려주세요.",
  },
  {
    title: "인증서가 없거나 목록에 보이지 않아요",
    answer:
      "본인 EPKI 인증서의 발급 여부, 저장 위치와 유효기간을 확인하세요. 신규자는 인사정보 등록 여부도 확인합니다. 발급·갱신은 전자서명인증센터와 소속기관 인증서 담당자의 안내를 따르세요.",
  },
  {
    title: "EVPN 기간이 끝났거나 비밀번호를 잊었어요",
    answer:
      "서울교육청 공식 공지에서는 나이스에서 원격업무지원서비스(EVPN)를 재신청하도록 안내합니다. 외부에서 나이스에 접속할 수 없다면 소속기관 원격업무담당자에게 문의하세요.",
  },
  {
    title: "VPN 실행을 눌러도 반응이 없어요",
    answer:
      "AXGATE VPN Client가 설치되었는지 확인하세요. 서울 EVPN은 로그인 후 프로그램을 내려받아 설치하도록 안내합니다. 설치했는데도 연결되지 않으면 공식 페이지의 ‘매뉴얼 보기’와 FAQ를 확인하세요.",
  },
  {
    title: "로그인은 됐는데 필요한 메뉴가 없어요",
    answer:
      "담당 업무에 필요한 권한이 있는지 소속기관 권한담당자에게 확인하세요. 소속기관, 담당 업무, 보이지 않는 메뉴 이름을 함께 전달하면 확인에 도움이 됩니다.",
  },
];
