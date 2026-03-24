// 전역 변수
let cheersInterval;
let timerTimeout;
let channelId = "";
let toggleButton;
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

// 현재 텍스트 표시 요소 생성
function createRecordedTextDisplay() {
  const recordedTextDisplay = document.createElement("div");
  recordedTextDisplay.id = "recorded-text-display";

  // 스타일 적용
  recordedTextDisplay.style.position = "fixed";
  recordedTextDisplay.style.bottom = "1px";
  recordedTextDisplay.style.right = "1px";
  recordedTextDisplay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  recordedTextDisplay.style.color = "#fff";
  recordedTextDisplay.style.padding = "1px 5px";
  recordedTextDisplay.style.borderRadius = "2px";
  recordedTextDisplay.style.fontSize = "10px";
  recordedTextDisplay.style.zIndex = "9999";

  document.body.appendChild(recordedTextDisplay);
  updateTextDisplay();
}

// 텍스트 표시 업데이트
function updateTextDisplay() {
  const display = document.querySelector("#recorded-text-display");
  if (!display) return;
  if (settings.randomEnabled) {
    display.textContent = "현재: " + settings.randomPattern + " x " + settings.randomMin + "~" + settings.randomMax + "개 (랜덤)";
  } else {
    display.textContent = "현재 텍스트: " + settings.recordedText;
  }
}

// 랜덤 텍스트 생성
function generateText() {
  if (settings.randomEnabled) {
    const count =
      Math.floor(Math.random() * (settings.randomMax - settings.randomMin + 1)) +
      settings.randomMin;
    return settings.randomPattern.repeat(count);
  }
  return settings.recordedText;
}

// 토글 함수
function toggleCheering() {
  if (isRunning) {
    stopCheering();
  } else {
    startCheering();
  }
}

// 버튼 및 선택 상자 생성 및 페이지에 주입
function injectControls() {
  const recordLi = document.createElement("li");
  const recordButton = document.createElement("button");
  recordButton.type = "button";
  recordButton.innerText = "📝";
  recordButton.id = "record-button";
  recordButton.className = "cheer-button";
  recordButton.title = "기록하기";
  recordLi.appendChild(recordButton);

  const toggleLi = document.createElement("li");
  toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.innerText = "▶️";
  toggleButton.id = "toggle-button";
  toggleButton.className = "cheer-button";
  toggleButton.title = "시작하기";
  toggleLi.appendChild(toggleButton);

  // 시간 선택 상자 생성
  const timeSelectorLi = document.createElement("li");
  const timeSelector = createTimeSelector();
  timeSelectorLi.appendChild(timeSelector);

  // 이벤트 리스너 추가
  recordButton.addEventListener("click", recordText);
  toggleButton.addEventListener("click", toggleCheering);

  const ul2 = document.querySelector("#ul2");
  if (!ul2) {
    showToast("#ul2 요소를 찾을 수 없습니다.");
    return;
  }
  const settingsLi = document.createElement("li");
  const settingsButton = document.createElement("button");
  settingsButton.type = "button";
  settingsButton.innerText = "⚙️";
  settingsButton.id = "settings-button";
  settingsButton.className = "cheer-button";
  settingsButton.title = "설정";
  settingsLi.appendChild(settingsButton);
  settingsButton.addEventListener("click", openSettingsModal);

  ul2.appendChild(recordLi);
  ul2.appendChild(toggleLi);
  ul2.appendChild(settingsLi);
  ul2.appendChild(timeSelectorLi);

  // 현재 텍스트 표시 요소 생성
  createRecordedTextDisplay();
}

// #write_area에서 텍스트 불러오기
function recordText() {
  const writeArea = document.querySelector("#write_area");
  if (writeArea) {
    const userText = writeArea.textContent.trim() || "/야광봉//야광봉//야광봉/";
    settings.recordedText = userText;
    saveChannelSettings();
    updateTextDisplay();
    showToast(`녹화된 텍스트: ${settings.recordedText}`);
  } else {
    showToast("#write_area 요소를 찾을 수 없습니다.");
  }
}

