/**
 * Stroke Processing Module
 *
 * 태블릿에서 수집한 스트로크 데이터를 처리하고
 * SVG로 변환하여 Supabase에 업로드하는 모듈
 */

// Types
export type {
  StrokePoint,
  Stroke,
  StrokeData,
  SVGOptions,
  StrokeRecord,
  UploadResult,
} from "./types";

// RDP Simplification
export {
  simplifyStroke,
  simplifyStrokes,
  getCompressionStats,
} from "./simplify";

// SVG Conversion
export {
  strokesToSVG,
  svgToBlob,
  svgToFile,
} from "./svg-converter";

// Upload Service
export {
  uploadStrokeData,
  ensureStorageBucket,
} from "./upload-service";
