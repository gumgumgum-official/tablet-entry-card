function envFlagTrue(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

/**
 * 캔버스 필기 시작(pointerdown) 시 입력을 받을지 여부.
 *
 * - 개발(Vite dev): 모든 pointerType 허용 (마우스·펜·터치 등 디버깅용)
 * - 프로덕션: 기본은 `pen`만 허용
 * - `VITE_ALLOW_TOUCH_AS_PEN=true|1` 이면 `touch`도 허용
 *   (일부 환경에서 애플펜슬이 `touch`로 보고되는 경우; 손가락도 touch면 동일하게 허용됨)
 * - `VITE_ALLOW_MOUSE=true|1` 이면 `mouse`도 허용 (데스크톱·프로덕션 디버깅용)
 */
export function isCanvasPointerStartAllowed(pointerType: string): boolean {
  if (import.meta.env.DEV) return true;
  if (pointerType === "pen") return true;

  if (envFlagTrue(import.meta.env.VITE_ALLOW_TOUCH_AS_PEN) && pointerType === "touch") {
    return true;
  }
  if (envFlagTrue(import.meta.env.VITE_ALLOW_MOUSE) && pointerType === "mouse") {
    return true;
  }

  return false;
}
