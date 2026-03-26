# Supabase 설정 처음부터 끝까지 (전체 점검)

세션 ID·prefix 어디서 확인하는지, Supabase에서 해야 할 설정을 **순서대로** 정리했습니다.

---

## 0. 세션 ID / Prefix 어디서 확인하나요?

### 세션 ID (Session ID)

| 어디서 쓰나요 | 어디서 정해지나요 |
|---------------|-------------------|
| **태블릿 앱** (이 레포) | 1) **URL 파라미터** `?session=exhibition-2026` 2) 없으면 **.env**의 `VITE_SESSION_ID` 3) 없으면 코드 기본값 **`default-session`** |
| **Edge Function** | 태블릿이 API 호출 시 **body**에 넣어서 보냄. 별도 설정 없음. |

**확인 방법**

- 태블릿 접속 URL에 `?session=xxx` 가 있으면 → 세션 ID = `xxx`
- 없으면 → 프로젝트 루트 **`.env`** 파일 열어서 `VITE_SESSION_ID` 확인
- `.env`에도 없으면 → **`default-session`** 이 사용 중

### Prefix (REALTIME_CHANNEL_PREFIX)

| 어디서 쓰나요 | 어디서 정해지나요 |
|---------------|-------------------|
| **Edge Function** (서버) | **Supabase Edge Function Secrets** 에서 `REALTIME_CHANNEL_PREFIX` 로 설정. **설정 안 하면 코드 기본값 `exhibition`** 사용. |

**확인 방법**

- 터미널에서: `supabase secrets list` → `REALTIME_CHANNEL_PREFIX` 값 확인
- Supabase Dashboard: **Edge Functions** → 해당 함수 → **Secrets** 탭에서 확인
- **한 번도 안 넣었다면** → 지금은 **`exhibition`** 이 쓰이고 있는 상태 (코드 기본값)

### 채널 이름 (다른 프론트에서 구독할 때)

- **공식**: `{prefix}:{sessionId}`
- 예: prefix=`exhibition`, sessionId=`exhibition-2026` → 채널 이름 = **`exhibition:exhibition-2026`**
- 예: prefix=`exhibition`, sessionId=`default-session` → **`exhibition:default-session`**

---

## 1. Supabase 프로젝트 확인

1. https://supabase.com/dashboard 접속 후 로그인
2. 사용할 **프로젝트** 선택 (예: `cffuybxttyrfjetyqrww`)
3. **Project Settings** (왼쪽 아래 톱니바퀴) → **General**
   - **Reference ID** 확인 (예: `cffuybxttyrfjetyqrww`) → 이게 URL에 들어감
   - **API** 탭에서 **Project URL**, **anon public** key 확인 → 태블릿/다른 프론트 `.env`에 넣는 값

---

## 2. 태블릿 앱(이 레포) .env 설정

프로젝트 **루트**에 `.env` 파일이 있어야 합니다.

1. 루트에 `.env` 있는지 확인
2. 아래 변수 넣기 (값은 Supabase Dashboard **Project Settings → API** 에서 복사):

```bash
# 필수
VITE_SUPABASE_URL=https://여기프로젝트ID.supabase.co
VITE_SUPABASE_ANON_KEY=여기_anon_public_키

# 선택 (없으면 기본값 사용)
VITE_SESSION_ID=exhibition-2026
VITE_FUNCTION_NAME=handwriting-to-svg
```

- **VITE_SESSION_ID** 를 안 넣으면 → `default-session` 사용
- **세션 ID 확인**: 위에서 정리한 대로 URL `?session=` 또는 이 `.env` 값

3. 저장 후 **개발 서버 재시작** (`npm run dev` 다시 실행)

---

## 3. Storage 버킷 만들기

1. Dashboard 왼쪽 **Storage** 클릭
2. **New bucket**
3. **Name**: `handwriting` (코드/Edge Function이 이 이름 사용)
4. **Public bucket** 체크 (다른 프론트에서 SVG URL로 바로 접근하려면 필수)
5. **Create bucket** 클릭

---

## 4. strokes 테이블 만들기 (마이그레이션)

1. Dashboard 왼쪽 **SQL Editor** 클릭
2. **New query**
3. 아래 SQL 붙여넣고 **Run** (이미 있으면 에러 나올 수 있음, 그때는 “이미 있음”으로 두면 됨)

```sql
-- strokes 테이블 (이미 있으면 스킵)
CREATE TABLE IF NOT EXISTS public.strokes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_url TEXT NOT NULL,
  is_processed BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strokes_is_processed ON public.strokes(is_processed);
CREATE INDEX IF NOT EXISTS idx_strokes_created_at ON public.strokes(created_at DESC);

ALTER TABLE public.strokes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert strokes" ON public.strokes;
CREATE POLICY "Anyone can insert strokes" ON public.strokes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view strokes" ON public.strokes;
CREATE POLICY "Anyone can view strokes" ON public.strokes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update strokes" ON public.strokes;
CREATE POLICY "Anyone can update strokes" ON public.strokes FOR UPDATE USING (true) WITH CHECK (true);
```

