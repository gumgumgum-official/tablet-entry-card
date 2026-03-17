/**
 * Backfill strokes table from existing Storage files
 *
 * Storage의 handwriting 버킷에 이미 있는 SVG 파일 목록을 읽어서
 * public.strokes 테이블에 한 번에 넣는 스크립트 (한 번만 실행)
 *
 * 사용법:
 *   npm run backfill:strokes
 *
 * 환경변수 (.env에 있으면 자동 로드):
 *   VITE_SUPABASE_URL       (필수)
 *   VITE_SUPABASE_ANON_KEY  또는 VITE_SUPABASE_PUBLISHABLE_KEY (필수)
 *   SESSION_FOLDER           (선택, 기본값: exhibition-2026)
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const BUCKET = "handwriting";
const SESSION_FOLDER = process.env.SESSION_FOLDER || "exhibition-2026";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "[backfill] 환경변수 없음. VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 설정 후 실행하세요."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log(`[backfill] 버킷: ${BUCKET}, 폴더: ${SESSION_FOLDER}`);

  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET)
    .list(SESSION_FOLDER);

  if (listError) {
    console.error("[backfill] Storage 목록 조회 실패:", listError.message);
    process.exit(1);
  }

  if (!files?.length) {
    console.log("[backfill] 해당 폴더에 파일 없음.");
    return;
  }

  const svgFiles = files.filter((f) => f.name.endsWith(".svg"));
  console.log(`[backfill] SVG ${svgFiles.length}개 발견`);

  const { data: existingRows } = await supabase.from("strokes").select("file_url");
  const existingUrls = new Set((existingRows || []).map((r) => r.file_url));

  let inserted = 0;
  let skipped = 0;

  for (const file of svgFiles) {
    const path = `${SESSION_FOLDER}/${file.name}`;
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

    if (existingUrls.has(publicUrl)) {
      skipped++;
      continue;
    }

    const { error: insertError } = await supabase.from("strokes").insert({
      file_url: publicUrl,
      is_processed: false,
      metadata: {
        sessionId: SESSION_FOLDER,
        backfilled: true,
        fileName: file.name,
      },
    });

    if (insertError) {
      console.error(`[backfill] insert 실패 (${file.name}):`, insertError.message);
      continue;
    }

    existingUrls.add(publicUrl);
    inserted++;
    console.log(`  + ${file.name}`);
  }

  console.log(`[backfill] 완료: ${inserted}개 추가, ${skipped}개 건너뜀`);
}

main().catch((err) => {
  console.error("[backfill] 오류:", err);
  process.exit(1);
});
