/**
 * Re-export shared outline math (Edge `handwriting-to-svg` uses the same file under supabase/functions/_shared).
 */
export type { ClosedFillPathOptions } from "../../../supabase/functions/_shared/fixedWidthFillOutline.ts";
export {
  roundCoord,
  strokePolylineToClosedFillPathD,
} from "../../../supabase/functions/_shared/fixedWidthFillOutline.ts";