4. **Table Editor**에서 왼쪽에 **strokes** 테이블이 보이면 완료

---

## 5. Realtime 켜져 있는지 확인

1. **Project Settings** → **API** 탭
2. 아래로 내려서 **Realtime** 섹션 확인
3. 비활성화되어 있으면 켜기 (보통 기본이 활성화)

---

## 6. Edge Function 배포

1. 터미널에서 이 레포 루트로 이동
2. Supabase 로그인 (한 번만):

```bash
supabase login
```

3. 이 프로젝트와 연결 (프로젝트 ID는 Dashboard URL 또는 Project Settings에서):

```bash
supabase link --project-ref 여기프로젝트ID
```

4. 함수 배포:

```bash
supabase functions deploy handwriting-to-svg
```

5. Dashboard **Edge Functions** 메뉴에 `handwriting-to-svg` 가 보이면 완료

---

## 7. Edge Function Secrets 설정 (Prefix 등)

1. **방법 A – Dashboard**
   - **Edge Functions** → **handwriting-to-svg** 클릭
   - **Secrets** 탭 (또는 **Function details** 안의 Secrets)
   - 아래 이름으로 추가 (이미 있으면 수정)

| Name | Value | 비고 |
|------|--------|------|
| `REALTIME_CHANNEL_PREFIX` | `exhibition` | 채널 이름 앞부분. **설정 안 하면 코드 기본값 `exhibition`** |
| `STORAGE_BUCKET` | `handwriting` | Storage 버킷 이름. 안 넣으면 기본값 `handwriting` |
| `SUPABASE_URL` | (자동 주입되는 경우 많음) | 없으면 Project URL 넣기 |
| `SUPABASE_SERVICE_ROLE_KEY` | (자동 주입되는 경우 많음) | Project Settings → API → service_role key |

- **Prefix 확인**: 여기서 `REALTIME_CHANNEL_PREFIX` 값이 곧 prefix. 비워두면 `exhibition`.

2. **방법 B – 터미널**

```bash
supabase secrets set REALTIME_CHANNEL_PREFIX=exhibition
supabase secrets set STORAGE_BUCKET=handwriting
```

(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 는 배포 시 자동으로 들어가는 경우가 많음. 없으면 Dashboard에서 확인 후 설정)

3. **확인**

```bash
supabase secrets list
```

---

## 8. 정리 – 지금 쓰이는 값 확인

| 항목 | 확인 방법 | 예시 |
|------|-----------|------|
| **세션 ID** | 태블릿 URL `?session=` 또는 `.env`의 `VITE_SESSION_ID` | `exhibition-2026` 또는 `default-session` |
| **Prefix** | Edge Function Secrets의 `REALTIME_CHANNEL_PREFIX` (없으면 기본값) | `exhibition` |
| **채널 이름** | `{prefix}:{sessionId}` | `exhibition:exhibition-2026` 또는 `exhibition:default-session` |

- **설정 안 했다고 해서 동작 안 하는 건 아닙니다.**
  - 세션 ID는 URL/.env 없으면 **`default-session`**
  - Prefix는 Secrets 안 넣으면 **`exhibition`**
  → 채널 이름은 **`exhibition:default-session`** 이 됨.

---

## 9. 다른 프론트에서 구독할 때

- **같은 Supabase 프로젝트**의 URL + anon key 사용
- **채널 이름**을 위 8번에서 정한 대로 맞추기
  - 예: `exhibition:default-session` 또는 `exhibition:exhibition-2026`
- **이벤트 이름**은 반드시 `new_handwriting`

자세한 코드/트러블슈팅은 `docs/REALTIME_SETUP_AND_TROUBLESHOOTING.md` 참고.

---

## 10. 체크리스트 (한 번에 점검)

- [ ] Supabase 프로젝트 선택됨, Project URL / anon key 확인함
- [ ] 태블릿 `.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 넣음
- [ ] (선택) `VITE_SESSION_ID` 넣음 → 안 넣으면 `default-session`
- [ ] Storage에 **handwriting** 버킷 생성, **Public** 체크
- [ ] **strokes** 테이블 있음 (SQL Editor 또는 마이그레이션)
- [ ] Project Settings → API에서 **Realtime** 활성화됨
- [ ] **handwriting-to-svg** Edge Function 배포됨
- [ ] Edge Function **Secrets**에 `REALTIME_CHANNEL_PREFIX` 있음 (또는 기본값 `exhibition` 사용 중)
- [ ] (선택) `STORAGE_BUCKET=handwriting` 넣음
- [ ] 다른 프론트는 **같은 프로젝트** + **채널 이름 `prefix:sessionId`** + **이벤트 `new_handwriting`** 로 구독 중

이 순서대로 하면 세션 ID·prefix 확인부터 Supabase 설정까지 한 번에 점검할 수 있습니다.
