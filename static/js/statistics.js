let hourlyChart = null;
let typeChart = null;

// 공통 사이드바를 불러오고 현재 페이지 메뉴를 활성화
fetch("/sidebar")
  .then((res) => res.text())
  .then((html) => {
    document.getElementById("sidebar-container").innerHTML = html;

    const currentPage = location.pathname.split("/").pop().replace(".html", "");

    document.querySelectorAll(".menu-item").forEach((item) => {
      if (item.dataset.page === currentPage) {
        item.classList.add("active");
      }
    });
  });

// 통계 API를 호출해서 요약 카드와 차트 데이터를 화면에 표시
async function loadStatistics() {
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  try {
    const response = await fetch(
      `/api/statistics?start_date=${startDate}&end_date=${endDate}`
    );

    const data = await response.json();

    renderSummary(data.summary);
    renderHourlyChart(data.hourlyWarnings);
    renderTypeChart(data.violationTypes);
  } catch (error) {
    console.error("통계 데이터 조회 실패:", error);

    // 조회 실패 시 기본값으로 화면 초기화
    renderSummary({
      totalCount: 0,
      warningCount: 0,
      ppeRate: 0,
      riskScore: 0
    });

    renderHourlyChart([]);
    renderTypeChart([]);
  }
}

// 상단 요약 카드에 감지 횟수, 위험 건수, PPE 착용률, 위험 점수 표시
function renderSummary(summary) {
  document.getElementById("totalCount").textContent =
    `${summary.totalCount.toLocaleString()} 건`;

  document.getElementById("warningCount").textContent =
    `${summary.warningCount.toLocaleString()} 건`;

  document.getElementById("ppeRate").textContent =
    `${summary.ppeRate} %`;

  document.getElementById("riskScore").textContent =
    `${summary.riskScore} 점`;
}

// 시간대별 위험 이벤트 데이터를 선 그래프로 표시
function renderHourlyChart(hourlyData) {
  const labels = hourlyData.map((item) => item.time);
  const counts = hourlyData.map((item) => item.count);

  const ctx = document.getElementById("hourlyChart");

  // 기존 차트가 있으면 제거 후 다시 그림
  if (hourlyChart) {
    hourlyChart.destroy();
  }

  hourlyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "위험 이벤트",
          data: counts,

          borderColor: "#08a64b",
          backgroundColor: "rgba(8, 166, 75, 0.15)",

          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: "#08a64b",
          pointBorderColor: "#08a64b",
          pointBorderWidth: 2,

          tension: 0.35,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 2
          }
        }
      }
    }
  });
}

// 위험 유형별 비율 데이터를 도넛 차트로 표시
function renderTypeChart(typeData) {
  const labels = typeData.map((item) => item.type);
  const rates = typeData.map((item) => item.rate);
  const colors = ["#3b82f6", "#ef4444", "#facc15", "#f97316"];

  const ctx = document.getElementById("typeChart");

  // 기존 차트가 있으면 제거 후 다시 그림
  if (typeChart) {
    typeChart.destroy();
  }

  typeChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: rates,
          backgroundColor: colors,
          borderWidth: 0
        }
      ]
    },
    options: {
      cutout: "50%",
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });

  renderLegend(typeData, colors);
}

// 도넛 차트 옆에 위험 유형별 범례 표시
function renderLegend(typeData, colors) {
  const legend = document.getElementById("typeLegend");
  legend.innerHTML = "";

  typeData.forEach((item, index) => {
    const li = document.createElement("li");

    li.innerHTML = `
      <span class="legend-color" style="background-color: ${colors[index]}"></span>
      <span>${item.type} (${item.rate}%)</span>
    `;

    legend.appendChild(li);
  });
}

// 검색 버튼 클릭 시 선택한 기간 기준으로 통계 다시 조회
document.getElementById("searchBtn").addEventListener("click", loadStatistics);

// 페이지 진입 시 통계 데이터 최초 조회
loadStatistics();