// 자동 응원 메시지 전송 시작
function startCheering() {
  if (cheersInterval) {
    clearInterval(cheersInterval);
    cheersInterval = null;
  }

  cheersInterval = setInterval(() => {
    const item = generateText();
    const writeArea = document.querySelector("#write_area");
    const sendButton = document.querySelector("#btn_send");

    if (writeArea && sendButton) {
      writeArea.textContent = item;
      writeArea.dispatchEvent(new Event("input", { bubbles: true }));
      sendButton.click();
    } else {
      showToast("#write_area 또는 #btn_send 요소를 찾을 수 없습니다.");
      stopCheering();
    }
  }, settings.selectedTime * 1000);

  isRunning = true;
  toggleButton.innerText = "⏹️";
  toggleButton.title = "멈추기";
  toggleButton.classList.add("active");

  // 타이머 자동 정지
  if (settings.timerEnabled) {
    const ms = settings.timerUnit === "min"
      ? settings.timerValue * 60 * 1000
      : settings.timerValue * 1000;
    timerTimeout = setTimeout(() => {
      stopCheering();
      showToast("타이머 종료! 자동 응원이 중지되었습니다.");
    }, ms);
  }

  showToast("자동 응원 시작!");
}

// 자동 전송 중지
function stopCheering() {
  if (cheersInterval) {
    clearInterval(cheersInterval);
    cheersInterval = null;
  }
  if (timerTimeout) {
    clearTimeout(timerTimeout);
    timerTimeout = null;
  }

  isRunning = false;
  toggleButton.innerText = "▶️";
  toggleButton.title = "시작하기";
  toggleButton.classList.remove("active");
}

// ======== 설정 모달 ========

