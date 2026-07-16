let monitoringTimer = null;

const API = {
  cctvList: "/api/cctv",
  monitoringStatus: "/api/monitoring/status",
};

/* =========================
   모니터링 sidebar 처리
========================= */

function setMonitoringSidebarActive() {
  const menuItems = document.querySelectorAll(".menu-item");

  menuItems.forEach((item) => {
    item.classList.remove("active");

    const href = item.getAttribute("href");
    const pageName = item.dataset.page;

    if (href === "./monitoring.html" || pageName === "monitoring") {
      item.classList.add("active");
    }
  });
}

function loadMonitoringSidebar() {
  const sidebarContainer = document.querySelector("#sidebar-container");

  if (!sidebarContainer) {
    return;
  }

  fetch("/sidebar")
    .then((res) => res.text())
    .then((html) => {
      sidebarContainer.innerHTML = html;
      setMonitoringSidebarActive();
    })
    .catch((error) => {
      console.error("sidebar 로드 실패:", error);
    });
}

/* =========================
   모니터링 데이터 처리
========================= */

function getRiskClass(riskLevel) {
  switch (riskLevel) {
    case "SAFE":
      return "risk-safe";
    case "WARNING":
      return "risk-warning";
    case "DANGER":
      return "risk-danger";
    case "CRITICAL":
      return "risk-critical";
    default:
      return "";
  }
}

function setText(selector, value) {
  const element = document.querySelector(selector);

  if (!element) {
    return;
  }

  element.textContent = value ?? "-";
}

function resetMonitoringView() {
  setText("#currentRiskLevel", "-");
  setText("#currentRiskText", "-");
  setText("#riskScore", "-");
  setText("#helmetViolation", "-");
  setText("#vestViolation", "-");
  setText("#zoneViolation", "-");

  const riskLevelEl = document.querySelector("#currentRiskLevel");
  const riskTextEl = document.querySelector("#currentRiskText");

  if (riskLevelEl) {
    riskLevelEl.className = "";
  }

  if (riskTextEl) {
    riskTextEl.className = "";
  }
}

function renderCctvOptions(cctvList) {
  const cctvSelect = document.querySelector("#cctvSelect");

  if (!cctvSelect) {
    return;
  }

  cctvSelect.innerHTML = `<option value="">전체 CCTV</option>`;

  cctvList.forEach((cctv) => {
    const option = document.createElement("option");

    option.value = cctv.id;
    option.textContent = cctv.name;

    cctvSelect.appendChild(option);
  });
}

function renderMonitoring(data) {
  const riskLevelEl = document.querySelector("#currentRiskLevel");
  const riskTextEl = document.querySelector("#currentRiskText");

  const riskClass = getRiskClass(data.riskLevel);

  if (riskLevelEl) {
    riskLevelEl.textContent = data.riskLevel ?? "-";
    riskLevelEl.className = riskClass;
  }

  if (riskTextEl) {
    riskTextEl.textContent = data.riskText ?? "-";
    riskTextEl.className = riskClass;
  }

  setText(
    "#riskScore",
    data.riskScore !== undefined && data.riskScore !== null
      ? `${data.riskScore} / 100`
      : "-"
  );

  setText("#helmetViolation", data.violations?.helmet);
  setText("#vestViolation", data.violations?.vest);
  setText("#zoneViolation", data.violations?.zone);
}

async function loadCctvList() {
  try {
    const response = await fetch(API.cctvList);

    if (!response.ok) {
      throw new Error("CCTV 목록 조회 실패");
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "CCTV 목록 조회 실패");
    }

    cctvList = result.data;

    renderCctvOptions(cctvList);

    // 페이지 진입 시 자동으로 전체 CCTV 표시
    document.querySelector("#singleVideoView").classList.add("hidden");
    document.querySelector("#videoGrid").classList.remove("hidden");

    showAllCctv();

    // 전체 CCTV의 최신 상태를 바로 1회 조회
    loadAllMonitoringStatus();

    // 이후 0.5초마다 전체 CCTV 상태 조회
    if (monitoringTimer) {
      clearInterval(monitoringTimer);
    }

    monitoringTimer = setInterval(() => {
      loadAllMonitoringStatus();
    }, 500);
  } catch (error) {
    console.error(error);
  }
}

