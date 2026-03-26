# Realtime 설정 & 다른 프론트에서 못 불러올 때

태블릿에서 전송한 필기가 **다른 프론트(3D 화면)**에서 안 보일 때 확인할 항목과 설정 방법입니다.

---

## 1. 우리가 쓰는 건 "Broadcast" Realtime

- **Database Realtime** (테이블 INSERT/UPDATE 구독)이 **아니라**
- **Realtime Broadcast** (채널 이름으로 메시지 주고받기)를 씁니다.

그래서 **Supabase Dashboard에서 `strokes` 테이블을 Realtime publication에 넣을 필요는 없습니다.**
필기 알림은 Edge Function이 **채널로 broadcast** 하고, 다른 프론트는 **같은 채널을 구독**하면 됩니다.

---

## 2. Supabase 쪽에서 확인할 것

### 2-1. Realtime이 켜져 있는지

1. **Dashboard** → **Project Settings** (왼쪽 아래 톱니바퀴)
2. **API** 탭
3. **Realtime** 섹션에서 비활성화되어 있지 않은지 확인 (기본값은 활성화)

### 2-2. Edge Function Secrets

브로드캐스트 시 사용하는 **채널 이름**이 `REALTIME_CHANNEL_PREFIX` + `:` + `sessionId` 입니다.

- Edge Function 배포 시 Secrets에 다음이 들어가 있어야 합니다.
  - `REALTIME_CHANNEL_PREFIX` (예: `exhibition`)
  - (이미 있다면) `STORAGE_BUCKET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 등

설정 확인:

```bash
supabase secrets list
```

없으면:

```bash
supabase secrets set REALTIME_CHANNEL_PREFIX=exhibition
```

태블릿 앱에서 쓰는 **세션 ID**가 예를 들어 `exhibition-2026` 이면,
실제 채널 이름은 **`exhibition:exhibition-2026`** 입니다. (prefix + `:` + sessionId)

---

## 3. 다른 프론트에서 꼭 맞춰야 할 것

### 3-1. 채널 이름

- **형식**: `{REALTIME_CHANNEL_PREFIX}:{sessionId}`
- **예**: `exhibition:exhibition-2026`
- 태블릿과 **같은 Supabase 프로젝트**, **같은 prefix**, **같은 sessionId**를 써야 합니다.

### 3-2. 이벤트 이름

- **반드시**: `new_handwriting`
- Edge Function에서 `event: "new_handwriting"` 로 보내고 있으므로, 다른 프론트도 이 이름으로 listen 해야 합니다.

### 3-3. 환경변수 (다른 프론트 레포)

- `VITE_SUPABASE_URL` = 태블릿과 동일한 프로젝트 URL (예: `https://cffuybxttyrfjetyqrww.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` = 같은 프로젝트의 anon key
- `VITE_REALTIME_CHANNEL_PREFIX` = Edge Function에 넣은 값과 동일 (예: `exhibition`)
- `VITE_DEFAULT_SESSION_ID` = 태블릿에서 쓰는 세션과 동일 (예: `exhibition-2026`)

---

## 4. 다른 프론트에서 구독하는 예시 코드

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const channelPrefix = import.meta.env.VITE_REALTIME_CHANNEL_PREFIX || 'exhibition';
const sessionId = import.meta.env.VITE_DEFAULT_SESSION_ID || 'exhibition-2026';
const channelName = `${channelPrefix}:${sessionId}`;

console.log('[Realtime] 구독 채널:', channelName);

const channel = supabase
  .channel(channelName)
  .on(
    'broadcast',
    { event: 'new_handwriting' },
    (payload) => {
      console.log('[Realtime] 수신:', payload.payload);
      const { id, storagePathSvg, createdAt, clientId } = payload.payload;
      // 여기서 storagePathSvg로 SVG 로드 후 3D 렌더링
    }
  )
  .subscribe((status) => {
    console.log('[Realtime] 상태:', status);
    if (status === 'SUBSCRIBED') {
      console.log('[Realtime] 연결됨');
    }
    if (status === 'CHANNEL_ERROR') {
      console.error('[Realtime] 채널 에러');
    }
  });
```

- **채널 이름**을 `channelName` 한 번만 쓰고, 위 환경변수와 맞추면 됩니다.
- **이벤트**는 반드시 `broadcast` + `event: 'new_handwriting'` 로 받아야 합니다.

---

## 5. 못 불러올 때 체크리스트

| 확인 항목 | 설명 |
|-----------|------|
| **같은 프로젝트** | 다른 프론트의 URL/Anon Key가 태블릿과 같은 Supabase 프로젝트인지 |
| **채널 이름** | `exhibition:exhibition-2026` 처럼 `prefix:sessionId` 형식인지, 띄어쓰기/오타 없는지 |
| **이벤트 이름** | `new_handwriting` (소문자, 언더스코어) 정확히 일치하는지 |
| **Realtime 활성화** | Dashboard → Project Settings → API에서 Realtime 꺼져 있지 않은지 |
| **Edge Function Secrets** | `REALTIME_CHANNEL_PREFIX` 가 설정되어 있는지 (`exhibition` 등) |
| **실제 전송 타이밍** | 다른 프론트 페이지를 연 상태에서 태블릿에서 버튼을 눌렀는지 (이미 보낸 건 재전송되지 않음) |

---

## 6. 테이블이 있어야 불러올 수 있나?

- **실시간으로 “방금 보낸 한 건”만 받기**
  → **테이블 필요 없음.** 위 Broadcast 구독만 맞추면 됩니다.
- **페이지 로드 시 “지금까지 쌓인 전체 목록” 보여주기**
  → **테이블 필요.** `supabase.from('strokes').select('*')` 로 조회하려면 `strokes` 테이블에 행이 있어야 합니다.
  이미 Storage에만 있는 SVG는 `npm run backfill:strokes` 로 테이블에 넣을 수 있습니다.

---

## 7. 디버깅 팁

1. **다른 프론트 콘솔**에서 `[Realtime] 구독 채널: exhibition:exhibition-2026` 같은 로그가 나오는지 확인.
2. **상태 로그**: `SUBSCRIBED` 가 나오면 구독은 된 것이고, `CHANNEL_ERROR` 면 채널 이름/키/Realtime 설정을 다시 확인.
3. **태블릿에서 전송**한 직후에만 broadcast가 가므로, 다른 프론트 페이지를 먼저 연 다음 태블릿에서 “입국심사받기”를 눌러보기.
4. **Edge Function 로그**: Dashboard → Edge Functions → handwriting-to-svg → Logs 에서 `Broadcasted to channel: ...` 이 보이면 서버에서는 정상 전송된 것입니다.

이렇게 맞춰도 수신이 안 되면, 다른 프론트의 **채널 이름 문자열**과 **이벤트 이름**을 한 번 더 비교해 보면 됩니다.
