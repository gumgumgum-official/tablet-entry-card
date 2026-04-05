/**
 * Vite는 `VITE_*` 값을 **빌드 시점**에 번들에 박습니다.
 * Vercel 등에서 ENV를 넣은 뒤 **반드시 새 배포(재빌드)** 가 있어야 반영됩니다.
 * Preview/Production 환경 구분도 맞는지 확인하세요.
 */

function normalizeEnvString(v: string | undefined): string {
  if (v == null || v === "") return "";
  let s = String(v).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s.toLowerCase();
}

/** Vercel에 `True`, `YES` 처럼 넣어도 인식되도록 */
function envFlagTrue(value: string | undefined): boolean {
  const n = normalizeEnvString(value);
  return n === "true" || n === "1" || n === "yes" || n === "on";
}

/**
 * 캔버스 필기 시작(pointerdown) 시 입력을 받을지 여부.
 *
 * - 개발(Vite dev): 모든 pointerType 허용
 * - 프로덕션: 기본은 `pen`만
 * - `VITE_ALLOW_ALL_POINTERS`: 프로덕션에서 pen/touch/mouse 외 타입까지 전부 허용 (전시 키오스크 등)
 * - `VITE_ALLOW_TOUCH_AS_PEN`: `touch` 허용 (손가락과 구분 불가)
 * - `VITE_ALLOW_MOUSE`: `mouse` 허용
 * - `VITE_DEBUG_POINTER`: 허용되지 않은 pointerdown 시 `console.warn`으로 타입·ENV 스냅샷 출력
 */
export function isCanvasPointerStartAllowed(
  pointerType: string | undefined | null
): boolean {
  if (import.meta.env.DEV) return true;

  if (envFlagTrue(import.meta.env.VITE_ALLOW_ALL_POINTERS)) {
    return true;
  }

  const pt = pointerType ?? "";

  const allowed =
    pt === "pen" ||
    (envFlagTrue(import.meta.env.VITE_ALLOW_TOUCH_AS_PEN) && pt === "touch") ||
    (envFlagTrue(import.meta.env.VITE_ALLOW_MOUSE) && pt === "mouse");

  if (!allowed && envFlagTrue(import.meta.env.VITE_DEBUG_POINTER)) {
    // eslint-disable-next-line no-console
    console.warn("[canvasPointer] pointerdown rejected", {
      pointerType: pt,
      VITE_ALLOW_TOUCH_AS_PEN: import.meta.env.VITE_ALLOW_TOUCH_AS_PEN,
      VITE_ALLOW_MOUSE: import.meta.env.VITE_ALLOW_MOUSE,
      VITE_ALLOW_ALL_POINTERS: import.meta.env.VITE_ALLOW_ALL_POINTERS,
    });
  }

  return allowed;
}
