/**
 * Stroke Data Types for Realtime 3D Visualization System
 */

/** 단일 스트로크 포인트 */
export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  time: number;
}

/** 하나의 스트로크 (연속된 포인트들) */
export interface Stroke {
  points: StrokePoint[];
  color?: string;
  width?: number;
}

/** 캔버스에서 수집된 전체 스트로크 데이터 */
export interface StrokeData {
  strokes: Stroke[];
  width: number;
  height: number;
  timestamp: number;
}

/** SVG 생성 옵션 */
export interface SVGOptions {
  /** 기본 선 두께 (pressure가 없을 때) */
  baseStrokeWidth: number;
  /** pressure에 따른 선 두께 배수 */
  pressureMultiplier: number;
  /** 선 색상 */
  strokeColor: string;
  /** SVG viewBox 패딩 */
  padding: number;
  /** 소수점 자릿수 (네트워크 최적화) */
  precision: number;
}

/** Supabase에 저장되는 스트로크 레코드 */
export interface StrokeRecord {
  id: string;
  file_url: string;
  is_processed: boolean;
  metadata?: {
    strokeCount?: number;
    pointCount?: number;
    width?: number;
    height?: number;
  };
  created_at: string;
}

/** 업로드 결과 */
export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  recordId?: string;
  error?: string;
}
