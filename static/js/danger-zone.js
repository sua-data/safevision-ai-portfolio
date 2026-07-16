const canvas = document.getElementById("zoneCanvas");
const searchBtn = document.getElementById("searchBtn");
const resetBtn = document.getElementById("resetBtn");
const saveBtn = document.getElementById("saveBtn");

const cctvSelect = document.getElementById("cctvSelect");
const zoneNameInput = document.getElementById("zoneName");
const zoneVideo = document.getElementById("zoneVideo");
const zonePlaceholder = document.getElementById("zonePlaceholder");
const x1Input = document.getElementById("x1");
const y1Input = document.getElementById("y1");
const x2Input = document.getElementById("x2");
const y2Input = document.getElementById("y2");

let zoneRect = null;
let isDrawing = false;
let isResizing = false;
let activeHandle = null;

let startX = 0;
let startY = 0;

let zone = {
  x1: null,
  y1: null,
  x2: null,
  y2: null,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function getMousePosition(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: Math.round(event.clientX - rect.left),
    y: Math.round(event.clientY - rect.top),
  };
}

function normalizeZone() {
  const x1 = Math.min(zone.x1, zone.x2);
  const y1 = Math.min(zone.y1, zone.y2);
  const x2 = Math.max(zone.x1, zone.x2);
  const y2 = Math.max(zone.y1, zone.y2);

  zone = { x1, y1, x2, y2 };
}

function updateInputs() {
  x1Input.value = zone.x1 ?? "";
  y1Input.value = zone.y1 ?? "";
  x2Input.value = zone.x2 ?? "";
  y2Input.value = zone.y2 ?? "";
}

function createZoneRect() {
  if (zoneRect) {
    zoneRect.remove();
  }

  zoneRect = document.createElement("div");
  zoneRect.className = "zone-rect";

  ["tl", "tr", "bl", "br"].forEach((position) => {
    const handle = document.createElement("div");
    handle.className = `zone-handle ${position}`;
    handle.dataset.handle = position;

    handle.addEventListener("mousedown", (event) => {
      event.stopPropagation();
      isResizing = true;
      activeHandle = position;
    });

    zoneRect.appendChild(handle);
  });

  canvas.appendChild(zoneRect);
}

function renderZone() {
  if (
    zone.x1 === null ||
    zone.y1 === null ||
    zone.x2 === null ||
    zone.y2 === null
  ) {
    if (zoneRect) {
      zoneRect.remove();
      zoneRect = null;
    }
    updateInputs();
    return;
  }

  normalizeZone();

  if (!zoneRect) {
    createZoneRect();
  }

  const width = zone.x2 - zone.x1;
  const height = zone.y2 - zone.y1;

  zoneRect.style.left = `${zone.x1}px`;
  zoneRect.style.top = `${zone.y1}px`;
  zoneRect.style.width = `${width}px`;
  zoneRect.style.height = `${height}px`;

  updateInputs();
}

function startDraw(event) {
  if (event.target.closest(".zone-handle")) {
    return;
  }

  const pos = getMousePosition(event);

  startX = clamp(pos.x, 0, canvas.clientWidth);
  startY = clamp(pos.y, 0, canvas.clientHeight);

  zone = {
    x1: startX,
    y1: startY,
    x2: startX,
    y2: startY,
  };

  isDrawing = true;
  renderZone();
}

function draw(event) {
  if (!isDrawing && !isResizing) {
    return;
  }

  const pos = getMousePosition(event);
  const x = clamp(pos.x, 0, canvas.clientWidth);
  const y = clamp(pos.y, 0, canvas.clientHeight);

  if (isDrawing) {
    zone.x2 = x;
    zone.y2 = y;
    renderZone();
    return;
  }

  if (isResizing) {
    if (activeHandle === "tl") {
      zone.x1 = x;
      zone.y1 = y;
    }

    if (activeHandle === "tr") {
      zone.x2 = x;
      zone.y1 = y;
    }

    if (activeHandle === "bl") {
      zone.x1 = x;
      zone.y2 = y;
    }

    if (activeHandle === "br") {
      zone.x2 = x;
      zone.y2 = y;
    }

    renderZone();
  }
}