async function loadAllMonitoringStatus() {
  try {
    const response = await fetch("/api/monitoring/status-all");

    if (!response.ok) {
      throw new Error("전체 CCTV 상태 조회 실패");
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      return;
    }

    Object.entries(result.data).forEach(([cctvId, data]) => {
      processRiskAlert(cctvId, data);
    });
  } catch (error) {
    console.error("전체 CCTV 상태 조회 오류:", error);
  }
}

async function loadMonitoringStatus(cctvId) {
  if (!cctvId) {
    resetMonitoringView();
    return;
  }

  try {
    const response = await fetch(`${API.monitoringStatus}?cctvId=${cctvId}`);

    if (!response.ok) {
      throw new Error("모니터링 상태 조회 실패");
    }

    const data = await response.json();

    renderMonitoring(data);

    // if (data.riskLevel === "SAFE") {
    //   lastAlertKey = null;
    // }

    processRiskAlert(cctvId, data);
  } catch (error) {
    console.error(error);
    resetMonitoringView();
  }
}

function processRiskAlert(cctvId, data) {
  const level = data.riskLevel;

  if (!level || level === "-") {
    return;
  }

  if (level === "SAFE") {
    lastAlertMap[cctvId] = null;
    return;
  }

  const alertKey =
    `${level}-${data.riskScore}-${data.violations?.helmet}-${data.violations?.vest}-${data.violations?.zone}`;

  if (alertKey === lastAlertMap[cctvId]) {
    return;
  }

  showRiskAlert(
    level,
    `${cctvId} ${data.riskText || "위험 상황이 감지되었습니다."}`
  );

  lastAlertMap[cctvId] = alertKey;
}

function updateVideoFeed(cctvId) {
  const video = document.querySelector("#cctvVideo");
  const placeholder = document.querySelector("#videoPlaceholder");

  if (!video || !placeholder) {
    return;
  }

  if (!cctvId) {
    video.removeAttribute("src");
    video.classList.add("hidden");
    placeholder.classList.remove("hidden");
    return;
  }

  video.src = `/api/video-feed/${cctvId}`;
  video.classList.remove("hidden");
  placeholder.classList.add("hidden");
}

/* =========================
   전체보기 처리
========================= */

function openFullscreen(src = null) {
  const video = document.querySelector("#cctvVideo");
  const fullscreenModal = document.querySelector("#fullscreenModal");
  const fullscreenVideo = document.querySelector("#fullscreenVideo");

  if (!fullscreenModal || !fullscreenVideo) {
    return;
  }

  const targetSrc = src || video?.src;

  if (!targetSrc) {
    alert("먼저 CCTV를 선택해주세요.");
    return;
  }

  fullscreenVideo.src = targetSrc;
  fullscreenModal.classList.add("active");
}

function closeFullscreen() {
  const fullscreenModal = document.querySelector("#fullscreenModal");
  const fullscreenVideo = document.querySelector("#fullscreenVideo");

  if (!fullscreenModal || !fullscreenVideo) {
    return;
  }

  fullscreenModal.classList.remove("active");
  fullscreenVideo.removeAttribute("src");
}

function initFullscreen() {
  const fullscreenBtn = document.querySelector("#fullscreenBtn");
  const fullscreenModal = document.querySelector("#fullscreenModal");
  const closeFullscreenBtn = document.querySelector("#closeFullscreenBtn");

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", () => {
      openFullscreen();
    });
  }

  if (closeFullscreenBtn) {
    closeFullscreenBtn.addEventListener("click", closeFullscreen);
  }

  if (fullscreenModal) {
    fullscreenModal.addEventListener("click", (event) => {
      if (event.target === fullscreenModal) {
        closeFullscreen();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeFullscreen();
    }
  });
}

