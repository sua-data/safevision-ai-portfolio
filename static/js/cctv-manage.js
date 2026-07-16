let cctvList = [];
let currentList = [];

const tableBody = document.getElementById("cctvTableBody");
const totalCount = document.getElementById("totalCount");
const activeCount = document.getElementById("activeCount");
const inactiveCount = document.getElementById("inactiveCount");

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

const modal = document.getElementById("cctvModal");
const openAddModalBtn = document.getElementById("openAddModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelBtn = document.getElementById("cancelBtn");
const cctvForm = document.getElementById("cctvForm");

const formMode = document.getElementById("formMode");
const cctvId = document.getElementById("cctvId");
const cctvName = document.getElementById("cctvName");
const locationInput = document.getElementById("location");
const streamUrl = document.getElementById("streamUrl");
const isActive = document.getElementById("isActive");
const modalTitle = document.getElementById("modalTitle");

function renderSummary(list) {
  totalCount.textContent = list.length;
  activeCount.textContent = list.filter(item => Number(item.is_active) === 1).length;
  inactiveCount.textContent = list.filter(item => Number(item.is_active) === 0).length;
}

function renderTable(list) {
  tableBody.innerHTML = "";

  if (list.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; color:#6b7280;">
          조회된 CCTV가 없습니다.
        </td>
      </tr>
    `;
    return;
  }

  list.forEach(item => {
    const statusClass = Number(item.is_active) === 1 ? "status-active" : "status-inactive";
    const statusText = Number(item.is_active) === 1 ? "사용" : "미사용";

    const row = `
      <tr>
        <td>${item.cctv_id}</td>
        <td>${item.cctv_name}</td>
        <td>${item.location || "-"}</td>
        <td>${item.stream_url || "-"}</td>
        <td>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </td>
        <td>${item.created_at || "-"}</td>
        <td>
          <div class="action-btns">
            <button class="edit-btn" onclick="openEditModal('${item.cctv_id}')">수정</button>
            <button class="delete-btn" onclick="deleteCctv('${item.cctv_id}')">삭제</button>
          </div>
        </td>
      </tr>
    `;

    tableBody.insertAdjacentHTML("beforeend", row);
  });
}

function refreshView(list = currentList) {
  renderSummary(list);
  renderTable(list);
}

async function loadCctvList() {
  try {
    const response = await fetch("/api/cctv");
    const result = await response.json();

    if (!result.success) {
      alert(result.message || "CCTV 목록 조회 실패");
      return;
    }

    cctvList = result.data;
    currentList = [...cctvList];

    refreshView(currentList);
  } catch (error) {
    console.error("CCTV 목록 조회 오류:", error);
    alert("CCTV 목록 조회 중 오류가 발생했습니다.");
  }
}

function openModal() {
  modal.classList.add("active");
}

function closeModal() {
  modal.classList.remove("active");
  cctvForm.reset();
  formMode.value = "add";
  cctvId.disabled = false;
  modalTitle.textContent = "CCTV 등록";
}

function openAddModal() {
  cctvForm.reset();
  formMode.value = "add";
  cctvId.disabled = false;
  modalTitle.textContent = "CCTV 등록";
  openModal();
}

function openEditModal(id) {
  const item = cctvList.find(cctv => cctv.cctv_id === id);

  if (!item) {
    alert("CCTV 정보를 찾을 수 없습니다.");
    return;
  }

  formMode.value = "edit";
  cctvId.value = item.cctv_id;
  cctvId.disabled = true;
  cctvName.value = item.cctv_name;
  locationInput.value = item.location || "";
  streamUrl.value = item.stream_url || "";
  isActive.value = String(item.is_active);

  modalTitle.textContent = "CCTV 수정";
  openModal();
}

async function deleteCctv(id) {
  const confirmed = confirm("해당 CCTV를 삭제 하시겠습니까?");

  if (!confirmed) return;

  try {
    const response = await fetch(`/api/cctv/${id}`, {
      method: "DELETE"
    });

    const result = await response.json();

    if (!result.success) {
      alert(result.message || "삭제 처리 실패");
      return;
    }

    alert(result.message);
    loadCctvList();
  } catch (error) {
    console.error("CCTV 삭제 처리 오류:", error);
    alert("CCTV 삭제 처리 중 오류가 발생했습니다.");
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  const data = {
    cctv_id: cctvId.value.trim(),
    cctv_name: cctvName.value.trim(),
    location: locationInput.value.trim(),
    stream_url: streamUrl.value.trim(),
    is_active: Number(isActive.value)
  };

  if (!data.cctv_id || !data.cctv_name) {
    alert("CCTV ID와 CCTV명은 필수입니다.");
    return;
  }

  const mode = formMode.value;
  const url = mode === "add" ? "/api/cctv" : `/api/cctv/${data.cctv_id}`;
  const method = mode === "add" ? "POST" : "PUT";

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!result.success) {
      alert(result.message || "저장 실패");
      return;
    }

    alert(result.message);
    closeModal();
    loadCctvList();
  } catch (error) {
    console.error("CCTV 저장 오류:", error);
    alert("CCTV 저장 중 오류가 발생했습니다.");
  }
}

function searchCctv() {
  const keyword = searchInput.value.trim().toLowerCase();

  currentList = cctvList.filter(item => {
    return (
      item.cctv_name.toLowerCase().includes(keyword) ||
      (item.location || "").toLowerCase().includes(keyword) ||
      item.cctv_id.toLowerCase().includes(keyword)
    );
  });

  refreshView(currentList);
}

openAddModalBtn.addEventListener("click", openAddModal);
closeModalBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);
cctvForm.addEventListener("submit", handleSubmit);
searchBtn.addEventListener("click", searchCctv);

searchInput.addEventListener("keyup", event => {
  if (event.key === "Enter") {
    searchCctv();
  }
});

loadCctvList();