function createSettingsModal() {
  // 오버레이
  const overlay = document.createElement("div");
  overlay.id = "cheer-modal-overlay";
  overlay.className = "cheer-modal-overlay";
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeSettingsModal();
  });

  // 모달 컨테이너
  const modal = document.createElement("div");
  modal.className = "cheer-modal";

  // 헤더
  const header = document.createElement("div");
  header.className = "cheer-modal-header";
  const titleWrap = document.createElement("div");
  const title = document.createElement("div");
  title.className = "cheer-modal-title";
  title.textContent = "자동 응원 설정";
  const channelName = document.createElement("div");
  channelName.className = "cheer-modal-channel";
  channelName.textContent = "채널: " + channelId;
  titleWrap.appendChild(title);
  titleWrap.appendChild(channelName);
  const closeBtn = document.createElement("button");
  closeBtn.id = "cheer-modal-close";
  closeBtn.className = "cheer-modal-close";
  closeBtn.textContent = "✕";
  header.appendChild(titleWrap);
  header.appendChild(closeBtn);

  // 탭 바
  const tabBar = document.createElement("div");
  tabBar.className = "cheer-tab-bar";
  const tabSettings = document.createElement("button");
  tabSettings.className = "cheer-tab active";
  tabSettings.dataset.tab = "settings";
  tabSettings.textContent = "설정";
  const tabChannels = document.createElement("button");
  tabChannels.className = "cheer-tab";
  tabChannels.dataset.tab = "channels";
  tabChannels.textContent = "채널 목록";
  tabBar.appendChild(tabSettings);
  tabBar.appendChild(tabChannels);

  // 설정 탭 콘텐츠
  const settingsContent = document.createElement("div");
  settingsContent.id = "cheer-tab-settings";
  settingsContent.className = "cheer-tab-content active";

  // --- 타이머 섹션 ---
  const timerSection = document.createElement("div");
  timerSection.className = "cheer-section";
  const timerHeader = document.createElement("div");
  timerHeader.className = "cheer-section-header";
  const timerLabel = document.createElement("span");
  timerLabel.textContent = "자동 정지 타이머";
  const timerToggle = createToggleSwitch("cheer-timer-toggle", settings.timerEnabled);
  timerHeader.appendChild(timerLabel);
  timerHeader.appendChild(timerToggle);
  const timerBody = document.createElement("div");
  timerBody.id = "cheer-timer-body";
  timerBody.className = "cheer-section-body";
  const timerRow = document.createElement("div");
  timerRow.className = "cheer-field-row";
  const timerInput = document.createElement("input");
  timerInput.type = "number";
  timerInput.id = "cheer-timer-value";
  timerInput.className = "cheer-input-number";
  timerInput.min = "1";
  timerInput.value = settings.timerValue;
  const timerUnit = document.createElement("select");
  timerUnit.id = "cheer-timer-unit";
  timerUnit.className = "cheer-select";
  const optMin = document.createElement("option");
  optMin.value = "min";
  optMin.textContent = "분";
  if (settings.timerUnit === "min") optMin.selected = true;
  const optSec = document.createElement("option");
  optSec.value = "sec";
  optSec.textContent = "초";
  if (settings.timerUnit === "sec") optSec.selected = true;
  timerUnit.appendChild(optMin);
  timerUnit.appendChild(optSec);
  timerRow.appendChild(timerInput);
  timerRow.appendChild(timerUnit);
  const timerDesc = document.createElement("div");
  timerDesc.className = "cheer-field-desc";
  timerDesc.textContent = "설정한 시간 후 자동으로 응원이 멈춥니다";
  timerBody.appendChild(timerRow);
  timerBody.appendChild(timerDesc);
  timerSection.appendChild(timerHeader);
  timerSection.appendChild(timerBody);

  // --- 랜덤 섹션 ---
  const randomSection = document.createElement("div");
  randomSection.className = "cheer-section";
  const randomHeader = document.createElement("div");
  randomHeader.className = "cheer-section-header";
  const randomLabel = document.createElement("span");
  randomLabel.textContent = "랜덤 개수";
  const randomToggle = createToggleSwitch("cheer-random-toggle", settings.randomEnabled);
  randomHeader.appendChild(randomLabel);
  randomHeader.appendChild(randomToggle);
  const randomBody = document.createElement("div");
  randomBody.id = "cheer-random-body";
  randomBody.className = "cheer-section-body";
  const patternField = document.createElement("div");
  patternField.className = "cheer-field";
  const patternLabel = document.createElement("label");
  patternLabel.textContent = "이모지 패턴";
  const patternInput = document.createElement("input");
  patternInput.type = "text";
  patternInput.id = "cheer-random-pattern";
  patternInput.className = "cheer-input-text";
  patternInput.value = settings.randomPattern;
  patternField.appendChild(patternLabel);
  patternField.appendChild(patternInput);
  const countRow = document.createElement("div");
  countRow.className = "cheer-field-row";
  const minLabel = document.createElement("label");
  minLabel.textContent = "최소";
  const minInput = document.createElement("input");
  minInput.type = "number";
  minInput.id = "cheer-random-min";
  minInput.className = "cheer-input-number";
  minInput.min = "1";
  minInput.value = settings.randomMin;
  const countSep = document.createElement("span");
  countSep.className = "cheer-separator";
  countSep.textContent = "~";
  const maxLabel = document.createElement("label");
  maxLabel.textContent = "최대";
  const maxInput = document.createElement("input");
  maxInput.type = "number";
  maxInput.id = "cheer-random-max";
  maxInput.className = "cheer-input-number";
  maxInput.min = "1";
  maxInput.value = settings.randomMax;
  countRow.appendChild(minLabel);
  countRow.appendChild(minInput);
  countRow.appendChild(countSep);
  countRow.appendChild(maxLabel);
  countRow.appendChild(maxInput);
  const preview = document.createElement("div");
  preview.id = "cheer-random-preview";
  preview.className = "cheer-preview";
  randomBody.appendChild(patternField);
  randomBody.appendChild(countRow);
  randomBody.appendChild(preview);
  randomSection.appendChild(randomHeader);
  randomSection.appendChild(randomBody);

  // --- 저장 버튼 ---
  const saveBtn = document.createElement("button");
  saveBtn.id = "cheer-save-btn";
  saveBtn.className = "cheer-save-btn";
  saveBtn.textContent = "저장";

  settingsContent.appendChild(timerSection);
  settingsContent.appendChild(randomSection);
  settingsContent.appendChild(saveBtn);

  // 채널 목록 탭 콘텐츠
  const channelsContent = document.createElement("div");
  channelsContent.id = "cheer-tab-channels";
  channelsContent.className = "cheer-tab-content";

  // 조립
  modal.appendChild(header);
  modal.appendChild(tabBar);
  modal.appendChild(settingsContent);
  modal.appendChild(channelsContent);
  overlay.appendChild(modal);

  return overlay;
}

