/**
 * Edge/DB `strokes.seq`가 숫자 또는 문자열로 올 수 있음.
 * gum_server `displaySeq`는 1 이상 정수만 유효.
 */
export function coerceDisplaySeq(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(n) || n < 1) return undefined;
  return n;
}
