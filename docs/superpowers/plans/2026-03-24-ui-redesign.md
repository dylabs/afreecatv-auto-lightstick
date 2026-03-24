# SOOP 자동 응원봉 UI 개선 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 재생/정지 토글 통합, 설정 모달(타이머+랜덤+채널관리), 채널별 설정 저장 구현

**Architecture:** 기존 content.js를 확장. 프레임워크 없이 vanilla JS DOM 조작. localStorage에 `cheerSettings_{channelId}` 키로 채널별 JSON 저장. 테스트 프레임워크 없음 — 각 태스크 후 크롬 확장 리로드 + 페이지 새로고침으로 수동 검증.

**Tech Stack:** Vanilla JS, Chrome Extension Manifest V3, CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-24-ui-redesign-design.md`

---

## 파일 구조

| 파일 | 변경 | 역할 |
|---|---|---|
| `content.js` | 수정 | 전체 로직 (채널 감지, 설정 저장, UI 주입, 모달, 타이머, 랜덤) |
| `styles.css` | 수정 | 모달, 토글 스위치, 탭, 채널 목록 스타일 추가 |

---

### Task 1: 채널 감지 + 채널별 설정 저장/로드

**Files:**
- Modify: `content.js:1-18` (전역 변수 + loadSavedSettings 교체)

- [ ] **Step 1: 전역 변수 리팩터링 + 채널 감지 함수 추가**

기존 전역 변수를 설정 객체로 통합하고, URL에서 channelId를 추출하는 함수를 추가한다.

```js
// 전역 변수
let cheersInterval;
let timerTimeout;
let channelId = "";
let toggleButton; // 기존 startButton + stopButton 대체
let isRunning = false;

// 설정 기본값
const DEFAULT_SETTINGS = {
  recordedText: "/야광봉//야광봉//야광봉/",
  selectedTime: 2,
  timerEnabled: false,
  timerValue: 3,
  timerUnit: "min",
  randomEnabled: false,
  randomPattern: "/야광봉/",
  randomMin: 2,
  randomMax: 5,
};

let settings = { ...DEFAULT_SETTINGS };

function getChannelId() {
  const parts = window.location.pathname.split("/");
  return parts[1] || "default";
}
```

- [ ] **Step 2: 채널별 저장/로드 함수 구현**

기존 `loadSavedSettings()`를 채널별 JSON 방식으로 교체한다.

```js
function loadChannelSettings() {
  channelId = getChannelId();
  const saved = localStorage.getItem(`cheerSettings_${channelId}`);
  if (saved) {
    const parsed = JSON.parse(saved);
    settings = { ...DEFAULT_SETTINGS, ...parsed };
  } else {
    settings = { ...DEFAULT_SETTINGS };
  }
}

function saveChannelSettings() {
  localStorage.setItem(`cheerSettings_${channelId}`, JSON.stringify(settings));
}

function getAllChannelSettings() {
  const channels = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith("cheerSettings_")) {
      const id = key.replace("cheerSettings_", "");
      channels.push({ id, settings: JSON.parse(localStorage.getItem(key)) });
    }
  }
  return channels;
}

