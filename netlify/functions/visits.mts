// 방문자 카운터. Netlify Blobs 에 일자별/누적 카운트만 저장한다.
// IP·User-Agent 등 개인을 식별할 수 있는 값은 저장하지 않는다.
import { getStore } from "@netlify/blobs";

const STORE = "singyro-visits";
const KEY = "counter";
/** 일자별 기록 보관 일수. 블롭 크기를 묶어 두기 위한 상한. */
const KEEP_DAYS = 45;

type Counter = { total: number; days: Record<string, number> };

/** 서버는 UTC 로 돌기 때문에 한국 날짜(UTC+9)로 환산해 집계한다. */
function kstToday(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export default async (req: Request) => {
  const today = kstToday();
  // 집계는 POST 로만 올린다. 크롤러·프리페치의 GET 으로 숫자가 부풀지 않게 한다.
  const counts = req.method === "POST";
  try {
    const store = getStore(STORE);
    const saved = (await store.get(KEY, { type: "json" })) as Counter | null;
    const days: Record<string, number> = saved?.days ?? {};
    let total = Number(saved?.total) || 0;

    if (counts) {
      total += 1;
      days[today] = (days[today] ?? 0) + 1;
      const kept = Object.keys(days).sort().slice(-KEEP_DAYS);
      const trimmed: Record<string, number> = {};
      for (const day of kept) trimmed[day] = days[day];
      await store.setJSON(KEY, { total, days: trimmed });
      return reply({ date: today, today: trimmed[today] ?? 0, total });
    }
    return reply({ date: today, today: days[today] ?? 0, total });
  } catch {
    // 카운터는 부가 기능이다. 저장소가 없거나 실패해도 사이트는 그대로 동작해야 한다.
    return reply({ date: today, today: null, total: null });
  }
};

export const config = { path: "/api/visits" };
