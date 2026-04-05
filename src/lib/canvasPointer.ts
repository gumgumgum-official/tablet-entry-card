/**
 * 캔버스 필기 시작(pointerdown) 시 입력을 받을지 여부.
 *
 * - 개발(Vite dev): 모든 pointerType 허용 (마우스·펜·터치 등 디버깅용)
 * - 프로덕션: 기본은 `pen`만 허용
 * - `VITE_ALLOW_TOUCH_AS_PEN=true` (또는 `1`) 이면 `touch`도 허용
 *   (일부 환경에서 애플펜슬이 `touch`로 보고되는 경우 대비)
 */
export function isCanvasPointerStartAllowed(pointerType: string): boolean {
  if (import.meta.env.DEV) return true;
  if (pointerType === "pen") return true;

  const raw = import.meta.env.VITE_ALLOW_TOUCH_AS_PEN;
  const allowTouchAsPen = raw === "true" || raw === "1";
  if (allowTouchAsPen && pointerType === "touch") return true;

  return false;
}
