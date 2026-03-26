# Scripts

## backfill-strokes-table.ts

Storage에만 있고 `strokes` 테이블에는 없는 기존 SVG를 테이블에 한 번에 넣는 스크립트입니다.

### 실행

```bash
npm install
npm run backfill:strokes
```

`.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`(또는 `VITE_SUPABASE_PUBLISHABLE_KEY`)가 있으면 자동 로드됩니다.

다른 세션 폴더를 넣으려면:

```bash
SESSION_FOLDER=default-session npx tsx scripts/backfill-strokes-table.ts
```

### 테이블이 왜 필요한가? (다른 프론트에서 불러올 때)

- **실시간으로 “방금 전송된 것”만 받을 때**
  → 다른 프론트는 **Realtime 채널 구독**만 하면 됨. payload에 `storagePathSvg`(URL)가 오므로 **테이블 없이도** 새로 들어오는 건 불러올 수 있음.

- **페이지 열었을 때 “지금까지 쌓인 전체 목록”을 보여줄 때**
  → 다른 프론트에서 `supabase.from('strokes').select('*')` 로 **테이블을 조회**해야 함. 이때는 **테이블에 행이 있어야** 잘 불러올 수 있음.

정리: **전체 목록/초기 로딩**을 쓰려면 테이블이 필요하고, **실시간 푸시만** 쓰면 테이블 없이도 동작합니다.