function showAllCctv() {
    const grid = document.querySelector("#videoGrid");

    grid.innerHTML = "";

    const activeCctvList = cctvList
      .filter((cctv) => Number(cctv.is_active) === 1)
      .slice(0, 6);
    const count = activeCctvList.length;

    grid.className = `video-grid grid-${count}`;

    activeCctvList.forEach(cctv => {

        grid.innerHTML += `
        <div class="video-item">

            <div class="video-title">${cctv.name}</div>

            <img src="/api/video-feed/${cctv.id}">

            <button
                class="grid-fullscreen-btn"
                onclick="openFullscreen('/api/video-feed/${cctv.id}')">
                <img src="../static/img/full-view.svg">
            </button>

        </div>
        `;

    });
}

/* =========================
   초기 실행
========================= */

function initMonitoring() {
  loadMonitoringSidebar();

  resetMonitoringView();
  loadCctvList();
  initFullscreen();

  const searchBtn = document.querySelector("#searchBtn");
  const cctvSelect = document.querySelector("#cctvSelect");

  if (searchBtn && cctvSelect) {
    searchBtn.addEventListener("click", () => {
      const cctvId = cctvSelect.value;

      // 기존 타이머가 있으면 먼저 중지
      if (monitoringTimer) {
        clearInterval(monitoringTimer);
        monitoringTimer = null;
      }

      // CCTV를 선택하지 않은 경우 화면 초기화
      if (!cctvId) {
        document.querySelector("#singleVideoView").classList.add("hidden");
        document.querySelector("#videoGrid").classList.remove("hidden");

        showAllCctv();

        loadAllMonitoringStatus();

        if (monitoringTimer) {
          clearInterval(monitoringTimer);
        }

        monitoringTimer = setInterval(() => {
          loadAllMonitoringStatus();
        }, 500);

        return;
      }

      // 영상 스트리밍 시작
      document.querySelector("#videoGrid").classList.add("hidden");
      document.querySelector("#singleVideoView").classList.remove("hidden");
      updateVideoFeed(cctvId);

      // 처음에는 YOLO가 아직 최신 상태를 만들기 전일 수 있어서 약간 늦게 1회 조회
      setTimeout(() => {
        loadMonitoringStatus(cctvId);
      }, 500);

      // 이후 1초마다 최신 감지 상태 조회
      monitoringTimer = setInterval(() => {
        loadMonitoringStatus(cctvId);
      }, 1000);
    });
  }
}

document.addEventListener("DOMContentLoaded", initMonitoring);

/* =========================
   알람
========================= */
let lastAlertMap = {};
let alertTimer = null;

function showRiskAlert(level, message) {
  if (level === "SAFE") return;

  const toast = document.getElementById("riskAlertToast");
  const icon = document.getElementById("riskAlertIcon");
  const levelText = document.getElementById("riskAlertLevel");
  const messageText = document.getElementById("riskAlertMessage");

  if (!toast || !icon || !levelText || !messageText) return;

  toast.className = "risk-alert-toast";

  switch (level) {
    case "WARNING":
      icon.src = "../static/img/warning.svg";
      levelText.style.color = "#f59e0b";
      toast.classList.add("risk-alert-warning");
      break;

    case "DANGER":
      icon.src = "../static/img/danger.svg";
      levelText.style.color = "#ff3333";
      toast.classList.add("risk-alert-danger");
      break;

    case "CRITICAL":
      icon.src = "../static/img/critical.svg";
      levelText.style.color = "#8b1515";
      toast.classList.add("risk-alert-critical");
      break;

    default:
      return;
  }

  levelText.textContent = level;
  messageText.textContent = message;

  toast.classList.add("show");

  if (alertTimer) {
    clearTimeout(alertTimer);
  }

  alertTimer = setTimeout(() => {
    toast.classList.remove("show");
    alertTimer = null;
  }, 7000);
}