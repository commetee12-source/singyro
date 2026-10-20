import { useEffect, useState } from "react";

export type VisitCount = { today: number; total: number };

/** 하루 한 번만 집계하기 위한 표시. 방문 사실 외에는 아무것도 담지 않는다. */
const VISIT_KEY = "singyro-visit-day";

/** 서버(UTC)와 같은 기준으로 한국 날짜를 만든다. */
function kstToday(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function readVisitDay(): string {
  try {
    return localStorage.getItem(VISIT_KEY) || "";
  } catch {
    return "";
  }
}

function writeVisitDay(day: string) {
  try {
    localStorage.setItem(VISIT_KEY, day);
  } catch {
    // 사생활 보호 모드 등에서 저장이 막혀도 그냥 넘어간다.
  }
}

/**
 * 오늘 방문자 수와 누적 방문자 수를 읽어온다.
 * 오늘 처음 연 브라우저만 숫자를 올리고, 같은 날 다시 열면 읽기만 한다.
 * 집계에 실패하면 null 을 유지해 화면에서 카운터를 감춘다.
 */
export function useVisitCount(): VisitCount | null {
  const [count, setCount] = useState<VisitCount | null>(null);
  useEffect(() => {
    let alive = true;
    const today = kstToday();
    const first = readVisitDay() !== today;
    (async () => {
      try {
        const res = await fetch("/api/visits", {
          method: first ? "POST" : "GET",
        });
        if (!res.ok) return;
        const data: unknown = await res.json();
        if (!alive || !data || typeof data !== "object") return;
        const { today: day, total } = data as Record<string, unknown>;
        if (typeof day !== "number" || typeof total !== "number") return;
        setCount({ today: day, total });
        if (first) writeVisitDay(today);
      } catch {
        // 카운터는 부가 기능이므로 실패를 화면에 드러내지 않는다.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return count;
}
