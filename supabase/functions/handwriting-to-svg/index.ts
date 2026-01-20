/**
 * Handwriting to SVG Edge Function
 * 
 * 태블릿에서 수집한 strokes를 SVG로 변환하고
 * Storage에 저장 후 Realtime으로 스크린에 알림
 * 
 * 배포: supabase functions deploy handwriting-to-svg
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

// ============================================================================
// Types
// ============================================================================

interface StrokePoint {
  x: number;
  y: number;
  t: number;
  p: number;
}

interface CanvasSize {
  width: number;
  height: number;
}

interface SubmitMeta {
  createdAt: string;
  color: string;
  baseStrokeWidth: number;
}

interface RequestPayload {
  sessionId: string;
  clientId: string;
  idempotencyKey: string;
  canvas: CanvasSize;
  strokes: StrokePoint[][];
  meta: SubmitMeta;
}

interface ResponsePayload {
  id: string;
  storagePathSvg: string;
  broadcasted: boolean;
}

// ============================================================================
// Environment Variables
// ============================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STORAGE_BUCKET = Deno.env.get("STORAGE_BUCKET") || "handwriting";
const REALTIME_CHANNEL_PREFIX = Deno.env.get("REALTIME_CHANNEL_PREFIX") || "exhibition";

// ============================================================================
// SVG Conversion
// ============================================================================

/** 숫자 반올림 */
function round(value: number, precision: number = 2): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

/** 바운딩 박스 계산 */
function calculateBoundingBox(strokes: StrokePoint[][]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const stroke of strokes) {
    for (const point of stroke) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
  }

  if (minX === Infinity) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Strokes를 채워진(filled) SVG path로 변환
 * 가변 폭 지원 - pressure에 따라 선 두께 변화
 */
function strokeToFilledPath(
  stroke: StrokePoint[],
  baseWidth: number,
  pressureMultiplier: number = 4
): string {
  if (stroke.length < 2) return "";

  // 상단 경계와 하단 경계를 따로 계산
  const upperPath: { x: number; y: number }[] = [];
  const lowerPath: { x: number; y: number }[] = [];

  for (let i = 0; i < stroke.length; i++) {
    const point = stroke[i];
    const width = (baseWidth + point.p * pressureMultiplier) / 2;

    // 방향 벡터 계산
    let dx: number, dy: number;
    if (i === 0) {
      dx = stroke[1].x - point.x;
      dy = stroke[1].y - point.y;
    } else if (i === stroke.length - 1) {
      dx = point.x - stroke[i - 1].x;
      dy = point.y - stroke[i - 1].y;
    } else {
      dx = stroke[i + 1].x - stroke[i - 1].x;
      dy = stroke[i + 1].y - stroke[i - 1].y;
    }

    // 수직 벡터 (정규화)
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) {
      upperPath.push({ x: point.x, y: point.y - width });
      lowerPath.push({ x: point.x, y: point.y + width });
    } else {
      const nx = -dy / length;
      const ny = dx / length;

      upperPath.push({
        x: round(point.x + nx * width),
        y: round(point.y + ny * width),
      });
      lowerPath.push({
        x: round(point.x - nx * width),
        y: round(point.y - ny * width),
      });
    }
  }

  // 상단 → 끝 → 하단(역순) → 시작으로 닫힌 path 생성
  const pathParts: string[] = [];

  // 상단 경로
  pathParts.push(`M ${upperPath[0].x} ${upperPath[0].y}`);
  for (let i = 1; i < upperPath.length; i++) {
    pathParts.push(`L ${upperPath[i].x} ${upperPath[i].y}`);
  }

  // 하단 경로 (역순)
  for (let i = lowerPath.length - 1; i >= 0; i--) {
    pathParts.push(`L ${lowerPath[i].x} ${lowerPath[i].y}`);
  }

  pathParts.push("Z"); // 닫힌 path

  return pathParts.join(" ");
}

/**
 * Strokes를 SVG 문자열로 변환
 */
