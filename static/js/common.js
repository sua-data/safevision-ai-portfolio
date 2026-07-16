document.addEventListener("DOMContentLoaded", () => {
  const currentPath = location.pathname;

  // 로그인 페이지에서는 로그인 검사 제외
  if (currentPath !== "/login") {
    const isLogin = sessionStorage.getItem("isLogin");

    if (isLogin !== "true") {
      alert("로그인이 필요합니다.");
      location.href = "/login";
      return;
    }
  }

  const sidebarContainer = document.querySelector("#sidebar-container");

  if (sidebarContainer) {
    fetch("/sidebar")
      .then((response) => {
        if (!response.ok) {
          throw new Error("sidebar.html을 불러오지 못했습니다.");
        }

        return response.text();
      })
      .then((html) => {
        sidebarContainer.innerHTML = html;

        if (typeof setActiveSidebar === "function") {
          setActiveSidebar();
        }
      })
      .catch((error) => {
        console.error("sidebar 로드 실패:", error);
      });
  }
});

/* sidebar가 나중에 들어와도 로그아웃 클릭을 잡기 위한 이벤트 위임 */
document.addEventListener("click", (event) => {
  const logoutBtn = event.target.closest("#logoutBtn");

  if (!logoutBtn) {
    return;
  }

  sessionStorage.removeItem("isLogin");
  alert("로그아웃되었습니다.");
  location.href = "/login";
});