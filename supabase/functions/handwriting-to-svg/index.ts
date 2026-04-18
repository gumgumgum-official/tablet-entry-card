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
  /** pressure — 하위호환 목적의 optional 필드. 현재 렌더링에서는 사용하지 않음 */
  p?: number;
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
  seq: number;
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
 * Strokes를 고정 폭 polyline path로 변환.
 * pressure는 완전히 무시되며, 모든 선은 baseStrokeWidth로 동일한 굵기로 렌더된다.
 * 캔버스 측 ctx(lineWidth 고정, lineCap/lineJoin = round)와 1:1로 동일하게 보이도록 맞춤.
 */
function strokeToPolylinePath(stroke: StrokePoint[]): string {
  if (stroke.length < 2) return "";

  const parts: string[] = [];
  parts.push(`M ${round(stroke[0].x)} ${round(stroke[0].y)}`);
  for (let i = 1; i < stroke.length; i++) {
    parts.push(`L ${round(stroke[i].x)} ${round(stroke[i].y)}`);
  }
  return parts.join(" ");
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

  // SVG 요소 생성 (고정 폭 polyline + 단일 점은 circle)
  const svgElements: string[] = [];

  for (const stroke of strokes) {
    if (stroke.length === 0) continue;

    if (stroke.length === 1) {
      const only = stroke[0];
      svgElements.push(
        `    <circle cx="${round(only.x)}" cy="${round(only.y)}" r="${round(baseStrokeWidth / 2)}" fill="${color}"/>`
      );
      continue;
    }

    const pathData = strokeToPolylinePath(stroke);
    if (pathData) {
      svgElements.push(
        `    <path d="${pathData}" fill="none" stroke="${color}" stroke-width="${baseStrokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
      );
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}" width="${canvas.width}" height="${canvas.height}">
  <g id="strokes">
${svgElements.join("\n")}
  </g>
</svg>`;
}

function createEmptySVG(width: number, height: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <g id="strokes"></g>
</svg>`;
}

function normalizeSeq(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
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

      // 동일 idempotencyKey로 이미 기록된 strokes 행을 찾아 seq를 함께 반환
      const { data: existingStrokeRows, error: seqError } = await supabase
        .from("strokes")
        .select("seq")
        // JSONB ->> 연산자 기반 조회 (metadata.idempotencyKey)
        .eq("metadata->>idempotencyKey", idempotencyKey);

      if (seqError) {
        console.error("[HandwritingToSVG] Idempotent seq lookup failed:", seqError);
        return new Response(
          JSON.stringify({ error: `Idempotent seq lookup failed: ${seqError.message}` }),
          { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      }

      const seq = normalizeSeq(existingStrokeRows?.[0]?.seq);
      if (seq === null) {
        return new Response(
          JSON.stringify({ error: "Idempotent request found file but strokes row (seq) missing" }),
          { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      }

      return new Response(
        JSON.stringify({
          id: idempotencyKey,
          storagePathSvg: urlData.publicUrl,
          broadcasted: false, // 이미 브로드캐스트됨
          seq,
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

    // 8. DB strokes 테이블에 기록 (Realtime 구독 + 대시보드 조회용)
    const pointCount = strokes.reduce((sum, s) => sum + s.length, 0);
    const { data: insertedRow, error: insertError } = await supabase
      .from("strokes")
      .insert({
        file_url: publicUrl,
        is_processed: false,
        metadata: {
          sessionId,
          clientId,
          idempotencyKey,
          strokeCount: strokes.length,
          pointCount,
          width: canvas.width,
          height: canvas.height,
          createdAt: meta.createdAt,
        },
      })
      .select("seq")
      .single();

    if (insertError) {
      console.error("[HandwritingToSVG] DB insert failed:", insertError);
      return new Response(
        JSON.stringify({ error: `DB insert failed: ${insertError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const seq = normalizeSeq(insertedRow?.seq);
    if (seq === null) {
      return new Response(
        JSON.stringify({ error: "DB insert returned no seq" }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 9. Realtime Broadcast
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
          seq,
          storagePathSvg: publicUrl,
          createdAt: meta.createdAt,
          clientId,
        },
      });

      broadcasted = true;
      console.log(`[HandwritingToSVG] Broadcasted to channel: ${channelName}`);
    } catch (broadcastError) {
      console.error("[HandwritingToSVG] Broadcast error:", broadcastError);
      // 브로드캐스트 실패해도 업로드/DB 기록은 성공으로 처리
    } finally {
      await supabase.removeChannel(channel);
    }

    // 10. 응답
    const response: ResponsePayload = {
      id: idempotencyKey,
      storagePathSvg: publicUrl,
      broadcasted,
      seq,
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