function deleteChannelSettings(id) {
  localStorage.removeItem(`cheerSettings_${id}`);
}
```

- [ ] **Step 3: init()에서 loadChannelSettings 호출로 변경**

```js
function init() {
  loadChannelSettings();
  injectControls();
}
```

- [ ] **Step 4: 커밋**

```bash
git add content.js
git commit -m "feat: add channel-specific settings storage"
```

---

### Task 2: 재생/정지 토글 버튼 통합

**Files:**
- Modify: `content.js` (injectControls, startCheering, stopCheering)

- [ ] **Step 1: injectControls에서 start+stop 버튼을 단일 토글 버튼으로 교체**

기존 `startButton`, `stopButton`, `startLi`, `stopLi` 생성 코드를 제거하고 하나의 `toggleButton`으로 교체한다.

```js
// injectControls 내부에서 startLi/stopLi 대신:
const toggleLi = document.createElement("li");
toggleButton = document.createElement("button");
toggleButton.type = "button";
toggleButton.innerText = "▶️";
toggleButton.id = "toggle-button";
toggleButton.className = "cheer-button";
toggleButton.title = "시작하기";
toggleLi.appendChild(toggleButton);
```

- [ ] **Step 2: toggleCheering 함수 구현**

```js
function toggleCheering() {
  if (isRunning) {
    stopCheering();
  } else {
    startCheering();
  }
}
```

- [ ] **Step 3: startCheering/stopCheering에서 토글 버튼 상태 업데이트**

`startCheering`에서:
```js
isRunning = true;
toggleButton.innerText = "⏹️";
toggleButton.title = "멈추기";
toggleButton.classList.add("active");
```

`stopCheering`에서:
```js
isRunning = false;
toggleButton.innerText = "▶️";
toggleButton.title = "시작하기";
toggleButton.classList.remove("active");
```

- [ ] **Step 4: startCheering에서 랜덤 텍스트 생성 분기 추가**

```js
function generateText() {
  if (settings.randomEnabled) {
    const count =
      Math.floor(Math.random() * (settings.randomMax - settings.randomMin + 1)) +
      settings.randomMin;
    return settings.randomPattern.repeat(count);
  }
  return settings.recordedText;
}
```

`startCheering`의 `setInterval` 콜백에서 `const item = recordedText;`를 `const item = generateText();`로 변경.

- [ ] **Step 5: startCheering에 타이머 로직 추가**

```js
// startCheering 함수 끝부분에 추가:
if (settings.timerEnabled) {
  const ms = settings.timerUnit === "min"
    ? settings.timerValue * 60 * 1000
    : settings.timerValue * 1000;
  timerTimeout = setTimeout(() => {
    stopCheering();
    showToast("타이머 종료! 자동 응원이 중지되었습니다.");
  }, ms);
}
```

`stopCheering`에 타이머 클리어 추가:
```js
if (timerTimeout) {
  clearTimeout(timerTimeout);
  timerTimeout = null;
}
```

- [ ] **Step 6: recordText에서 채널별 저장 적용**

기존 `localStorage.setItem("recordedText", ...)` 를 `settings.recordedText = userText; saveChannelSettings();`로 변경.

- [ ] **Step 7: 이벤트 리스너 연결 + ul2 append 정리**

```js
// injectControls 내부:
recordButton.addEventListener("click", recordText);
toggleButton.addEventListener("click", toggleCheering);

const ul2 = document.querySelector("#ul2");
if (!ul2) {
  showToast("#ul2 요소를 찾을 수 없습니다.");
  return;
}
ul2.appendChild(recordLi);
ul2.appendChild(toggleLi);
// settingsLi는 Task 3에서 추가
ul2.appendChild(timeSelectorLi);
```

- [ ] **Step 8: createTimeSelector에서 채널별 저장 적용**

```js
timeSelector.addEventListener("change", (event) => {
  settings.selectedTime = parseFloat(event.target.value);
  saveChannelSettings();
});
```

초기 selected 값도 `settings.selectedTime` 기준으로 변경.

- [ ] **Step 9: 하단 텍스트 표시 업데이트**

`createRecordedTextDisplay`와 `recordText`에서 랜덤 모드일 때 표시 텍스트를 분기:

```js
function updateTextDisplay() {
  const display = document.querySelector("#recorded-text-display");
  if (!display) return;
  if (settings.randomEnabled) {
    display.textContent = "현재: " + settings.randomPattern + " x " + settings.randomMin + "~" + settings.randomMax + "개 (랜덤)";
  } else {
    display.textContent = "현재 텍스트: " + settings.recordedText;
  }
}
```

- [ ] **Step 10: 수동 테스트 + 커밋**

확장 리로드 후 페이지 새로고침. 토글 버튼 전환 확인.

```bash
git add content.js
git commit -m "feat: merge play/stop into toggle button, add timer and random logic"
```

---

### Task 3: 설정 모달 (타이머 + 랜덤 + 채널 목록)

**Files:**
- Modify: `content.js` (모달 생성/열기/닫기 함수 추가)

- [ ] **Step 1: 설정 버튼 추가 (injectControls)**

```js
const settingsLi = document.createElement("li");
const settingsButton = document.createElement("button");
settingsButton.type = "button";
settingsButton.innerText = "⚙️";
settingsButton.id = "settings-button";
settingsButton.className = "cheer-button";
settingsButton.title = "설정";
settingsLi.appendChild(settingsButton);

settingsButton.addEventListener("click", openSettingsModal);

