const zoneTableBody = document.getElementById("zoneTableBody");

async function loadDangerZones() {
  try {
    const response = await fetch("/api/danger-zone");
    const result = await response.json();

    if (!result.success) {
      alert("위험구역 목록 조회 실패");
      return;
    }

    renderZoneTable(result.data);
  } catch (error) {
    console.error(error);
    alert("서버 연결 오류");
  }
}

function renderZoneTable(zoneList) {
  zoneTableBody.innerHTML = "";

  zoneList.forEach((zone) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${zone.cctv_id}</td>
      <td>${zone.cctv_name}</td>
      <td>${zone.zone_name}</td>
      <td>
        <button
          type="button"
          class="coord-btn"
          onclick="showZonePreview('${zone.cctv_id}', ${zone.x1}, ${zone.y1}, ${zone.x2}, ${zone.y2})"
        >
          X1:${zone.x1}, Y1:${zone.y1}, X2:${zone.x2}, Y2:${zone.y2}
        </button>
      </td>
      <td>${formatDate(zone.updated_at)}</td>
      <td>
        <button type="button" class="delete-btn" onclick="deleteZone(${zone.zone_id})">
          삭제
        </button>
      </td>
    `;

    zoneTableBody.appendChild(tr);
  });
}

async function deleteZone(zoneId) {
  const ok = confirm("해당 위험구역을 삭제하시겠습니까?");
  if (!ok) return;

  const response = await fetch(`/api/danger-zone/zone/${zoneId}`, {
    method: "DELETE",
  });

  const result = await response.json();

  if (result.success) {
    loadDangerZones();
  } else {
    alert("삭제 실패");
  }
}

function formatDate(dateText) {
  if (!dateText) return "-";
  return dateText.replace("T", " ").slice(0, 19);
}

loadDangerZones();

function showZonePreview(cctvId, x1, y1, x2, y2) {
  const modal = document.getElementById("zonePreviewModal");
  const video = document.getElementById("zonePreviewVideo");
  const rect = document.getElementById("zonePreviewRect");

  modal.style.display = "flex";
  video.src = `/api/video-feed/${cctvId}`;

  const drawPreviewZone = () => {
    const BASE_WIDTH = 1280;
    const BASE_HEIGHT = 720;

    const previewWidth = video.clientWidth;
    const previewHeight = video.clientHeight;

    if (previewWidth === 0 || previewHeight === 0) {
      requestAnimationFrame(drawPreviewZone);
      return;
    }

    const scaleX = previewWidth / BASE_WIDTH;
    const scaleY = previewHeight / BASE_HEIGHT;

    rect.style.left = `${x1 * scaleX}px`;
    rect.style.top = `${y1 * scaleY}px`;
    rect.style.width = `${(x2 - x1) * scaleX}px`;
    rect.style.height = `${(y2 - y1) * scaleY}px`;
  };

  requestAnimationFrame(drawPreviewZone);
}

function closeZonePreview() {
  const modal = document.getElementById("zonePreviewModal");
  const video = document.getElementById("zonePreviewVideo");

  modal.style.display = "none";
  video.src = "";
}