function createToggleSwitch(id, checked) {
  const label = document.createElement("label");
  label.className = "cheer-toggle";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.checked = checked;
  const slider = document.createElement("span");
  slider.className = "cheer-toggle-slider";
  label.appendChild(input);
  label.appendChild(slider);
  return label;
}

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

function renderChannelList() {
  const container = document.querySelector("#cheer-tab-channels");
  if (!container) return;
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const channels = getAllChannelSettings();
  if (channels.length === 0) {
    const empty = document.createElement("div");
    empty.className = "cheer-channel-empty";
    empty.textContent = "저장된 채널이 없습니다.";
    container.appendChild(empty);
    return;
  }

  channels.forEach((ch) => {
    const item = document.createElement("div");
    item.className = "cheer-channel-item";
    if (ch.id === channelId) item.classList.add("current");

    const info = document.createElement("div");
    info.className = "cheer-channel-info";
    const name = document.createElement("div");
    name.className = "cheer-channel-name";
    name.textContent = ch.id;
    if (ch.id === channelId) {
      const badge = document.createElement("span");
      badge.className = "cheer-channel-badge";
      badge.textContent = "현재";
      name.appendChild(badge);
    }
    const summary = document.createElement("div");
    summary.className = "cheer-channel-summary";
    const s = ch.settings;
    let desc = s.randomEnabled
      ? s.randomPattern + " x " + (s.randomMin || 1) + "~" + (s.randomMax || 1) + "개"
      : (s.recordedText || "기본 텍스트");
    desc += " / " + (s.selectedTime || 2) + "초";
    if (s.timerEnabled) desc += " / 타이머 " + (s.timerValue || 3) + (s.timerUnit === "sec" ? "초" : "분");
    summary.textContent = desc;
    info.appendChild(name);
    info.appendChild(summary);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "cheer-channel-delete";
    deleteBtn.textContent = "🗑️";
    deleteBtn.title = "삭제";
    deleteBtn.addEventListener("click", () => {
      if (ch.id === channelId) {
        showToast("현재 채널은 삭제할 수 없습니다.");
        return;
      }
      deleteChannelSettings(ch.id);
      renderChannelList();
      showToast(ch.id + " 채널 설정이 삭제되었습니다.");
    });

    item.appendChild(info);
    item.appendChild(deleteBtn);
    container.appendChild(item);
  });
}

// 시간 선택 상자 생성
function createTimeSelector() {
  const timeSelector = document.createElement("select");
  timeSelector.id = "time-selector";

  const times = [0.8, 1, 1.5, 2, 3, 5, 10];
  times.forEach((time) => {
    const option = document.createElement("option");
    option.value = time;
    option.text = `${time}초`;
    if (time === settings.selectedTime) {
      option.selected = true;
    }
    timeSelector.appendChild(option);
  });

  timeSelector.addEventListener("change", (event) => {
    settings.selectedTime = parseFloat(event.target.value);
    saveChannelSettings();
  });

  return timeSelector;
}

// 토스트 메시지 표시 함수
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "cheer-toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("cheer-toast-show");
  }, 100);

  setTimeout(() => {
    toast.classList.remove("cheer-toast-show");
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 500);
  }, 3000);
}

// 초기화 함수
function init() {
  loadChannelSettings();
  injectControls();
}

// 스크립트 실행 시 초기화
init();