// ul2에 toggleLi 다음에 추가
ul2.appendChild(settingsLi);
```

- [ ] **Step 2: 모달 생성 함수 구현**

`createSettingsModal()` — 모달 전체 DOM을 `document.createElement` 기반으로 생성하여 반환한다. 탭 2개(설정/채널목록), 타이머 섹션, 랜덤 섹션, 저장 버튼 포함. XSS 방지를 위해 사용자 입력값은 반드시 `textContent`로 삽입하고, `createElement` + `appendChild` 패턴으로 DOM을 구성한다.

주요 구조:
- 오버레이 (`div.cheer-modal-overlay`) — 클릭 시 모달 닫기
- 모달 컨테이너 (`div.cheer-modal`)
- 헤더: 제목 + 채널명 + 닫기 버튼
- 탭 바: "설정" | "채널 목록"
- 설정 탭: 타이머 섹션 (토글 + 숫자 입력 + 분/초 선택) + 랜덤 섹션 (토글 + 패턴 입력 + min/max + 미리보기) + 저장 버튼
- 채널 목록 탭: renderChannelList()로 동적 렌더링

모든 input/select 요소는 `createElement`로 생성하고, `value` 속성으로 현재 settings 값을 반영한다. checkbox의 checked 속성은 `settings.timerEnabled`, `settings.randomEnabled`로 설정.

- [ ] **Step 3: 모달 열기/닫기 + 탭 전환 + 저장 이벤트**

```js
function openSettingsModal() {
  if (document.querySelector("#cheer-modal-overlay")) return;

  const overlay = createSettingsModal();
  document.body.appendChild(overlay);

  // 닫기 버튼
  document.querySelector("#cheer-modal-close").addEventListener("click", closeSettingsModal);

  // 탭 전환
  overlay.querySelectorAll(".cheer-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      overlay.querySelectorAll(".cheer-tab").forEach((t) => t.classList.remove("active"));
      overlay.querySelectorAll(".cheer-tab-content").forEach((c) => c.classList.remove("active"));
      tab.classList.add("active");
      const targetId = tab.dataset.tab === "settings" ? "cheer-tab-settings" : "cheer-tab-channels";
      document.getElementById(targetId).classList.add("active");
      if (tab.dataset.tab === "channels") renderChannelList();
    });
  });

  // 토글 스위치로 섹션 활성/비활성
  setupToggle("#cheer-timer-toggle", "#cheer-timer-body");
  setupToggle("#cheer-random-toggle", "#cheer-random-body", updateRandomPreview);

  // 랜덤 미리보기 이벤트
  ["#cheer-random-pattern", "#cheer-random-min", "#cheer-random-max"].forEach((sel) => {
    document.querySelector(sel)?.addEventListener("input", updateRandomPreview);
  });
  updateRandomPreview();

  // 저장
  document.querySelector("#cheer-save-btn").addEventListener("click", saveSettingsFromModal);
}

function setupToggle(toggleSel, bodySel, onChange) {
  const toggle = document.querySelector(toggleSel);
  const body = document.querySelector(bodySel);
  body.classList.toggle("disabled", !toggle.checked);
  toggle.addEventListener("change", () => {
    body.classList.toggle("disabled", !toggle.checked);
    if (onChange) onChange();
  });
}

function updateRandomPreview() {
  const preview = document.querySelector("#cheer-random-preview");
  if (!preview) return;
  const pattern = document.querySelector("#cheer-random-pattern").value || "/야광봉/";
  const min = parseInt(document.querySelector("#cheer-random-min").value) || 1;
  const max = parseInt(document.querySelector("#cheer-random-max").value) || 1;
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  preview.textContent = "미리보기: " + pattern.repeat(count) + " (" + count + "개)";
}

function saveSettingsFromModal() {
  settings.timerEnabled = document.querySelector("#cheer-timer-toggle").checked;
  settings.timerValue = parseInt(document.querySelector("#cheer-timer-value").value) || 3;
  settings.timerUnit = document.querySelector("#cheer-timer-unit").value;
  settings.randomEnabled = document.querySelector("#cheer-random-toggle").checked;
  settings.randomPattern = document.querySelector("#cheer-random-pattern").value || "/야광봉/";
  settings.randomMin = parseInt(document.querySelector("#cheer-random-min").value) || 1;
  settings.randomMax = parseInt(document.querySelector("#cheer-random-max").value) || 1;

  if (settings.randomMin > settings.randomMax) {
    const temp = settings.randomMin;
    settings.randomMin = settings.randomMax;
    settings.randomMax = temp;
  }

  saveChannelSettings();
  updateTextDisplay();
  closeSettingsModal();
  showToast("설정이 저장되었습니다!");
}

