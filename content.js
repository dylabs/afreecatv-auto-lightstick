// 전역 변수
let cheersInterval;
let timerTimeout;
let channelId = "";
let toggleButton;
let isRunning = false;
let startButton, stopButton; // Task 2에서 제거 예정

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
  ul2.appendChild(recordLi);
  ul2.appendChild(toggleLi);
  // settingsLi는 Task 3에서 추가
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
