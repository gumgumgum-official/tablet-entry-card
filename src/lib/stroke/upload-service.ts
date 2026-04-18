/**
 * Supabase Upload Service
 *
 * SVG 파일을 Storage에 업로드하고 DB에 기록
 * Realtime을 통해 대형 스크린으로 전송
 */

import { supabase } from "@/integrations/supabase/client";
import type { StrokeData, UploadResult, SVGOptions } from "./types";
import { simplifyStrokes, getCompressionStats } from "./simplify";
import { strokesToSVG, svgToFile } from "./svg-converter";

/** Storage Bucket 이름 */
const STORAGE_BUCKET = "strokes";

/**
 * UUID v4 생성 (브라우저 호환)
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * 파일명 생성 (timestamp_uuid.svg)
 */
function generateFilename(): string {
  const timestamp = Date.now();
  const uuid = generateUUID();
  return `${timestamp}_${uuid}.svg`;
}

/**
 * 스트로크 데이터를 SVG로 변환하고 Supabase에 업로드
 */
export async function uploadStrokeData(
  strokeData: StrokeData,
  options?: {
    svgOptions?: Partial<SVGOptions>;
    useVariableWidth?: boolean;
    skipSimplify?: boolean;
  }
): Promise<UploadResult> {
  try {
    const { svgOptions, useVariableWidth = false, skipSimplify = false } = options || {};

    // 1. 스트로크가 없으면 업로드하지 않음
    if (strokeData.strokes.length === 0) {
      return {
        success: false,
        error: "No strokes to upload",
      };
    }

    // 2. RDP 알고리즘으로 스트로크 단순화 (50~70% 압축)
    let processedStrokes = strokeData.strokes;
    let compressionStats = null;

    if (!skipSimplify) {
      processedStrokes = simplifyStrokes(strokeData.strokes);
      compressionStats = getCompressionStats(strokeData.strokes, processedStrokes);
      console.log(
        `[StrokeUpload] Compressed: ${compressionStats.originalPoints} → ${compressionStats.simplifiedPoints} points (${compressionStats.reductionPercent.toFixed(1)}% reduction)`
      );
    }

    // 3. SVG 생성
    const processedData: StrokeData = {
      ...strokeData,
      strokes: processedStrokes,
    };
    const svgString = strokesToSVG(processedData, svgOptions, useVariableWidth);

    // 4. File 객체 생성
    const filename = generateFilename();
    const file = svgToFile(svgString, filename);

    // 5. Supabase Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, file, {
        contentType: "image/svg+xml",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("[StrokeUpload] Storage upload failed:", uploadError);
      return {
        success: false,
        error: `Storage upload failed: ${uploadError.message}`,
      };
    }

    // 6. Public URL 획득
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filename);

    const fileUrl = urlData.publicUrl;

    // 7. DB에 레코드 삽입 (Realtime으로 대형 스크린에 전송됨)
    const metadata = {
      strokeCount: processedStrokes.length,
      pointCount: processedStrokes.reduce((sum, s) => sum + s.points.length, 0),
      width: strokeData.width,
      height: strokeData.height,
      ...(compressionStats && {
        originalPoints: compressionStats.originalPoints,
        reductionPercent: compressionStats.reductionPercent,
      }),
    };

    // 타입 단언을 사용하여 strokes 테이블에 삽입
    // 참고: types.ts가 자동 생성되므로 strokes 테이블 타입이 아직 없을 수 있음
    const { data: insertData, error: insertError } = await supabase
      .from("strokes" as never)
      .insert({
        file_url: fileUrl,
        is_processed: false,
        metadata: metadata,
      } as never)
      .select()
      .single();

    if (insertError) {
      console.error("[StrokeUpload] DB insert failed:", insertError);
      // Storage에 업로드는 성공했으므로 URL 반환
      return {
        success: true,
        fileUrl,
        error: `DB insert failed (but file uploaded): ${insertError.message}`,
      };
    }

    console.log("[StrokeUpload] Success:", { fileUrl, recordId: (insertData as { id: string })?.id });

    return {
      success: true,
      fileUrl,
      recordId: (insertData as { id: string })?.id,
    };
  } catch (error) {
    console.error("[StrokeUpload] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Storage Bucket 존재 확인 및 생성
 * (앱 시작 시 한 번 호출)
 */
export async function ensureStorageBucket(): Promise<boolean> {
  try {
    // 버킷 목록 확인
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error("[StrokeUpload] Failed to list buckets:", listError);
      return false;
    }

    const bucketExists = buckets?.some((b) => b.name === STORAGE_BUCKET);

    if (!bucketExists) {
      // 버킷 생성 (public 접근 허용)
      const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 1024 * 1024, // 1MB 제한
        allowedMimeTypes: ["image/svg+xml"],
      });

      if (createError) {
        console.error("[StrokeUpload] Failed to create bucket:", createError);
        return false;
      }

      console.log("[StrokeUpload] Created storage bucket:", STORAGE_BUCKET);
    }

    return true;
  } catch (error) {
    console.error("[StrokeUpload] ensureStorageBucket error:", error);
    return false;
  }
}