function closeSettingsModal() {
  const overlay = document.querySelector("#cheer-modal-overlay");
  if (overlay) overlay.remove();
}
```

- [ ] **Step 4: 채널 목록 렌더링 함수**

`renderChannelList()` — `getAllChannelSettings()`로 모든 채널을 가져와 DOM으로 렌더링. 채널명은 `textContent`로 안전하게 삽입. 현재 채널에 "현재" 뱃지 표시. 삭제 버튼 이벤트 연결.

- [ ] **Step 5: 수동 테스트 + 커밋**

확장 리로드 후 ⚙️ 클릭 → 모달 열림 확인. 탭 전환, 토글, 저장, 채널 목록 확인.

```bash
git add content.js
git commit -m "feat: add settings modal with timer, random, and channel management"
```

---

### Task 4: 모달 + 토글 스위치 CSS

**Files:**
- Modify: `styles.css`

- [ ] **Step 1: 모달 오버레이 + 컨테이너 스타일 추가**

모달 오버레이 (fixed, 풀스크린, 반투명 검정 배경, z-index: 10000, flex center), 모달 컨테이너 (340px, border-radius: 12px, max-height: 80vh overflow-y auto).

- [ ] **Step 2: 모달 헤더 + 탭 스타일 추가**

헤더 (flex, space-between), 제목 (15px bold), 채널명 (12px, color #4a9), 닫기 버튼, 탭 바 (flex, border-bottom), 탭 active 상태 (color #4a9, border-bottom #4a9), 탭 콘텐츠 (display none/block).

- [ ] **Step 3: 토글 스위치 CSS 추가**

`.cheer-toggle` (36x20px relative), input hidden, slider (absolute, #555 bg, rounded), slider::before (16px circle), checked 상태 (#28a745 bg, translateX).

- [ ] **Step 4: 입력 필드 + 저장 버튼 + 미리보기 스타일 추가**

number input (55px center), text input (100% width), select, field/label, field-row (flex), separator, preview (#4a9), save button (#28a745 full width), disabled 상태 (opacity 0.4, pointer-events none).

- [ ] **Step 5: 채널 목록 스타일 추가**

channel-item (flex, space-between), current 상태 (green border), badge, delete 버튼, empty 상태.

- [ ] **Step 6: CSS 변수 추가 (라이트 + 다크 모드)**

`:root`에 `--modal-bg`, `--modal-text`, `--modal-border`, `--section-bg`, `--input-bg`, `--input-border` 추가. `body.thema_dark`에 다크 값 추가.

- [ ] **Step 7: 미사용 .ul3 관련 스타일 제거**

- [ ] **Step 8: 수동 테스트 + 커밋**

```bash
git add styles.css
git commit -m "feat: add modal, toggle switch, tab, and channel list styles"
```

---

### Task 5: 정리 + 최종 통합 테스트

**Files:**
- Modify: `content.js` (dead code 제거)

- [ ] **Step 1: 기존 dead code 제거**

삭제할 코드:
- `let startButton, stopButton;` 전역 변수
- `ul3` 관련 코드 (주석 포함)
- 기존 `loadSavedSettings()` 함수
- 기존 개별 `localStorage.getItem/setItem` 호출

- [ ] **Step 2: 최종 통합 테스트**

1. 확장 리로드 후 페이지 새로고침
2. 기록(📝) → 텍스트 캡처 확인
3. 토글(▶️) 클릭 → ⏹️ 전환 → 메시지 전송 확인
4. 토글(⏹️) 클릭 → ▶️ 전환 → 중지 확인
5. 설정(⚙️) → 타이머 ON → 저장 → 재생 → 자동 정지 확인
6. 설정(⚙️) → 랜덤 ON → 패턴/개수 설정 → 저장 → 재생 → 랜덤 개수 확인
7. 다른 채널로 이동 → 설정이 독립적인지 확인
8. 설정(⚙️) → 채널 목록 탭 → 채널 리스트 + 현재 뱃지 확인
9. 채널 삭제 → 삭제 확인
10. 페이지 새로고침 → 설정 유지 확인

- [ ] **Step 3: 최종 커밋**

```bash
git add content.js styles.css
git commit -m "refactor: remove dead code and finalize integration"
```