function stopAction() {
  isDrawing = false;
  isResizing = false;
  activeHandle = null;
}

function applyInputsToZone() {
  const x1 = Number(x1Input.value);
  const y1 = Number(y1Input.value);
  const x2 = Number(x2Input.value);
  const y2 = Number(y2Input.value);

  if ([x1, y1, x2, y2].some((value) => Number.isNaN(value))) {
    return;
  }

  zone = {
    x1: clamp(x1, 0, canvas.clientWidth),
    y1: clamp(y1, 0, canvas.clientHeight),
    x2: clamp(x2, 0, canvas.clientWidth),
    y2: clamp(y2, 0, canvas.clientHeight),
  };

  renderZone();
}

function resetZone() {
  zone = {
    x1: null,
    y1: null,
    x2: null,
    y2: null,
  };

  renderZone();
}

async function loadCctvOptions() {
  try {
    const response = await fetch("/api/cctv");
    const result = await response.json();

    if (!result.success) {
      return;
    }

    cctvSelect.innerHTML = `<option value="">CCTV 선택</option>`;

    result.data.forEach((cctv, index) => {
      const option = document.createElement("option");

      option.value = cctv.cctv_id;
      option.textContent = `${index + 1}번 CCTV`;

      cctvSelect.appendChild(option);
    });
  } catch (error) {
    console.error("CCTV 목록 조회 실패:", error);
  }
}

async function saveDangerZone() {
  if (
    zone.x1 === null ||
    zone.y1 === null ||
    zone.x2 === null ||
    zone.y2 === null
  ) {
    alert("위험구역을 먼저 설정하세요.");
    return;
  }

  if (!cctvSelect.value) {
    alert("CCTV를 선택하세요.");
    return;
  }

  // DB에는 항상 1280×720 기준 좌표로 저장
  const BASE_WIDTH = 1280;
  const BASE_HEIGHT = 720;

  const scaleX = BASE_WIDTH / canvas.clientWidth;
  const scaleY = BASE_HEIGHT / canvas.clientHeight;

  const payload = {
    cctv_id: cctvSelect.value,
    zone_name: zoneNameInput.value.trim() || "위험구역 1",

    x1: Math.round(zone.x1 * scaleX),
    y1: Math.round(zone.y1 * scaleY),
    x2: Math.round(zone.x2 * scaleX),
    y2: Math.round(zone.y2 * scaleY),
  };

  console.log("캔버스 기준 좌표:", zone);
  console.log("1280×720 변환 좌표:", payload);

  try {
    const response = await fetch("/api/danger-zone", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    console.log("저장 결과:", result);

    if (result.success) {
      alert("위험구역이 저장되었습니다.");
    } else {
      alert(result.message || "저장 실패");
    }

  } catch (error) {
    console.error("위험구역 저장 오류:", error);
    alert("서버 오류가 발생했습니다.");
  }
}

canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", draw);
document.addEventListener("mouseup", stopAction);

[x1Input, y1Input, x2Input, y2Input].forEach((input) => {
  input.addEventListener("change", applyInputsToZone);
});

resetBtn.addEventListener("click", resetZone);
saveBtn.addEventListener("click", saveDangerZone);

searchBtn.addEventListener("click", () => {
  const selectedCctvId = cctvSelect.value;

  if (!selectedCctvId) {
    alert("CCTV를 선택하세요.");
    return;
  }

  zoneVideo.src = `/api/video-feed/${selectedCctvId}`;
  zoneVideo.classList.remove("hidden");
  zonePlaceholder.classList.add("hidden");

  resetZone();
});

loadCctvOptions();