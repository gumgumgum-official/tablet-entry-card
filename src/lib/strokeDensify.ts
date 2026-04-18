import type { SubmitPoint } from "@/lib/submit/types";

/**
 * 빠른 필기에서 이벤트 간격이 커져 선이 끊겨 보일 때, 두 점 사이를
 * `maxStep` 이하 간격으로 직선 보간한다. 반환 배열은 끝점까지 포함하고 시작점은 제외한다.
 */
export function densifySegmentToSubmitPoints(
  x0: number,
  y0: number,
  t0: number,
  x1: number,
  y1: number,
  t1: number,
  maxStep: number
): SubmitPoint[] {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) {
    return [{ x: x1, y: y1, t: t1 }];
  }
  const n = Math.max(1, Math.ceil(dist / maxStep));
  const out: SubmitPoint[] = [];
  for (let i = 1; i <= n; i++) {
    const f = i / n;
    out.push({
      x: x0 + dx * f,
      y: y0 + dy * f,
      t: t0 + (t1 - t0) * f,
    });
  }
  return out;
}
