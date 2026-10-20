import { Users } from "lucide-react";
import { useVisitCount } from "./visits";

const number = new Intl.NumberFormat("ko-KR");

/**
 * 오늘/누적 방문자 수. 집계 전이거나 실패하면 아무것도 그리지 않는다.
 * 숫자를 못 보여주는 것보다 빈 자리나 오류 문구가 더 거슬리기 때문이다.
 */
export function VisitCounter() {
  const count = useVisitCount();
  if (!count) return null;
  return (
    <div
      className="visit-counter"
      title="오늘 이 사이트를 연 브라우저 수와 누적 방문 수입니다. 같은 브라우저로 하루에 여러 번 열어도 하루 한 번만 집계합니다."
    >
      <Users size={15} strokeWidth={1.9} />
      <span>
        오늘 <b>{number.format(count.today)}</b>
      </span>
      <i aria-hidden="true">·</i>
      <span>
        누적 <b>{number.format(count.total)}</b>
      </span>
    </div>
  );
}
