const loginForm = document.querySelector(".login-form");
const adminIdInput = document.querySelector("#admin-id");
const adminPasswordInput = document.querySelector("#admin-password");
const saveIdCheckbox = document.querySelector('input[name="save_id"]');

// 임시 관리자 계정
const ADMIN_ID = "admin";
const ADMIN_PASSWORD = "1234";

// 페이지 열릴 때 저장된 아이디 불러오기
document.addEventListener("DOMContentLoaded", () => {
  const savedAdminId = localStorage.getItem("savedAdminId");

  if (savedAdminId) {
    adminIdInput.value = savedAdminId;
    saveIdCheckbox.checked = true;
  }
});

if (loginForm) {
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const adminId = adminIdInput.value.trim();
    const adminPassword = adminPasswordInput.value.trim();

    // 아이디 / 비밀번호 미입력
    if (!adminId || !adminPassword) {
      alert("아이디와 비밀번호를 입력하세요.");
      return;
    }

    // 로그인 실패
    if (adminId !== ADMIN_ID || adminPassword !== ADMIN_PASSWORD) {
      alert("아이디 또는 비밀번호가 일치하지 않습니다.");
      return;
    }

    // 아이디 저장 체크 여부에 따라 저장 / 삭제
    if (saveIdCheckbox.checked) {
      localStorage.setItem("savedAdminId", adminId);
    } else {
      localStorage.removeItem("savedAdminId");
    }

    // 로그인 상태 저장
    // sessionStorage는 창/탭 닫으면 자동 삭제됨
    sessionStorage.setItem("isLogin", "true");

    alert("로그인되었습니다.");

    // 로그인 성공 후 이동할 페이지
    location.href = "/dashboard";
  });
}