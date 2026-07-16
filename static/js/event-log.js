let events = [];

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

async function loadEvents() {
  // 나중에 Flask랑 연결하면 여기를 수정하면 됨
  // 예: const response = await fetch("/api/events");
  // events = await response.json();
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const cctvId = document.getElementById("cctvSelect").value;

  const params = new URLSearchParams();

  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);
  if (cctvId && cctvId !== "all") params.append("cctv_id", cctvId);

  const response = await fetch(`/api/events?${params.toString()}`);
  const result = await response.json();

  events = result.data;
  renderTable(events);
}

async function getEventData() {
  return [
    {
      id: 101,
      time: "2026-07-02 14:35:21",
      cctv: "1번 CCTV",
      type: "안전모 미착용",
      risk: "DANGER",
      score: 65,
      status: "미확인",
      memo: ""
    },
    {
      id: 100,
      time: "2026-07-02 14:32:10",
      cctv: "2번 CCTV",
      type: "위험구역 진입",
      risk: "WARNING",
      score: 30,
      status: "확인",
      memo: ""
    },
    {
      id: 99,
      time: "2026-07-02 14:28:45",
      cctv: "1번 CCTV",
      type: "안전조끼 미착용",
      risk: "DANGER",
      score: 60,
      status: "미확인",
      memo: ""
    }
  ];
}

function renderTable(data) {
  const tbody = document.getElementById("eventTableBody");
  tbody.innerHTML = "";

  data.forEach((event) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${event.id}</td>
      <td>${event.time}</td>
      <td>${event.cctv}</td>
      <td>${event.type}</td>
      <td class="${getRiskClass(event.risk)}">${event.risk}</td>
      <td class="${getStatusClass(event.status)}">
        ${event.status}
      </td>
      <td>
        <button class="detail-btn" data-id="${event.id}">상세</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  document.querySelectorAll(".detail-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      openDetail(id);
    });
  });
}

function getRiskClass(risk) {
  if (risk === "WARNING") return "risk-warning";
  if (risk === "DANGER") return "risk-danger";
  if (risk === "CRITICAL") return "risk-critical";
  return "";
}

function getStatusClass(status) {
  if (status === "미확인") return "status-unchecked";
  if (status === "확인") return "status-confirmed";
  if (status === "조치완료") return "status-completed";
  return "";
}

function updateCaptureImage(event) {
  const captureImage = document.getElementById("captureImage");
  const capturePlaceholder = document.getElementById("capturePlaceholder");

  if (!captureImage || !capturePlaceholder) {
    return;
  }

  const imageUrl =
    event.imageUrl ||
    event.captureImage ||
    event.capturePath ||
    event.capture_url ||
    event.image_url;

  if (!imageUrl) {
    captureImage.removeAttribute("src");
    captureImage.classList.add("hidden");
    capturePlaceholder.classList.remove("hidden");
    return;
  }

  captureImage.src = imageUrl;
  captureImage.classList.remove("hidden");
  capturePlaceholder.classList.add("hidden");
}

function openDetail(id) {
  const event = events.find((item) => item.id === id);

  if (!event) return;

  document.getElementById("detailTime").textContent = event.time;
  document.getElementById("detailCctv").textContent = event.cctv;
  document.getElementById("detailType").textContent = event.type;
  document.getElementById("detailRisk").textContent = `${event.risk} (${event.score}점)`;
  document.getElementById("detailRisk").className = getRiskClass(event.risk);

  document.getElementById("statusSelect").value = event.status;
  document.getElementById("memoInput").value = event.memo || "";

  updateCaptureImage(event);

  document.getElementById("detailModal").classList.add("show");

  document.getElementById("saveBtn").onclick = async () => {
    const newStatus = document.getElementById("statusSelect").value;
    const comment = document.getElementById("memoInput").value;

    try {
      const response = await fetch(`/api/events/${event.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          comment: comment,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        alert(result.message || "처리 상태 저장에 실패했습니다.");
        return;
      }

      event.status = newStatus;
      event.memo = comment;

      renderTable(events);
      closeDetail();

      alert("저장되었습니다.");
    } catch (error) {
      console.error("이벤트 처리 상태 저장 오류:", error);
      alert("서버 오류로 처리 상태를 저장하지 못했습니다.");
    }
  };
}

function closeDetail() {
  document.getElementById("detailModal").classList.remove("show");
}

document.getElementById("closeBtn").addEventListener("click", closeDetail);

document.getElementById("searchBtn").addEventListener("click", () => {
  loadEvents();
});

loadEvents();

function openImageFullscreen() {
  const captureImage = document.getElementById("captureImage");
  const fullscreenModal = document.getElementById("imageFullscreenModal");
  const fullscreenImage = document.getElementById("fullscreenCaptureImage");

  if (!captureImage || !fullscreenModal || !fullscreenImage) {
    return;
  }

  if (!captureImage.src || captureImage.classList.contains("hidden")) {
    alert("확대할 캡처 이미지가 없습니다.");
    return;
  }

  fullscreenImage.src = captureImage.src;
  fullscreenModal.classList.add("active");
}

function closeImageFullscreen() {
  const fullscreenModal = document.getElementById("imageFullscreenModal");
  const fullscreenImage = document.getElementById("fullscreenCaptureImage");

  if (!fullscreenModal || !fullscreenImage) {
    return;
  }

  fullscreenModal.classList.remove("active");
  fullscreenImage.removeAttribute("src");
}

function initImageFullscreen() {
  const fullscreenBtn = document.getElementById("imageFullscreenBtn");
  const fullscreenModal = document.getElementById("imageFullscreenModal");
  const closeBtn = document.getElementById("closeImageFullscreenBtn");

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", openImageFullscreen);
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeImageFullscreen);
  }

  if (fullscreenModal) {
    fullscreenModal.addEventListener("click", (event) => {
      if (event.target === fullscreenModal) {
        closeImageFullscreen();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeImageFullscreen();
    }
  });
}

initImageFullscreen();