function strokesToSVG(
  strokes: StrokePoint[][],
  canvas: CanvasSize,
  meta: SubmitMeta
): string {
  const padding = 10;
  const { color, baseStrokeWidth } = meta;

  if (strokes.length === 0) {
    return createEmptySVG(canvas.width, canvas.height);
  }

  // viewBox 계산
  const bbox = calculateBoundingBox(strokes);
  const viewBoxX = Math.floor(bbox.minX - padding);
  const viewBoxY = Math.floor(bbox.minY - padding);
  const viewBoxWidth = Math.ceil(bbox.maxX - bbox.minX + padding * 2);
  const viewBoxHeight = Math.ceil(bbox.maxY - bbox.minY + padding * 2);

  // SVG path 생성
  const pathElements: string[] = [];

  for (const stroke of strokes) {
    if (stroke.length < 2) continue;

    const pathData = strokeToFilledPath(stroke, baseStrokeWidth);
    if (pathData) {
      pathElements.push(
        `    <path d="${pathData}" fill="${color}" stroke="none"/>`
      );
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}" width="${canvas.width}" height="${canvas.height}">
  <g id="strokes">
${pathElements.join("\n")}
  </g>
</svg>`;
}

function createEmptySVG(width: number, height: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <g id="strokes"></g>
</svg>`;
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
      },
    });
  }

  // POST만 허용
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Request 파싱
    const payload: RequestPayload = await req.json();
    const { sessionId, clientId, idempotencyKey, canvas, strokes, meta } = payload;

    // 2. 검증
    if (!sessionId || !clientId || !idempotencyKey) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: sessionId, clientId, idempotencyKey" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!strokes || strokes.length === 0) {
      return new Response(
        JSON.stringify({ error: "No strokes provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Supabase Client (service role)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 4. Idempotency 체크 (동일 키가 이미 존재하는지 확인)
    const storagePath = `${sessionId}/${idempotencyKey}.svg`;
    
    const { data: existingFile } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(sessionId, {
        search: `${idempotencyKey}.svg`,
      });

    if (existingFile && existingFile.length > 0) {
      // 이미 처리된 요청 - 기존 결과 반환
      console.log(`[HandwritingToSVG] Idempotent request - returning existing: ${storagePath}`);
      
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      return new Response(
        JSON.stringify({
          id: idempotencyKey,
          storagePathSvg: urlData.publicUrl,
          broadcasted: false, // 이미 브로드캐스트됨
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // 5. SVG 생성
    const svgString = strokesToSVG(strokes, canvas, meta);

    // 6. Storage 업로드
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, new Blob([svgString], { type: "image/svg+xml" }), {
        contentType: "image/svg+xml",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("[HandwritingToSVG] Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: `Storage upload failed: ${uploadError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 7. Public URL 획득
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // 8. Realtime Broadcast
    const channelName = `${REALTIME_CHANNEL_PREFIX}:${sessionId}`;
    const channel = supabase.channel(channelName);
    
    let broadcasted = false;
    
    try {
      await channel.subscribe();
      
      await channel.send({
        type: "broadcast",
        event: "new_handwriting",
        payload: {
          id: idempotencyKey,
          storagePathSvg: publicUrl,
          createdAt: meta.createdAt,
          clientId,
        },
      });
      
      broadcasted = true;
      console.log(`[HandwritingToSVG] Broadcasted to channel: ${channelName}`);
    } catch (broadcastError) {
      console.error("[HandwritingToSVG] Broadcast error:", broadcastError);
      // 브로드캐스트 실패해도 업로드는 성공으로 처리
    } finally {
      await supabase.removeChannel(channel);
    }

    // 9. (선택) DB 테이블에 기록
    // 필요시 handwriting_records 테이블에 메타데이터 저장
    /*
    await supabase.from('handwriting_records').insert({
      id: idempotencyKey,
      session_id: sessionId,
      client_id: clientId,
      storage_path: storagePath,
      stroke_count: strokes.length,
      point_count: strokes.reduce((sum, s) => sum + s.length, 0),
      created_at: meta.createdAt,
    });
    */

    // 10. 응답
    const response: ResponsePayload = {
      id: idempotencyKey,
      storagePathSvg: publicUrl,
      broadcasted,
    };

    console.log(`[HandwritingToSVG] Success: ${storagePath}`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    console.error("[HandwritingToSVG] Error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error" 
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
