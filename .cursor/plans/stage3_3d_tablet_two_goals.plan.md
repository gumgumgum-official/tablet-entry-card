---
name: Stage3 3D와 태블릿 품질 동시 만족
overview: 태블릿에서 손글씨 SVG 형식이 바뀐 뒤 2D 품질은 나아졌지만, gum-frontend Stage3 볼륨은 fill 기반 ExtrudeGeometry에 맞춰져 있어 stroke-only 다중 path와 계약이 어긋나 3D가 깨져 보인다. gum에서 stroke를 익스트루드 가능한 닫힌 기하로 처리하는 것이 핵심이며, 태블릿은 버그·스무딩 개선을 유지한 채 선택적으로 3D용 산출을 보강할 수 있다.
todos:
  - id: gum-stroke-to-shape
    content: gum-frontend svg-loader·stage3HandwritingSvgVolume stroke-only path를 닫힌 Shape/메시로 변환 후 Extrude 또는 동등 품질 파이프
    status: completed
  - id: visual-match-brun
    content: 참고(밝은 BRUN)에 맞춤 bevel/curveSegments·캡/조인 튜닝 및 와이어 확인
    status: completed
  - id: tablet-contract-optional
    content: 필요 시 tablet Edge에 3D용 fill 병행 등 계약 문서화(선택, 이중 유지보수 최소화)
    status: completed
isProject: false
---

# 글씨체 살리면서 깔끔한 3D + 태블릿 개선 유지 (두 마리 토끼)

## 사용자 기대 정리

- **참고 이미지(BRUN 등):** 필기 느낌(획의 개성)은 유지하되, **에지가 매끈하고** 익스트루드가 **한 덩어리처럼** 보이며 과한 베벨/조각남 없음.
- **현재 Stage3 한글 스샷:** 직육면체 조각이 겹쳐 보이고 이음이 거칠음 — “울퉁불퉁·블록감”.
- **원하는 것:** 예전처럼 3D가 깔끔했던 때로 되돌리되, **태블릿 쪽 버그 수정·스무딩 등 개선은 그대로** 유지.

## “예전엔 됐는데 지금은 왜?” — 태블릿을 많이 고쳐서냐?

**부분적으로 맞다.** 태블릿·Edge에서 만드는 SVG가 과거와 달라졌다.

| 구간 | 예전에 가깝던 점 | 지금 |
|------|------------------|------|
| SVG 의미 | fill 위주의 닫힌 면(또는 Extrude에 덜 민감한 입력)에 가까웠을 수 있음 | **`fill="none"` + `stroke` + Quadratic `d`**, 스트로크 **여러 개** |
| gum Stage3 볼륨 | [`parseSVGToExtrudeShapes`](file:///Applications/Github/26-winter/gum-frontend/src/lib/svg-loader.js) → `path.toShapes(false)` → [`ExtrudeGeometry`](file:///Applications/Github/26-winter/gum-frontend/src/utils/stages/stage3/stage3HandwritingSvgVolume.js) | **`toShapes`는 채움 윤곽용**이라 stroke-only 오픈 경로에 취약 → **깨진 Shape**가 익스트루드됨 |

즉 **태블릿만 원복**하면 2D/전송 쪽 개선을 되돌리게 되고, **gum만 고치지 않으면** 나중에 다른 SVG에서도 같은 계약 문제가 반복될 수 있다.

## 두 마리 토끼를 잡는 권장 조합

### 1) 필수: gum-frontend (Stage3 볼륨 파이프)

- **원인 정리:** stroke-only 다중 `<path>`를 **fill용 `toShapes`로 익스트루드**하는 것이 조각/겹침의 1차 원인에 가깝다.
- **대응:** `parseSVGToExtrudeShapes`(또는 볼륨 전용 파서)에서 `path.userData.style`를 보고,
  - **fill이 있으면** 기존처럼 `toShapes` → Extrude.
  - **fill이 `none`이고 stroke가 있으면** Three.js [`SVGLoader.pointsToStroke`](file:///Applications/Github/26-winter/gum-frontend/node_modules/three/examples/jsm/loaders/SVGLoader.js) 등으로 **스트로크 리본을 닫힌 2D 메시/윤곽**으로 만든 뒤 익스트루드하거나, 리본 `BufferGeometry`를 Z 방향으로 **직접 두께 부여**(ExtrudeGeometry 대체)해 **단일 덩어리**에 가깝게 머지.
- **BRUN 느낌:** [`stage3HandwritingSvgVolume.js`](file:///Applications/Github/26-winter/gum-frontend/src/utils/stages/stage3/stage3HandwritingSvgVolume.js)의 `bevelThickness` / `bevelSize` / `curveSegments`를 낮추거나 끄는 쪽으로 **날카로운 모서리**에 가깝게 튜닝(참고와 완전 일치는 아트 디렉션).

### 2) 선택: tablet-entry-card (Edge)

- **기본:** SVG 계약을 gum에서 흡수하면 **태블릿/Edge는 현재 스타일 유지**해도 된다.
- **선택:** 3D 전용으로 **filled 단일 레이어**를 추가 저장하거나 메타 플래그로 구버전과 병행 — **이중 파이프**라 유지보수 비용이 있으므로 gum 수정 후에도 깨지면 그때 검토.

### 3) 태블릿 쪽

- **유지:** 스무딩·optimizer·UI 일관성 등 **이미 반영된 개선은 유지**.
- **원복 금지 아님:** “예전 스타일”이 **3D만** 의미한다면 **태블릿 SVG를 과거 형식으로 되돌릴 필요는 없음** — 문제의 중심은 **소비자(gum)의 Extrude 입력**이다.

## 검증

- 동일 `svgUrl`로 Stage3 로드 후: **와이어프레임 / face 수 / 첫 프레임**에서 조각남 여부.
- stroke-only·fill-only·혼합 SVG **소 fixture**로 회귀.

## 리스크

- `pointsToStroke` → Shape 변환이 복잡하면 단계적으로 **볼륨 실패 시 평면 폴백** 빈도가 잠시 늘 수 있음 — UX상 나을 수 있음.
