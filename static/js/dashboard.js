const DASHBOARD_API = "/api/dashboard";

/* =========================
   대시보드 sidebar 처리
========================= */

function setDashboardSidebarActive() {
  const menuItems = document.querySelectorAll(".menu-item");

  menuItems.forEach((item) => {
    item.classList.remove("active");

    const href = item.getAttribute("href");
    const pageName = item.dataset.page;

    if (href === "./dashboard.html" || pageName === "dashboard" || pageName === "index") {
      item.classList.add("active");
    }
  });
}

function loadDashboardSidebar() {
  const sidebarContainer = document.querySelector("#sidebar-container");

  if (!sidebarContainer) {
    return;
  }

  fetch("/sidebar")
    .then((res) => res.text())
    .then((html) => {
      sidebarContainer.innerHTML = html;
      setDashboardSidebarActive();
    })
    .catch((error) => {
      console.error("sidebar 로드 실패:", error);
    });
}

/* =========================
   대시보드 데이터 처리
========================= */

function getRiskLevelClass(riskLevel) {
  switch (riskLevel) {
    case "SAFE":
      return "level-safe";
    case "WARNING":
      return "level-warning";
    case "DANGER":
      return "level-danger";
    case "CRITICAL":
      return "level-critical";
    default:
      return "";
  }
}

function getStatusClass(status) {
  if (status === "확인" || status === "조치완료") {
    return "status-done";
  }

  return "status-pending";
}

function updateOverallStatus(status) {
  const icon = document.querySelector("#overallStatusIcon");
  const text = document.querySelector("#overallStatus");

  if (!icon || !text) return;

  switch (status) {
    case "SAFE":
      icon.src = "../static/img/safe.svg";
      text.style.color = "#03a94d";
      break;

    case "WARNING":
      icon.src = "../static/img/warning.svg";
      text.style.color = "#f59e0b";
      break;

    case "DANGER":
      icon.src = "../static/img/danger.svg";
      text.style.color = "#ff3333";
      break;

    case "CRITICAL":
      icon.src = "../static/img/critical.svg";
      text.style.color = "#8b1515";
      break;

    default:
      icon.src = "../static/img/safe.svg";
      text.style.color = "#03a94d";
  }
}

function setText(selector, value) {
  const element = document.querySelector(selector);

  if (!element) {
    return;
  }

  element.textContent = value ?? "-";
}

function resetDashboard() {
  setText("#overallStatus", "-");
  setText("#overallStatusText", "-");

  setText("#todayWarningCount", "-");
  setText("#todayWarningChange", "-");

  setText("#ppeRate", "-");
  setText("#ppeRateChange", "-");

  setText("#cctvStatus", "-");
  setText("#cctvStatusText", "-");

  const tbody = document.querySelector("#recentEventTable");

  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">데이터를 불러오는 중입니다.</td>
      </tr>
    `;
  }
}

function renderSummary(data) {
  const status = data.overallStatus?.status;

  setText("#overallStatus", data.overallStatus?.status);
  setText("#overallStatusText", data.overallStatus?.text);

  updateOverallStatus(status);

  setText("#todayWarningCount", data.todayWarning?.count);

  const warningChange = data.todayWarning?.change;
  const warningChangeText = data.todayWarning?.changeText;

  setText(
    "#todayWarningChange",
    warningChange && warningChangeText
      ? `${warningChange} ${warningChangeText}`
      : "-"
  );

  const ppeRate = data.ppeRate?.rate;

  setText(
    "#ppeRate",
    ppeRate !== undefined && ppeRate !== null ? `${ppeRate}%` : "-"
  );

  const ppeChange = data.ppeRate?.change;
  const ppeChangeText = data.ppeRate?.changeText;

  setText(
    "#ppeRateChange",
    ppeChange && ppeChangeText ? `${ppeChange} ${ppeChangeText}` : "-"
  );

  const connected = data.cctv?.connected;
  const total = data.cctv?.total;

  setText(
    "#cctvStatus",
    connected !== undefined && total !== undefined
      ? `${connected} / ${total}`
      : "-"
  );

  setText("#cctvStatusText", data.cctv?.text);
}

function renderRecentEvents(events) {
  const tbody = document.querySelector("#recentEventTable");

  if (!tbody) {
    return;
  }

  tbody.innerHTML = "";

  if (!events || events.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">최근 이벤트가 없습니다.</td>
      </tr>
    `;
    return;
  }

  events.forEach((event) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${event.time ?? "-"}</td>
      <td>${event.cctv ?? "-"}</td>
      <td>${event.violation ?? "-"}</td>
      <td class="${getRiskLevelClass(event.riskLevel)}">${event.riskLevel ?? "-"}</td>
      <td class="${getStatusClass(event.status)}">${event.status ?? "-"}</td>
    `;

    tbody.appendChild(tr);
  });
}

async function loadDashboard() {
  resetDashboard();

  try {
    const response = await fetch(DASHBOARD_API);

    if (!response.ok) {
      throw new Error("대시보드 데이터 조회 실패");
    }

    const data = await response.json();

    renderSummary(data);
    renderRecentEvents(data.recentEvents);
  } catch (error) {
    console.error(error);

    const tbody = document.querySelector("#recentEventTable");

    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">대시보드 데이터를 불러오지 못했습니다.</td>
        </tr>
      `;
    }
  }
}

/* =========================
   초기 실행
========================= */

document.addEventListener("DOMContentLoaded", () => {
  loadDashboardSidebar();
  loadDashboard();
});