---
name: Scribble bypass strategy
overview: iPadOS Scribble이 Apple Pencil 이벤트를 OS 레벨에서 가로채는 것이 근본 원인. 순수 웹에서는 완전 해결 불가능하지만, 즉시 적용 가능한 3가지 레벨의 대응을 제안한다.
todos:
  - id: scribble-banner
    content: "Level 1: iPad에서 Scribble 비활성화 안내 UI 추가 (EntryCardCanvas)"
    status: pending
  - id: remove-preventdefault
    content: "Level 2-A: 3개 캔버스 pointerdown에서 preventDefault() 제거"
    status: pending
  - id: pointermove-fallback
    content: "Level 2-B: 3개 캔버스 pointermove 폴백 시작 로직 추가"
    status: pending
  - id: pointercancel-soft
    content: "Level 2-C: 3개 캔버스 pointercancel 별도 처리 (획 종료 안 함)"
    status: pending
  - id: desynchronized
    content: "Level 2-D: 3개 캔버스 getContext에 desynchronized: true 추가"
    status: pending
  - id: remove-willchange
    content: "Level 2-E: WorrySection 캔버스에서 willChange: contents 제거"
    status: pending
isProject: false
---

# Apple Pencil 딜레이 근본 원인과 대응 전략

## 근본 원인: iPadOS Scribble

iPadOS의 Scribble은 **OS 레벨**에서 Apple Pencil 입력을 모니터링한다. 한글 "아"를 쓸 때, "ㅇ" 이후 "ㅏ" 패턴을 Scribble이 **필기(텍스트) 입력으로 인식**하고, 이벤트를 가로채서 텍스트 인식을 시도한다. 인식에 실패하면 1~10초 후 이벤트를 다시 웹에 전달한다.

- **마우스**: Scribble 대상 아님 -> 딜레이 없음
- **손가락**: Scribble은 Apple Pencil 전용 -> 딜레이 없음
- **Apple Pencil + 우리 앱**: Scribble이 이벤트 가로챔 -> 딜레이 발생
- **Apple Pencil + Canva**: Cordova 네이티브 오버레이로 입력을 직접 수신 + `UIScribbleInteraction` API로 Scribble 비활성화 -> 딜레이 없음
- **Apple Pencil + tldraw**: 우리와 같은 문제 (2026년 3월 현재 미해결, [GitHub Issue #5813](https://github.com/tldraw/tldraw/issues/5813))

**웹 앱에서 Scribble을 비활성화하는 CSS/HTML/JS API는 존재하지 않는다.**

## 대응 전략 (3단계)

### Level 1: 즉시 적용 - Scribble 비활성화 안내 (확실한 해결)

iPad 설정에서 Scribble을 끄면 문제가 완전히 사라진다. 앱 내에 안내 UI를 추가한다.

- 대상 파일: [EntryCardCanvas.tsx](src/components/EntryCard/EntryCardCanvas.tsx)
- 내용: 앱 상단 또는 최초 진입 시 "Apple Pencil 최적 사용을 위해 iPad 설정 > Apple Pencil > Scribble(손글씨)을 꺼주세요" 배너/팝업 표시
- 조건: `navigator.maxTouchPoints > 0` (터치 디바이스)에서만 표시

### Level 2: 즉시 적용 - 코드 최적화 (딜레이 완화)

Scribble을 끌 수 없는 환경을 위해, Scribble이 이벤트를 돌려줬을 때 최대한 빠르게 복구하는 코드 개선.

수정 대상: [WorrySection.tsx](src/components/EntryCard/WorrySection.tsx), [NameField.tsx](src/components/EntryCard/NameField.tsx), [SignatureSection.tsx](src/components/EntryCard/SignatureSection.tsx)

**A. `pointerdown`에서 `preventDefault()` 제거**

`touch-action: none` CSS가 이미 스크롤/줌을 방지하고 있어 `preventDefault()`가 불필요하다. WebKit의 Apple Pencil 이벤트 파이프라인에 부작용을 줄 수 있으므로 제거한다.

```typescript
// Before
e.preventDefault(); // 제거

// After (no preventDefault)
```

**B. `pointermove` 폴백 시작**

Scribble이 `pointerdown`을 삼킨 후 `pointermove`를 먼저 돌려주는 경우를 대비한다:

```typescript
const handlePointerMove = (e: PointerEvent) => {
  // Scribble이 pointerdown을 삼키고 pointermove를 돌려준 경우 자동 시작
  if (!isDrawingRef.current && e.pressure > 0) {
    isDrawingRef.current = true;
    canvasRectRef.current = canvas.getBoundingClientRect();
    // ... 시작점 기록 ...
  }
  if (!isDrawingRef.current) return;
  // ... 기존 드로잉 로직 ...
};
```

**C. `pointercancel` 별도 처리**

`pointercancel`에서 획을 종료하지 않고 상태만 리셋. 곧 도착하는 `pointermove`에서 자동 재시작:

```typescript
const handlePointerCancel = () => {
  isDrawingRef.current = false;
  lastPointRef.current = null;
  // strokesRef에 push하지 않음 (획 종료가 아닌 일시 중단)
};
```

**D. `desynchronized: true` 캔버스 컨텍스트**

저지연 렌더링 모드 활성화. Safari 15+ (iPadOS 15+) 지원:

```typescript
// Before
const ctx = canvas.getContext("2d", { willReadFrequently: false });

// After
const ctx = canvas.getContext("2d", {
  willReadFrequently: false,
  desynchronized: true,
});
```

**E. `willChange: "contents"` 제거**

WorrySection 캔버스에서 불필요한 컴포지팅 힌트 제거.

### Level 3: 장기 - 네이티브 컨테이너 (완전 해결)

Canva와 동일한 접근: Capacitor 또는 Cordova로 앱을 감싸고, 네이티브 레이어에서 Apple Pencil 입력을 직접 수신 + `UIScribbleInteraction`으로 Scribble 비활성화. 이건 큰 아키텍처 변경이므로 별도로 계획해야 한다.

## 권장 우선순위

1. **Level 1 (안내 UI)** + **Level 2 (코드 최적화)** 를 함께 적용
2. 사용자 환경에서 Scribble OFF 시 문제 완전 해결 확인
3. 필요하면 Level 3 검토
